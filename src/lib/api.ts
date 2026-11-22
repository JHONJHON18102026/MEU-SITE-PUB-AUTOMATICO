/**
 * Chamadas para a nossa API (/api/...), sempre com o token do usuário.
 * Erros chegam como ApiClientError com um código fixo (ex.: INSUFFICIENT_CREDITS).
 */
import type { ApiErrorBody, ApiErrorCode, GenerateAvatarRequest, GenerateAvatarResponse } from '@shared/contracts';
import type {
  CreateImageAdRequest,
  CreateSlideshowRequest,
  CreateUgcVideoRequest,
  GenerateBrandbookRequest,
  GenerateHooksRequest,
  GenerateManifestRequest,
  GenerateSlidesRequest,
  StudioAccountDTO,
  StudioBrandProjectDTO,
  StudioBrandbookDTO,
  StudioScheduledPostDTO,
  VideoProjectDTO,
  ViralFolderDTO,
  ViralItemDTO,
  ViralManifestDTO,
} from '@shared/ugcContracts';
import { supabase } from './supabase';
import type { DirectorPlan, DirectorPlanRequest } from '@shared/directorContracts';
import type { AvatarTemplateDTO, AvatarTemplateInput } from '@shared/avatarTemplateContracts';

export type { DirectorPlan, DirectorPlanRequest } from '@shared/directorContracts';

export class ApiClientError extends Error {
  readonly code: ApiErrorCode | 'NETWORK';
  constructor(code: ApiErrorCode | 'NETWORK', message: string) {
    super(message);
    this.code = code;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(await authHeader()), ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiClientError('NETWORK', 'Sem conexão com o servidor. Confira se o "npm run dev" está rodando.');
  }
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiClientError(err?.code ?? 'INTERNAL', err?.message ?? `Erro ${res.status} no servidor.`);
  }
  return body as T;
}

export interface HealthResponse {
  ok: boolean;
  missing: string[];
  models: { image: string; imagePro: string; text: string } | null;
  modelError: string | null;
}

export interface ScriptOptionDTO {
  id: string;
  title: string;
  script: string;
  scenes: { index: number; text: string; estimatedSeconds: number }[];
}

