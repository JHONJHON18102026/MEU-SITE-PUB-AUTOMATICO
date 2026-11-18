import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Film, Repeat2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Brand';
import { StepGuideBanner } from '@/components/ui/StepGuideBanner';
import { QuickAvatarSelect, type SelectedVisualSource } from '@/features/avatars/QuickAvatarSelect';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import { VIRAL_TRENDING_VIDEOS } from '@shared/ugcCatalog';
import { VIDEO_ENGINES, calculateUgcCost, type VideoEngineId, type ViralManifestDTO } from '@shared/ugcContracts';
import { useCreateUgcProject } from '@/features/projects/previewProjectsStore';
import { buildLocalManifest } from '@/features/viral/viralCartridges';
import { useViralLibrary, useViralStore } from '@/features/viral/viralStore';

export function RemakeViralCreator() {
  const navigate = useNavigate();
  const { remakeSeed, setRemakeSeed } = useViralStore();
  const { items, analyzeManifest } = useViralLibrary();
  const { createProject, busy } = useCreateUgcProject();

  const initialPreset = VIRAL_TRENDING_VIDEOS[0]!;
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceTitle, setSourceTitle] = useState(initialPreset.title);
  const [sourceThumb, setSourceThumb] = useState(initialPreset.thumbnail);
  const [niche, setNiche] = useState<string>(initialPreset.niche);
  const [singleTake, setSingleTake] = useState(false);

  const [productName, setProductName] = useState('Sérum Facial Vitamina C Pura');
  const [locationHint, setLocationHint] = useState('Banheiro iluminado pela manhã com luz natural');
  const [manifest, setManifest] = useState<ViralManifestDTO>(initialPreset.preAnalyzedManifest);
  const [analyzing, setAnalyzing] = useState(false);

  const [avatar, setAvatar] = useState<SelectedVisualSource>({
    label: SHOWCASE_AVATARS[0]!.name,
    previewUrl: SHOWCASE_AVATARS[0]!.image_url,
    uploaded: null,
  });
  const [engine, setEngine] = useState<VideoEngineId>('veo-3.1-fast');

  // Se o usuário chegou pelo botão "Fazer Remake" lá da Biblioteca VIRAL, pré-carrega a semente.
  useEffect(() => {
    if (!remakeSeed) return;
    setSourceTitle(remakeSeed.sourceTitle);
    setSourceUrl(remakeSeed.sourceUrl ?? '');
    setSourceThumb(remakeSeed.thumbnailUrl);
    setNiche(remakeSeed.niche);
    const loadedManifest =
      remakeSeed.manifest ??
      buildLocalManifest({
        sourceTitle: remakeSeed.sourceTitle,
        sourceUrl: remakeSeed.sourceUrl,
        niche: remakeSeed.niche,
        durationSec: remakeSeed.durationSec,
        targetProduct: productName,
      });
    setManifest(loadedManifest);
    setRemakeSeed(null);
  }, [remakeSeed, setRemakeSeed, productName]);

  const activeScenes = singleTake ? manifest.scenes.slice(0, 1) : manifest.scenes;
  const cost = calculateUgcCost({ engine, sceneCount: activeScenes.length });

  async function handleGenerateManifest() {
    setAnalyzing(true);
    try {
      const m = await analyzeManifest({
        sourceTitle: sourceTitle.trim() || sourceUrl.trim() || 'Anúncio de Referência',
        sourceUrl: sourceUrl.trim() || undefined,
        niche,
        durationSec: singleTake ? 8 : 24,
        targetProduct: productName,
      });
      setManifest(m);
      toast.success('Manifest gerado gratuitamente (0 créditos)! Revise os takes abaixo.');
    } finally {
      setAnalyzing(false);
    }
  }

  function applyOneClickAdaptation() {
    const prod = productName.trim() || 'Seu Produto';
    const updated = buildLocalManifest({
      sourceTitle,
      sourceUrl: sourceUrl.trim() || undefined,
      niche,
      durationSec: singleTake ? 8 : 24,
      targetProduct: prod,
    });
    setManifest(updated);
    toast.success(`Roteiro adaptado em 1 clique para "${prod}"!`);
  }

  function updateSceneText(index: number, patch: Partial<ViralManifestDTO['scenes'][number]>) {
    setManifest((curr) => ({
      ...curr,
      scenes: curr.scenes.map((sc) => (sc.index === index ? { ...sc, ...patch } : sc)),
    }));
  }

  async function submit() {
    if (!productName.trim()) {
      toast.error('Informe o produto ou serviço que vai aparecer no Remake.');
      return;
    }
    const proj = await createProject({
      mode: 'remake',
      title: `Remake · ${productName.trim()}`,
      engine,
      aspectRatio: '9:16',
      productName: productName.trim(),
      avatarUrl: avatar.previewUrl,
      avatarImageData: avatar.uploaded?.data,
      scenes: activeScenes.map((sc) => ({
        text: sc.spokenTemplate,
        action: `${sc.visualCues}${locationHint ? ` Setting: ${locationHint}` : ''}`,
        durationSeconds: sc.durationSeconds,
      })),
    });
    if (proj) navigate('/projects');
  }

  return (
    <div className="premium-workspace space-y-4">
      <StepGuideBanner guideKey="remake" />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          {/* 1. Referência Viral + Gerar Manifest grátis */}
          <section data-guide-target="remake-source-box" className="space-y-3.5 rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-accent text-xs font-black text-white">1</span>
                <h3 className="text-sm font-black">VÍDEO DE REFERÊNCIA + MANIFEST (GRÁTIS)</h3>
              </div>
              <Button variant="brand" size="sm" onClick={() => void handleGenerateManifest()} loading={analyzing} data-testid="remake-manifest-btn">
                <Wand2 className="size-3.5" /> Gerar Manifest (0 créditos)
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-fg-muted">Link do vídeo original (TikTok / Reels / Shorts)</span>
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/..."
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-fg-muted">Título ou ângulo da referência</span>
                <input
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold text-fg-muted">Modelos virais pré-analisados (ou salvos em Minhas pastas):</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[...items.slice(0, 2).map((it) => ({
                  id: it.id,
                  title: it.title,
                  thumbnail: it.thumbnail_url,
                  niche: it.niche,
                  durationSec: it.duration_sec,
                  manifest: it.manifest,
                })), ...VIRAL_TRENDING_VIDEOS.slice(0, 4).map((v) => ({
                  id: v.id,
                  title: v.title,
                  thumbnail: v.thumbnail,
                  niche: v.niche,
                  durationSec: v.durationSec,
                  manifest: v.preAnalyzedManifest,
                }))].slice(0, 4).map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setSourceTitle(tpl.title);
                      setSourceThumb(tpl.thumbnail);
                      setNiche(tpl.niche);
                      if (tpl.manifest) setManifest(tpl.manifest);
                    }}
                    className={clsx(
                      'overflow-hidden rounded-xl border text-left transition-all',
                      sourceTitle === tpl.title ? 'border-accent ring-brand' : 'border-border bg-surface-2 hover:border-fg-subtle',
                    )}
                  >
                    <img src={tpl.thumbnail} alt="" className="aspect-[16/10] w-full object-cover object-top" />
                    <div className="p-1.5 text-[10px] font-bold truncate">{tpl.title}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 2. Adaptação para sua marca + Manifest por cena */}
          <section className="rounded-2xl border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-accent text-xs font-black text-white">2</span>
                <h3 className="text-sm font-black">ADAPTAR PARA SEU PRODUTO E GERAR</h3>
              </div>
              <Button variant="secondary" size="sm" onClick={applyOneClickAdaptation} data-testid="remake-adapt-btn">
                <Sparkles className="size-3.5 text-accent" /> Adaptar roteiro em 1 clique
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-fg-muted">Seu produto ou serviço *</span>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-fg-muted">Local / Ambiente opcional</span>
                <input
                  value={locationHint}
                  onChange={(e) => setLocationHint(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-semibold text-fg-muted">Quem vai protagonizar o Remake (opcional)</div>
              <QuickAvatarSelect value={avatar} onChange={setAvatar} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSingleTake(false)}
                  className={clsx('rounded-xl border px-3 py-1.5', !singleTake ? 'border-accent bg-accent-soft text-fg' : 'border-border bg-surface-2 text-fg-muted')}
                >
                  Contínuo ({manifest.scenes.length} cenas)
                </button>
                <button
                  type="button"
                  onClick={() => setSingleTake(true)}
                  className={clsx('rounded-xl border px-3 py-1.5', singleTake ? 'border-accent bg-accent-soft text-fg' : 'border-border bg-surface-2 text-fg-muted')}
                >
                  1 take rápido (até 8s)
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {activeScenes.map((sc) => (
                <div key={sc.index} className="rounded-2xl border border-border bg-surface-2 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-accent">Cena #{sc.index + 1} · {sc.role}</span>
                    <span className="text-fg-muted">~{sc.durationSeconds}s</span>
                  </div>
                  <textarea
                    value={sc.spokenTemplate}
                    rows={2}
                    onChange={(e) => updateSceneText(sc.index, { spokenTemplate: e.target.value })}
                    className="w-full resize-none rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                  />
                  <input
                    value={sc.visualCues}
                    onChange={(e) => updateSceneText(sc.index, { visualCues: e.target.value })}
                    className="w-full rounded-xl border border-border bg-surface px-2.5 py-1.5 text-[11px] text-fg-muted outline-none focus:border-accent"
                  />
                </div>
              ))}
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

        {/* 3. Comparador Lado a Lado 50% Original × Remake */}
        <aside data-guide-target="remake-compare-box" className="lg:sticky lg:top-20 h-fit rounded-2xl border border-border bg-surface p-6 space-y-4">
          <div className="text-sm font-semibold text-fg-muted">Comparador · Original × Remake</div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-fg-muted">ORIGINAL</div>
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img src={sourceThumb} alt="Original" className="aspect-[9/14] w-full object-cover object-top opacity-85" />
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {manifest.style}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-bold text-accent">SEU REMAKE</div>
              <div className="relative overflow-hidden rounded-xl border border-accent/60">
                <img src={avatar.previewUrl} alt="Seu Remake" className="aspect-[9/14] w-full object-cover object-top" />
                <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {productName || 'Seu Produto'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-2 p-3 text-xs space-y-1">
            <div className="font-bold">Resumo da clonagem</div>
            <div className="text-fg-muted">Cenas adaptadas: <strong className="text-fg">{activeScenes.length} (~{activeScenes.length * 8}s)</strong></div>
            <div className="text-fg-muted">Nicho: <strong className="text-fg">{manifest.niche}</strong></div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-fg-muted">{activeScenes.length} cena(s)</span>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-black">
              <CoinIcon className="size-3.5" /> {cost} créditos
            </span>
          </div>

          <Button variant="brand" className="w-full" onClick={() => void submit()} loading={busy} data-testid="remake-create-btn">
            <Repeat2 className="size-4" /> Gerar Vídeo Remake · {cost}
          </Button>
          <div className="flex items-center justify-center gap-1 text-[11px] text-fg-subtle">
            <Film className="size-3" /> Vai direto para Meus Projetos
          </div>
        </aside>
      </div>
    </div>
  );
}
