import { useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Cpu, Film, Image as ImageIcon, Minus, Plus, RectangleVertical, ScanFace, Sparkles, Wand2, X } from 'lucide-react';
import {
  ASPECT_RATIOS,
  ENGINES,
  FRAMINGS,
  MAX_IMAGES_PER_REQUEST,
  MAX_REFERENCE_IMAGES,
  avatarCost,
  type AspectRatio,
  type EngineId,
  type FramingId,
} from '@shared/contracts';
import { PillSelect } from '@/components/ui/PillSelect';
import { CoinIcon } from '@/components/ui/Brand';
import { api, ApiClientError } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAvatarStudio } from './avatarStore';
import { ImagePicker } from './ImagePicker';
import { AvatarPickerModal } from './AvatarPickerModal';

function Slot({
  label,
  preview,
  highlight,
  onClear,
  children,
}: {
  label: string;
  preview: string | null;
  highlight?: boolean;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'relative min-h-[84px] w-[76px] shrink-0 self-stretch overflow-hidden rounded-xl bg-surface-2/85 ring-1 ring-inset transition',
        highlight ? 'ring-accent ring-brand' : 'ring-border hover:ring-fg-subtle/50',
      )}
    >
      {preview ? (
        <>
          <img src={preview} alt={label} className="h-full w-full object-cover object-top" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
          <button
            onClick={onClear}
            className="absolute right-1.5 top-1.5 rounded-full bg-black/75 p-0.5 text-white hover:bg-black"
            aria-label={`Remover ${label.toLowerCase()}`}
          >
            <X className="size-3.5" />
          </button>
          <span className="pointer-events-none absolute bottom-1.5 left-2 text-[10px] font-black uppercase tracking-wide text-white">
            {label}
          </span>
        </>
      ) : (
        <>
          {children}
          <span className="pointer-events-none absolute bottom-2 left-2 text-[11px] font-black uppercase tracking-wide text-fg">
            {label}
          </span>
        </>
      )}
    </div>
  );
}

