import { env } from './env';

export type RustImageResult = { buffer: Buffer; mimeType: string; model: string };

function endpoint(path: string): string {
  if (!env.rustMotorUrl) throw new Error('RUST_MOTOR_URL não configurada.');
  return `${env.rustMotorUrl}${path}`;
}

async function requestJson(path: string, init: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10 * 60_000);
  try {
    const res = await fetch(endpoint(path), { ...init, signal: controller.signal });
    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
    if (!res.ok) throw new Error(body?.error?.message || `Motor Rust respondeu HTTP ${res.status}.`);
    return body;
  } finally { clearTimeout(timer); }
}

export async function rustGenerateImage(opts: { prompt: string; aspectRatio: string; model?: string }): Promise<RustImageResult> {
  const body = await requestJson('/v1/images/generations', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: opts.model || env.rustImageModel, prompt: opts.prompt, aspect_ratio: opts.aspectRatio }),
  });
  const encoded = body?.data?.[0]?.b64_json;
  if (!encoded) throw new Error('Motor Rust não devolveu uma imagem.');
  return { buffer: Buffer.from(encoded, 'base64'), mimeType: 'image/png', model: body.model || opts.model || env.rustImageModel };
}

export async function rustChatCompletion(opts: { prompt: string; system?: string; model?: string }): Promise<string> {
  const messages = [
    ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
    { role: 'user', content: opts.prompt },
  ];
  const body = await requestJson('/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: opts.model || 'gemini-4-argon', messages, temperature: 0.7 }),
  });
  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Motor Rust não devolveu texto.');
  return text;
}

export const rustEnabled = () => Boolean(env.rustMotorUrl);
