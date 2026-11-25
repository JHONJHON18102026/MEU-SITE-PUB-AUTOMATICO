/**
 * Estado da tela Influencer IA.
 *
 * Fica numa "caixinha" própria (zustand) porque o painel da esquerda, a barra
 * de prompt e a galeria precisam ler e escrever as mesmas escolhas.
 * As escolhas de criação ficam salvas no navegador: se a pessoa fechar a
 * aba, ao voltar encontra o personagem do jeito que deixou.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_SELECTION,
  ATTRIBUTE_GROUP_MAP,
  randomSelection,
  type AttributeGroupId,
  type AttributeSelection,
} from '@shared/attributes';
import type { AspectRatio, AvatarDTO, EngineId, FramingId } from '@shared/contracts';
import type { VideoEngineId } from '@shared/ugcContracts';
import type { PreparedImage } from '@/lib/image';

export type GalleryTab = 'explore' | 'mine';
export type ExploreSubTab = 'modelos' | 'comunidade';
export type PanelTab = 'create' | 'templates';
export type AvatarTemplateMode = 'image' | 'video';
export const MAX_PENDING_IMAGE_REQUESTS = 4;
export const MAX_PENDING_VIDEO_REQUESTS = 4;
export interface CustomAvatarTemplate {
  id: string;
  name: string;
  mode: AvatarTemplateMode;
  prompt: string;
  skillIds: string[];
}

interface AvatarStudioState {
  // painel de características
  panelTab: PanelTab;
  composerMode: 'image' | 'video';
  useInfluencerPreset: boolean;
  selection: AttributeSelection;
  extraDetails: string;
  characterWorld: string;
  basePhoto: PreparedImage | null;
  openGroups: AttributeGroupId[];
  // barra de prompt
  prompt: string;
  referenceImages: PreparedImage[];
  productImage: PreparedImage | null;
  baseAvatar: AvatarDTO | null;
  engine: EngineId;
  videoEngine: VideoEngineId;
  videoDurationSeconds: number;
  videoSubmit: (() => Promise<void>) | null;
  videoBusy: boolean;
  customTemplates: CustomAvatarTemplate[];
  framing: FramingId;
  aspectRatio: AspectRatio;
  count: number;
  attributeCount: number;
  videoCount: number;
  makePublic: boolean;
  // galeria
  tab: GalleryTab;
  exploreSub: ExploreSubTab;
  pendingCount: number;

  toggleOption: (group: AttributeGroupId, optionId: string) => void;
  toggleGroup: (group: AttributeGroupId) => void;
  randomize: () => void;
  resetSelection: () => void;
  set: (patch: Partial<AvatarStudioState>) => void;
  addReference: (img: PreparedImage) => void;
  removeReference: (index: number) => void;
}

const DIRECTOR_HANDOFF_KEY = 'fd-avatar-director-handoff-v1';
const DIRECTOR_HANDOFF_TTL_MS = 30 * 60 * 1000;

export type DirectorCanvasHandoff = Pick<AvatarStudioState,
  'tab' | 'panelTab' | 'composerMode' | 'useInfluencerPreset' | 'baseAvatar' | 'basePhoto' | 'productImage' | 'referenceImages' | 'prompt' | 'aspectRatio' | 'count' | 'videoCount' | 'videoEngine' | 'videoDurationSeconds'
> & { directorScene?: { action: string; text: string } };

function compactHandoffImage(image: PreparedImage | null): Omit<PreparedImage, 'previewUrl'> | null {
  if (!image) return null;
  return { mimeType: image.mimeType, data: image.data, name: image.name };
}

export function saveDirectorCanvasHandoff(payload: DirectorCanvasHandoff): void {
  if (typeof window === 'undefined') throw new Error('O armazenamento temporário não está disponível.');
  const compact = {
    ...payload,
    basePhoto: compactHandoffImage(payload.basePhoto),
    productImage: compactHandoffImage(payload.productImage),
    referenceImages: payload.referenceImages.map((image) => compactHandoffImage(image)).filter(Boolean),
  };
  try {
    window.sessionStorage.setItem(DIRECTOR_HANDOFF_KEY, JSON.stringify({ createdAt: Date.now(), payload: compact }));
  } catch {
    throw new Error('Não consegui preservar os anexos neste navegador. Tente reduzir o tamanho das imagens.');
  }
}

export function restoreDirectorCanvasHandoff(): DirectorCanvasHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.sessionStorage.getItem(DIRECTOR_HANDOFF_KEY);
    if (!stored) return null;
    const envelope = JSON.parse(stored) as { createdAt?: unknown; payload?: Record<string, unknown> };
    if (typeof envelope.createdAt !== 'number' || Date.now() - envelope.createdAt > DIRECTOR_HANDOFF_TTL_MS || !envelope.payload) {
      window.sessionStorage.removeItem(DIRECTOR_HANDOFF_KEY);
      return null;
    }
    const hydrate = (value: unknown): PreparedImage | null => {
      if (!value || typeof value !== 'object') return null;
      const image = value as { mimeType?: unknown; data?: unknown; name?: unknown };
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(String(image.mimeType)) || typeof image.data !== 'string' || typeof image.name !== 'string') return null;
      return { mimeType: image.mimeType as PreparedImage['mimeType'], data: image.data, name: image.name, previewUrl: 'data:' + image.mimeType + ';base64,' + image.data };
    };
    const payload = envelope.payload;
    const basePhoto = hydrate(payload.basePhoto);
    const productImage = hydrate(payload.productImage);
    const referenceImages = Array.isArray(payload.referenceImages) ? payload.referenceImages.map(hydrate).filter((image): image is PreparedImage => Boolean(image)) : [];
    if ((payload.basePhoto && !basePhoto) || (payload.productImage && !productImage) || typeof payload.prompt !== 'string') return null;
    return { ...payload, basePhoto, productImage, referenceImages } as DirectorCanvasHandoff;
  } catch {
    window.sessionStorage.removeItem(DIRECTOR_HANDOFF_KEY);
    return null;
  }
}

export function clearDirectorCanvasHandoff(): void {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(DIRECTOR_HANDOFF_KEY);
}

export const useAvatarStudio = create<AvatarStudioState>()(
  persist(
    (set, get) => ({
      panelTab: 'create',
      composerMode: 'image',
      useInfluencerPreset: false,
      selection: DEFAULT_SELECTION,
      extraDetails: '',
      characterWorld: '',
      basePhoto: null,
      openGroups: ['characterType'],
      prompt: '',
      referenceImages: [],
      productImage: null,
      baseAvatar: null,
      engine: 'nano-banana-2',
      videoEngine: 'omni-flash',
      videoDurationSeconds: 10,
      videoSubmit: null,
      videoBusy: false,
      customTemplates: [],
      framing: 'meio-corpo',
      aspectRatio: '9:16',
      count: 1,
      attributeCount: 1,
      videoCount: 1,
      makePublic: false,
      tab: 'explore',
      exploreSub: 'modelos',
      pendingCount: 0,

      toggleOption: (group, optionId) => {
        const multi = ATTRIBUTE_GROUP_MAP[group].multi;
        const current = get().selection[group] ?? [];
        let next: string[];
        if (current.includes(optionId)) next = current.filter((id) => id !== optionId);
        else next = multi ? [...current, optionId] : [optionId];
        set({ selection: { ...get().selection, [group]: next } });
      },
      toggleGroup: (group) => {
        const open = get().openGroups;
        set({ openGroups: open.includes(group) ? open.filter((g) => g !== group) : [...open, group] });
      },
      randomize: () => set({ selection: randomSelection() }),
      resetSelection: () =>
        set({
          selection: DEFAULT_SELECTION,
          extraDetails: '',
          characterWorld: '',
          basePhoto: null,
          baseAvatar: null,
          productImage: null,
          referenceImages: [],
          prompt: '',
          composerMode: 'image',
          useInfluencerPreset: false,
        }),
      set: (patch) => set(patch),
      addReference: (img) => set({ referenceImages: [...get().referenceImages, img].slice(0, 3) }),
      removeReference: (index) => set({ referenceImages: get().referenceImages.filter((_, i) => i !== index) }),
    }),
    {
      name: 'fd-avatar-studio',
      // Imagens em base64 não vão para o localStorage (ficariam pesadas demais).
      partialize: (s) => ({
        panelTab: s.panelTab,
        composerMode: s.composerMode,
        useInfluencerPreset: s.useInfluencerPreset,
        selection: s.selection,
        extraDetails: s.extraDetails,
        characterWorld: s.characterWorld,
        openGroups: s.openGroups,
        prompt: s.prompt,
        // Persistir o avatar selecionado mantém o rosto-base após voltar ou recarregar.
        // Fotos enviadas ficam fora porque carregam dados binários pesados.
        baseAvatar: s.baseAvatar,
        engine: s.engine,
        videoEngine: s.videoEngine,
        videoDurationSeconds: s.videoDurationSeconds,
        framing: s.framing,
        aspectRatio: s.aspectRatio,
        count: s.count,
        attributeCount: s.attributeCount,
        videoCount: s.videoCount,
        makePublic: s.makePublic,
        customTemplates: s.customTemplates,
      }),
    },
  ),
);
