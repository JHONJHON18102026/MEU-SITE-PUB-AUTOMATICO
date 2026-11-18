import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Clapperboard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Brand';
import { QuickAvatarSelect, type SelectedVisualSource } from '@/features/avatars/QuickAvatarSelect';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import { useCreateUgcProject } from '@/features/projects/previewProjectsStore';
import { STUDIO_FORMATS } from '@shared/ugcCatalog';
import { VIDEO_ENGINES, calculateUgcCost, type StudioBrandProjectDTO, type VideoEngineId } from '@shared/ugcContracts';
import { buildStudioBatchDraft } from './studioCartridges';

export function StudioCreateTab({
  project,
  formatSlug,
  onBatchCreated,
}: {
  project: StudioBrandProjectDTO;
  formatSlug?: string;
  onBatchCreated: () => void;
}) {
  const { createProject, busy } = useCreateUgcProject();
  const [batchCount, setBatchCount] = useState(1);
  const [engine, setEngine] = useState<VideoEngineId>('veo-3.1-fast');
  const [customAngle, setCustomAngle] = useState('');
  const [avatar, setAvatar] = useState<SelectedVisualSource>({
    label: SHOWCASE_AVATARS[0]!.name,
    previewUrl: project.brandbook?.heroVisualUrl || SHOWCASE_AVATARS[0]!.image_url,
    uploaded: null,
  });

  const format = formatSlug ? STUDIO_FORMATS.find((f) => f.id === formatSlug) ?? null : null;
  const costPerVideo = calculateUgcCost({ engine, sceneCount: 2 });
  const totalCost = batchCount * costPerVideo;

  async function produceBatch() {
    if (!format) return;
    let createdCount = 0;
    for (let i = 0; i < batchCount; i++) {
      const draft = buildStudioBatchDraft({
        formatTitle: format.title,
        productName: project.product_name,
        hookBase: customAngle || project.brandbook?.sampleHooks?.[i] || '',
        cta: project.brandbook?.defaultCta || 'Confira o link na bio',
        variationIndex: i,
      });
      const proj = await createProject({
        mode: 'studio',
        title: draft.title,
        engine,
        aspectRatio: '9:16',
        productName: project.product_name,
        avatarUrl: format.id === 'monetiza-view' ? '/showcase/modelo-05.webp' : avatar.previewUrl,
        avatarImageData: avatar.uploaded?.data,
        scenes: draft.scenes,
      });
      if (!proj) break;
      createdCount++;
    }
    if (createdCount > 0) {
      toast.success(`${createdCount} vídeo(s) do Studio criados! Abra a Montagem final para escolher a legenda.`);
      onBatchCreated();
    }
  }

  // Visão 1 (/studio/criar): apenas a lista limpa de formatos; clicar abre a tela dedicada daquele formato.
  if (!format) {
    return (
      <div className="space-y-3" data-guide-target="studio-main-box">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-light">LINHAS DE PRODUÇÃO</div>
          <h2 className="mt-1 text-lg font-black">Escolha o formato do vídeo</h2>
          <p className="text-xs text-fg-muted">
            Cada formato abre uma linha de produção dedicada para <strong>{project.name}</strong>.
          </p>
        </div>

        <div className="space-y-2.5">
          {STUDIO_FORMATS.map((f) => (
            <Link
              key={f.id}
              to={`/studio/criar/${f.id}`}
              data-testid={`studio-format-${f.id}`}
              className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[linear-gradient(105deg,rgba(21,20,31,.98),rgba(25,24,39,.88))] p-5 shadow-[0_12px_30px_rgba(0,0,0,.14)] transition duration-200 hover:-translate-y-0.5 hover:border-accent/55 hover:shadow-[0_20px_44px_rgba(0,0,0,.22)]"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold group-hover:text-accent">{f.title}</span>
                  <span
                    className={clsx(
                      'rounded px-1.5 py-0.5 text-[10px] font-bold',
                      f.badge === 'RECOMENDADO' ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-fg-muted',
                    )}
                  >
                    {f.badge}
                  </span>
                </div>
                <p className="text-xs text-fg-muted">{f.desc}</p>
              </div>
              <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white">
                <Sparkles className="size-3.5" /> Usar este formato <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Visão 2 (/studio/criar/:formatId): tela limpa exclusiva do formato selecionado
  return (
    <div className="space-y-4" data-guide-target="studio-main-box">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/studio/criar"
          className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-3.5" /> Escolher outro formato
        </Link>
        <span className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
          <CoinIcon className="size-3.5" /> Total: {totalCost} créditos
        </span>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <div>
          <h2 className="text-sm font-bold">PRODUÇÃO EM MASSA · {format.title.toUpperCase()}</h2>
          <p className="text-xs text-fg-muted">
            Marca ativa: <strong>{project.name}</strong> · Produto: <strong>{project.product_name}</strong>
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-fg-muted">Quantidade de vídeos no lote</div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBatchCount(n)}
                  className={clsx(
                    'rounded-lg border py-1.5 text-xs font-semibold',
                    batchCount === n ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface-2 text-fg-muted',
                  )}
                >
                  {n} vídeo{n > 1 ? 's' : ''}
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {VIDEO_ENGINES.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEngine(e.id)}
                  className={clsx(
                    'flex items-center justify-between rounded-xl border p-2.5 text-left text-xs',
                    engine === e.id ? 'border-accent bg-accent-soft font-bold text-fg' : 'border-border bg-surface-2 text-fg-muted',
                  )}
                >
                  <span>{e.label}</span>
                  <span>{e.creditsPerScene * 2}/vídeo</span>
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg-muted">Gancho ou direcionamento opcional</span>
              <input
                value={customAngle}
                onChange={(e) => setCustomAngle(e.target.value)}
                placeholder={project.brandbook?.sampleHooks?.[0] || 'Deixe em branco para variar os ganchos do Brandbook'}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-fg-muted">
              {format.id === 'monetiza-view' ? 'Monetiza View roda sem precisar de rosto fixo' : 'Avatar da linha de produção'}
            </div>
            <QuickAvatarSelect value={avatar} onChange={setAvatar} />
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-3.5">
          <Button variant="brand" size="md" onClick={() => void produceBatch()} loading={busy} data-testid="studio-produce-btn">
            <Clapperboard className="size-4" /> Produzir em Massa ({batchCount}) · {totalCost}
          </Button>
        </div>
      </section>
    </div>
  );
}