export function PromptComposer({ onGenerate, busy, highlightProduct }: { onGenerate: () => void; busy: boolean; highlightProduct?: boolean }) {
  const st = useAvatarStudio();
  const [media, setMedia] = useState<'image' | 'video'>('image');
  const [enhancing, setEnhancing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const cost = avatarCost(st.count);
  const avatarSlotPreview = st.baseAvatar?.image_url ?? st.basePhoto?.previewUrl ?? null;

  async function enhance() {
    if (!isSupabaseConfigured) {
      toast.info('Você está na prévia visual. Para melhorar textos com a IA, ligue suas chaves no .env.');
      return;
    }
    setEnhancing(true);
    try {
      const { prompt } = await api.enhancePrompt(st.prompt);
      st.set({ prompt });
      toast.success('Descrição melhorada pela IA.');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Não consegui melhorar agora.');
    } finally {
      setEnhancing(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-surface/95 p-2 text-left shadow-xl shadow-black/25 backdrop-blur sm:flex-row"
      data-testid="prompt-composer"
    >
      {/* Imagem / Vídeo — coluna vertical estilo Influai */}
      <div className="flex shrink-0 gap-1 sm:w-[70px] sm:flex-col" role="tablist" aria-label="Tipo de criação">
        {(
          [
            ['image', 'Imagem', ImageIcon],
            ['video', 'Vídeo', Film],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={media === id}
            onClick={() => {
              if (id === 'video') toast.info('Para vídeos com este avatar, use a aba Motion ou AI UGC -> Falante.');
              else setMedia(id);
            }}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition sm:flex-col',
              media === id ? 'bg-surface-3 text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Caixa central: Prompt + Barra de controles em uma única faixa limpa */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 rounded-xl bg-surface-2/80 p-2.5">
        <textarea
          value={st.prompt}
          onChange={(e) => st.set({ prompt: e.target.value })}
          maxLength={2000}
          rows={2}
          aria-label="Descreva o que você quer criar"
          placeholder="Descreva o que você quer criar… ex.: tomando o suplemento na cozinha, luz da manhã"
          className="min-h-[44px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-fg-subtle"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onGenerate();
          }}
        />

        {st.referenceImages.length > 0 && (
          <div className="flex gap-2 pb-1">
            {st.referenceImages.map((r, i) => (
              <div key={i} className="relative">
                <img src={r.previewUrl} alt={`Referência ${i + 1}`} className="size-11 rounded-lg object-cover" />
                <button
                  onClick={() => st.removeReference(i)}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-black/80 p-0.5 text-white"
                  aria-label={`Remover referência ${i + 1}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1 xl:flex-nowrap">
          <ImagePicker
            label={`Adicionar imagem de referência (até ${MAX_REFERENCE_IMAGES})`}
            testId="reference-input"
            disabled={st.referenceImages.length >= MAX_REFERENCE_IMAGES}
            onPicked={st.addReference}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-3/70 hover:text-fg disabled:opacity-40"
          >
            <Plus className="size-3.5" />
          </ImagePicker>
          <PillSelect<EngineId>
            label="Motor de criação"
            icon={<Cpu className="size-3.5 text-accent dark:text-indigo-400" />}
            value={st.engine}
            onChange={(engine) => st.set({ engine })}
            options={ENGINES.map((e) => ({ value: e.id, label: e.label, hint: e.description }))}
          />
          <PillSelect<FramingId>
            label="Enquadramento"
            icon={<ScanFace className="size-3.5" />}
            value={st.framing}
            onChange={(framing) => st.set({ framing })}
            options={FRAMINGS.map((f) => ({ value: f.id, label: f.label }))}
          />
          <PillSelect<AspectRatio>
            label="Proporção"
            icon={<RectangleVertical className="size-3.5" />}
            value={st.aspectRatio}
            onChange={(aspectRatio) => st.set({ aspectRatio })}
            options={ASPECT_RATIOS.map((r) => ({
              value: r,
              label: r,
              hint: r === '9:16' ? 'Reels, TikTok, Stories' : r === '1:1' ? 'Feed quadrado' : r === '16:9' ? 'YouTube' : undefined,
            }))}
          />
          <div className="flex h-7 shrink-0 items-center gap-0.5 rounded-lg px-0.5 text-[11px] font-semibold text-fg-muted" aria-label="Quantidade de imagens">
            <button
              onClick={() => st.set({ count: Math.max(1, st.count - 1) })}
              className="rounded p-1 hover:bg-surface-3/70 hover:text-fg"
              aria-label="Menos imagens"
            >
              <Minus className="size-3" />
            </button>
            <span className="w-6 text-center tabular-nums" data-testid="image-count">{st.count}/{MAX_IMAGES_PER_REQUEST}</span>
            <button
              onClick={() => st.set({ count: Math.min(MAX_IMAGES_PER_REQUEST, st.count + 1) })}
              className="rounded p-1 hover:bg-surface-3/70 hover:text-fg"
              aria-label="Mais imagens"
            >
              <Plus className="size-3" />
            </button>
          </div>
          <button
            onClick={enhance}
            disabled={st.prompt.trim().length < 3 || enhancing}
            title={st.prompt.trim().length < 3 ? 'Escreva a ideia primeiro' : 'A IA reescreve sua ideia com mais detalhes'}
            className="ml-auto flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-[11px] font-semibold text-accent transition hover:bg-accent-soft dark:text-indigo-300 disabled:opacity-40"
          >
            <Wand2 className={clsx('size-3.5', enhancing && 'animate-pulse')} />
            {enhancing ? 'Melhorando…' : 'Melhorar'}
          </button>
        </div>
      </div>

      {/* Slots AVATAR, PRODUTO e CTA GERAR idênticos ao Influai (apenas '+' no círculo superior) */}
      <div className="flex shrink-0 items-stretch justify-end gap-2">
        <Slot
          label="AVATAR"
          preview={avatarSlotPreview}
          onClear={() => st.set({ baseAvatar: null, basePhoto: null })}
        >
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="absolute inset-0 transition hover:bg-surface-3/60"
            aria-label="Escolher avatar"
          >
            <span className="pointer-events-none absolute left-2 top-2 flex size-6 items-center justify-center rounded-full border border-fg/25 text-fg-muted">
              <Plus className="size-3.5" />
            </span>
          </button>
        </Slot>
        <Slot
          label="PRODUTO"
          highlight={highlightProduct}
          preview={st.productImage?.previewUrl ?? null}
          onClear={() => st.set({ productImage: null })}
        >
          <ImagePicker
            label="Escolher produto"
            testId="product-input"
            onPicked={(img) => st.set({ productImage: img })}
            className="absolute inset-0 transition hover:bg-surface-3/60"
          >
            <span className="pointer-events-none absolute left-2 top-2 flex size-6 items-center justify-center rounded-full border border-fg/25 text-fg-muted">
              <Plus className="size-3.5" />
            </span>
          </ImagePicker>
        </Slot>
        <button
          onClick={onGenerate}
          disabled={busy}
          data-testid="generate-from-prompt"
          className="flex min-h-[84px] w-[96px] shrink-0 flex-col items-center justify-center gap-1 self-stretch rounded-xl bg-brand text-sm font-black uppercase tracking-wide text-white glow-brand transition hover:brightness-110 disabled:opacity-60"
        >
          <span>{busy ? '…' : 'GERAR'}</span>
          <span className="inline-flex items-center gap-1 text-xs font-bold normal-case">
            <Sparkles className="size-3.5" />
            <CoinIcon className="size-3.5" />
            {cost}
          </span>
        </button>
      </div>

      <AvatarPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(avatar) => {
          st.set({ baseAvatar: avatar, basePhoto: null });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
