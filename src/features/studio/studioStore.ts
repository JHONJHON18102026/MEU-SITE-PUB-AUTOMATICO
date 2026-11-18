/**
 * Estado unificado do Studio (/studio):
 *  - Com Supabase (.env): consulta /api/studio/state, /brandbook, /projects, /accounts, /posts.
 *  - Sem .env (Modo Prévia Visual): persiste localmente em fd-studio-workspace.
 */
import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '@/lib/supabase';
import { api, ApiClientError } from '@/lib/api';
import type {
  StudioAccountDTO,
  StudioBrandProjectDTO,
  StudioBrandbookDTO,
  StudioScheduledPostDTO,
} from '@shared/ugcContracts';
import { buildLocalBrandbook } from './studioCartridges';

const DEFAULT_PROJECT: StudioBrandProjectDTO = {
  id: 'studio-default-1',
  user_id: 'preview',
  name: 'Minha Marca Principal',
  niche: 'Skincare & Rotina',
  product_name: 'Sérum Facial Vitamina C',
  is_active: true,
  brandbook: buildLocalBrandbook({
    brandName: 'Minha Marca Principal',
    niche: 'Skincare & Rotina',
    productName: 'Sérum Facial Vitamina C',
  }),
  auto_routine_enabled: false,
  daily_target: 2,
  created_at: '2026-11-15T12:00:00.000Z',
};

const SEED_ACCOUNT: StudioAccountDTO = {
  id: 'acc-seed-1',
  user_id: 'preview',
  project_id: 'studio-default-1',
  handle: '@futurodigital.skincare',
  platform: 'TikTok',
  stage: 'Pronta',
  health_score: 96,
  tiktok_shop: true,
  auto_warmup: true,
  avatar_url: '/showcase/modelo-01.webp',
  published_28d: 14,
  created_at: '2026-11-15T12:00:00.000Z',
};

interface StudioState {
  projects: StudioBrandProjectDTO[];
  accounts: StudioAccountDTO[];
  posts: StudioScheduledPostDTO[];
  activeProjectId: string;
  selectedCaptionStyle: string;
  version: number;
  bump: () => void;
  setActiveProjectId: (id: string) => void;
  setSelectedCaptionStyle: (style: string) => void;
  addLocalProject: (p: Omit<StudioBrandProjectDTO, 'id' | 'user_id' | 'created_at'>) => StudioBrandProjectDTO;
  updateLocalProject: (id: string, patch: Partial<StudioBrandProjectDTO>) => void;
  addLocalAccount: (a: Omit<StudioAccountDTO, 'id' | 'user_id' | 'created_at' | 'health_score' | 'published_28d'>) => StudioAccountDTO;
  updateLocalAccount: (id: string, patch: Partial<StudioAccountDTO>) => void;
  deleteLocalAccount: (id: string) => void;
  addLocalPost: (p: Omit<StudioScheduledPostDTO, 'id' | 'user_id' | 'created_at' | 'status'>) => StudioScheduledPostDTO;
  deleteLocalPost: (id: string) => void;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      projects: [DEFAULT_PROJECT],
      accounts: [SEED_ACCOUNT],
      posts: [],
      activeProjectId: DEFAULT_PROJECT.id,
      selectedCaptionStyle: 'karaoke',
      version: 0,
      bump: () => set({ version: get().version + 1 }),
      setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
      setSelectedCaptionStyle: (selectedCaptionStyle) => set({ selectedCaptionStyle }),
      addLocalProject: (p) => {
        const created: StudioBrandProjectDTO = {
          ...p,
          id: `studio-proj-${Date.now()}`,
          user_id: 'preview',
          created_at: new Date().toISOString(),
        };
        set({ projects: [...get().projects, created], activeProjectId: created.id });
        return created;
      },
      updateLocalProject: (id, patch) =>
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
      addLocalAccount: (a) => {
        const created: StudioAccountDTO = {
          ...a,
          id: `acc-${Date.now()}`,
          user_id: 'preview',
          health_score: 94,
          published_28d: 0,
          created_at: new Date().toISOString(),
        };
        set({ accounts: [...get().accounts, created] });
        return created;
      },
      updateLocalAccount: (id, patch) =>
        set({ accounts: get().accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }),
      deleteLocalAccount: (id) =>
        set({
          accounts: get().accounts.filter((a) => a.id !== id),
          posts: get().posts.filter((p) => p.account_id !== id),
        }),
      addLocalPost: (p) => {
        const created: StudioScheduledPostDTO = {
          ...p,
          id: `post-${Date.now()}`,
          user_id: 'preview',
          status: 'scheduled',
          created_at: new Date().toISOString(),
        };
        set({ posts: [...get().posts, created] });
        return created;
      },
      deleteLocalPost: (id) => set({ posts: get().posts.filter((p) => p.id !== id) }),
    }),
    {
      name: 'fd-studio-workspace',
      partialize: (s) => ({
        projects: s.projects,
        accounts: s.accounts,
        posts: s.posts,
        activeProjectId: s.activeProjectId,
        selectedCaptionStyle: s.selectedCaptionStyle,
      }),
    },
  ),
);

