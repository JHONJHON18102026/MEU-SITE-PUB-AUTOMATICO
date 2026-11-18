/**
 * Cliente Supabase do navegador (usa só a chave pública "anon").
 * Se o .env ainda não foi preenchido, devolve null e o app mostra a tela
 * de configuração em vez de quebrar.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase não configurado. Preencha o arquivo .env.');
  return supabase;
}
