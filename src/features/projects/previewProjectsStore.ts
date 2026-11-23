/**
 * Estado unificado de Projetos de Vídeo (Entrega 2):
 *  - Com chaves reais (.env): consulta GET /api/projects, POST /api/ai-ugc/create e refaz cenas no servidor (Veo + Supabase).
 *  - Sem chaves (Modo Prévia Visual): armazena demonstrações locais marcadas explicitamente com "Prévia local (sem IA)"
 *    para que o usuário possa clicar em tudo sem tela travada e sem enganação.
 */
import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { api, ApiClientError } from '@/lib/api';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import {
  calculateImageBatchCost,
  calculateUgcCost,
  type CreateImageAdRequest,
  type CreateSlideshowRequest,
  type CreateUgcVideoRequest,
  type VideoProjectDTO,
} from '@shared/ugcContracts';

const EXPIRES_IN_MS = 14 * 24 * 60 * 60 * 1000;

interface PreviewProjectsState {
  projects: VideoProjectDTO[];
  version: number;
  addPreviewProject: (req: CreateUgcVideoRequest) => VideoProjectDTO;
  addCustomPreviewProject: (proj: Omit<VideoProjectDTO, 'id' | 'user_id' | 'refunded' | 'error' | 'created_at' | 'completed_at' | 'expires_at' | 'is_preview'>) => VideoProjectDTO;
  retryPreviewScene: (projectId: string, sceneIndex: number) => void;
  deletePreviewProject: (projectId: string) => void;
  bump: () => void;
}

const SEED_PREVIEW_PROJECTS: VideoProjectDTO[] = [
  {
    id: 'preview-seed-1',
    user_id: 'preview',
    mode: 'link',
    title: 'Sérum Facial Vitamina C Pura',
    status: 'done',
    engine: 'veo-3.1-fast',
    aspect_ratio: '9:16',
    duration_seconds: 16,
    scene_count: 2,
    cost: 20,
    refunded: 0,
    thumbnail_url: '/showcase/modelo-01.webp',
    video_url: null,
    is_preview: true,
    scenes: [
      { index: 0, text: 'Gente, eu precisava mostrar esse sérum que mudou a textura da minha pele.', status: 'done', duration_seconds: 8 },
      { index: 1, text: 'Em duas semanas já senti o brilho natural logo de manhã.', status: 'done', duration_seconds: 8 },
    ],
    error: null,
    created_at: '2026-11-15T18:00:00.000Z',
    completed_at: '2026-11-15T18:03:00.000Z',
    expires_at: new Date(Date.now() + EXPIRES_IN_MS).toISOString(),
  },
];

export const usePreviewProjects = create<PreviewProjectsState>()(
  persist(
    (set, get) => ({
      projects: SEED_PREVIEW_PROJECTS,
      version: 0,
      bump: () => set({ version: get().version + 1 }),
      addPreviewProject: (req) => {
        const now = Date.now();
        const cost = calculateUgcCost({ engine: req.engine ?? 'veo-3.1-fast', sceneCount: req.scenes.length, voiceType: req.voiceType });
        const proj: VideoProjectDTO = {
          id: `preview-${now}`,
          user_id: 'preview',
          mode: req.mode,
          origin: req.origin ?? 'projects',
          mediaType: req.mediaType ?? 'video',
          title: req.title,
          status: 'done',
          engine: req.engine ?? 'veo-3.1-fast',
          aspect_ratio: req.aspectRatio ?? '9:16',
          duration_seconds: req.scenes.reduce((s, x) => s + (x.durationSeconds ?? 8), 0),
          scene_count: req.scenes.length,
          cost,
          refunded: 0,
          thumbnail_url: req.avatarUrl || '/showcase/modelo-01.webp',
          video_url: null,
          is_preview: true,
          scenes: req.scenes.map((s, index) => ({
            index,
            text: s.text,
            action: s.action,
            status: 'done',
            duration_seconds: s.durationSeconds ?? 8,
          })),
          error: null,
          created_at: new Date(now).toISOString(),
          completed_at: new Date(now).toISOString(),
          expires_at: new Date(now + EXPIRES_IN_MS).toISOString(),
        };
        set({ projects: [proj, ...get().projects] });
        return proj;
      },
      addCustomPreviewProject: (partial) => {
        const now = Date.now();
        const proj: VideoProjectDTO = {
          ...partial,
          id: `preview-${now}`,
          user_id: 'preview',
          refunded: 0,
          is_preview: true,
          error: null,
          created_at: new Date(now).toISOString(),
          completed_at: new Date(now).toISOString(),
          expires_at: new Date(now + EXPIRES_IN_MS).toISOString(),
        };
        set({ projects: [proj, ...get().projects] });
        return proj;
      },
      retryPreviewScene: (projectId, sceneIndex) => {
        set({
          projects: get().projects.map((p) =>
            p.id !== projectId
              ? p
              : {
                  ...p,
                  status: 'done',
                  error: null,
                  scenes: p.scenes.map((s) => (s.index === sceneIndex ? { ...s, status: 'done', error: null } : s)),
                },
          ),
        });
      },
      deletePreviewProject: (projectId) => {
        set({ projects: get().projects.filter((p) => p.id !== projectId) });
      },
    }),
    {
      name: 'fd-preview-projects',
      partialize: (s) => ({ projects: s.projects }),
    },
  ),
);

