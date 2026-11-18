import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Layers, Pause, Play, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Brand';
import { StepGuideBanner } from '@/components/ui/StepGuideBanner';
import { ENGINES, type AspectRatio, type EngineId } from '@shared/contracts';
import { HOOK_STYLES, SLIDESHOW_TONES, UGC_TEMPLATES } from '@shared/ugcCatalog';
import { calculateImageBatchCost, type HookPosition } from '@shared/ugcContracts';
import { useCreateUgcProject } from '@/features/projects/previewProjectsStore';
import { buildLocalSlidesDraft } from './ugcCartridges';
import { api } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';

interface SlideItem {
  headline: string;
  body: string;
  visualPrompt: string;
}

export function SlideshowCreator() {
  const navigate = useNavigate();
  const { createSlideshow, busy } = useCreateUgcProject();

  const [topic, setTopic] = useState('');
  const [promptNotes, setPromptNotes] = useState('');
  const [tone, setTone] = useState<string>(SLIDESHOW_TONES[0]);
  const [slideCount, setSlideCount] = useState(5);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [generatingSlides, setGeneratingSlides] = useState(false);

  const [engine, setEngine] = useState<EngineId>('nano-banana-2');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [captionStyle, setCaptionStyle] = useState<string>(HOOK_STYLES[1]!.id);
  const [captionPosition, setCaptionPosition] = useState<HookPosition>('center');

  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);

  const cost = calculateImageBatchCost({ engine, count: slides.length });
  const currentSlide = slides[activeIdx] ?? slides[0]!;
  const styleMeta = HOOK_STYLES.find((s) => s.id === captionStyle) ?? HOOK_STYLES[1]!;

  useEffect(() => {
    if (!playing || slides.length < 2) return;
    // O relógio mantém a reprodução alinhada mesmo se um frame atrasar.
    const duration = 2400 / speed;
    let previous = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = Math.floor((now - previous) / duration);
      if (elapsed > 0) {
        setActiveIdx(i => (i + elapsed) % slides.length);
        previous += elapsed * duration;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, slides.length]);

  async function handleGenerateSlides() {
    const generationTopic = topic.trim() || 'Rotina Skincare em 3 Passos';
    setGeneratingSlides(true);
    try {
      const next = isSupabaseConfigured
        ? (await api.generateSlides({ productName: generationTopic, tone, slideCount })).slides
        : buildLocalSlidesDraft(generationTopic, tone, slideCount);
      setSlides(next);
      setActiveIdx(0);
      toast.success(`Carrossel com ${next.length} slides pronto para revisar!`);
    } catch {
      const fallback = buildLocalSlidesDraft(topic, tone, slideCount);
      setSlides(fallback);
      setActiveIdx(0);
    } finally {
      setGeneratingSlides(false);
    }
  }

  function applySampleModel() {
    const tpl = UGC_TEMPLATES[0]!;
    setTopic(tpl.title);
    setSlideCount(5);
    setSlides(buildLocalSlidesDraft(tpl.title, 'Antes e Depois', 5));
    setActiveIdx(0);
    toast.success(`Modelo "${tpl.title}" carregado em 5 lâminas.`);
  }

  function updateSlide(index: number, patch: Partial<SlideItem>) {
    setSlides((curr) => curr.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function submit() {
    if (!slides.length) return;
    const proj = await createSlideshow(
      {
        title: `Slideshow · ${topic.trim() || 'Carrossel'}`,
        engine,
        aspectRatio,
        tone,
        captionStyle,
        captionPosition,
        slides,
      },
      UGC_TEMPLATES[activeIdx % UGC_TEMPLATES.length]?.thumbnail ?? '/showcase/modelo-01.webp',
    );
    if (proj) navigate('/projects');
  }

  return (
    <div className="premium-workspace space-y-7">
      <StepGuideBanner guideKey="slideshows" />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <section data-guide-target="slideshow-prompt-box" className="space-y-2 rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex shrink-0 items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-accent text-xs font-black text-white">1</span>
                <h3 className="text-sm font-black">PROMPT</h3>
              </div>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={140}
                aria-label="Tema ou produto"
                placeholder="• Nenhum contexto"
                className="h-8 min-w-[100px] flex-1 rounded-lg border border-border bg-surface-2 px-2 text-xs font-semibold outline-none focus:border-accent"
              />
              <select
                aria-label="Formato do texto"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="h-8 w-[92px] rounded-lg border border-border bg-surface-2 px-1.5 text-[11px] outline-none focus:border-accent"
              >
                {SLIDESHOW_TONES.map((t) => (
                  <option key={t} value={t}>{t.split(' / ')[0]}</option>
                ))}
              </select>
              <Button
                variant="brand"
                size="sm"
                className={clsx('px-2 text-[11px]', !topic.trim() && 'opacity-60')}
                onClick={() => void handleGenerateSlides()}
                loading={generatingSlides}
                data-testid="slideshow-generate-btn"
              >
                <Wand2 className="size-3.5" /> Gerar com IA ({slideCount})
              </Button>
              <select
                aria-label="Slides"
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                className="h-8 w-[56px] rounded-lg border border-border bg-surface-2 px-1.5 text-[11px] outline-none focus:border-accent"
              >
                {[3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {!topic.trim() && <p className="text-[11px] text-fg-muted">Selecione um produto ou nicho acima para gerar</p>}

            <textarea
              value={promptNotes}
              onChange={(e) => setPromptNotes(e.target.value)}
              placeholder="Opcional: adicione direções específicas, tom de voz desejado, ou deixe em branco para geração automática com as melhores práticas de conversão..."
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" size="sm" onClick={applySampleModel}>Comece com o modelo</Button>
              <Button variant="secondary" size="sm" onClick={() => toast.info('Cole uma URL de produto no campo Tema ou produto para importar o contexto.')}>A partir de URL</Button>
            </div>

            <div className="space-y-2.5">
              {slides.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveIdx(idx)}
                  className={clsx(
                    'rounded-2xl border p-3 transition-colors cursor-pointer',
                    activeIdx === idx ? 'border-accent bg-accent-soft/50' : 'border-border bg-surface-2/60 hover:border-fg-subtle',
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                    <span className="text-accent">Slide {idx + 1}</span>
                    <span className="text-[11px] font-normal text-fg-subtle">Clique para visualizar à direita</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={s.headline}
                      onChange={(e) => updateSlide(idx, { headline: e.target.value })}
                      placeholder="Título curto do slide"
                      className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-accent"
                    />
                    <input
                      value={s.body}
                      onChange={(e) => updateSlide(idx, { body: e.target.value })}
                      placeholder="Texto complementar"
                      className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <h3 className="text-sm font-black">2. IMAGENS</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {ENGINES.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEngine(e.id)}
                  className={clsx(
                    'flex items-center justify-between rounded-xl border p-3 text-left text-xs transition-all',
                    engine === e.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2 hover:border-fg-subtle',
                  )}
                >
                  <div>
                    <div className="font-bold">{e.label}</div>
                    <div className="text-fg-muted">{e.description}</div>
                  </div>
                  <span className="font-bold">{e.id === 'nano-banana-pro' ? 3 : 2}/slide</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(['9:16', '1:1', '4:3'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspectRatio(r)}
                  className={clsx(
                    'rounded-xl border px-3 py-1.5 text-xs font-bold',
                    aspectRatio === r ? 'border-accent bg-accent-soft text-fg' : 'border-border bg-surface-2 text-fg-muted',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Player interativo 50% à direita */}
        <aside data-guide-target="slideshow-player-box" className="lg:sticky lg:top-20 h-fit rounded-2xl border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider text-fg-muted">Editor de pré-visualização {slides.length ? `(${activeIdx + 1}/${slides.length})` : ''}</span>
            <div className="flex items-center gap-1">
              {([1, 1.5, 2] as const).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setSpeed(sp)}
                  className={clsx(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold',
                    speed === sp ? 'bg-accent text-white' : 'bg-surface-2 text-fg-muted',
                  )}
                >
                  {sp}x
                </button>
              ))}
            </div>
          </div>

          {currentSlide ? <div className="relative mx-auto max-w-[300px] aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-surface-2">
            <img
              src={UGC_TEMPLATES[activeIdx % UGC_TEMPLATES.length]?.thumbnail ?? '/showcase/modelo-01.webp'}
              alt=""
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/35" />

            {/* Barra de progresso estilo Stories/TikTok */}
            <div className="absolute inset-x-3 top-2.5 flex gap-1">
              {slides.map((_, idx) => (
                <div key={idx} className={clsx('h-1 flex-1 rounded-full', idx <= activeIdx ? 'bg-white' : 'bg-white/30')} />
              ))}
            </div>

            <div
              className={clsx(
                'absolute inset-x-4 text-center space-y-2',
                captionPosition === 'top' && 'top-10',
                captionPosition === 'center' && 'top-1/2 -translate-y-1/2',
                captionPosition === 'bottom' && 'bottom-8',
              )}
            >
              <div className={clsx('inline-block rounded-xl px-3 py-2 text-sm font-black leading-tight', styleMeta.bgClass)}>
                {currentSlide.headline}
              </div>
              {currentSlide.body && (
                <div className="rounded-xl bg-black/75 px-3 py-2 text-xs text-white/95 backdrop-blur">
                  {currentSlide.body}
                </div>
              )}
            </div>
          </div> : <div className="grid min-h-[500px] place-items-center rounded-xl bg-bg p-6 text-center"><div><Layers className="mx-auto mb-4 size-10 text-fg-subtle" /><h4 className="font-semibold">Você não tem apresentações de slides</h4><p className="mt-2 text-sm text-fg-muted">Comece gerando um à esquerda</p></div></div>}

          <div className="flex items-center justify-between gap-2">
            <Button variant="secondary" size="sm" aria-label="Slide anterior" disabled={!slides.length} onClick={() => setActiveIdx((i) => (i - 1 + slides.length) % slides.length)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" disabled={!slides.length} onClick={() => setPlaying((p) => !p)}>
              {playing ? <><Pause className="size-3.5" /> Pausar</> : <><Play className="size-3.5" /> Reproduzir</>}
            </Button>
            <Button variant="secondary" size="sm" aria-label="Próximo slide" disabled={!slides.length} onClick={() => setActiveIdx((i) => (i + 1) % slides.length)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {HOOK_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={s.label}
                  onClick={() => setCaptionStyle(s.id)}
                  className={clsx('size-5 rounded-full border', captionStyle === s.id ? 'scale-110 border-accent' : 'border-border')}
                  style={{ backgroundColor: s.dotColor }}
                />
              ))}
            </div>
            <div className="flex gap-1 text-[10px] font-bold">
              {(['top', 'center', 'bottom'] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setCaptionPosition(pos)}
                  className={clsx('rounded px-1.5 py-0.5', captionPosition === pos ? 'bg-accent text-white' : 'bg-surface-2 text-fg-muted')}
                >
                  {pos === 'top' ? 'Topo' : pos === 'center' ? 'Centro' : 'Base'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-fg-muted">{slides.length} lâminas</span>
            <span className="inline-flex items-center gap-1 font-black">
              <CoinIcon className="size-3.5" /> {cost} créditos
            </span>
          </div>

          <Button variant="brand" className="w-full" disabled={!slides.length} onClick={() => void submit()} loading={busy} data-testid="slideshow-create-btn">
            <Layers className="size-4" /> Gerar Slideshow · {cost}
          </Button>
        </aside>
      </div>
    </div>
  );
}
