import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import {
  Cpu,
  ImagePlus,
  Layers,
  Minus,
  PenLine,
  Plus,
  RectangleHorizontal,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Brand';
import { ImagePicker } from '@/features/avatars/ImagePicker';
import { QuickAvatarSelect, type SelectedVisualSource } from '@/features/avatars/QuickAvatarSelect';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import { PillSelect } from '@/components/ui/PillSelect';
import { ENGINES, type AspectRatio, type EngineId } from '@shared/contracts';
import { IMAGE_AD_TEMPLATES } from '@shared/ugcCatalog';
import { calculateImageBatchCost } from '@shared/ugcContracts';
import { useCreateUgcProject } from '@/features/projects/previewProjectsStore';
import type { PreparedImage } from '@/lib/image';

export function ImageAdsPage() {
  const navigate = useNavigate();
  const { createImageAd, busy } = useCreateUgcProject();

  const [templateId, setTemplateId] = useState(IMAGE_AD_TEMPLATES[0]!.id);
  const [productName, setProductName] = useState('Sérum Facial Vitamina C Pura');
  const [headline, setHeadline] = useState(IMAGE_AD_TEMPLATES[0]!.defaultHeadline);
  const [badgeText, setBadgeText] = useState(IMAGE_AD_TEMPLATES[0]!.defaultBadge);
  const [ctaText, setCtaText] = useState(IMAGE_AD_TEMPLATES[0]!.defaultCta);
  const [stylePrompt, setStylePrompt] = useState('');

  const [productPhoto, setProductPhoto] = useState<PreparedImage | null>(null);
  const [includeCreator, setIncludeCreator] = useState(false);
  const [creator, setCreator] = useState<SelectedVisualSource>({
    label: SHOWCASE_AVATARS[0]!.name,
    previewUrl: SHOWCASE_AVATARS[0]!.image_url,
    uploaded: null,
  });

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(IMAGE_AD_TEMPLATES[0]!.defaultRatio);
  const [engine, setEngine] = useState<EngineId>('nano-banana-2');
  const [count, setCount] = useState(1);

  const [studioDrawerOpen, setStudioDrawerOpen] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const tpl = IMAGE_AD_TEMPLATES.find((t) => t.id === templateId) ?? IMAGE_AD_TEMPLATES[0]!;
  const cost = calculateImageBatchCost({ engine, count });

  function selectTemplate(id: string) {
    const found = IMAGE_AD_TEMPLATES.find((t) => t.id === id);
    if (!found) return;
    setTemplateId(found.id);
    setHeadline(found.defaultHeadline);
    setBadgeText(found.defaultBadge);
    setCtaText(found.defaultCta);
    setAspectRatio(found.defaultRatio);
    setIncludeCreator(found.id === 'prova-social');
    setPreviewReady(true);
  }

  function fillWinnerExample() {
    selectTemplate('prova-social');
    setProductName('Sérum Facial Vitamina C Pura');
    setHeadline('Pele mais iluminada em 14 dias sem gastar fortuna');
    setBadgeText('MAIS VENDIDO');
    setCtaText('Garantir com desconto');
    setStylePrompt('Foto publicitária editorial com luz suave de estúdio destacando o frasco.');
    setPreviewReady(true);
    toast.success('Anúncio campeão preenchido! Confira a prévia no centro.');
  }

  async function submit() {
    if (!productName.trim() && !stylePrompt.trim()) {
      toast.error('Descreva a cena do anúncio ou preencha o nome do produto.');
      return;
    }
    const finalHeadline = headline.trim() || stylePrompt.trim().slice(0, 60);
    const proj = await createImageAd(
      {
        title: `Image Ad · ${productName.trim() || 'Criativo'}`,
        templateId,
        productName: productName.trim() || 'Produto em Destaque',
        headline: finalHeadline,
        badgeText: badgeText.trim(),
        ctaText: ctaText.trim(),
        stylePrompt: stylePrompt.trim(),
        engine,
        aspectRatio,
        count,
        productImageData: productPhoto?.data,
        avatarImageData: includeCreator ? creator.uploaded?.data : undefined,
        avatarUrl: includeCreator ? creator.previewUrl : tpl.thumbnail,
      },
      productPhoto?.previewUrl || (includeCreator ? creator.previewUrl : tpl.thumbnail),
    );
    if (proj) navigate('/projects');
  }

  const showPreviewCard = previewReady || Boolean(productPhoto) || stylePrompt.trim().length > 0;

  return (
    <div className="premium-workspace mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1480px] flex-col justify-between gap-4 px-6 pb-6 pt-4">
      {/* Palco central zen idêntico ao Influai (vazio limpo até escolher modelo ou digitar) */}
      <div className="flex flex-1 flex-col items-center justify-center py-6">
        {!showPreviewCard ? (
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,.24),transparent_55%),linear-gradient(135deg,#111a2f,#131024)] px-8 py-12 text-left shadow-[0_24px_60px_rgba(13,89,120,.2)] md:px-12 md:py-14">
            <img src="/showcase/internal-ads-new.png" alt="" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[52%] object-cover object-center opacity-70 mix-blend-screen" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-3/5 bg-gradient-to-l from-transparent via-[#111a2f]/70 to-[#111a2f]" />
            <div className="relative max-w-md space-y-2.5">
            <div className="mx-auto grid size-14 place-items-center text-fg-muted">
              <ImagePlus className="size-11 stroke-[1.5] text-accent" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">IMAGE ADS</h1>
            <p className="text-sm text-fg-muted">Crie imagens publicitárias incríveis em segundos</p>
            <div className="pt-3 text-xs font-semibold text-accent-light">Escolha um template, ajuste a oferta e visualize o criativo antes de gerar.</div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-2.5" data-guide-target="image-ad-submit">
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span className="font-semibold">Prévia do criativo · {tpl.title}</span>
              <span className="rounded bg-surface-2 px-2 py-0.5 font-semibold">{aspectRatio}</span>
            </div>
            <div
              className={clsx(
                'relative mx-auto overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-xl',
                aspectRatio === '9:16'
                  ? 'aspect-[9/16] max-h-[380px]'
                  : aspectRatio === '4:3'
                    ? 'aspect-[4/3]'
                    : 'aspect-square max-h-[340px]',
              )}
            >
              <img
                src={productPhoto?.previewUrl || (includeCreator ? creator.previewUrl : tpl.thumbnail)}
                alt=""
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/25" />

              {badgeText && (
                <span className="absolute left-3.5 top-3.5 rounded-lg bg-brand px-2.5 py-1 text-[11px] font-bold text-white shadow">
                  {badgeText}
                </span>
              )}

              <div className="absolute inset-x-4 bottom-4 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">{productName}</div>
                <div className="text-sm font-bold leading-snug text-white">{headline}</div>
                {ctaText && (
                  <span className="inline-block rounded-lg bg-white px-3 py-1 text-[11px] font-bold text-black">
                    {ctaText} →
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Painel opcional de estilos, copy e avatar (só aparece quando pedido) */}
      {studioDrawerOpen && (
        <div className="mx-auto w-full max-w-4xl space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-lg">
          <div data-guide-target="image-ad-templates" className="space-y-2.5">
            <div className="text-xs font-semibold text-fg-muted">1. Estilo pronto de anúncio</div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {IMAGE_AD_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTemplate(t.id)}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-xl border p-2 text-left transition',
                    templateId === t.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2 hover:border-fg-subtle',
                  )}
                >
                  <img src={t.thumbnail} alt="" className="size-11 shrink-0 rounded-lg object-cover object-top" />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold">{t.title}</div>
                    <div className="text-[11px] text-fg-muted">{t.defaultRatio}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg-muted">Nome do produto</span>
              <input
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value);
                  setPreviewReady(true);
                }}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg-muted">Selo (badge)</span>
              <input
                value={badgeText}
                onChange={(e) => {
                  setBadgeText(e.target.value);
                  setPreviewReady(true);
                }}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-fg-muted">Chamada principal (Headline)</span>
              <input
                value={headline}
                onChange={(e) => {
                  setHeadline(e.target.value);
                  setPreviewReady(true);
                }}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={includeCreator}
                onChange={(e) => {
                  setIncludeCreator(e.target.checked);
                  setPreviewReady(true);
                }}
                className="size-4 accent-[var(--accent)]"
              />
              Incluir influencer segurando o produto
            </label>
            <input
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="Texto do botão (CTA)"
              className="rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
          </div>

          {includeCreator && <QuickAvatarSelect value={creator} onChange={setCreator} compact />}
        </div>
      )}

      {/* Dock de prompt estilo Influai ancorado na base */}
      <div className="mx-auto w-full max-w-[880px] rounded-2xl border border-border bg-surface p-3 shadow-xl">
        <div className="flex items-start gap-2.5">
          {productPhoto ? (
            <div className="relative mt-1 shrink-0">
              <img src={productPhoto.previewUrl} alt="" className="size-11 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setProductPhoto(null)}
                aria-label="Remover foto do produto"
                className="absolute -right-1.5 -top-1.5 rounded-full bg-black/80 p-0.5 text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <ImagePicker
              label="Enviar foto do produto"
              onPicked={(img) => {
                setProductPhoto(img);
                setPreviewReady(true);
              }}
              className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              <Plus className="size-4" />
            </ImagePicker>
          )}

          <textarea
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            rows={2}
            placeholder="Descreva a cena do anúncio que imagina… ex.: frasco de sérum em mármore branco, gotas d’água e luz dourada da manhã"
            className="w-full resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-fg-subtle"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <PillSelect<EngineId>
              label="Motor de imagem"
              icon={<Cpu className="size-3.5 text-accent" />}
              value={engine}
              onChange={setEngine}
              options={ENGINES.map((e) => ({ value: e.id, label: e.label, hint: e.description }))}
            />

            <div className="flex items-center rounded-lg border border-border bg-surface-2 px-1 text-xs font-semibold text-fg-muted">
              <button
                type="button"
                onClick={() => setCount(Math.max(1, count - 1))}
                className="grid size-7 place-items-center rounded hover:text-fg"
                aria-label="Menos variações"
              >
                <Minus className="size-3" />
              </button>
              <span className="w-5 text-center">{count}</span>
              <button
                type="button"
                onClick={() => setCount(Math.min(4, count + 1))}
                className="grid size-7 place-items-center rounded hover:text-fg"
                aria-label="Mais variações"
              >
                <Plus className="size-3" />
              </button>
            </div>

            <PillSelect<AspectRatio>
              label="Proporção"
              icon={<RectangleHorizontal className="size-3.5" />}
              value={aspectRatio}
              onChange={(r) => {
                setAspectRatio(r);
                setPreviewReady(true);
              }}
              options={[
                { value: '1:1', label: '1:1', hint: 'Feed quadrado' },
                { value: '9:16', label: '9:16', hint: 'Stories e Reels' },
                { value: '4:3', label: '4:3', hint: 'Banner horizontal' },
              ]}
            />

            <button
              type="button"
              onClick={() => setStudioDrawerOpen((v) => !v)}
              className={clsx(
                'inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition',
                studioDrawerOpen ? 'bg-accent-soft text-accent' : 'bg-surface-3/70 text-fg-muted hover:text-fg',
              )}
            >
              <PenLine className="size-3.5" /> Desenhar
            </button>

            <button
              type="button"
              onClick={() => setStudioDrawerOpen((v) => !v)}
              className={clsx(
                'inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition',
                studioDrawerOpen ? 'bg-accent-soft text-accent' : 'bg-surface-3/70 text-fg-muted hover:text-fg',
              )}
            >
              <Layers className="size-3.5 text-accent" />
              {tpl.title.split(' ')[0]} · Modelos
            </button>

            <button
              type="button"
              onClick={fillWinnerExample}
              data-testid="image-ad-autofill"
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-surface-3/70 px-2.5 text-[11px] font-semibold text-accent transition hover:bg-accent-soft"
            >
              <Sparkles className="size-3" /> Exemplo 1-clique
            </button>
          </div>

          <Button variant="brand" size="md" onClick={() => void submit()} loading={busy} data-testid="image-ad-create-btn">
            <Upload className="hidden" />
            <Sparkles className="size-3.5" />
            Gerar · <CoinIcon className="size-3.5" /> {cost}
          </Button>
        </div>
      </div>
    </div>
  );
}
