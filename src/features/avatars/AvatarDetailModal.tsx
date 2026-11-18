import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Globe2, Lock, RefreshCcw, ScanFace, Trash2 } from 'lucide-react';
import type { AvatarDTO } from '@shared/contracts';
import { ATTRIBUTE_GROUPS, findOption, type AttributeGroupId, type AttributeSelection } from '@shared/attributes';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { downloadImage } from '@/lib/image';
import { useSession } from '@/store/session';
import { useAvatarStudio } from './avatarStore';
import { useGalleryVersion } from './useAvatarData';

export function AvatarDetailModal({ avatar, onClose }: { avatar: AvatarDTO | null; onClose: () => void }) {
  const userId = useSession((s) => s.session?.user.id);
  const bump = useGalleryVersion((s) => s.bump);
  const studio = useAvatarStudio();
  const [working, setWorking] = useState<string | null>(null);
  if (!avatar) return null;
  const mine = avatar.user_id === userId;
  const isShowcase = avatar.user_id === 'showcase';

  // Chave única por grupo+opção: "Verde" existe em olhos E em cabelo.
  const chips = ATTRIBUTE_GROUPS.flatMap((g) =>
    (avatar.attributes?.[g.id] ?? []).flatMap((id) => {
      const opt = findOption(g.id as AttributeGroupId, id);
      return opt ? [{ key: `${g.id}:${id}`, label: `${g.label}: ${opt.label}` }] : [];
    }),
  );

  async function togglePublic() {
    if (!supabase || !avatar) return;
    setWorking('public');
    const { error } = await supabase.from('avatars').update({ is_public: !avatar.is_public }).eq('id', avatar.id);
    setWorking(null);
    if (error) return toast.error(error.message);
    toast.success(avatar.is_public ? 'Agora só você vê este avatar.' : 'Avatar publicado na Comunidade.');
    bump();
    onClose();
  }

  async function remove() {
    if (!avatar) return;
    if (!window.confirm('Apagar este avatar? Não dá para desfazer.')) return;
    setWorking('delete');
    try {
      await api.deleteAvatar(avatar.id);
      toast.success('Avatar apagado.');
      bump();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não consegui apagar.');
    } finally {
      setWorking(null);
    }
  }

  function useAsBase() {
    if (!avatar) return;
    studio.set({ baseAvatar: avatar, basePhoto: null, tab: 'explore' });
    toast.success('Rosto definido como base. Descreva a cena e clique em GERAR.');
    onClose();
  }

  function recreate() {
    if (!avatar) return;
    studio.set({
      selection: (avatar.attributes ?? {}) as AttributeSelection,
      aspectRatio: (avatar.aspect_ratio as typeof studio.aspectRatio) ?? '9:16',
      framing: (avatar.framing as typeof studio.framing) || 'meio-corpo',
    });
    toast.success('Características carregadas no painel. Ajuste o que quiser e gere de novo.');
    onClose();
  }

  return (
    <Modal open={Boolean(avatar)} onClose={onClose} title={avatar.name} size="xl">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-2xl bg-surface-2">
          <img src={avatar.image_url} alt={avatar.name} className="mx-auto max-h-[70vh] w-auto object-contain" />
        </div>
        <div className="space-y-4">
          <div className="text-xs text-fg-subtle">
            {isShowcase
              ? `Modelo de referência · ${avatar.aspect_ratio}`
              : `Criado em ${new Date(avatar.created_at).toLocaleString('pt-BR')} · ${avatar.aspect_ratio} · ${avatar.engine}`}
          </div>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <span key={c.key} className="rounded-lg bg-surface-2 px-2 py-1 text-xs">{c.label}</span>
              ))}
            </div>
          )}
          {avatar.prompt && (
            <details className="rounded-xl border border-border p-3 text-xs text-fg-muted">
              <summary className="cursor-pointer font-semibold text-fg">Descrição usada</summary>
              <p className="mt-2 whitespace-pre-wrap">{avatar.prompt}</p>
            </details>
          )}
          <div className="grid gap-2">
            <Button variant="brand" onClick={useAsBase}><ScanFace className="size-4" /> Usar este rosto como base</Button>
            <Button variant="secondary" onClick={recreate}><RefreshCcw className="size-4" /> Recriar com estas características</Button>
            <Button variant="secondary" onClick={() => void downloadImage(avatar.image_url, `futuro-digital-${avatar.id.slice(0, 8)}.png`)}>
              <Download className="size-4" /> Baixar imagem
            </Button>
            {mine && (
              <>
                <Button variant="secondary" onClick={togglePublic} loading={working === 'public'}>
                  {avatar.is_public ? <Lock className="size-4" /> : <Globe2 className="size-4" />}
                  {avatar.is_public ? 'Tornar privado' : 'Publicar na Comunidade'}
                </Button>
                <Button variant="danger" onClick={remove} loading={working === 'delete'}>
                  <Trash2 className="size-4" /> Apagar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
