import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { env } from './env';

const PROBE_TIMEOUT_MS = 2_000;
const START_TIMEOUT_MS = 15_000;

export type RustMotorStatus = {
  available: boolean;
  models: string[];
  error?: string;
};

function localMotorAddress(): URL | null {
  if (!env.rustMotorUrl) return null;
  try {
    const url = new URL(env.rustMotorUrl);
    return ['127.0.0.1', 'localhost', '::1'].includes(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

export async function checkRustMotor(timeoutMs = PROBE_TIMEOUT_MS): Promise<RustMotorStatus> {
  if (!env.rustMotorUrl) return { available: false, models: [], error: 'RUST_MOTOR_URL não configurada.' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${env.rustMotorUrl}/v1/models`, { signal: controller.signal });
    if (!response.ok) return { available: false, models: [], error: `A ponte Hust respondeu HTTP ${response.status}.` };
    const body = await response.json() as { data?: Array<{ id?: unknown }> };
    const models = Array.isArray(body.data)
      ? body.data.flatMap((model) => typeof model.id === 'string' ? [model.id] : [])
      : [];
    return models.length
      ? { available: true, models }
      : { available: false, models, error: 'A ponte Hust não devolveu o catálogo de modelos.' };
  } catch (error) {
    return {
      available: false,
      models: [],
      error: error instanceof Error && error.name === 'AbortError'
        ? 'A ponte Hust não respondeu dentro do prazo de verificação.'
        : 'A ponte Hust está desligada ou inacessível.',
    };
  } finally {
    clearTimeout(timer);
  }
}

function executableCandidates(): string[] {
  const home = os.homedir();
  const explicit = process.env.RUST_MOTOR_EXECUTABLE?.trim();
  const root = process.env.MOTORES_RUST_HOME?.trim();
  return [
    ...(explicit ? [explicit] : []),
    ...(root ? [path.join(root, 'target', 'release', 'motores-mcp-hub.exe')] : []),
    path.join(home, 'Desktop', 'MOTORES_RUST_SEM_CONTAS', 'MOTORES_RUST', 'target', 'release', 'motores-mcp-hub.exe'),
    path.join(home, 'Desktop', 'MOTORES_RUST', 'target', 'release', 'motores-mcp-hub.exe'),
  ];
}

async function waitForBridge(timeoutMs: number): Promise<RustMotorStatus> {
  const deadline = Date.now() + timeoutMs;
  let status: RustMotorStatus = { available: false, models: [], error: 'A ponte Hust não iniciou.' };
  while (Date.now() < deadline) {
    status = await checkRustMotor(1_200);
    if (status.available) return status;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return status;
}

/** Inicia a ponte local no dev do Windows quando ela ainda não está ativa. */
export async function ensureRustMotorRunning(): Promise<void> {
  const address = localMotorAddress();
  if (process.platform !== 'win32' || process.env.NODE_ENV === 'production' || !address) return;

  const current = await checkRustMotor();
  if (current.available) {
    console.info('[hust] Ponte local pronta; Gemini 3.8 Flash disponível.');
    return;
  }

  const executable = executableCandidates().find(existsSync);
  if (!executable) {
    console.warn(`[hust] ${current.error} Binário motores-mcp-hub.exe não encontrado; configure RUST_MOTOR_EXECUTABLE.`);
    return;
  }

  const child = spawn(executable, ['serve-openai', String(Number(address.port) || 31415), address.hostname], {
    cwd: path.dirname(path.dirname(path.dirname(executable))),
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
  });
  child.unref();

  const started = await waitForBridge(START_TIMEOUT_MS);
  if (started.available) {
    console.info('[hust] Ponte local iniciada automaticamente; Gemini 3.8 Flash disponível.');
  } else {
    console.warn(`[hust] Não foi possível iniciar a ponte local: ${started.error ?? current.error}`);
  }
}
