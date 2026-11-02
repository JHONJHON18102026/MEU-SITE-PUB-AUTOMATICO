import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfigCheck {
  configured: boolean;
  error: string | null;
}

/**
 * Verifica se uma chave parece ser secreta (service_role ou sb_secret_...),
 * impedindo exposição acidental no navegador.
 */
export function isForbiddenSecretKey(key: string): boolean {
  const trimmed = key.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('sb_secret_')) {
    return true;
  }

  // Caso seja um JWT (header.payload.signature), inspeciona o campo "role" sem logar a chave
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const json = JSON.parse(atob(padded)) as { role?: string };
      if (json.role === 'service_role') {
        return true;
      }
    } catch {
      // Se não for JSON válido em base64, segue fluxo normal
    }
  }

  return false;
}

export function validateSupabaseEnv(
  url?: string,
  anonKey?: string,
): SupabaseConfigCheck {
  const cleanUrl = (url ?? '').trim();
  const cleanKey = (anonKey ?? '').trim();

  if (!cleanUrl || !cleanKey) {
    return {
      configured: false,
      error:
        'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local (local) e nas Environment Variables da Vercel.',
    };
  }

  if (!cleanUrl.startsWith('https://') && !cleanUrl.startsWith('http://localhost')) {
    return {
      configured: false,
      error: 'VITE_SUPABASE_URL deve começar com https:// (ou http://localhost em desenvolvimento local).',
    };
  }

  if (isForbiddenSecretKey(cleanKey)) {
    return {
      configured: false,
      error:
        'Chave secreta detectada (service_role / sb_secret_). Por segurança, o frontend aceita apenas a chave pública (anon ou sb_publishable_).',
    };
  }

  return { configured: true, error: null };
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const supabaseStatus = validateSupabaseEnv(rawUrl, rawAnonKey);

export const supabase: SupabaseClient | null = supabaseStatus.configured
  ? createClient(rawUrl!.trim(), rawAnonKey!.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
