/**
 * Busca listas da galeria direto no Supabase (as regras RLS garantem que
 * cada pessoa só vê o que é dela + o que foi marcado como público).
 */
import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import type { AvatarDTO, GenerationDTO } from '@shared/contracts';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/session';

/** Contador global: quando muda, todas as listas recarregam. */
export const useGalleryVersion = create<{ version: number; bump: () => void }>((set, get) => ({
  version: 0,
  bump: () => set({ version: get().version + 1 }),
}));

const AVATAR_COLUMNS = 'id, user_id, name, image_url, prompt, attributes, engine, framing, aspect_ratio, is_public, is_favorite, created_at';

function useQuery<T>(fetcher: () => Promise<T[]>, deps: unknown[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const version = useGalleryVersion((s) => s.version);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    run()
      .then((rows) => alive && (setData(rows), setError(null)))
      .catch((err: unknown) => alive && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [run, version]);

  return { data, loading, error };
}

export function useMyAvatars() {
  const userId = useSession((s) => s.session?.user.id);
  return useQuery<AvatarDTO>(async () => {
    if (!supabase || !userId) return [];
    const { data, error } = await supabase
      .from('avatars')
      .select(AVATAR_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(120);
    if (error) throw error;
    return data as AvatarDTO[];
  }, [userId]);
}

export function useCommunityAvatars() {
  return useQuery<AvatarDTO>(async () => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('avatars')
      .select(AVATAR_COLUMNS)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) throw error;
    return data as AvatarDTO[];
  }, []);
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
