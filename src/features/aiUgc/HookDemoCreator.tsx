import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Film, Sparkles, Upload, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Brand';
import { StepGuideBanner } from '@/components/ui/StepGuideBanner';
import { QuickAvatarSelect, type SelectedVisualSource } from '@/features/avatars/QuickAvatarSelect';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import { ImagePicker } from '@/features/avatars/ImagePicker';
import { HOOK_STYLES } from '@shared/ugcCatalog';
import { VIDEO_ENGINES, calculateUgcCost, type HookPosition, type VideoEngineId } from '@shared/ugcContracts';
import { useCreateUgcProject } from '@/features/projects/previewProjectsStore';
import { buildLocalHooks } from './ugcCartridges';
import { api } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { PreparedImage } from '@/lib/image';

const HOOK_POSITIONS: { id: HookPosition; label: string }[] = [
  { id: 'top', label: 'Topo' },
  { id: 'center', label: 'Centro' },
  { id: 'bottom', label: 'Inferior' },
];

export function HookDemoCreator() {
  const navigate = useNavigate();
  const { createProject, busy } = useCreateUgcProject();

  const [productName, setProductName] = useState('Sérum Facial Vitamina C');
  const [niche, setNiche] = useState('Skincare');
  const [hookCount, setHookCount] = useState(5);
  const [hookText, setHookText] = useState('Ninguém te contou esse segredo antes de comprar sérum...');
  const [hookIdeas, setHookIdeas] = useState<string[]>(() => buildLocalHooks('Sérum Facial Vitamina C', 'Skincare', 5));
  const [loadingHooks, setLoadingHooks] = useState(false);

  const [creator, setCreator] = useState<SelectedVisualSource>({
    label: SHOWCASE_AVATARS[0]!.name,
    previewUrl: SHOWCASE_AVATARS[0]!.image_url,
    uploaded: null,
  });
  const [demoPhoto, setDemoPhoto] = useState<PreparedImage | null>(null);
  const [demoAction, setDemoAction] = useState('Mostra o produto de perto em luz natural e aplica rapidamente.');
  const [previewLayer, setPreviewLayer] = useState<'hook' | 'demo'>('hook');

  const [hookStyle, setHookStyle] = useState<string>(HOOK_STYLES[1]!.id);
  const [hookPosition, setHookPosition] = useState<HookPosition>('top');
  const [engine, setEngine] = useState<VideoEngineId>('veo-3.1-fast');

  // Hook + Demo gera 2 takes: Cena 1 (Gancho 8s) + Cena 2 (Demonstração 8s)
  const cost = calculateUgcCost({ engine, sceneCount: 2 });
  const activeStyle = HOOK_STYLES.find((s) => s.id === hookStyle) ?? HOOK_STYLES[1]!;

  async function handleGenerateHooks() {
    if (!productName.trim()) {
      toast.error('Informe o produto ou assunto para gerar ganchos.');
      return;
    }
    setLoadingHooks(true);
    try {
      const hooks = isSupabaseConfigured
        ? (await api.generateHooks({ productName: productName.trim(), niche, count: hookCount })).hooks
        : buildLocalHooks(productName, niche, hookCount);
      setHookIdeas(hooks);
      if (hooks[0]) setHookText(hooks[0]);
      toast.success(`${hooks.length} ganchos prontos! Clique em qualquer opção para testar na prévia.`);
    } catch {
      const fallback = buildLocalHooks(productName, niche, hookCount);
      setHookIdeas(fallback);
      if (fallback[0]) setHookText(fallback[0]);
    } finally {
      setLoadingHooks(false);
    }
  }

  function applyOneClickRecipe() {
    const prod = productName.trim() || 'Produto Campeão';
    const hooks = buildLocalHooks(prod, niche, 5);
    setHookIdeas(hooks);
    setHookText(hooks[0]!);
    setDemoAction(`Segura ${prod} perto da câmera, demonstra o uso real e sorri apontando o resultado.`);
    toast.success('Hook + Demo montado em 1 clique! Ajuste ou clique em Criar Hook + Demo.');
  }

  async function submit() {
    if (!hookText.trim()) {
      toast.error('Escreva ou gere o texto do gancho nos primeiros segundos.');
      return;
    }
    const proj = await createProject({
      mode: 'hook',
      title: `Hook + Demo · ${productName.trim() || 'Anúncio'}`,
      engine,
      aspectRatio: '9:16',
      productName: productName.trim() || undefined,
      avatarUrl: creator.previewUrl,
      avatarImageData: creator.uploaded?.data,
      productImageData: demoPhoto?.data,
      hookText: hookText.trim(),
      hookStyle,
      hookPosition,
      scenes: [
        { text: hookText.trim(), action: `Opening hook facing camera (${creator.label})`, durationSeconds: 8 },
        { text: `Olha como ${productName.trim() || 'esse produto'} funciona na prática todos os dias.`, action: demoAction, durationSeconds: 8 },
      ],
    });
    if (proj) navigate('/projects');
  }

  return (
    <div className="premium-workspace space-y-4">
      <StepGuideBanner guideKey="hook" />

      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-xl font-bold uppercase tracking-wide sm:text-2xl">CRIE VÍDEOS DE HOOK + DEMO</h2>
        <p className="mt-1 text-xs text-fg-muted sm:text-sm">
          Combine ganchos persuasivos com demonstrações de produto
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* 1. Gancho (Hook) */}
          <section data-guide-target="hook-text-box" className="space-y-3.5 rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-accent text-xs font-black text-white">1</span>
                <h3 className="text-sm font-black">GANCHO (3 PRIMEIROS SEGUNDOS)</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={applyOneClickRecipe} data-testid="hook-oneclick-btn">
                  <Sparkles className="size-3.5" /> Montar em 1 clique
                </Button>
                <Button variant="brand" size="sm" onClick={() => void handleGenerateHooks()} loading={loadingHooks} data-testid="hook-generate-btn">
                  <Wand2 className="size-3.5" /> Gerar com IA ({hookCount})
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <label className="sm:col-span-2 block">
                <span className="mb-1 block text-xs font-semibold text-fg-muted">Produto ou assunto</span>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  maxLength={120}
                  placeholder="Ex.: Sérum Vitamina C, Escova Alisadora..."
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-fg-muted">Nicho</span>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {['Skincare', 'Fitness', 'Tech', 'Casa', 'Moda', 'Saúde', 'Geral'].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-fg-muted">Qtd. ideias</span>
                <select
                  value={hookCount}
                  onChange={(e) => setHookCount(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {[3, 5, 8].map((n) => (
                    <option key={n} value={n}>{n} ganchos</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <div className="mb-1 flex justify-between text-xs text-fg-muted">
                <span className="font-semibold">Texto do gancho na tela e na fala</span>
                <span>{hookText.length}/200</span>
              </div>
              <textarea
                value={hookText}
                onChange={(e) => setHookText(e.target.value)}
                rows={2}
                maxLength={200}
                data-testid="hook-textarea"
                placeholder="Ex.: O erro #1 que impede sua pele de responder ao skincare..."
                className="w-full rounded-2xl border border-border bg-surface-2 p-3 text-sm outline-none focus:border-accent"
              />
            </label>

            {hookIdeas.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-semibold text-fg-muted">Ideias geradas (clique para aplicar):</div>
                <div className="flex flex-wrap gap-1.5">
                  {hookIdeas.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setHookText(idea)}
                      className={clsx(
                        'rounded-xl border px-2.5 py-1.5 text-left text-xs transition-colors',
                        hookText === idea ? 'border-accent bg-accent-soft font-semibold text-fg' : 'border-border bg-surface-2 text-fg-muted hover:text-fg',
                      )}
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 2. Conteúdo de Abertura + Vídeo Demo */}
          <section data-guide-target="hook-media-box" className="rounded-2xl border border-border bg-surface p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-accent text-xs font-black text-white">2</span>
              <h3 className="text-sm font-black">QUEM FALA O GANCHO + CENA DEMO</h3>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-semibold text-fg-muted">Avatar / criador de abertura</div>
              <QuickAvatarSelect value={creator} onChange={setCreator} />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px] items-start">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-fg-muted">O que mostrar na cena Demo (Cena 2)</span>
                <textarea
                  value={demoAction}
                  onChange={(e) => setDemoAction(e.target.value)}
                  rows={2}
                  maxLength={350}
                  className="w-full rounded-xl border border-border bg-surface-2 p-2.5 text-xs outline-none focus:border-accent"
                />
              </label>

              <div>
                <span className="mb-1 block text-xs font-semibold text-fg-muted">Foto Demo (opcional)</span>
                {demoPhoto ? (
                  <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent-soft p-2 text-xs">
                    <img src={demoPhoto.previewUrl} alt="" className="size-10 rounded-lg object-cover" />
                    <button type="button" onClick={() => setDemoPhoto(null)} className="truncate font-semibold hover:underline">
                      Trocar
                    </button>
                  </div>
                ) : (
                  <ImagePicker
                    label="Anexar foto demo do produto"
                    onPicked={setDemoPhoto}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 px-3 py-3 text-xs font-semibold hover:border-accent/60"
                  >
                    <Upload className="size-4 text-accent" /> Foto do produto
                  </ImagePicker>
                )}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {VIDEO_ENGINES.map((e) => (
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
                  <span className="font-bold">{e.creditsPerScene}/cena</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* 3. Preview interativo 50% (estilo + posição + gerar) */}
        <aside data-guide-target="hook-preview-box" className="lg:sticky lg:top-20 h-fit rounded-2xl border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-fg-muted">Prévia do Gancho</span>
            <div className="flex rounded-lg bg-surface-2 p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setPreviewLayer('hook')}
                className={clsx('rounded-md px-2 py-0.5', previewLayer === 'hook' ? 'bg-surface text-fg shadow' : 'text-fg-muted')}
              >
                Gancho
              </button>
              <button
                type="button"
                onClick={() => setPreviewLayer('demo')}
                className={clsx('rounded-md px-2 py-0.5', previewLayer === 'demo' ? 'bg-surface text-fg shadow' : 'text-fg-muted')}
              >
                Demo
              </button>
            </div>
          </div>

          <div className="relative mx-auto max-w-[300px] aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-surface-2">
            <img
              src={previewLayer === 'demo' && demoPhoto ? demoPhoto.previewUrl : creator.previewUrl}
              alt="Prévia Hook+Demo"
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

            {previewLayer === 'hook' ? (
              <div
                className={clsx(
                  'absolute inset-x-3 flex justify-center transition-all',
                  hookPosition === 'top' && 'top-5',
                  hookPosition === 'center' && 'top-1/2 -translate-y-1/2',
                  hookPosition === 'bottom' && 'bottom-6',
                )}
              >
                <div className={clsx('max-w-full rounded-xl px-3 py-2 text-center text-xs font-black leading-snug', activeStyle.bgClass)}>
                  {hookText.trim() || 'Seu gancho aparece aqui'}
                </div>
              </div>
            ) : (
              <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/75 p-2.5 text-[11px] text-white">
                <div className="font-bold text-emerald-300">Cena 2 · Demo do produto</div>
                <div className="mt-0.5 line-clamp-2 opacity-90">{demoAction}</div>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="mb-1 text-[11px] font-semibold text-fg-muted">Posição do texto</div>
              <div className="grid grid-cols-3 gap-1.5">
                {HOOK_POSITIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setHookPosition(p.id)}
                    className={clsx(
                      'rounded-lg border py-1.5 text-xs font-semibold',
                      hookPosition === p.id ? 'border-accent bg-accent-soft text-fg' : 'border-border bg-surface-2 text-fg-muted',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold text-fg-muted">5 estilos prontos de destaque</div>
              <div className="flex items-center gap-2">
                {HOOK_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={s.label}
                    title={s.label}
                    onClick={() => setHookStyle(s.id)}
                    className={clsx(
                      'size-7 rounded-full border-2 transition-transform',
                      hookStyle === s.id ? 'scale-110 border-accent' : 'border-border opacity-80 hover:opacity-100',
                    )}
                    style={{ backgroundColor: s.dotColor }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-fg-muted">2 cenas (~16s)</span>
            <span className="inline-flex items-center gap-1 font-black">
              <CoinIcon className="size-3.5" /> {cost} créditos
            </span>
          </div>

          <Button variant="brand" className="w-full" onClick={() => void submit()} loading={busy} data-testid="hook-create-btn">
            <Film className="size-4" /> Criar Hook + Demo · {cost}
          </Button>
        </aside>
      </div>
    </div>
  );
}
