/**
 * Cliente Supabase com a chave service_role (poderes de administrador).
 * Fica SÓ no servidor: é ele que debita créditos e grava as imagens.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { ApiError } from './errors';

let admin: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    throw new ApiError('NOT_CONFIGURED', 'Supabase não configurado no servidor (.env).');
  }
  if (!admin) {
    admin = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/** Confere o token do usuário logado e devolve o id dele. */
export async function getUserIdFromToken(authHeader: string | undefined): Promise<string> {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) throw new ApiError('UNAUTHORIZED', 'Faça login para continuar.');
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data.user) throw new ApiError('UNAUTHORIZED', 'Sessão expirada. Entre de novo.');
  return data.user.id;
}
