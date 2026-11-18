/**
 * Lê e valida as variáveis de ambiente do servidor.
 * O servidor sobe mesmo sem chaves (para você ver a tela), mas as rotas
 * que precisam delas respondem NOT_CONFIGURED com a lista do que falta.
 */
import 'dotenv/config';

export interface ServerEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  geminiApiKey: string;
  geminiImageModel: string;
  geminiImageProModel: string;
  geminiTextModel: string;
  rustMotorUrl: string;
  rustImageModel: string;
  rustVideoModel: string;
  port: number;
}

const read = (key: string): string => (process.env[key] ?? '').trim();

export const env: ServerEnv = {
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY'),
  supabaseServiceKey: read('SUPABASE_SERVICE_ROLE_KEY'),
  geminiApiKey: read('GEMINI_API_KEY'),
  geminiImageModel: read('GEMINI_IMAGE_MODEL'),
  geminiImageProModel: read('GEMINI_IMAGE_PRO_MODEL'),
  geminiTextModel: read('GEMINI_TEXT_MODEL'),
  rustMotorUrl: read('RUST_MOTOR_URL').replace(/\/$/, ''),
  rustImageModel: read('RUST_IMAGE_MODEL') || 'google_flow',
  rustVideoModel: read('RUST_VIDEO_MODEL') || 'veo3.1',
  port: Number(read('API_PORT') || 8787),
};

export function missingKeys(): string[] {
  const missing: string[] = [];
  if (!env.supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!env.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  if (!env.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!env.geminiApiKey && !env.rustMotorUrl) missing.push('GEMINI_API_KEY (ou RUST_MOTOR_URL)');
  return missing;
}
