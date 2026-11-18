/**
 * Estado unificado da Biblioteca VIRAL + semente do Remake Viral:
 *  - Com Supabase (.env): consulta /api/viral/folders, /items e /manifest.
 *  - Sem .env (Modo Prévia Visual): guarda pastas e referências localmente em fd-viral-library.
 */
import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '@/lib/supabase';
import { api, ApiClientError } from '@/lib/api';
import { VIRAL_TRENDING_VIDEOS } from '@shared/ugcCatalog';
import type { ViralFolderDTO, ViralItemDTO, ViralManifestDTO } from '@shared/ugcContracts';
import { buildLocalManifest, detectPlatformFromUrl } from './viralCartridges';

export interface RemakeSeed {
  sourceTitle: string;
  sourceUrl?: string;
  thumbnailUrl: string;
  niche: string;
  durationSec: number;
  manifest?: ViralManifestDTO | null;
}

const DEFAULT_FOLDERS: ViralFolderDTO[] = [
  {
    id: 'folder-aleatorios',
    user_id: 'preview',
    name: 'Aleatórios',
    formats: ['ADS', 'Hook+Demo', 'Remake Viral'],
    created_at: '2026-11-15T12:00:00.000Z',
  },
];

const SEED_ITEMS: ViralItemDTO[] = VIRAL_TRENDING_VIDEOS.slice(0, 2).map((v) => ({
  id: `seed-${v.id}`,
  user_id: 'preview',
  folder_id: 'folder-aleatorios',
  title: v.title,
  source_url: null,
  platform: v.platform,
  thumbnail_url: v.thumbnail,
  niche: v.niche,
  viral_score: v.viralScore,
  duration_sec: v.durationSec,
  manifest: v.preAnalyzedManifest,
  created_at: '2026-11-15T12:00:00.000Z',
}));

interface ViralState {
  folders: ViralFolderDTO[];
  items: ViralItemDTO[];
  remakeSeed: RemakeSeed | null;
  version: number;
  setRemakeSeed: (seed: RemakeSeed | null) => void;
  addLocalFolder: (name: string, formats?: string[]) => ViralFolderDTO;
  updateLocalFolder: (id: string, patch: { name?: string; formats?: string[] }) => void;
  deleteLocalFolder: (id: string) => void;
  addLocalItem: (item: Omit<ViralItemDTO, 'id' | 'user_id' | 'created_at'>) => ViralItemDTO;
  deleteLocalItem: (id: string) => void;
  setLocalItemManifest: (id: string, manifest: ViralManifestDTO) => void;
  bump: () => void;
}

export const useViralStore = create<ViralState>()(
  persist(
    (set, get) => ({
      folders: DEFAULT_FOLDERS,
      items: SEED_ITEMS,
      remakeSeed: null,
      version: 0,
      bump: () => set({ version: get().version + 1 }),
      setRemakeSeed: (remakeSeed) => set({ remakeSeed }),
      addLocalFolder: (name, formats = ['Remake Viral']) => {
        const folder: ViralFolderDTO = {
          id: `folder-${Date.now()}`,
          user_id: 'preview',
          name: name.trim(),
          formats,
          created_at: new Date().toISOString(),
        };
        set({ folders: [...get().folders, folder] });
        return folder;
      },
      updateLocalFolder: (id, patch) => {
        set({
          folders: get().folders.map((f) =>
            f.id === id ? { ...f, name: patch.name ?? f.name, formats: patch.formats ?? f.formats } : f,
          ),
        });
      },
      deleteLocalFolder: (id) => {
        set({
          folders: get().folders.filter((f) => f.id !== id),
          items: get().items.filter((i) => i.folder_id !== id),
        });
      },
      addLocalItem: (item) => {
        const created: ViralItemDTO = {
          ...item,
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          user_id: 'preview',
          created_at: new Date().toISOString(),
        };
        set({ items: [created, ...get().items] });
        return created;
      },
      deleteLocalItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      setLocalItemManifest: (id, manifest) =>
        set({ items: get().items.map((i) => (i.id === id ? { ...i, manifest } : i)) }),
    }),
    {
      name: 'fd-viral-library',
      partialize: (s) => ({ folders: s.folders, items: s.items, remakeSeed: s.remakeSeed }),
    },
  ),
);

