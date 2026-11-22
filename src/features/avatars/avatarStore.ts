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
import type { PreparedImage } from '@/lib/image';

export type GalleryTab = 'explore' | 'history' | 'mine';
export type ExploreSubTab = 'modelos' | 'comunidade';
export type PanelTab = 'create' | 'motion';

interface AvatarStudioState {
  // painel de características
  panelTab: PanelTab;
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
  framing: FramingId;
  aspectRatio: AspectRatio;
  count: number;
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

export const useAvatarStudio = create<AvatarStudioState>()(
  persist(
    (set, get) => ({
      panelTab: 'create',
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
      framing: 'meio-corpo',
      aspectRatio: '9:16',
      count: 1,
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
        selection: s.selection,
        extraDetails: s.extraDetails,
        characterWorld: s.characterWorld,
        openGroups: s.openGroups,
        prompt: s.prompt,
        // O avatar salvo é só metadado + URL; persistir mantém o rosto-base ao voltar.
        // Fotos enviadas ficam fora porque carregam dados binários pesados.
        baseAvatar: s.baseAvatar,
        engine: s.engine,
        framing: s.framing,
        aspectRatio: s.aspectRatio,
        count: s.count,
        makePublic: s.makePublic,
      }),
    },
  ),
);