export const api = {
  health: () => request<HealthResponse>('/health'),
  generateAvatar: (payload: GenerateAvatarRequest) =>
    request<GenerateAvatarResponse>('/avatars/generate', { method: 'POST', body: JSON.stringify(payload) }),
  listAvatars: (scope: 'mine' | 'community') =>
    request<{ avatars: import('@shared/contracts').AvatarDTO[] }>(`/avatars/gallery?scope=${scope}`),
  enhancePrompt: (prompt: string) =>
    request<{ prompt: string }>('/prompt/enhance', { method: 'POST', body: JSON.stringify({ prompt }) }),
  createDirectorPlan: (payload: DirectorPlanRequest) =>
    request<{ plan: DirectorPlan }>('/director/plan', { method: 'POST', body: JSON.stringify(payload) }),
  deleteAvatar: (id: string) => request<{ ok: true }>(`/avatars/${id}`, { method: 'DELETE' }),
  listAvatarTemplates: () => request<{ templates: AvatarTemplateDTO[] }>('/avatars/templates'),
  createAvatarTemplate: (payload: AvatarTemplateInput) =>
    request<{ template: AvatarTemplateDTO }>('/avatars/templates', { method: 'POST', body: JSON.stringify(payload) }),
  deleteAvatarTemplate: (id: string) => request<{ ok: true }>(`/avatars/templates/${id}`, { method: 'DELETE' }),
  extractProductLink: (url: string) =>
    request<{ name: string; description: string; imageUrl: string | null; highlights: string[] }>('/ai-ugc/extract-link', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  generateUgcScripts: (payload: {
    mode: 'ads' | 'link' | 'talking';
    productName: string;
    productDescription?: string;
    platform?: string;
    tone?: string;
    audience?: string;
    language?: string;
    sceneCount?: number;
  }) => request<{ options: ScriptOptionDTO[] }>('/ai-ugc/generate-script', { method: 'POST', body: JSON.stringify(payload) }),
  generateHooks: (payload: GenerateHooksRequest) =>
    request<{ hooks: string[] }>('/ai-ugc/generate-hooks', { method: 'POST', body: JSON.stringify(payload) }),
  generateSlides: (payload: GenerateSlidesRequest) =>
    request<{ slides: { headline: string; body: string; visualPrompt: string }[] }>('/ai-ugc/generate-slides', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createUgcVideo: (payload: CreateUgcVideoRequest) =>
    request<{ project: VideoProjectDTO; balance: number }>('/ai-ugc/create', { method: 'POST', body: JSON.stringify(payload) }),
  createSlideshow: (payload: CreateSlideshowRequest) =>
    request<{ project: VideoProjectDTO; balance: number }>('/ai-ugc/create-slideshow', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createImageAd: (payload: CreateImageAdRequest) =>
    request<{ project: VideoProjectDTO; balance: number }>('/ai-ugc/create-image-ad', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listProjects: (page = 1, limit = 24, origin: 'projects' | 'avatar' = 'projects') =>
    request<{ projects: VideoProjectDTO[]; page: number; limit: number; hasMore: boolean }>(`/projects?page=${page}&limit=${limit}&origin=${origin}`),
  retryProjectScene: (projectId: string, sceneIndex: number) =>
    request<{ project: VideoProjectDTO; balance: number }>(`/projects/${projectId}/retry-scene`, {
      method: 'POST',
      body: JSON.stringify({ sceneIndex }),
    }),
  deleteProject: (projectId: string) => request<{ ok: true }>(`/projects/${projectId}`, { method: 'DELETE' }),
  listViralLibrary: () => request<{ folders: ViralFolderDTO[]; items: ViralItemDTO[] }>('/viral/folders'),
  createViralFolder: (name: string, formats: string[] = ['Remake Viral']) =>
    request<{ folder: ViralFolderDTO }>('/viral/folders', { method: 'POST', body: JSON.stringify({ name, formats }) }),
  updateViralFolder: (id: string, patch: { name?: string; formats?: string[] }) =>
    request<{ folder: ViralFolderDTO }>(`/viral/folders/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteViralFolder: (id: string) => request<{ ok: true }>(`/viral/folders/${id}`, { method: 'DELETE' }),
  importViralItem: (payload: {
    folderId: string;
    title?: string;
    url?: string;
    platform?: string;
    niche?: string;
    durationSec?: number;
    thumbnailUrl?: string;
  }) => request<{ item: ViralItemDTO }>('/viral/items', { method: 'POST', body: JSON.stringify(payload) }),
  deleteViralItem: (id: string) => request<{ ok: true }>(`/viral/items/${id}`, { method: 'DELETE' }),
  generateViralManifest: (payload: GenerateManifestRequest) =>
    request<{ manifest: ViralManifestDTO }>('/viral/manifest', { method: 'POST', body: JSON.stringify(payload) }),
  getStudioState: () =>
    request<{ projects: StudioBrandProjectDTO[]; accounts: StudioAccountDTO[]; posts: StudioScheduledPostDTO[] }>('/studio/state'),
  generateBrandbook: (payload: GenerateBrandbookRequest) =>
    request<{ brandbook: StudioBrandbookDTO }>('/studio/brandbook', { method: 'POST', body: JSON.stringify(payload) }),
  createStudioProject: (payload: { name: string; niche: string; productName: string; brandbook?: StudioBrandbookDTO }) =>
    request<{ project: StudioBrandProjectDTO }>('/studio/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateStudioProject: (id: string, patch: Partial<StudioBrandProjectDTO>) =>
    request<{ project: StudioBrandProjectDTO }>(`/studio/projects/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteStudioProject: (id: string) => request<{ ok: true }>(`/studio/projects/${id}`, { method: 'DELETE' }),
  createStudioAccount: (payload: {
    projectId: string;
    handle: string;
    platform: 'TikTok' | 'Instagram Reels' | 'YouTube Shorts';
    stage?: string;
    tiktokShop?: boolean;
    autoWarmup?: boolean;
    avatarUrl?: string;
  }) => request<{ account: StudioAccountDTO }>('/studio/accounts', { method: 'POST', body: JSON.stringify(payload) }),
  updateStudioAccount: (id: string, patch: Partial<StudioAccountDTO>) =>
    request<{ account: StudioAccountDTO }>(`/studio/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteStudioAccount: (id: string) => request<{ ok: true }>(`/studio/accounts/${id}`, { method: 'DELETE' }),
  createStudioPost: (payload: {
    projectId: string;
    accountId: string;
    videoProjectId?: string;
    title: string;
    captionStyle: string;
    trimFooter: boolean;
    normalizeVoice: boolean;
    scheduledFor: string;
    thumbnailUrl?: string;
  }) => request<{ post: StudioScheduledPostDTO }>('/studio/posts', { method: 'POST', body: JSON.stringify(payload) }),
  deleteStudioPost: (id: string) => request<{ ok: true }>(`/studio/posts/${id}`, { method: 'DELETE' }),
};
