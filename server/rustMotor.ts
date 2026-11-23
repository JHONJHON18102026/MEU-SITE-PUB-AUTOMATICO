import { env } from './env';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ImageInput } from '../shared/contracts';
import { ApiError } from './errors';

export type RustImageResult = { buffer: Buffer; mimeType: string; model: string };

// Flow automation shares one authenticated Chrome/CDP session. Keep all Hust
// operations in FIFO order so an image, video, or LLM task cannot steal the
// other request's active Flow project or temporary media output.
const MAX_QUEUED_RUST_OPERATIONS = 24;
let queuedRustOperations = 0;
let rustOperationTail: Promise<void> = Promise.resolve();

export async function withRustEngineQueue<T>(operation: () => Promise<T>, label: string): Promise<T> {
  if (queuedRustOperations >= MAX_QUEUED_RUST_OPERATIONS) {
    throw new ApiError('RATE_LIMITED', 'O motor Hust está com a fila cheia. Aguarde uma geração terminar e tente novamente.');
  }

  const queuedAt = Date.now();
  const previous = rustOperationTail;
  let release!: () => void;
  rustOperationTail = new Promise<void>((resolve) => { release = resolve; });
  const position = ++queuedRustOperations;
  if (position > 1) console.info(`[hust] ${label} aguardando na fila (posição ${position}).`);

  await previous;
  const waitMs = Date.now() - queuedAt;
  if (waitMs > 0) console.info(`[hust] ${label} iniciou após ${waitMs} ms na fila.`);
  try {
    return await operation();
  } finally {
    queuedRustOperations -= 1;
    release();
  }
}

function endpoint(path: string): string {
  if (!env.rustMotorUrl) throw new Error('RUST_MOTOR_URL não configurada.');
  return `${env.rustMotorUrl}${path}`;
}

async function requestJson(path: string, init: RequestInit, timeoutMs = 10 * 60_000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint(path), { ...init, signal: controller.signal });
    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
    if (!res.ok) throw new Error(body?.error?.message || `Motor Rust respondeu HTTP ${res.status}.`);
    return body;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`O motor oficial não respondeu em ${Math.ceil(timeoutMs / 1000)} segundos.`);
    }
    throw error;
  } finally { clearTimeout(timer); }
}

export function rustGenerateImage(opts: {
  prompt: string;
  aspectRatio: string;
  model?: string;
  imageModel?: string;
  images?: ImageInput[];
  imageDescriptions?: string[];
}): Promise<RustImageResult> {
  return withRustEngineQueue(async () => {
  const images = opts.images ?? [];
  const referenceDir = images.length ? await fs.mkdtemp(path.join(os.tmpdir(), 'fd-image-reference-')) : null;
  try {
    const referenceImages: string[] = [];
    if (referenceDir) {
      for (const [index, image] of images.entries()) {
        const ext = image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg';
        const referencePath = path.join(referenceDir, `reference-${index + 1}.${ext}`);
        await fs.writeFile(referencePath, Buffer.from(image.data, 'base64'));
        referenceImages.push(referencePath);
      }
    }
    const visualInstructions = images.map((_, index) =>
      opts.imageDescriptions?.[index] ?? ('Attached visual ' + (index + 1) + '.'),
    ).join('\n');
    const prompt = images.length
      ? [
          'WRITTEN SCENE PRIORITY: Follow the user prompt exactly for action, pose, clothing, location, framing, lighting, and camera. Attached photos are identity/product references only; do not copy their pose, outfit, or background unless the written prompt asks for it.',
          visualInstructions,
          'USER SCENE: ' + opts.prompt,
        ].filter(Boolean).join('\n\n')
      : opts.prompt;
    const body = await requestJson('/v1/images/generations', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: opts.model || env.rustImageModel,
        image_model: opts.imageModel || 'GEM_PIX_2',
        prompt,
        aspect_ratio: opts.aspectRatio,
        ...(referenceImages.length ? { reference_images: referenceImages } : {}),
      }),
    }, 210_000);
    const encoded = body?.data?.[0]?.b64_json;
    if (!encoded) throw new Error('Motor Rust não devolveu uma imagem.');
    return { buffer: Buffer.from(encoded, 'base64'), mimeType: 'image/png', model: body.model || opts.model || env.rustImageModel };
  } finally {
    if (referenceDir) await fs.rm(referenceDir, { recursive: true, force: true }).catch(() => undefined);
  }
  }, 'imagem');
}

export function rustChatCompletion(opts: {
  prompt: string;
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  images?: ImageInput[];
}): Promise<string> {
  return withRustEngineQueue(async () => {
  const userContent = opts.images?.length
    ? [
        ...opts.images.flatMap((image, index) => [
          { type: 'text', text: `VISUAL REFERENCE ${index + 1}: inspect the attached image directly. It is present in this message.` },
          { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.data}` } },
        ]),
        { type: 'text', text: opts.prompt },
      ]
    : opts.prompt;
  const messages = [
    ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
    { role: 'user', content: userContent },
  ];
  const body = await requestJson('/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model || 'gemini-4-argon',
      messages,
      temperature: opts.temperature ?? 0.7,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    }),
  }, 60_000);
  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Motor Rust não devolveu texto.');
  return text;
  }, 'texto');
}

export const rustEnabled = () => Boolean(env.rustMotorUrl);
