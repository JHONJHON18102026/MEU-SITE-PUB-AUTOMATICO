import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Check, Cpu, Expand, Film, Image as ImageIcon, LoaderCircle, Minus, Plus, RectangleVertical, ScanFace, Sparkles, Wand2, X } from 'lucide-react';
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
import { VIDEO_ENGINES, type VideoEngineId } from '@shared/ugcContracts';
import { PillSelect } from '@/components/ui/PillSelect';
import { CoinIcon } from '@/components/ui/Brand';
import { api, ApiClientError } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { MAX_PENDING_IMAGE_REQUESTS, MAX_PENDING_VIDEO_REQUESTS, useAvatarStudio } from './avatarStore';
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
            <span className="pointer-events-none absolute inset-x-2 bottom-1.5 truncate text-[10px] font-black uppercase tracking-wide text-white">
            {label}
          </span>
        </>
      ) : (
        <>
          {children}
          <span className="pointer-events-none absolute inset-x-2 bottom-2 truncate text-[10px] font-black uppercase tracking-wide text-fg">
            {label}
          </span>
        </>
      )}
    </div>
  );
}

export function PromptComposer({ onGenerate, onVideo, pendingImageRequests = 0, pendingVideoRequests = 0, highlightProduct }: { onGenerate: () => void; onVideo: () => void; pendingImageRequests?: number; pendingVideoRequests?: number; highlightProduct?: boolean }) {
  const st = useAvatarStudio();
  const media = st.composerMode;
  const [enhancing, setEnhancing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const expandedPromptRef = useRef<HTMLTextAreaElement>(null);
  const cost = avatarCost(st.count);
  const videoBusy = st.videoBusy;
  // Foto enviada é só referência de criação; o slot INFLUENCER recebe a imagem
  // depois da validação (baseAvatar) ou quando a pessoa escolhe um avatar pronto.
  const avatarSlotPreview = st.baseAvatar?.image_url ?? null;
  const activeMedia = media;
  const generationCount = activeMedia === 'image' ? st.count : st.videoCount;
  const countLabel = activeMedia === 'image' ? 'imagens' : 'vídeos';

  useEffect(() => {
    if (!promptExpanded) return;
    expandedPromptRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPromptExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [promptExpanded]);

  function openVideoTemplates() {
    st.set({ composerMode: 'video', panelTab: 'templates' });
    onVideo();
  }

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
    <>
    <div
      className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-surface/95 p-2 text-left shadow-xl shadow-black/25 backdrop-blur sm:flex-row"
      data-testid="prompt-composer"
    >
      {/* Imagem / Vídeo — coluna vertical. */}
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
            aria-selected={activeMedia === id}
            onClick={() => {
              st.set({ composerMode: id });
            }}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition sm:flex-col',
              activeMedia === id ? 'bg-surface-3 text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Caixa central: Prompt + Barra de controles em uma única faixa limpa */}
      <div className={clsx('relative flex min-w-0 flex-1 flex-col justify-between gap-2 rounded-xl bg-surface-2/80 p-2.5', activeMedia === 'video' && 'sm:min-h-40')}>
        <button
          type="button"
          onClick={() => setPromptExpanded(true)}
          aria-label="Expandir editor do prompt"
          title="Abrir editor amplo do prompt"
          className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-lg text-fg-muted transition hover:bg-surface-3 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Expand className="size-3.5" />
        </button>
        <textarea
          value={st.prompt}
          onChange={(e) => st.set({ prompt: e.target.value })}
          maxLength={2000}
          rows={activeMedia === 'video' ? 5 : 3}
          aria-label="Descreva o que você quer criar"
          placeholder="Descreva o que você quer criar… ex.: tomando o suplemento na cozinha, luz da manhã"
          className={clsx(
            'composer-prompt max-h-64 w-full resize-y overflow-y-auto bg-transparent pr-9 text-sm outline-none placeholder:text-fg-subtle focus:border-transparent focus:outline-none focus:ring-0',
            activeMedia === 'video' ? 'min-h-36' : 'min-h-20',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              if (activeMedia === 'video') void st.videoSubmit?.();
              else onGenerate();
            }
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

        <div className="relative flex min-h-7 flex-wrap items-center gap-0.5 pr-[68px]">
          <ImagePicker
            label={`Adicionar imagem de referência (até ${MAX_REFERENCE_IMAGES})`}
            testId="reference-input"
            disabled={st.referenceImages.length >= MAX_REFERENCE_IMAGES}
            multiple
            onPicked={st.addReference}
            onPickedMany={(images) => images.slice(0, MAX_REFERENCE_IMAGES - st.referenceImages.length).forEach(st.addReference)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-3/70 hover:text-fg disabled:opacity-40"
          >
            <Plus className="size-3.5" />
          </ImagePicker>
          {activeMedia === 'image' ? (
            <PillSelect<EngineId>
              label="Modelo de imagem"
              icon={<Cpu className="size-3.5 text-accent dark:text-indigo-400" />}
              value={st.engine}
              onChange={(engine) => st.set({ engine })}
              options={ENGINES.map((e) => ({ value: e.id, label: e.label, hint: e.description }))}
            />
          ) : (
            <PillSelect<VideoEngineId>
              label="Modelo de vídeo"
              icon={<Cpu className="size-3.5 text-accent dark:text-indigo-400" />}
              value={st.videoEngine}
              onChange={(videoEngine) => st.set({ videoEngine, videoDurationSeconds: videoEngine === 'omni-flash' ? 10 : 8 })}
              options={VIDEO_ENGINES.map((engine) => ({
                value: engine.id,
                label: engine.id === 'veo-3.1-fast' ? 'Veo 3.1 · lower priority' : 'Omni Flash 1.2',
                hint: engine.id === 'omni-flash' ? 'Vídeo de até 10 segundos no Avatar' : engine.description,
              }))}
            />
          )}
          <div className="flex h-7 shrink-0 items-center gap-0.5 rounded-lg px-0.5 text-[11px] font-semibold text-fg-muted" aria-label={activeMedia === 'image' ? 'Quantidade de imagens' : 'Quantidade de vídeos'}>
              <button
                onClick={() => { const next = Math.max(1, generationCount - 1); st.set(activeMedia === 'image' ? { count: next } : { videoCount: next }); }}
                className="rounded p-0.5 hover:bg-surface-3/70 hover:text-fg"
                aria-label={`Menos ${countLabel}`}
              >
                <Minus className="size-3" />
              </button>
              <span className="w-6 text-center tabular-nums" data-testid={activeMedia === 'image' ? 'image-count' : 'video-count'}>{generationCount}/{MAX_IMAGES_PER_REQUEST}</span>
              <button
                onClick={() => { const next = Math.min(MAX_IMAGES_PER_REQUEST, generationCount + 1); st.set(activeMedia === 'image' ? { count: next } : { videoCount: next }); }}
                className="rounded p-0.5 hover:bg-surface-3/70 hover:text-fg"
                aria-label={`Mais ${countLabel}`}
              >
                <Plus className="size-3" />
              </button>
            </div>
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
          <button
            onClick={enhance}
            disabled={st.prompt.trim().length < 3 || enhancing}
            title={st.prompt.trim().length < 3 ? 'Escreva a ideia primeiro' : 'A IA reescreve sua ideia com mais detalhes'}
            className="absolute right-0 top-0 flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-[11px] font-semibold text-accent transition hover:bg-accent-soft dark:text-indigo-300 disabled:opacity-40"
          >
            <Wand2 className={clsx('size-3.5', enhancing && 'animate-pulse')} />
            {enhancing ? 'Melhorando…' : 'Melhorar'}
          </button>
        </div>
      </div>

      {/* Slots INFLUENCER, PRODUTO, VÍDEO e CTA GERAR. */}
      <div className="flex w-full shrink-0 items-stretch gap-2 sm:w-auto sm:justify-end">
        <Slot
          label="INFLUENCER"
          preview={avatarSlotPreview}
          onClear={() => st.set({ baseAvatar: null, basePhoto: null })}
        >
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="absolute inset-0 transition hover:bg-surface-3/60"
            aria-label="Escolher influencer"
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
        <Slot label="VÍDEO" preview={null} onClear={() => undefined}>
          <button
            type="button"
            onClick={openVideoTemplates}
            className="absolute inset-0 transition hover:bg-surface-3/60"
            aria-label="Abrir templates de vídeo"
          >
            <span className="pointer-events-none absolute left-2 top-2 flex size-6 items-center justify-center rounded-full border border-fg/25 text-fg-muted">
              <Plus className="size-3.5" />
            </span>
          </button>
        </Slot>
        <button
          onClick={activeMedia === 'video' ? () => void st.videoSubmit?.() : onGenerate}
          disabled={activeMedia === 'image' ? pendingImageRequests >= MAX_PENDING_IMAGE_REQUESTS : pendingVideoRequests >= MAX_PENDING_VIDEO_REQUESTS || videoBusy || !st.videoSubmit}
          type="button"
          data-testid="generate-from-prompt"
          aria-label={activeMedia === 'video' ? `Gerar vídeo${pendingVideoRequests ? `, ${pendingVideoRequests} de ${MAX_PENDING_VIDEO_REQUESTS} vídeos em andamento` : ''}` : `Gerar imagem, ${cost} créditos${pendingImageRequests ? `, ${pendingImageRequests} de ${MAX_PENDING_IMAGE_REQUESTS} imagens em andamento` : ''}`}
          title={activeMedia === 'video' ? pendingVideoRequests >= MAX_PENDING_VIDEO_REQUESTS ? 'Já existem 4 vídeos em andamento' : 'Gerar vídeo com o modelo selecionado' : pendingImageRequests >= MAX_PENDING_IMAGE_REQUESTS ? 'Já existem 4 imagens em andamento' : `Gerar imagem · ${cost} créditos${pendingImageRequests ? ` · ${pendingImageRequests}/${MAX_PENDING_IMAGE_REQUESTS} imagens em andamento` : ''}`}
          className="flex min-h-[84px] w-[96px] shrink-0 flex-col items-center justify-center gap-1 self-stretch rounded-xl bg-brand text-sm font-black uppercase tracking-wide text-white glow-brand transition hover:brightness-110 disabled:opacity-60"
        >
          {(activeMedia === 'image' ? pendingImageRequests > 0 : pendingVideoRequests > 0 || videoBusy) && <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />}
          <span aria-live="polite">
            {activeMedia === 'image'
              ? pendingImageRequests >= MAX_PENDING_IMAGE_REQUESTS ? 'AGUARDE' : pendingImageRequests > 0 ? `GERANDO IMAGEM… ${pendingImageRequests}/${MAX_PENDING_IMAGE_REQUESTS}` : 'GERAR IMAGEM'
              : pendingVideoRequests >= MAX_PENDING_VIDEO_REQUESTS ? 'AGUARDE' : videoBusy ? 'ENVIANDO…' : pendingVideoRequests > 0 ? `GERANDO VÍDEO… ${pendingVideoRequests}/${MAX_PENDING_VIDEO_REQUESTS}` : 'GERAR'}
          </span>
          {activeMedia === 'image' && (
            <span className="inline-flex items-center gap-1 text-xs font-bold normal-case">
              <Sparkles className="size-3.5" />
              <CoinIcon className="size-3.5" />
              {cost}
            </span>
          )}
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
    {promptExpanded && createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
        onMouseDown={(event) => { if (event.target === event.currentTarget) setPromptExpanded(false); }}
      >
        <section role="dialog" aria-modal="true" aria-labelledby="expanded-prompt-title" className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-accent/40 bg-surface shadow-2xl shadow-black/60">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
            <div>
              <h2 id="expanded-prompt-title" className="text-sm font-bold text-fg">Editar prompt de {activeMedia === 'video' ? 'vídeo' : 'imagem'}</h2>
              <p className="mt-0.5 text-[11px] text-fg-muted">{st.prompt.length}/2000 caracteres · Ctrl+Enter para gerar</p>
            </div>
            <button type="button" onClick={() => setPromptExpanded(false)} aria-label="Fechar editor amplo" className="grid size-9 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"><X className="size-4" /></button>
          </header>
          <textarea
            ref={expandedPromptRef}
            value={st.prompt}
            onChange={(event) => st.set({ prompt: event.target.value })}
            maxLength={2000}
            aria-label="Prompt completo"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                setPromptExpanded(false);
                if (activeMedia === 'video') void st.videoSubmit?.();
                else onGenerate();
              }
            }}
            className="min-h-[48vh] w-full resize-y bg-transparent px-4 py-4 text-sm leading-6 text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:px-6"
            placeholder="Descreva o que você quer criar…"
          />
          <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
            <span className="text-[11px] text-fg-muted">As alterações são salvas no canvas automaticamente.</span>
            <button type="button" onClick={() => setPromptExpanded(false)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-xs font-bold text-white hover:brightness-110"><Check className="size-3.5" /> Concluir edição</button>
          </footer>
        </section>
      </div>,
      document.body,
    )}
    </>
  );
}
