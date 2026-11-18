import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Check, Film, ImagePlus, Music, Sparkles, Wand2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Brand';
import { ImagePicker } from '@/features/avatars/ImagePicker';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import { useMyAvatars } from '@/features/avatars/useAvatarData';
import { MUSIC_MOODS, TALKING_EMOTIONS, UGC_TEMPLATES, type UgcTemplate } from '@shared/ugcCatalog';
import {
  VIDEO_ENGINES,
  VOICE_OPTIONS,
  calculateUgcCost,
  type UgcSceneDraft,
  type VideoEngineId,
  type VoiceOptionId,
} from '@shared/ugcContracts';
import { useCreateUgcProject } from '@/features/projects/previewProjectsStore';
import { useSession } from '@/store/session';
import { buildAutoAdsDraft } from './ugcCartridges';
import type { PreparedImage } from '@/lib/image';

const STEPS = [
  '1. Template',
  '2. Imagem',
  '3. Ação',
  '4. Cenas',
  '5. Texto do áudio',
  '6. Voz e emoção',
  '7. Fundo musical',
  '8. Resumo',
];

export function AdsWizardModal({
  open,
  initialTemplate,
  onClose,
}: {
  open: boolean;
  initialTemplate: UgcTemplate | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { createProject, busy } = useCreateUgcProject();
  const myAvatars = useMyAvatars();
  const plan = useSession((s) => s.profile?.plan);
  const unlimited = plan === 'unlimited';

  const [step, setStep] = useState(0);
  const [tplFilter, setTplFilter] = useState<'all' | 'popular' | 'recent'>('all');
  const [orientation, setOrientation] = useState<'9:16' | '16:9'>('9:16');
  const [niche, setNiche] = useState<string>('Todos');
  const [search, setSearch] = useState('');
  const [selectedTpl, setSelectedTpl] = useState<UgcTemplate | null>(initialTemplate);
  const [creativeAi, setCreativeAi] = useState(false);

  const [productName, setProductName] = useState('');
  const [productImg, setProductImg] = useState<PreparedImage | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(SHOWCASE_AVATARS[0]!.image_url);
  const [customAvatar, setCustomAvatar] = useState<PreparedImage | null>(null);

  const [actionText, setActionText] = useState('');
  const [scenes, setScenes] = useState<UgcSceneDraft[]>([
    { index: 0, text: '', action: '', estimatedSeconds: 8 },
    { index: 1, text: '', action: '', estimatedSeconds: 8 },
  ]);
  const [language, setLanguage] = useState('Português (Brasil)');
  const [emotion, setEmotion] = useState('feliz');
  const [voiceType, setVoiceType] = useState<VoiceOptionId>('default');
  const [musicMood, setMusicMood] = useState<string>(MUSIC_MOODS[1]);
  const [engine, setEngine] = useState<VideoEngineId>('veo-3.1-fast');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');

  useEffect(() => {
    if (!open) return;
    setStep(initialTemplate ? 1 : 0);
    setSelectedTpl(initialTemplate);
    if (initialTemplate) {
      setOrientation(initialTemplate.orientation);
      const draft = buildAutoAdsDraft(initialTemplate, productName);
      setActionText(draft.action);
      setScenes(draft.scenes);
    }
  }, [open, initialTemplate]);

  const filteredTemplates = UGC_TEMPLATES.filter((t) => {
    if (tplFilter === 'popular' && !t.popular) return false;
    if (tplFilter === 'recent' && !t.recent) return false;
    if (t.orientation !== orientation) return false;
    if (niche !== 'Todos' && t.niche !== niche) return false;
    if (search.trim() && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function applyOneClickAutofill() {
    const auto = buildAutoAdsDraft(selectedTpl, productName || 'Produto em destaque');
    if (!productName.trim()) setProductName(selectedTpl?.title || 'Produto Destaque');
    setActionText(auto.action);
    setScenes(auto.scenes);
  }

  function updateSceneCount(nextCount: number) {
    const count = Math.max(1, Math.min(6, nextCount));
    setScenes((curr) =>
      Array.from({ length: count }, (_, i) => curr[i] ?? { index: i, text: `Cena ${i + 1}: mostra os detalhes e resultados do produto.`, action: actionText, estimatedSeconds: 8 }),
    );
  }

  const cost = calculateUgcCost({ engine, sceneCount: scenes.length, voiceType });

  async function submit() {
    const proj = await createProject({
      mode: 'ads',
      title: productName.trim() || selectedTpl?.title || 'Anúncio ADS com IA',
      engine,
      aspectRatio: orientation,
      language,
      templateId: selectedTpl?.id,
      emotion,
      voiceType,
      musicMood,
      captions: true,
      avatarUrl: customAvatar?.previewUrl || avatarUrl,
      avatarImageData: customAvatar?.data,
      productName: productName.trim() || 'Produto',
      productImageData: productImg?.data,
      scenes: scenes.map((s) => ({
        text: s.text.trim() || `Veja como ${productName || 'este produto'} funciona na prática.`,
        action: s.action || actionText,
        durationSeconds: 8,
      })),
    });
    if (proj) {
      onClose();
      navigate('/projects');
    }
  }

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        {unlimited ? (
          <span className="rounded-lg border border-accent/40 bg-accent-soft px-2 py-1 text-xs font-semibold text-fg" title="Plano Ilimitado usa lowerpriority e fixa vídeos em 8 segundos">
            lowerpriority · 8s · ilimitado
          </span>
        ) : (
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as VideoEngineId)}
            aria-label="Motor de vídeo"
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs font-semibold text-fg"
          >
            {VIDEO_ENGINES.map((e) => (
              <option key={e.id} value={e.id}>{e.label} · {e.creditsPerScene}/cena</option>
            ))}
          </select>
        )}
        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value as '720p' | '1080p')}
          aria-label="Resolução"
          className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs font-semibold text-fg"
        >
          <option value="1080p">1080p</option>
          <option value="720p">720p</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Voltar</Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button variant="primary" onClick={() => setStep((s) => s + 1)}>Próximo</Button>
        ) : (
          <Button variant="brand" onClick={() => void submit()} loading={busy} data-testid="wizard-generate-video" aria-label={unlimited ? 'Gerar vídeo no plano ilimitado' : `Gerar vídeo por ${cost} créditos`} title={unlimited ? 'Gerar vídeo · plano ilimitado · lowerpriority · 8s' : `Gerar vídeo · ${cost} créditos`}>
            <Film className="size-4" /> {unlimited ? 'Gerar Vídeo · Ilimitado' : <>Gerar Vídeo · <CoinIcon className="size-3.5" /> {cost}</>}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Criar Vídeo ADS (8 etapas)" size="xl" className="ads-wizard" footer={footer}>
      {/* Barra de etapas clicável no topo */}
      <div className="ads-wizard-steps mb-5 flex gap-1 overflow-x-auto pb-2 thin-scroll" role="tablist" aria-label="Etapas do assistente ADS">
        {STEPS.map((label, idx) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={step === idx}
            onClick={() => setStep(idx)}
            className={clsx(
              'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
              step === idx ? 'bg-brand text-white' : idx < step ? 'bg-accent-soft text-fg' : 'bg-surface-2 text-fg-muted hover:text-fg',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold uppercase md:text-3xl">Biblioteca de <span className="text-accent">modelos virais</span></h2>
          <div className="flex flex-wrap items-center gap-2">
            {([['all', 'Todos'], ['popular', 'Populares'], ['recent', 'Recentes']] as const).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTplFilter(k)}
                className={clsx('rounded-lg px-2.5 py-1 text-xs font-semibold', tplFilter === k ? 'bg-accent-soft text-fg' : 'bg-surface-2 text-fg-muted')}
              >
                {lbl}
              </button>
            ))}
            <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs font-semibold">
              {(['9:16', '16:9'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setOrientation(r)}
                  className={clsx('rounded-md px-2 py-1', orientation === r ? 'bg-surface text-fg shadow' : 'text-fg-muted')}
                >
                  {r === '9:16' ? 'Vertical 9:16' : 'Horizontal 16:9'}
                </button>
              ))}
            </div>
            <select value={niche} onChange={(e) => setNiche(e.target.value)} aria-label="Filtrar nicho" className="rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs">
              {['Todos', 'Skincare', 'Saúde', 'Fitness', 'Tech', 'Casa', 'Moda'].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar modelo…"
              className="ml-auto rounded-lg border border-border bg-surface-2 px-3 py-1 text-xs outline-none focus:border-accent"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <button
              type="button"
              onClick={() => {
                setCreativeAi(true);
                setSelectedTpl(null);
                setStep(1);
              }}
              className={clsx(
                'flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center bg-brand text-white transition hover:brightness-110',
                creativeAi && 'ring-brand',
              )}
            >
              <Sparkles className="size-7" />
              <div className="text-xs font-black uppercase tracking-wide">IA Criativa</div>
              <div className="text-[11px] text-white/85">Deixar a IA criar o vídeo do zero</div>
            </button>

            {filteredTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setCreativeAi(false);
                  setSelectedTpl(t);
                  const draft = buildAutoAdsDraft(t, productName);
                  setActionText(draft.action);
                  setScenes(draft.scenes);
                  setStep(1);
                }}
                className={clsx(
                  'group relative overflow-hidden rounded-2xl border bg-surface-2 text-left transition',
                  selectedTpl?.id === t.id ? 'border-accent ring-brand' : 'border-border hover:border-accent/50',
                )}
              >
                <img src={t.thumbnail} alt={t.title} className="aspect-[9/16] w-full object-cover object-top" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-2.5">
                  <div className="text-[10px] font-bold text-accent">{t.niche} · {t.duration}s</div>
                  <div className="truncate text-xs font-semibold text-white">{t.title}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold">Avatar (Opcional)</h3>
            <p className="mt-1 text-xs text-fg-muted">Escolha um modelo pronto, seus avatares ou envie uma foto.</p>
            <div className="mt-3 grid grid-cols-3 gap-2 max-h-60 overflow-y-auto thin-scroll">
              {[...myAvatars.data, ...SHOWCASE_AVATARS].slice(0, 9).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setAvatarUrl(a.image_url);
                    setCustomAvatar(null);
                  }}
                  className={clsx('relative overflow-hidden rounded-xl border', avatarUrl === a.image_url && !customAvatar ? 'border-accent ring-brand' : 'border-border')}
                >
                  <img src={a.image_url} alt={a.name} className="aspect-[3/4] w-full object-cover object-top" />
                </button>
              ))}
            </div>
            <ImagePicker
              label="Enviar foto própria do avatar"
              onPicked={(img) => setCustomAvatar(img)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 py-2.5 text-xs font-semibold hover:border-accent"
            >
              <ImagePlus className="size-4" /> {customAvatar ? `Foto: ${customAvatar.name}` : 'Fazer upload de rosto'}
            </ImagePicker>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold">Produto / Local *</h3>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Nome do produto (ex.: Sérum Facial Vitamina C)"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <ImagePicker
              label="Enviar foto do produto"
              onPicked={(img) => setProductImg(img)}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2 p-6 text-xs text-fg-muted hover:border-accent"
            >
              {productImg ? (
                <img src={productImg.previewUrl} alt="Produto selecionado" className="h-28 rounded-xl object-contain" />
              ) : (
                <>
                  <ImagePlus className="size-6 text-accent" />
                  <span>Clique para enviar foto do produto (JPG, PNG ou WEBP)</span>
                </>
              )}
            </ImagePicker>
            <Button variant="secondary" className="w-full" onClick={applyOneClickAutofill}>
              <Wand2 className="size-4 text-accent" /> Preencher anúncio automático (1 clique)
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">O que a pessoa faz com o produto na cena?</h3>
            <Button variant="ghost" size="sm" onClick={applyOneClickAutofill}>
              <Wand2 className="size-3.5 text-accent" /> Sugerir ação
            </Button>
          </div>
          <textarea
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            rows={4}
            placeholder="Ex.: Abre a embalagem sobre a bancada da cozinha, aplica duas gotas e sorri para a câmera."
            className="w-full rounded-xl border border-border bg-surface-2 p-3 text-sm outline-none focus:border-accent"
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Quantidade de cenas ({unlimited ? '8s cada' : 'até 10s cada'})</h3>
              <p className="text-xs text-fg-muted">
                {unlimited
                  ? 'Plano Ilimitado: motor lowerpriority, vídeos fixos em 8s e sem desconto de créditos.'
                  : `Omni Flash 1.2: ${VIDEO_ENGINES.find((e) => e.id === engine)?.creditsPerScene} créditos por cena.`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => updateSceneCount(scenes.length - 1)}>-</Button>
              <span className="w-14 text-center text-sm font-bold">{scenes.length} cena(s)</span>
              <Button variant="secondary" size="sm" onClick={() => updateSceneCount(scenes.length + 1)}>+</Button>
            </div>
          </div>
          <div className="space-y-2">
            {scenes.map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="mb-1 text-xs font-bold text-accent">Cena #{i + 1}</div>
                <input
                  value={s.action ?? ''}
                  onChange={(e) => setScenes((curr) => curr.map((item, idx) => (idx === i ? { ...item, action: e.target.value } : item)))}
                  placeholder={`Ação visual da cena ${i + 1}…`}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold">Texto falado por cena</h3>
          {scenes.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-2 p-3">
              <div className="mb-1 text-xs font-bold text-accent">Fala da Cena #{i + 1}</div>
              <textarea
                rows={2}
                value={s.text}
                onChange={(e) => setScenes((curr) => curr.map((item, idx) => (idx === i ? { ...item, text: e.target.value } : item)))}
                placeholder={`O que o avatar fala na cena ${i + 1}…`}
                className="w-full resize-none rounded-lg border border-border bg-surface p-2 text-xs outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
      )}

      {step === 5 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-xs font-bold">Idioma</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
              <option>Português (Brasil)</option>
              <option>English (US)</option>
              <option>Español</option>
            </select>
            <label className="block text-xs font-bold">Emoção na entrega</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TALKING_EMOTIONS.slice(0, 6).map((em) => (
                <button
                  key={em.id}
                  type="button"
                  onClick={() => setEmotion(em.id)}
                  className={clsx('rounded-lg border px-2 py-1.5 text-xs font-semibold', emotion === em.id ? 'border-accent bg-accent-soft text-fg' : 'border-border bg-surface-2 text-fg-muted')}
                >
                  {em.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold">Tipo de voz</label>
            {VOICE_OPTIONS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVoiceType(v.id)}
                className={clsx('flex w-full items-start justify-between rounded-xl border p-2.5 text-left text-xs', voiceType === v.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2')}
              >
                <span>
                  <strong className="block text-fg">{v.label}</strong>
                  <span className="text-fg-muted">{v.desc}</span>
                </span>
                <span className="shrink-0 font-bold text-accent">{v.extraPerScene ? `+${v.extraPerScene}/cena` : 'Grátis'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-bold"><Music className="size-4 text-accent" /> Fundo musical</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {MUSIC_MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMusicMood(m)}
                className={clsx('flex items-center justify-between rounded-xl border p-3 text-xs font-semibold', musicMood === m ? 'border-accent bg-accent-soft text-fg' : 'border-border bg-surface-2 text-fg-muted')}
              >
                {m}
                {musicMood === m && <Check className="size-4 text-accent" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-3 rounded-2xl border border-border bg-surface-2 p-4 text-sm">
          <div className="font-bold">Resumo da produção (clique em qualquer etapa acima para ajustar)</div>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div><span className="text-fg-subtle">Produto/Projeto:</span> <strong>{productName || selectedTpl?.title || 'Anúncio ADS'}</strong></div>
            <div><span className="text-fg-subtle">Modelo:</span> <strong>{creativeAi ? 'IA Criativa do zero' : selectedTpl?.title ?? 'Personalizado'}</strong></div>
            <div><span className="text-fg-subtle">Formato / Motor:</span> <strong>{orientation} · {engine} ({resolution})</strong></div>
            <div><span className="text-fg-subtle">Cenas / Duração:</span> <strong>{scenes.length} cena(s) (~{scenes.length * 8}s)</strong></div>
            <div><span className="text-fg-subtle">Voz / Música:</span> <strong>{voiceType} · {musicMood}</strong></div>
            <div><span className="text-fg-subtle">Custo total:</span> <strong className="text-accent">{cost} créditos</strong></div>
          </div>
        </div>
      )}
    </Modal>
  );
}
