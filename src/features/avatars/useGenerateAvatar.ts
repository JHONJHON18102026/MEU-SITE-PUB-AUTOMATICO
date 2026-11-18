/**
 * Ação "Gerar": monta o pedido a partir do estado da tela, chama a API,
 * atualiza saldo, galeria e notificações, e traduz erros para o usuário.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { avatarCost, type GenerateAvatarRequest, type AvatarDTO } from '@shared/contracts';
import { api, ApiClientError } from '@/lib/api';
import { prepareImageFromUrl } from '@/lib/image';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import { useAvatarStudio } from './avatarStore';
import { useGalleryVersion } from './useAvatarData';

const strip = (img: { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string } | null) =>
  img ? { mimeType: img.mimeType, data: img.data } : null;

export function useGenerateAvatar() {
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<AvatarDTO[]>([]);
  const setBalance = useSession((s) => s.setBalance);
  const balance = useSession((s) => s.profile?.coins_balance ?? 0);
  const plan = useSession((s) => s.profile?.plan);
  const notify = useUi((s) => s.notify);
  const bump = useGalleryVersion((s) => s.bump);

  async function generate(mode: 'attributes' | 'prompt') {
    if (!isSupabaseConfigured) {
      toast.info('Você está na prévia visual. Para gerar imagens reais com a IA, clique em "Ligar minhas chaves" no topo.');
      return;
    }
    const st = useAvatarStudio.getState();
    const cost = avatarCost(st.count);
    const hasAttr = Object.values(st.selection).some((v) => (v?.length ?? 0) > 0);
    const hasVisual = Boolean(st.basePhoto || st.baseAvatar || st.productImage);

    if (mode === 'prompt' && !st.prompt.trim() && !hasAttr && !hasVisual) {
      toast.error('Descreva o que você quer criar ou escolha características ao lado.');
      return;
    }
    if (plan !== 'unlimited' && balance < cost) {
      toast.error(`Saldo insuficiente: você tem ${balance} créditos e essa geração custa ${cost}.`);
      return;
    }

    setBusy(true);
    st.set({ pendingCount: st.count, tab: 'mine' });
    try {
      let basePhoto = strip(st.basePhoto);
      let baseAvatarId = st.baseAvatar?.id ?? null;
      if (!basePhoto && st.baseAvatar?.user_id === 'showcase') {
        const prepared = await prepareImageFromUrl(st.baseAvatar.image_url, `${st.baseAvatar.name}.jpg`);
        basePhoto = { mimeType: prepared.mimeType, data: prepared.data };
        baseAvatarId = null;
      }

      const payload: GenerateAvatarRequest = {
        mode,
        attributes: st.selection as Record<string, string[]>,
        extraDetails: st.extraDetails,
        characterWorld: st.characterWorld,
        prompt: st.prompt,
        basePhoto,
        baseAvatarId,
        productImage: strip(st.productImage),
        referenceImages: st.referenceImages.map((r) => ({ mimeType: r.mimeType, data: r.data })),
        engine: st.engine,
        framing: st.framing,
        aspectRatio: st.aspectRatio,
        count: st.count,
        makePublic: st.makePublic,
      };
      const res = await api.generateAvatar(payload);
      setBalance(res.balance);
      setLastResult(res.avatars);
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
      setBusy(false);
      useAvatarStudio.getState().set({ pendingCount: 0 });
    }
  }

  return { generate, busy, lastResult };
}
