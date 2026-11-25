import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Download, Globe2, Lock, RefreshCcw, ScanFace, Trash2 } from 'lucide-react';
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

export function AvatarDetailModal({ avatar, onClose, items = [], onNavigate }: { avatar: AvatarDTO | null; onClose: () => void; items?: AvatarDTO[]; onNavigate?: (avatar: AvatarDTO) => void }) {
  const userId = useSession((s) => s.session?.user.id);
  const bump = useGalleryVersion((s) => s.bump);
  const studio = useAvatarStudio();
  const [working, setWorking] = useState<string | null>(null);
  const [generationParams, setGenerationParams] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    let current = true;
    setGenerationParams(null);
    if (!supabase || !avatar?.generation_id) return () => { current = false; };
    void supabase
      .from('generations')
      .select('params')
      .eq('id', avatar.generation_id)
      .maybeSingle()
      .then(({ data }) => {
        if (current && data?.params && typeof data.params === 'object') setGenerationParams(data.params as Record<string, unknown>);
      });
    return () => { current = false; };
  }, [avatar?.generation_id]);
  if (!avatar) return null;
  const currentIndex = items.findIndex((item) => item.id === avatar.id);
  const canNavigate = currentIndex >= 0 && items.length > 1 && Boolean(onNavigate);
  const mine = avatar.user_id === userId;
  const isShowcase = avatar.user_id === 'showcase';

  // Chave única por grupo+opção: "Verde" existe em olhos E em cabelo.
  const chips = ATTRIBUTE_GROUPS.flatMap((g) =>
    (avatar.attributes?.[g.id] ?? []).flatMap((id) => {
      const opt = findOption(g.id as AttributeGroupId, id);
      return opt ? [{ key: `${g.id}:${id}`, label: `${g.label}: ${opt.label}` }] : [];
    }),
  );
  const generationAsset = (value: unknown) => value && typeof value === 'object' ? value as Record<string, unknown> : null;
  const basePhoto = generationAsset(generationParams?.basePhoto);
  const productImage = generationAsset(generationParams?.productImage);
  const references = Array.isArray(generationParams?.referenceImages)
    ? generationParams.referenceImages.map(generationAsset).filter((x): x is Record<string, unknown> => Boolean(x))
    : [];

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

  function animateAvatar() {
    if (!avatar) return;
    studio.set({ baseAvatar: avatar, basePhoto: null, panelTab: 'templates', tab: 'explore' });
    toast.success(`Avatar "${avatar.name}" pronto para usar em um template.`);
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
        <div className="relative overflow-hidden rounded-2xl bg-surface-2">
          <img src={avatar.image_url} alt={avatar.name} className="mx-auto max-h-[70vh] w-auto object-contain" />
          {canNavigate && <>
            <button type="button" onClick={() => onNavigate?.(items[currentIndex - 1]!)} disabled={currentIndex === 0} aria-label="Imagem anterior" title="Imagem anterior" className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/65 text-white shadow-lg backdrop-blur transition hover:bg-black/85 disabled:pointer-events-none disabled:opacity-35">
              <ArrowLeft className="size-5" />
            </button>
            <button type="button" onClick={() => onNavigate?.(items[currentIndex + 1]!)} disabled={currentIndex === items.length - 1} aria-label="Próxima imagem" title="Próxima imagem" className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/65 text-white shadow-lg backdrop-blur transition hover:bg-black/85 disabled:pointer-events-none disabled:opacity-35">
              <ArrowRight className="size-5" />
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">{currentIndex + 1} / {items.length}</span>
          </>}
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
            <details open className="rounded-xl border border-border p-3 text-xs text-fg-muted">
              <summary className="cursor-pointer font-semibold text-fg">Descrição usada</summary>
              <p className="mt-2 whitespace-pre-wrap">{avatar.prompt}</p>
            </details>
          )}
          {avatar.generation_id && (
            <details open className="rounded-xl border border-border p-3 text-xs text-fg-muted" data-testid="used-generation-details">
              <summary className="cursor-pointer font-semibold text-fg">Tudo que foi usado</summary>
              {generationParams ? (
                <dl className="mt-2 space-y-1.5">
                  <UsedValue label="Modo" value={generationParams.mode} />
                  <UsedValue label="Motor" value={generationParams.engine ?? avatar.engine} />
                  <UsedValue label="Enquadramento" value={generationParams.framing ?? avatar.framing} />
                  <UsedValue label="Proporção" value={generationParams.aspectRatio ?? avatar.aspect_ratio} />
                  <UsedValue label="Variações" value={generationParams.count} />
                  <UsedValue label="Foto base" value={basePhoto ? basePhoto.name ?? 'Foto base enviada' : generationParams.hasBasePhoto ? 'Foto base usada' : generationParams.baseAvatarId ? 'Avatar existente usado como base' : 'Nenhuma'} />
                  <UsedValue label="Produto" value={productImage ? productImage.name ?? 'Imagem de produto enviada' : generationParams.hasProduct ? 'Imagem de produto usada' : 'Nenhum'} />
                  <UsedValue label="Referências" value={references.length ? references.map((item, index) => String(item.name ?? `Referência ${index + 1}`)).join(', ') : generationParams.referenceCount ? `${generationParams.referenceCount} referência(s) usada(s)` : 'Nenhuma'} />
                  <UsedValue label="Detalhes extras" value={generationParams.extraDetails} />
                  <UsedValue label="Mundo do personagem" value={generationParams.characterWorld} />
                  <UsedValue label="Compartilhamento" value={generationParams.makePublic === true ? 'Pública na comunidade' : generationParams.makePublic === false ? 'Privada' : undefined} />
                </dl>
              ) : (
                <p className="mt-2">Carregando os dados da geração…</p>
              )}
            </details>
          )}
          <div className="grid gap-2">
            <Button variant="brand" onClick={useAsBase}><ScanFace className="size-4" /> Usar este rosto como base</Button>
            <Button variant="brand" onClick={animateAvatar}><ScanFace className="size-4" /> Criar vídeo com este avatar</Button>
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

function UsedValue({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2">
      <dt className="font-semibold text-fg-muted">{label}</dt>
      <dd className="min-w-0 break-words text-fg">{String(value)}</dd>
    </div>
  );
}
