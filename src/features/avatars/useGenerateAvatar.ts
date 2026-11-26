/**
 * Ação "Gerar": monta o pedido a partir do estado da tela, chama a API,
 * atualiza saldo, galeria e notificações, e traduz erros para o usuário.
 */
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { MAX_IMAGES_PER_REQUEST, avatarCost, type GenerateAvatarRequest, type AvatarDTO } from '@shared/contracts';
import { api, ApiClientError } from '@/lib/api';
import { prepareImageFromUrl } from '@/lib/image';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import { clearDirectorCanvasHandoff, MAX_PENDING_IMAGE_REQUESTS, useAvatarStudio } from './avatarStore';
import { useGalleryVersion, useGenerations } from './useAvatarData';
import { CHARACTER_TYPES_WITH_STYLE_REFERENCE, findOption } from '@shared/attributes';

const strip = (img: { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string; name?: string } | null) =>
  img ? { mimeType: img.mimeType, data: img.data, name: img.name } : null;

export function useGenerateAvatar() {
  const pendingImagesRef = useRef(0);
  const [pendingImages, setPendingImages] = useState(0);
  const [lastResult, setLastResult] = useState<AvatarDTO[]>([]);
  const setBalance = useSession((s) => s.setBalance);
  const balance = useSession((s) => s.profile?.coins_balance ?? 0);
  const plan = useSession((s) => s.profile?.plan);
  const notify = useUi((s) => s.notify);
  const bump = useGalleryVersion((s) => s.bump);
  const generations = useGenerations();
  const persistedPendingImageCount = generations.data.reduce((count, generation) => {
    if (generation.kind !== 'avatar_image' || generation.status !== 'processing') return count;
    const requested = Number(generation.params?.count ?? 1);
    return count + Math.max(1, Math.min(MAX_IMAGES_PER_REQUEST, Number.isFinite(requested) ? Math.floor(requested) : 1));
  }, 0);
  const pendingImageRequests = Math.max(pendingImages, persistedPendingImageCount);

  async function generate(mode: 'attributes' | 'prompt') {
    if (!isSupabaseConfigured) {
      toast.info('Você está na prévia visual. Para gerar imagens reais com a IA, clique em "Ligar minhas chaves" no topo.');
      return;
    }
    const st = useAvatarStudio.getState();
    const pendingBeforeRequest = Math.max(pendingImagesRef.current, persistedPendingImageCount);
    const availableImageSlots = MAX_PENDING_IMAGE_REQUESTS - pendingBeforeRequest;
    if (availableImageSlots <= 0) {
      toast.info('Já existem 4 pedidos de imagem em andamento. Aguarde uma geração terminar.');
      return;
    }
    if (mode === 'attributes' && !st.useInfluencerPreset) {
      toast.info('Ative o painel Criar Influencer no compositor para validar este personagem.');
      return;
    }
    const desiredImageCount = mode === 'attributes'
      ? Math.max(1, Math.min(MAX_IMAGES_PER_REQUEST, Math.floor(st.attributeCount)))
      : st.count;
    const requestedImageCount = Math.max(1, Math.min(desiredImageCount, availableImageSlots));
    if (requestedImageCount < desiredImageCount) {
      toast.info(`Vou enviar ${requestedImageCount} imagem(ns), respeitando o limite de 4 imagens simultâneas.`);
    }
    const cost = avatarCost(requestedImageCount);
    const useInfluencerPreset = st.useInfluencerPreset;
    const hasAttr = useInfluencerPreset && Object.values(st.selection).some((v) => (v?.length ?? 0) > 0);
    const hasVisual = Boolean(st.basePhoto || st.baseAvatar || st.productImage || st.referenceImages.length);

    if (mode === 'prompt' && !st.prompt.trim() && !hasAttr && !hasVisual) {
      toast.error('Descreva o que você quer criar ou escolha características ao lado.');
      return;
    }
    if (plan !== 'unlimited' && balance < cost) {
      toast.error(`Saldo insuficiente: você tem ${balance} créditos e essa geração custa ${cost}.`);
      return;
    }

    // Reserve synchronously so clicks made before React rerenders cannot
    // exceed the four-request concurrency limit.
    pendingImagesRef.current += requestedImageCount;
    setPendingImages(pendingImagesRef.current);
    useAvatarStudio.getState().set({ pendingCount: useAvatarStudio.getState().pendingCount + requestedImageCount });
    bump();
    try {
      // A foto enviada pela lateral só influencia o canvas enquanto a chave
      // estiver ligada. Imagens escolhidas no slot INFLUENCER continuam válidas.
      let basePhoto = useInfluencerPreset ? strip(st.basePhoto) : null;
      let baseAvatarId = st.baseAvatar?.id ?? null;
      if (!basePhoto && st.baseAvatar?.user_id === 'showcase') {
        const prepared = await prepareImageFromUrl(st.baseAvatar.image_url, `${st.baseAvatar.name}.jpg`);
        basePhoto = { mimeType: prepared.mimeType, data: prepared.data, name: prepared.name };
        baseAvatarId = null;
      }

      // A miniatura da opção escolhida não era enviada ao motor: ela só
      // aparecia no seletor. Envie-a como referência de estilo, separada da
      // foto de identidade enviada pela pessoa.
      const characterTypeId = useInfluencerPreset ? st.selection.characterType?.[0] : undefined;
      const characterTypeOption = characterTypeId ? findOption('characterType', characterTypeId) : undefined;
      let preparedCharacterStyleReference: GenerateAvatarRequest['characterStyleReference'] = null;
      if (characterTypeId && CHARACTER_TYPES_WITH_STYLE_REFERENCE.has(characterTypeId) && characterTypeOption?.image) {
        const prepared = await prepareImageFromUrl(characterTypeOption.image, `referencia-estilo-${characterTypeId}.jpg`);
        preparedCharacterStyleReference = { mimeType: prepared.mimeType, data: prepared.data, name: prepared.name };
      }

      const payload: GenerateAvatarRequest = {
        mode,
        attributes: (useInfluencerPreset ? st.selection : {}) as Record<string, string[]>,
        extraDetails: useInfluencerPreset ? st.extraDetails : '',
        characterWorld: useInfluencerPreset ? st.characterWorld : '',
        prompt: st.prompt,
        basePhoto,
        baseAvatarId,
        characterStyleReference: preparedCharacterStyleReference,
        productImage: strip(st.productImage),
        referenceImages: st.referenceImages.map((r) => ({ mimeType: r.mimeType, data: r.data, name: r.name })),
        engine: st.engine,
        framing: st.framing,
        aspectRatio: st.aspectRatio,
        count: requestedImageCount,
        makePublic: useInfluencerPreset && st.makePublic,
      };
      const res = await api.generateAvatar(payload);
      clearDirectorCanvasHandoff();
      setBalance(res.balance);
      setLastResult(res.avatars);
      // O resultado recém-criado vira imediatamente o personagem ativo para
      // que a próxima ação possa ser "Criar vídeo com este avatar" sem exigir
      // que o usuário volte à galeria e o selecione manualmente.
      if (mode === 'attributes' && res.avatars[0]) {
        useAvatarStudio.getState().set({ baseAvatar: res.avatars[0], basePhoto: null, tab: 'explore' });
      }
      bump();
      const msg =
        res.refunded > 0
          ? `${res.avatars.length} pronta(s). ${res.refunded} créditos devolvidos pelas que falharam.`
          : `${res.avatars.length} imagem(ns) pronta(s) com a marca FUTURO DIGITAL.`;
      toast.success(msg);
      notify({ title: 'Influencer pronto', description: msg, kind: 'success' });
    } catch (err) {
      const e = err instanceof ApiClientError ? err : new ApiClientError('INTERNAL', String(err));
      toast.error(e.message);
      notify({ title: 'Geração não concluída', description: e.message, kind: 'error' });
      // O servidor já estornou; recarrega o saldo real.
      void useSession.getState().refreshProfile();
      bump();
    } finally {
      pendingImagesRef.current = Math.max(0, pendingImagesRef.current - requestedImageCount);
      setPendingImages(pendingImagesRef.current);
      const current = useAvatarStudio.getState();
      current.set({ pendingCount: Math.max(0, current.pendingCount - requestedImageCount) });
    }
  }

  return {
    generate,
    // O painel só bloqueia quando os quatro slots da fila estão ocupados.
    // Pedidos abaixo do limite podem continuar sendo enviados em paralelo.
    busy: pendingImageRequests >= MAX_PENDING_IMAGE_REQUESTS,
    pendingRequests: pendingImageRequests,
    lastResult,
  };
}