export function useViralLibrary() {
  const store = useViralStore();
  const [remoteFolders, setRemoteFolders] = useState<ViralFolderDTO[]>([]);
  const [remoteItems, setRemoteItems] = useState<ViralItemDTO[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.listViralLibrary();
      setRemoteFolders(res.folders);
      setRemoteItems(res.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Não foi possível carregar a Biblioteca VIRAL.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, store.version]);

  const folders = isSupabaseConfigured ? remoteFolders : store.folders;
  const items = isSupabaseConfigured ? remoteItems : store.items;

  async function createFolder(name: string, formats: string[] = ['Remake Viral']) {
    if (!name.trim()) return null;
    if (!isSupabaseConfigured) {
      const f = store.addLocalFolder(name, formats);
      toast.success(`Pasta "${f.name}" criada.`);
      return f;
    }
    try {
      const res = await api.createViralFolder(name.trim(), formats);
      store.bump();
      toast.success(`Pasta "${res.folder.name}" criada.`);
      return res.folder;
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Falha ao criar pasta.');
      return null;
    }
  }

  async function toggleFolderFormat(folder: ViralFolderDTO, format: string) {
    const next = folder.formats.includes(format)
      ? folder.formats.filter((x) => x !== format)
      : [...folder.formats, format];
    if (!isSupabaseConfigured) {
      store.updateLocalFolder(folder.id, { formats: next });
      return;
    }
    try {
      await api.updateViralFolder(folder.id, { formats: next });
      store.bump();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Falha ao atualizar formatos.');
    }
  }

  async function deleteFolder(id: string) {
    if (!isSupabaseConfigured) {
      store.deleteLocalFolder(id);
      toast.success('Pasta removida.');
      return;
    }
    try {
      await api.deleteViralFolder(id);
      store.bump();
      toast.success('Pasta removida.');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Falha ao apagar pasta.');
    }
  }

  async function importReference(opts: {
    folderId: string;
    title: string;
    url?: string;
    niche?: string;
    durationSec?: number;
    thumbnailUrl?: string;
    platform?: string;
    manifest?: ViralManifestDTO | null;
  }) {
    if (!isSupabaseConfigured) {
      const created = store.addLocalItem({
        folder_id: opts.folderId,
        title: opts.title,
        source_url: opts.url || null,
        platform: opts.platform || detectPlatformFromUrl(opts.url),
        thumbnail_url: opts.thumbnailUrl || '/showcase/modelo-01.webp',
        niche: opts.niche || 'Geral',
        viral_score: 92,
        duration_sec: opts.durationSec || 15,
        manifest: opts.manifest || null,
      });
      toast.success(`Salvo em Minhas pastas sem gastar créditos.`);
      return created;
    }
    try {
      const res = await api.importViralItem(opts);
      store.bump();
      toast.success('Referência salva em Minhas pastas (0 créditos).');
      return res.item;
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Link ou vídeo inválido.');
      return null;
    }
  }

  async function removeItem(id: string) {
    if (!isSupabaseConfigured) {
      store.deleteLocalItem(id);
      toast.success('Referência removida.');
      return;
    }
    try {
      await api.deleteViralItem(id);
      store.bump();
      toast.success('Referência removida.');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Falha ao excluir.');
    }
  }

  async function analyzeManifest(opts: {
    itemId?: string;
    sourceTitle: string;
    sourceUrl?: string;
    niche?: string;
    durationSec?: number;
    targetProduct?: string;
  }): Promise<ViralManifestDTO> {
    if (!isSupabaseConfigured) {
      const m = buildLocalManifest(opts);
      if (opts.itemId) store.setLocalItemManifest(opts.itemId, m);
      return m;
    }
    try {
      const res = await api.generateViralManifest(opts);
      if (opts.itemId) store.bump();
      return res.manifest;
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'A análise remota falhou. Exibindo uma prévia local.');
      return buildLocalManifest(opts);
    }
  }

  return {
    folders,
    items,
    loading,
    error,
    reload: load,
    createFolder,
    toggleFolderFormat,
    deleteFolder,
    importReference,
    removeItem,
    analyzeManifest,
  };
}
