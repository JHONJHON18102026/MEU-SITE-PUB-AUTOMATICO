/**
 * Busca listas da galeria direto no Supabase (as regras RLS garantem que
 * cada pessoa só vê o que é dela + o que foi marcado como público).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import type { AvatarDTO, GenerationDTO } from '@shared/contracts';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useSession } from '@/store/session';

/** Contador global: quando muda, todas as listas recarregam. */
export const useGalleryVersion = create<{ version: number; bump: () => void }>((set, get) => ({
  version: 0,
  bump: () => set({ version: get().version + 1 }),
}));

function useQuery<T>(fetcher: () => Promise<T[]>, deps: unknown[], refreshEveryMs?: number) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedAt = useRef(0);
  const hasLoadedRef = useRef(false);
  const previousRunRef = useRef<(() => Promise<T[]>) | null>(null);
  const version = useGalleryVersion((s) => s.version);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps);

  useEffect(() => {
    let alive = true;
    // A versão muda também enquanto uma geração está em andamento. Não troque
    // a galeria pronta por um skeleton nesse refetch: mantenha os cards visíveis.
    if (previousRunRef.current !== run) {
      previousRunRef.current = run;
      hasLoadedRef.current = false;
      setData([]);
      setError(null);
    }
    if (!hasLoadedRef.current) setLoading(true);
    run()
      .then((rows) => alive && (lastFetchedAt.current = Date.now(), hasLoadedRef.current = true, setData(rows), setError(null)))
      .catch((err: unknown) => alive && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [run, version]);

  useEffect(() => {
    if (!refreshEveryMs) return;
    let alive = true;
    const refreshIfStaleAndVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastFetchedAt.current < refreshEveryMs) return;
      run()
        .then((rows) => alive && (lastFetchedAt.current = Date.now(), hasLoadedRef.current = true, setData(rows), setError(null)))
        .catch((err: unknown) => alive && setError(err instanceof Error ? err.message : String(err)));
    };
    // Do not poll while the gallery is open. Each refetch can rotate signed
    // Storage URLs and defeat the browser cache for every visible image. Keep
    // the gallery fresh when the user returns to a stale tab instead.
    document.addEventListener('visibilitychange', refreshIfStaleAndVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', refreshIfStaleAndVisible);
    };
  }, [run, refreshEveryMs]);

  return { data, loading, error };
}

export function useMyAvatars() {
  const userId = useSession((s) => s.session?.user.id);
  useEffect(() => {
    const client = supabase;
    if (!client || !userId) return;
    // Cada componente pode chamar useMyAvatars; nomes compartilhados fazem o
    // Supabase reutilizar um canal já inscrito e rejeitar novos callbacks.
    const channel = client
      .channel(`my-avatars:${userId}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avatars', filter: `user_id=eq.${userId}` }, () => {
        useGalleryVersion.getState().bump();
      })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [userId]);

  return useQuery<AvatarDTO>(async () => {
    if (!supabase || !userId) return [];
    const { avatars } = await api.listAvatars('mine');
    return avatars;
  }, [userId], 50 * 60 * 1000);
}

export function useCommunityAvatars() {
  return useQuery<AvatarDTO>(async () => {
    if (!supabase) return [];
    const { avatars } = await api.listAvatars('community');
    return avatars;
  }, [], 50 * 60 * 1000);
}

export function useGenerations() {
  const userId = useSession((s) => s.session?.user.id);
  return useQuery<GenerationDTO>(async () => {
    if (!supabase || !userId) return [];
    const { data, error } = await supabase
      .from('generations')
      .select('id, kind, status, cost, params, result_count, error, created_at, completed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data as GenerationDTO[];
  }, [userId]);
}