export function useStudioWorkspace() {
  const st = useStudioStore();
  const [remoteProjects, setRemoteProjects] = useState<StudioBrandProjectDTO[]>([]);
  const [remoteAccounts, setRemoteAccounts] = useState<StudioAccountDTO[]>([]);
  const [remotePosts, setRemotePosts] = useState<StudioScheduledPostDTO[]>([]);
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
      const res = await api.getStudioState();
      setRemoteProjects(res.projects);
      setRemoteAccounts(res.accounts);
      setRemotePosts(res.posts);
      if (res.projects[0] && !res.projects.some((p) => p.id === st.activeProjectId)) {
        st.setActiveProjectId(res.projects[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Não foi possível carregar o espaço de trabalho do Studio.');
    } finally {
      setLoading(false);
    }
  }, [st.activeProjectId]);

  useEffect(() => {
    void load();
  }, [load, st.version]);

  const projects = isSupabaseConfigured ? remoteProjects : st.projects;
  const accounts = isSupabaseConfigured ? remoteAccounts : st.accounts;
  const posts = isSupabaseConfigured ? remotePosts : st.posts;
  const activeProject = projects.find((p) => p.id === st.activeProjectId) ?? projects[0] ?? DEFAULT_PROJECT;

  async function generateBrandbook(opts: {
    brandName: string;
    niche: string;
    productName: string;
    targetAudience: string;
    voiceTone: string;
  }): Promise<StudioBrandbookDTO> {
    if (!isSupabaseConfigured) {
      const bb = buildLocalBrandbook(opts);
      st.updateLocalProject(activeProject.id, { brandbook: bb, name: opts.brandName, niche: opts.niche, product_name: opts.productName });
      toast.success('Brandbook atualizado com IA (0 créditos).');
      return bb;
    }
    try {
      const res = await api.generateBrandbook(opts);
      setRemoteProjects((curr) =>
        curr.map((p) => (p.id === activeProject.id ? { ...p, brandbook: res.brandbook, name: opts.brandName, niche: opts.niche, product_name: opts.productName } : p)),
      );
      await api.updateStudioProject(activeProject.id, {
        brandbook: res.brandbook,
        name: opts.brandName,
        niche: opts.niche,
        product_name: opts.productName,
      });
      st.bump();
      toast.success('Brandbook gerado com IA e salvo no Studio (0 créditos).');
      return res.brandbook;
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Usando modelo local de Brandbook.');
      return buildLocalBrandbook(opts);
    }
  }

  async function createBrandProject(name: string, niche: string, productName: string, metadata?: { client: string; description: string }) {
    const bb = buildLocalBrandbook({ brandName: name, niche, productName });
    if (metadata) bb.projectMetadata = metadata;
    if (!isSupabaseConfigured) {
      const created = st.addLocalProject({
        name,
        niche,
        product_name: productName,
        is_active: true,
        brandbook: bb,
        auto_routine_enabled: false,
        daily_target: 2,
      });
      toast.success(`Projeto "${created.name}" criado no Studio.`);
      return created;
    }
    const res = await api.createStudioProject({ name, niche, productName, brandbook: bb });
    st.setActiveProjectId(res.project.id);
    st.bump();
    toast.success(`Projeto "${res.project.name}" criado no Studio.`);
    return res.project;
  }

  async function updateProjectSettings(patch: Partial<StudioBrandProjectDTO>) {
    if (!isSupabaseConfigured) {
      st.updateLocalProject(activeProject.id, patch);
      return;
    }
    await api.updateStudioProject(activeProject.id, patch);
    st.bump();
  }

  async function addAccount(opts: {
    handle: string;
    platform: 'TikTok' | 'Instagram Reels' | 'YouTube Shorts';
    tiktokShop: boolean;
    avatarUrl: string;
  }) {
    if (!isSupabaseConfigured) {
      const acc = st.addLocalAccount({
        project_id: activeProject.id,
        handle: opts.handle,
        platform: opts.platform,
        stage: 'Criada',
        tiktok_shop: opts.tiktokShop,
        auto_warmup: true,
        avatar_url: opts.avatarUrl,
      });
      toast.success(`Conta ${acc.handle} adicionada.`);
      return acc;
    }
    const res = await api.createStudioAccount({
      projectId: activeProject.id,
      handle: opts.handle,
      platform: opts.platform,
      stage: 'Criada',
      tiktokShop: opts.tiktokShop,
      autoWarmup: true,
      avatarUrl: opts.avatarUrl,
    });
    st.bump();
    toast.success(`Conta ${res.account.handle} adicionada.`);
    return res.account;
  }

  async function updateAccount(id: string, patch: Partial<StudioAccountDTO>) {
    if (!isSupabaseConfigured) {
      st.updateLocalAccount(id, patch);
      return;
    }
    await api.updateStudioAccount(id, patch);
    st.bump();
  }

  async function removeAccount(id: string) {
    if (!isSupabaseConfigured) {
      st.deleteLocalAccount(id);
      toast.success('Conta removida.');
      return;
    }
    await api.deleteStudioAccount(id);
    st.bump();
    toast.success('Conta removida.');
  }

  async function schedulePost(opts: {
    accountId: string;
    videoProjectId?: string;
    title: string;
    captionStyle: string;
    trimFooter: boolean;
    normalizeVoice: boolean;
    scheduledFor: string;
    thumbnailUrl: string;
  }) {
    if (!isSupabaseConfigured) {
      const p = st.addLocalPost({
        project_id: activeProject.id,
        account_id: opts.accountId,
        video_project_id: opts.videoProjectId ?? null,
        title: opts.title,
        caption_style: opts.captionStyle,
        trim_footer: opts.trimFooter,
        normalize_voice: opts.normalizeVoice,
        scheduled_for: opts.scheduledFor,
        thumbnail_url: opts.thumbnailUrl,
      });
      toast.success('Publicação adicionada à agenda do Studio.');
      return p;
    }
    const res = await api.createStudioPost({
      projectId: activeProject.id,
      ...opts,
    });
    st.bump();
    toast.success('Publicação agendada no Studio.');
    return res.post;
  }

  async function removePost(id: string) {
    if (!isSupabaseConfigured) {
      st.deleteLocalPost(id);
      toast.success('Agendamento removido.');
      return;
    }
    await api.deleteStudioPost(id);
    st.bump();
    toast.success('Agendamento removido.');
  }

  return {
    projects,
    accounts,
    posts,
    activeProject,
    loading,
    error,
    reload: load,
    selectedCaptionStyle: st.selectedCaptionStyle,
    setSelectedCaptionStyle: st.setSelectedCaptionStyle,
    setActiveProjectId: st.setActiveProjectId,
    generateBrandbook,
    createBrandProject,
    updateProjectSettings,
    addAccount,
    updateAccount,
    removeAccount,
    schedulePost,
    removePost,
  };
}
