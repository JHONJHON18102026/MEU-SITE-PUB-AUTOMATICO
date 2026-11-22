import { env } from './env';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ImageInput } from '../shared/contracts';

export type RustImageResult = { buffer: Buffer; mimeType: string; model: string };

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

export async function rustGenerateImage(opts: {
  prompt: string;
  aspectRatio: string;
  model?: string;
  images?: ImageInput[];
}): Promise<RustImageResult> {
  // O endpoint Rust recebe caminhos locais; gravamos cada referência em um
  // diretório temporário compartilhado pelo backend e pelo motor na VPS.
  const referenceDir = opts.images?.length
    ? await fs.mkdtemp(path.join(os.tmpdir(), 'fd-image-reference-'))
    : null;

  try {
    const referenceImages: string[] = [];
    for (const [index, image] of (opts.images ?? []).entries()) {
      const extension = image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg';
      const referencePath = path.join(referenceDir!, `reference-${index + 1}.${extension}`);
      await fs.writeFile(referencePath, Buffer.from(image.data, 'base64'));
      referenceImages.push(referencePath);
    }

    const body = await requestJson('/v1/images/generations', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: opts.model || env.rustImageModel,
        prompt: opts.prompt,
        aspect_ratio: opts.aspectRatio,
        ...(referenceImages.length ? { reference_images: referenceImages } : {}),
      }),
    });
    const encoded = body?.data?.[0]?.b64_json;
    if (!encoded) throw new Error('Motor Rust não devolveu uma imagem.');
    return { buffer: Buffer.from(encoded, 'base64'), mimeType: 'image/png', model: body.model || opts.model || env.rustImageModel };
  } finally {
    if (referenceDir) await fs.rm(referenceDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function rustChatCompletion(opts: {
  prompt: string;
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const messages = [
    ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
    { role: 'user', content: opts.prompt },
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
}

export const rustEnabled = () => Boolean(env.rustMotorUrl);
