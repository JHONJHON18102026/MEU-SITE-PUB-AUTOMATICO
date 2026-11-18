import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Film, ImagePlus, Link2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Brand';
import { StepGuideBanner } from '@/components/ui/StepGuideBanner';
import { ImagePicker } from '@/features/avatars/ImagePicker';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import { api, ApiClientError, type ScriptOptionDTO } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { type AspectRatio } from '@shared/contracts';
import { LINK_AD_STYLES, LINK_PLATFORMS, LINK_TONES } from '@shared/ugcCatalog';
import { VIDEO_ENGINES, calculateUgcCost, splitSpeechIntoScenes, type VideoEngineId } from '@shared/ugcContracts';
import { EXAMPLE_PRODUCT_LINKS, buildLocalScripts } from './ugcCartridges';
import { useCreateUgcProject } from '@/features/projects/previewProjectsStore';
import type { PreparedImage } from '@/lib/image';

export function LinkCreator() {
  const navigate = useNavigate();
  const { createProject, busy: creating } = useCreateUgcProject();

  const [step, setStep] = useState(0); // 0 URL -> 1 Produto -> 2 Config -> 3 Roteiro -> 4 Avatar -> 5 Estilo & Gerar
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);

  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [promoOn, setPromoOn] = useState(false);
  const [promoText, setPromoText] = useState('');
  const [productPhoto, setProductPhoto] = useState<PreparedImage | null>(null);
  const [productRemoteImg, setProductRemoteImg] = useState<string | null>(null);

  const [platform, setPlatform] = useState<string>(LINK_PLATFORMS[0]);
  const [ratio, setRatio] = useState<AspectRatio>('9:16');
  const [language, setLanguage] = useState('Português (Brasil)');
  const [tone, setTone] = useState<string>(LINK_TONES[0]);
  const [audience, setAudience] = useState('');

  const [loadingScripts, setLoadingScripts] = useState(false);
  const [scriptOptions, setScriptOptions] = useState<ScriptOptionDTO[]>([]);
  const [chosenScript, setChosenScript] = useState('');

  const [avatarUrl, setAvatarUrl] = useState<string | null>(SHOWCASE_AVATARS[0]!.image_url);
  const [adStyle, setAdStyle] = useState<string>('lifestyle');
  const [engine, setEngine] = useState<VideoEngineId>('veo-3.1-fast');

  async function extractFromUrl() {
    if (!url.trim()) return;
    setExtracting(true);
    try {
      if (!isSupabaseConfigured) {
        const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
        setProductName(`Produto ${host}`);
        setProductDesc('Produto extraído na prévia local — edite os benefícios principais antes de gerar os roteiros.');
        setProductRemoteImg('/showcase/modelo-01.webp');
        toast.info('Prévia local: preenchemos um rascunho editável a partir do domínio do link.');
        setStep(1);
        return;
      }
      const res = await api.extractProductLink(url.trim());
      setProductName(res.name);
      setProductDesc(res.description);
      setProductRemoteImg(res.imageUrl);
      setStep(1);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Não consegui ler esse link. Use "Criar do zero".');
    } finally {
      setExtracting(false);
    }
  }

  async function loadScriptsAndContinue() {
    if (!productName.trim()) {
      toast.error('Informe o nome do produto primeiro.');
      return;
    }
    setLoadingScripts(true);
    try {
      const opts = isSupabaseConfigured
        ? (
            await api.generateUgcScripts({
              mode: 'link',
              productName,
              productDescription: productDesc,
              platform,
              tone,
              audience,
              language,
              sceneCount: 2,
            })
          ).options
        : buildLocalScripts(productName, tone, 2);
      setScriptOptions(opts);
      setChosenScript(opts[0]?.script ?? '');
      setStep(3);
    } catch (err) {
      const fallback = buildLocalScripts(productName, tone, 2);
      setScriptOptions(fallback);
      setChosenScript(fallback[0]!.script);
      toast.info(err instanceof ApiClientError ? err.message : 'Roteiros sugeridos prontos para revisão.');
      setStep(3);
    } finally {
      setLoadingScripts(false);
    }
  }

  const scenes = splitSpeechIntoScenes(chosenScript || `Conheça o ${productName}.`, 8);
  const cost = calculateUgcCost({ engine, sceneCount: Math.max(1, scenes.length), voiceType: 'default' });

  async function generateFinalVideo() {
    const proj = await createProject({
      mode: 'link',
      title: productName.trim() || 'Anúncio por Link',
      engine,
      aspectRatio: ratio,
      language,
      captions: true,
      avatarUrl: avatarUrl || '/showcase/modelo-01.webp',
      productName,
      productImageData: productPhoto?.data,
      scenes: (scenes.length ? scenes : [{ index: 0, text: `Conheça ${productName}!`, estimatedSeconds: 8 }]).map((s) => ({
        text: s.text,
        action: `Estilo ${adStyle} para ${platform}: apresentando ${productName}`,
        durationSeconds: s.estimatedSeconds,
      })),
    });
    if (proj) navigate('/projects');
  }

  return (
    <div className="premium-workspace mx-auto max-w-[1152px] space-y-16" data-guide-target="link-current-box">
      <StepGuideBanner guideKey="link" currentStep={step} />

      {step === 0 && (
        <div className="space-y-6" data-guide-target="link-url-box">
          <div className="grid items-center gap-12 rounded-xl border border-border bg-surface p-6 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-[48px] sm:leading-none">
                TRANSFORME QUALQUER PRODUTO EM UM <span className="text-brand">VÍDEO PUBLICITÁRIO</span>
              </h2>
              <p className="text-base leading-relaxed text-fg-muted md:text-xl">
                Cole o link do produto e criaremos um vídeo scroll-stopping com avatares de IA e narração natural em minutos.
              </p>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-fg-subtle">URL da página do produto</label>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-1 items-center gap-2 rounded-[8px] border border-border bg-surface-2 px-3 focus-within:border-accent">
                    <Link2 className="size-4 text-fg-subtle" />
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Cole a URL do produto (https://...)"
                      aria-label="URL da página do produto"
                      className="h-14 w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                  <Button variant="brand" size="lg" disabled={!url.trim()} loading={extracting} onClick={() => void extractFromUrl()}>
                    Continuar <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={() => setStep(1)}>
                  Criar do zero
                </Button>
                <button
                  type="button"
                  data-testid="link-fill-example"
                  onClick={() => {
                    const ex = EXAMPLE_PRODUCT_LINKS[0]!;
                    setUrl(ex.url);
                    setProductName(ex.name);
                    setProductDesc(ex.description);
                    setProductRemoteImg(ex.imageUrl);
                    setAudience(ex.audience);
                    setStep(1);
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-[7px] bg-accent-soft px-3 text-xs font-semibold text-accent hover:brightness-110"
                >
                  <Wand2 className="size-3.5" /> Testar exemplo (1 clique)
                </button>
              </div>
            </div>

            <div className="relative mx-auto hidden h-[600px] w-full overflow-hidden rounded-xl border border-border bg-surface-2 md:block">
              <img src="/showcase/modelo-01.webp" alt="Exemplo de anúncio UGC" className="h-full w-full object-cover object-top" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 text-xs font-semibold text-white">
                Sérum Vitamina C · Exemplo 9:16
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { n: '1', title: 'Adicione o link do produto', desc: 'Extraímos imagens, título e benefícios direto da página ou do cadastro manual.' },
              { n: '2', title: 'Escolha o estilo do anúncio', desc: 'Selecione Lifestyle, Luxury ou Minimal e escolha um dos roteiros gerados pela IA.' },
              { n: '3', title: 'Gere e baixe em Projetos', desc: 'Cada cena tem ~8–10 segundos. Cenas que falharem voltam direto para o saldo.' },
            ].map((card) => (
              <div key={card.n} className="rounded-2xl border border-border bg-surface p-5">
                <span className="inline-grid size-7 place-items-center rounded-full bg-brand text-xs font-bold text-white">{card.n}</span>
                <h3 className="mt-3 text-sm font-black uppercase">{card.title}</h3>
                <p className="mt-1 text-xs text-fg-muted">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-5 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Informações do produto</h3>
            <label className="block text-xs font-semibold">
              Nome do produto
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex.: Creme facial hidratante"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block text-xs font-semibold">
              Descrição e benefícios ({productDesc.length}/800)
              <textarea
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                maxLength={800}
                rows={4}
                placeholder="Descreva os principais benefícios do produto…"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm outline-none focus:border-accent"
              />
            </label>
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <label className="flex items-center justify-between text-xs font-semibold">
                Ativar informações promocionais
                <input type="checkbox" checked={promoOn} onChange={(e) => setPromoOn(e.target.checked)} className="size-4 accent-[var(--accent)]" />
              </label>
              {promoOn && (
                <input
                  value={promoText}
                  onChange={(e) => setPromoText(e.target.value)}
                  placeholder="Ex.: Frete grátis hoje / 20% OFF"
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs outline-none"
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Imagem principal do produto</h3>
            {(productPhoto?.previewUrl || productRemoteImg) && (
              <img
                src={productPhoto?.previewUrl || productRemoteImg || ''}
                alt={productName || 'Produto'}
                className="h-44 w-full rounded-2xl border border-border bg-surface-2 object-contain p-2"
              />
            )}
            <ImagePicker
              label="Enviar foto do produto"
              onPicked={(img) => setProductPhoto(img)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2 p-5 text-sm font-semibold hover:border-accent"
            >
              <ImagePlus className="size-5 text-accent" /> Adicionar ou trocar imagem principal
            </ImagePicker>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="size-4" /> Voltar</Button>
              <Button variant="primary" disabled={!productName.trim()} onClick={() => setStep(2)}>
                Continuar <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-lg font-bold">Configurações de vídeo</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1.5 text-xs font-bold">Plataforma</div>
              <div className="flex flex-wrap gap-1.5">
                {LINK_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={clsx('rounded-lg border px-3 py-1.5 text-xs font-semibold', platform === p ? 'border-accent bg-accent-soft text-fg' : 'border-border bg-surface-2 text-fg-muted')}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-bold">Proporção da tela</div>
              <div className="flex gap-2">
                {(['9:16', '16:9', '1:1'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRatio(r)}
                    className={clsx('flex-1 rounded-xl border py-2 text-xs font-bold', ratio === r ? 'border-accent bg-accent-soft text-fg' : 'border-border bg-surface-2 text-fg-muted')}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-xs font-bold">
              Linguagem
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-normal">
                <option>Português (Brasil)</option>
                <option>English</option>
                <option>Español</option>
              </select>
            </label>
            <label className="block text-xs font-bold">
              Tom de fala
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-normal">
                {LINK_TONES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs font-bold">
            Público-alvo
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Ex.: mulheres de 25 a 45 anos buscando rotina prática de skincare"
              className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-normal outline-none focus:border-accent"
            />
          </label>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="size-4" /> Voltar</Button>
            <Button variant="brand" loading={loadingScripts} onClick={() => void loadScriptsAndContinue()}>
              <Sparkles className="size-4" /> Gerar opções de roteiro
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-lg font-bold">Escolha ou edite o roteiro</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {scriptOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChosenScript(opt.script)}
                className={clsx('rounded-2xl border p-4 text-left transition', chosenScript === opt.script ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2')}
              >
                <div className="text-xs font-bold text-accent">{opt.title}</div>
                <p className="mt-1.5 text-xs text-fg-muted">{opt.script}</p>
              </button>
            ))}
          </div>
          <label className="block text-xs font-bold">
            Use ou edite seu script ({scenes.length} cena(s) estimada(s)):
            <textarea
              rows={4}
              value={chosenScript}
              onChange={(e) => setChosenScript(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm font-normal outline-none focus:border-accent"
            />
          </label>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="size-4" /> Voltar</Button>
            <Button variant="primary" disabled={!chosenScript.trim()} onClick={() => setStep(4)}>Continuar <ArrowRight className="size-4" /></Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold">Escolha o avatar (opcional)</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAvatarUrl(null);
                setStep(5);
              }}
            >
              Continuar sem Avatar (IA escolhe) →
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {SHOWCASE_AVATARS.slice(0, 6).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAvatarUrl(a.image_url)}
                className={clsx('overflow-hidden rounded-xl border', avatarUrl === a.image_url ? 'border-accent ring-brand' : 'border-border')}
              >
                <img src={a.image_url} alt={a.name} className="aspect-[3/4] w-full object-cover object-top" />
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft className="size-4" /> Voltar</Button>
            <Button variant="primary" onClick={() => setStep(5)}>Escolher estilo <ArrowRight className="size-4" /></Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-lg font-bold">Estilo visual e tecnologia</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {LINK_AD_STYLES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setAdStyle(st.id)}
                className={clsx('rounded-2xl border p-4 text-left', adStyle === st.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2')}
              >
                <div className="text-sm font-black uppercase">{st.label}</div>
                <p className="mt-1 text-xs text-fg-muted">{st.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface-2 p-4">
            <div className="space-y-1 text-xs">
              <div><strong>{productName}</strong> · {platform} ({ratio}) · Estilo {adStyle}</div>
              <div className="text-fg-muted">{scenes.length} cena(s) (~{scenes.length * 8}s)</div>
            </div>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as VideoEngineId)}
              aria-label="Tecnologia de vídeo"
              className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold"
            >
              {VIDEO_ENGINES.map((e) => <option key={e.id} value={e.id}>{e.label} · {e.creditsPerScene}/cena</option>)}
            </select>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(4)}><ArrowLeft className="size-4" /> Voltar</Button>
            <Button variant="brand" size="lg" loading={creating} onClick={() => void generateFinalVideo()} data-testid="link-generate-video">
              <Film className="size-4" /> Gerar Vídeo · <CoinIcon className="size-3.5" /> {cost}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