export function useProjectsData(origin: 'projects' | 'avatar' = 'projects') {
  const preview = usePreviewProjects();
  const deletePreviewProject = usePreviewProjects((state) => state.deletePreviewProject);
  const userId = useSession((state) => state.session?.user.id);
  const [remote, setRemote] = useState<VideoProjectDTO[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (nextPage = 1, silent = false) => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const res = await api.listProjects(nextPage, 24, origin);
      setRemote((current) => nextPage === 1 ? res.projects : [...current, ...res.projects]);
      setPage(nextPage);
      setHasMore(res.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [origin]);

  const deleteProject = useCallback(async (project: VideoProjectDTO) => {
    if (project.is_preview || !isSupabaseConfigured) {
      deletePreviewProject(project.id);
      return;
    }
    await api.deleteProject(project.id);
    setRemote((current) => current.filter((item) => item.id !== project.id));
  }, [deletePreviewProject]);

  useEffect(() => {
    void load();
  }, [load, preview.version]);

  useEffect(() => {
    const client = supabase;
    if (!client || !userId) return;
    const channel = client
      .channel(`video-projects:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_projects', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const removed = payload.old as Pick<VideoProjectDTO, 'id'>;
            setRemote((projects) => projects.filter((project) => project.id !== removed.id));
            return;
          }
          const changed = payload.new as VideoProjectDTO;
          if ((changed.origin ?? 'projects') !== origin) return;
          setRemote((projects) => {
            const index = projects.findIndex((project) => project.id === changed.id);
            if (index === -1) return [changed, ...projects];
            const next = [...projects];
            next[index] = changed;
            return next;
          });
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, origin]);

  return {
    projects: isSupabaseConfigured ? remote : preview.projects.filter((project) => (project.origin ?? 'projects') === origin),
    loading,
    error,
    reload: () => load(1),
    loadMore: () => load(page + 1),
    deleteProject,
    hasMore,
  };
}

export function useCreateUgcProject() {
  const [busy, setBusy] = useState(false);
  const setBalance = useSession((s) => s.setBalance);
  const balance = useSession((s) => s.profile?.coins_balance ?? 0);
  const plan = useSession((s) => s.profile?.plan);
  const notify = useUi((s) => s.notify);
  const { addPreviewProject, addCustomPreviewProject, bump } = usePreviewProjects();

  async function runSubmission(
    cost: number,
    buildPreview: () => VideoProjectDTO,
    callRemote: () => Promise<{ project: VideoProjectDTO; balance: number }>,
    title: string,
    remoteToast: string,
  ): Promise<VideoProjectDTO | null> {
    if (!isSupabaseConfigured) {
      setBusy(true);
      const proj = buildPreview();
      setBusy(false);
      const destination = proj.origin === 'avatar' ? 'Avatar > Vídeos gerados' : 'Projetos';
      toast.success(`"${proj.title}" salvo em ${destination} (Prévia local — conecte o .env para gerar com IA real).`);
      notify({
        title: proj.origin === 'avatar' ? 'Vídeo adicionado em Avatar' : 'Projeto adicionado na prévia',
        description: `${proj.title} (${proj.scene_count} item(ns)). Conecte o .env para renderização real.`,
        kind: 'info',
      });
      return proj;
    }

    if (plan !== 'unlimited' && balance < cost) {
      toast.error(`Saldo insuficiente: você precisa de ${cost} créditos e tem ${balance}.`);
      return null;
    }

    setBusy(true);
    try {
      const res = await callRemote();
      setBalance(res.balance);
      bump();
      toast.success(remoteToast);
      notify({ title, description: `${res.project.title} salvo em Projetos.`, kind: 'success' });
      return res.project;
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : String(err);
      toast.error(msg);
      return null;
    } finally {
      setBusy(false);
    }
  }

  function createProject(req: CreateUgcVideoRequest) {
    const cost = calculateUgcCost({ engine: req.engine ?? 'veo-3.1-fast', sceneCount: req.scenes.length, voiceType: req.voiceType });
    const isAvatarCreation = req.origin === 'avatar';
    return runSubmission(
      cost,
      () => addPreviewProject(req),
      () => api.createUgcVideo(req),
      isAvatarCreation ? 'Vídeo salvo em Avatar' : 'Vídeo UGC iniciado',
      isAvatarCreation ? 'Vídeo de Avatar entrou em produção! Acompanhe em Avatar > Vídeos gerados.' : 'Projeto entrou em produção! Acompanhe na tela Projetos.',
    );
  }

  function createSlideshow(req: CreateSlideshowRequest, thumb = '/showcase/modelo-05.webp') {
    const cost = calculateImageBatchCost({ engine: req.engine, count: req.slides.length });
    return runSubmission(
      cost,
      () =>
        addCustomPreviewProject({
          mode: 'slideshow',
          title: req.title,
          status: 'done',
          engine: 'veo-3.1-fast',
          aspect_ratio: req.aspectRatio ?? '9:16',
          duration_seconds: req.slides.length * 3,
          scene_count: req.slides.length,
          cost,
          thumbnail_url: thumb,
          video_url: thumb,
          scenes: req.slides.map((s, index) => ({
            index,
            headline: s.headline,
            text: s.body || s.headline,
            status: 'done',
            duration_seconds: 3,
            image_url: thumb,
          })),
        }),
      () => api.createSlideshow(req),
      'Slideshow gerado',
      'Slideshow concluído e salvo em Projetos!',
    );
  }

  function createImageAd(req: CreateImageAdRequest, thumb = '/showcase/modelo-01.webp') {
    const cost = calculateImageBatchCost({ engine: req.engine, count: req.count ?? 1 });
    return runSubmission(
      cost,
      () =>
        addCustomPreviewProject({
          mode: 'image-ad',
          title: req.title,
          status: 'done',
          engine: 'veo-3.1-fast',
          aspect_ratio: req.aspectRatio ?? '1:1',
          duration_seconds: 1,
          scene_count: req.count ?? 1,
          cost,
          thumbnail_url: req.avatarUrl || thumb,
          video_url: req.avatarUrl || thumb,
          scenes: Array.from({ length: req.count ?? 1 }, (_, index) => ({
            index,
            headline: req.headline,
            text: `${req.productName} · ${req.ctaText ?? 'Garanta o seu'}`,
            status: 'done',
            duration_seconds: 1,
            image_url: req.avatarUrl || thumb,
          })),
        }),
      () => api.createImageAd(req),
      'Image Ads gerado',
      'Anúncio estático salvo em Projetos!',
    );
  }

  return { createProject, createSlideshow, createImageAd, busy };
}
