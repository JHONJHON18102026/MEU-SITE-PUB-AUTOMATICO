import { useRef, useState } from 'react';
import { ArrowRight, Bot, Clock3, Copy, ImagePlus, ShieldCheck, Sparkles, Target, UploadCloud, WandSparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { api, type DirectorPlan } from '@/lib/api';
import type { DirectorPresetId } from '@shared/directorContracts';
import { prepareImage } from '@/lib/image';
import { saveDirectorCanvasHandoff, useAvatarStudio } from '@/features/avatars/avatarStore';

type RefFile = { file: File; preview: string };
type ReferenceMode = 'frames' | 'elements';

const OBJECTIVES = ['Anúncio UGC', 'Vídeo de produto', 'Conteúdo viral', 'Personagem consistente'];
const FORMATS = ['9:16', '16:9', '1:1'] as const;
const DURATIONS = [8, 10, 15] as const;
const DIRECTOR_SKILLS: Array<{
  id: DirectorPresetId;
  title: string;
  detail: string;
  objective: string;
  duration: (typeof DURATIONS)[number];
  referenceMode: ReferenceMode;
  briefing: string;
  aspectRatio?: (typeof FORMATS)[number];
  route?: string;
}> = [
  {
    id: 'ugc-product', title: 'UGC de produto', detail: 'Demonstração natural com criador e chamada para ação.',
    objective: 'Anúncio UGC', duration: 8, referenceMode: 'frames',
    briefing: 'Crie um anúncio UGC vertical de 8 segundos. Mostre o produto de perto, demonstre o principal benefício em uma situação real e finalize com uma chamada de ação curta e natural.',
  },
  {
    id: 'avatar', title: 'Criação de avatar', detail: 'Abre o criador de personagem com o fluxo certo para consistência visual.',
    objective: 'Personagem consistente', duration: 8, referenceMode: 'elements', route: '/avatars?panel=create&skill=avatar',
    briefing: 'Crie um avatar adulto consistente, com identidade visual definida, aparência realista e detalhes reaproveitáveis em futuras cenas.',
  },
  {
    id: 'character', title: 'Personagem consistente', detail: 'Mantém rosto, roupa e detalhes usando Elementos.',
    objective: 'Personagem consistente', duration: 8, referenceMode: 'elements',
    briefing: 'Crie uma cena curta com personagem consistente. Preserve rosto, cabelo, roupa, proporções e identidade em todas as imagens de referência, com movimento natural e sem colagem.',
  },
  {
    id: 'storyboard', title: 'Storyboard em cenas', detail: 'Começa no frame inicial e segue uma direção de cena.',
    objective: 'Vídeo de produto', duration: 8, referenceMode: 'frames',
    briefing: 'Crie um vídeo que comece exatamente na imagem inicial. Siga o movimento e a composição do storyboard com continuidade visual, câmera suave e uma única ação clara por cena.',
  },
  {
    id: 'viral', title: 'Gancho viral', detail: 'Abre com impacto, demonstra e encerra com CTA.',
    objective: 'Conteúdo viral', duration: 8, referenceMode: 'elements',
    briefing: 'Crie um vídeo vertical de ritmo rápido com um gancho visual no primeiro segundo, demonstração objetiva do produto e chamada para ação direta no final. Preserve os elementos enviados.',
  },
  {
    id: 'tiktok-shop-influencer', title: 'TikTok Shop · Influenciadora', detail: 'A apresentadora demonstra o produto e fala diretamente com a câmera.',
    objective: 'Vídeo de produto', duration: 10, aspectRatio: '9:16', referenceMode: 'elements',
    briefing: 'Apresente o produto em formato UGC para TikTok Shop. A influenciadora fala diretamente com a câmera em português brasileiro, com linguagem natural e comercial. Estruture a fala em gancho, apresentação do produto, benefício somente se comprovado e chamada para ação. Preserve todos os detalhes visíveis; não invente características, benefícios, preço, desconto ou urgência. Prepare prompts separados para a capa promocional, a imagem limpa e o vídeo.',
  },
  {
    id: 'tiktok-shop-hands', title: 'TikTok Shop · Demonstração com as mãos', detail: 'Mostra apenas as mãos e o produto, com narração feminina.',
    objective: 'Vídeo de produto', duration: 10, aspectRatio: '9:16', referenceMode: 'elements',
    briefing: 'Crie um anúncio para TikTok Shop mostrando exclusivamente mãos humanas e o produto, sem rostos, influenciadora ou apresentadora. Use narração feminina em português brasileiro. Estruture a fala em gancho, apresentação do produto, benefício somente se comprovado e chamada para ação. Preserve formato, cor, embalagem e detalhes; não invente características, benefícios, preço, desconto ou urgência. Prepare prompts separados para a capa promocional, a imagem limpa e o vídeo.',
  },
  {
    id: 'tiktok-shop-pov', title: 'TikTok Shop · POV', detail: 'Demonstração em primeira pessoa com narração de experiência pessoal.',
    objective: 'Vídeo de produto', duration: 10, aspectRatio: '9:16', referenceMode: 'elements',
    briefing: 'Crie uma demonstração para TikTok Shop em perspectiva POV, sem rostos, influenciadora ou apresentadora. Use narração feminina em primeira pessoa, sem fingir experiência de uso nem afirmar resultados que não estejam comprovados. Estruture a fala em gancho, apresentação do produto, benefício somente se comprovado e chamada para ação. Preserve o produto e não invente características, benefícios, preço, desconto ou urgência. Prepare prompts separados para a capa promocional, a imagem limpa e o vídeo.',
  },
];

function PlanTextOutput({ title, value }: { title: string; value: string }) {
  return (
    <details className="rounded-xl border border-white/8 bg-white/[.025] p-3">
      <summary className="cursor-pointer text-[10px] font-bold">{title}</summary>
      <textarea readOnly value={value} rows={5} className="mt-2 w-full resize-y rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-[10px] leading-4 text-fg-muted" />
      <button type="button" onClick={() => void navigator.clipboard.writeText(value).then(() => toast.success(`${title} copiado.`)).catch(() => toast.error("Não consegui copiar o texto."))} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[9px] font-bold hover:border-accent">
        <Copy className="size-3" /> Copiar
      </button>
    </details>
  );
}

export function AgentDirectorPage() {
  const navigate = useNavigate();
  const { set: setAvatarStudio } = useAvatarStudio();
  const inputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const presenterInputRef = useRef<HTMLInputElement>(null);
  const [briefing, setBriefing] = useState('');
  const [presetId, setPresetId] = useState<DirectorPresetId>('custom');
  const [objective, setObjective] = useState(OBJECTIVES[0]!);
  const [format, setFormat] = useState<(typeof FORMATS)[number]>('9:16');
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(8);
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>('frames');
  const [refs, setRefs] = useState<RefFile[]>([]);
  const [productRef, setProductRef] = useState<RefFile | null>(null);
  const [presenterRef, setPresenterRef] = useState<RefFile | null>(null);
  const [plan, setPlan] = useState<DirectorPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [handingOff, setHandingOff] = useState(false);
  const isTikTokShop = presetId.startsWith('tiktok-shop-');
  const isTikTokInfluencerMode = presetId === 'tiktok-shop-influencer';
  const referenceCount = isTikTokShop ? (productRef ? 1 : 0) + (isTikTokInfluencerMode && presenterRef ? 1 : 0) : refs.length;
  const missingRequiredReference = isTikTokShop ? !productRef : referenceMode === 'frames' && refs.length === 0;
  const missingReferenceMessage = isTikTokShop
    ? 'Anexe uma foto do produto para habilitar a criação do plano.'
    : 'Anexe o frame inicial obrigatório para habilitar a criação do plano.';

  function applySkill(skill: (typeof DIRECTOR_SKILLS)[number]) {
    if (skill.route) {
      navigate(skill.route);
      return;
    }
    setPresetId(skill.id);
    setBriefing(skill.briefing);
    setObjective(skill.objective);
    setDuration(skill.duration);
    if (skill.aspectRatio) setFormat(skill.aspectRatio);
    setReferenceMode(skill.referenceMode);
    if (skill.referenceMode === 'frames') setRefs((current) => current.slice(0, 2));
    setPlan(null);
    if (skill.id.startsWith('tiktok-shop-')) {
      setRefs([]);
      if (skill.id !== 'tiktok-shop-influencer' || presetId !== 'tiktok-shop-influencer') setPresenterRef(null);
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const maxFiles = referenceMode === 'frames' ? 2 : 8;
    const selected = Array.from(files);
    const supported = selected.filter((file) => ['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(file.type));
    if (supported.length < selected.length) toast.error('Alguns arquivos foram ignorados. Use PNG, JPG, WEBP ou AVIF.');
    const remaining = Math.max(0, maxFiles - refs.length);
    if (supported.length > remaining) toast.error('Limite de imagens atingido para este tipo de referência.');
    const added = supported.slice(0, remaining).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setRefs((current) => [...current, ...added]);
  }

  function selectProduct(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(file.type)) {
      toast.error('Use uma imagem PNG, JPG, WEBP ou AVIF para o produto.');
      return;
    }
    setProductRef({ file, preview: URL.createObjectURL(file) });
    setPlan(null);
  }

  function selectPresenter(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(file.type)) {
      toast.error('Use uma imagem PNG, JPG, WEBP ou AVIF para a pessoa de referência.');
      return;
    }
    setPresenterRef({ file, preview: URL.createObjectURL(file) });
    setPlan(null);
  }

  async function createPlan() {
    if (briefing.trim().length < 12) return;
    if (missingRequiredReference) {
      toast.error(isTikTokShop ? 'Anexe primeiro a foto do produto para o Diretor analisar.' : 'Anexe primeiro o frame inicial para o Diretor analisar.');
      return;
    }
    setLoading(true);
    try {
      const sourceReferences = isTikTokShop
        ? [
            ...(productRef ? [{ ...productRef, role: 'Produto' }] : []),
            ...(isTikTokInfluencerMode && presenterRef ? [{ ...presenterRef, role: 'Pessoa de referência' }] : []),
          ]
        : refs.map((reference) => ({ ...reference, role: 'Referência visual' }));
      // Redimensiona antes de enviar: fotos de celular em base64 podem ultrapassar
      // o limite do contrato mesmo quando o arquivo original parece aceitável.
      const references = await Promise.all(sourceReferences.map(async ({ file, role }) => {
        const image = await prepareImage(file);
        return { name: `${role} · ${image.name}`.slice(0, 120), dataUrl: `data:${image.mimeType};base64,${image.data}` };
      }));
      const result = await api.createDirectorPlan({ presetId, briefing, objective, aspectRatio: format, durationSeconds: duration, references });
      setPlan({ ...result.plan, referenceMode });
      toast.success('Plano de produção criado. Revise antes de aprovar.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o plano.');
    } finally {
      setLoading(false);
    }
  }

  async function openCanvas(target: 'cover' | 'clean' | 'video') {
    if (!plan || handingOff) return;
    const prompt = target === 'cover' ? plan.coverImagePrompt : target === 'clean' ? plan.cleanImagePrompt : plan.flowVideoPrompt;
    if (!prompt) {
      toast.error('O plano não trouxe esse prompt. Gere o plano novamente antes de abrir o canvas.');
      return;
    }
    if (isTikTokShop && !productRef) {
      toast.error('Anexe primeiro a foto do produto para preparar o canvas.');
      return;
    }
    // O canvas do Avatar aceita uma foto de produto e até três outras referências.
    // Barramos anexos extras para não descartar silenciosamente nenhuma referência.
    const maxSourceImages = isTikTokShop ? 4 : 3;
    if (!isTikTokShop && refs.length > maxSourceImages) {
      toast.error(`O canvas aceita até ${maxSourceImages} imagens neste fluxo. Remova as referências excedentes antes de continuar.`);
      return;
    }
    setHandingOff(true);
    try {
      const productImage = isTikTokShop ? await prepareImage(productRef!.file) : null;
      const presenterImage = isTikTokInfluencerMode && presenterRef ? await prepareImage(presenterRef.file) : null;
      const preparedReferences = isTikTokShop
        ? []
        : await Promise.all(refs.map(({ file }) => prepareImage(file)));
      const referenceImages = preparedReferences.slice(0, 3);
      const composerMode: 'video' | 'image' = target === 'video' ? 'video' : 'image';
      const canvasHandoff = {
        tab: 'explore' as const,
        panelTab: composerMode === 'video' ? 'templates' as const : 'create' as const,
        composerMode,
        useInfluencerPreset: false,
        baseAvatar: null,
        basePhoto: presenterImage,
        prompt: prompt.slice(0, 2000),
        productImage,
        referenceImages,
        aspectRatio: plan.aspectRatio,
        count: 1,
        videoCount: 1,
        videoEngine: plan.engineId,
        videoDurationSeconds: plan.engineId === 'omni-flash' ? Math.min(10, plan.totalDurationSeconds) : 8,
      };
      saveDirectorCanvasHandoff(canvasHandoff);
      setAvatarStudio(canvasHandoff);
      navigate(`/avatars?tab=explore&media=${composerMode}&panel=${composerMode === 'video' ? 'templates' : 'create'}&handoff=director`);
      toast.success('Plano e referências preparados no canvas. Confira os anexos e clique em Gerar quando estiver pronto.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não consegui preparar as referências para o canvas.');
    } finally {
      setHandingOff(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1460px] px-5 pb-20 pt-7 md:px-8 lg:px-10 2xl:px-0">
      <section className="relative overflow-hidden rounded-[28px] border border-accent/25 bg-[linear-gradient(135deg,#171429_0%,#111422_58%,#0b1720_100%)] px-6 py-7 shadow-[0_24px_70px_rgba(15,8,40,.36)] md:px-8">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-accent-light"><Bot className="size-3.5" /> Direção inteligente de produção</span>
            <h1 className="mt-4 text-3xl font-black tracking-[-.035em] text-white md:text-5xl">Agente Diretor</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Descreva a produção e anexe produto e personagem em campos separados. O Diretor prepara o plano para sua aprovação.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success/10 px-4 py-3"><ShieldCheck className="size-5 text-success" /><div><div className="text-[10px] font-black uppercase tracking-[.14em] text-success">Controle do usuário</div><div className="mt-0.5 text-[11px] text-white/65">Nada é gerado sem aprovação</div></div></div>
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-white/10 bg-surface p-5 shadow-[0_16px_42px_rgba(0,0,0,.14)] md:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><span className="text-[10px] font-black uppercase tracking-[.16em] text-accent">Skills do Diretor</span><h2 className="mt-1 text-lg font-black">Comece por um fluxo pronto</h2><p className="mt-1 text-xs text-fg-muted">Cada skill preenche o briefing e seleciona o tipo certo de referência. Você mantém o controle total antes de gerar.</p></div><span className="text-[10px] font-semibold text-fg-subtle">Sem geração automática</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{DIRECTOR_SKILLS.map((skill) => <button key={skill.id} type="button" onClick={() => applySkill(skill)} className="group rounded-2xl border border-border bg-surface-2 p-4 text-left transition hover:-translate-y-0.5 hover:border-accent/60 hover:bg-accent/[.06]"><span className="grid size-8 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white"><WandSparkles className="size-3.5" /></span><span className="mt-3 block text-xs font-black">{skill.title}</span><span className="mt-1 block text-[10px] leading-4 text-fg-muted">{skill.detail}</span><span className="mt-3 inline-flex rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[9px] font-bold text-fg-subtle">{skill.route ? 'Avatar Studio' : `${skill.referenceMode === 'frames' ? 'Frames' : 'Elementos'} · ${skill.duration}s`}</span></button>)}</div>
      </section>

      <div className="mt-5 grid items-stretch gap-5 xl:grid-cols-2">
        <section className="h-full rounded-[24px] border border-white/10 bg-surface shadow-[0_20px_55px_rgba(0,0,0,.18)]">
          <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4 md:px-6"><span className="grid size-10 place-items-center rounded-xl bg-accent text-white"><WandSparkles className="size-4" /></span><div><h2 className="text-sm font-black">Descreva a produção</h2><p className="mt-0.5 text-[11px] text-fg-muted">Escreva naturalmente. O Diretor transforma a ideia em plano técnico.</p></div></header>
          <div className="space-y-5 p-5 md:p-6">
            <label className="block"><span className="mb-2 flex justify-between text-[11px] font-bold"><span>O que você quer criar?</span><span className="font-medium text-fg-subtle">{briefing.length}/1200</span></span><textarea value={briefing} maxLength={1200} onChange={(e) => { setBriefing(e.target.value); setPlan(null); }} placeholder="Ex.: Quero um anúncio UGC de protetor solar com uma criadora jovem, mostrando o produto e terminando com uma chamada para compra..." className="min-h-36 w-full resize-y rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-sm leading-6 outline-none transition placeholder:text-fg-subtle focus:border-accent/70 focus:ring-4 focus:ring-accent/10" /></label>
            <div className="grid gap-4 md:grid-cols-3">
              <label><span className="mb-2 block text-[11px] font-bold">Objetivo</span><select value={objective} onChange={(e) => setObjective(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-xs outline-none focus:border-accent">{OBJECTIVES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span className="mb-2 block text-[11px] font-bold">Formato</span><select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-xs outline-none focus:border-accent">{FORMATS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span className="mb-2 block text-[11px] font-bold">Duração</span><select value={duration} onChange={(e) => setDuration(Number(e.target.value) as typeof duration)} className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-xs outline-none focus:border-accent">{DURATIONS.map((item) => <option key={item} value={item}>{item} segundos</option>)}</select></label>
            </div>
            <div>
              <div className="mb-2 flex justify-between"><span className="text-[11px] font-bold">{isTikTokShop ? 'Anexos do TikTok Shop' : 'Referências visuais'}</span><span className="text-[10px] text-fg-subtle">PNG, JPG, WEBP ou AVIF</span></div>
              {isTikTokShop ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input ref={productInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="hidden" onChange={(event) => { selectProduct(event.target.files); event.target.value = ''; }} />
                  <div className="rounded-xl border border-border bg-surface-2 p-3">
                    <div className="text-[11px] font-bold">Produto <span className="text-danger">· obrigatório</span></div>
                    <p className="mt-1 text-[9px] leading-4 text-fg-subtle">Envie uma foto focada no produto; ela irá para o slot Produto no canvas.</p>
                    {productRef ? <div className="mt-2 flex items-center gap-2"><img src={productRef.preview} alt="Referência do produto" className="size-14 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-[10px]">{productRef.file.name}</span><button type="button" onClick={() => { setProductRef(null); setPlan(null); }} aria-label="Remover foto do produto" className="rounded-lg p-1 text-fg-subtle hover:text-danger"><X className="size-3.5" /></button></div> : <button type="button" onClick={() => productInputRef.current?.click()} className="mt-2 flex min-h-16 w-full items-center justify-center rounded-lg border border-dashed border-accent/35 px-3 text-[10px] font-semibold text-fg-muted hover:border-accent">Adicionar foto do produto</button>}
                    {productRef && <button type="button" onClick={() => productInputRef.current?.click()} className="mt-2 text-[9px] font-semibold text-accent">Trocar foto do produto</button>}
                  </div>
                  {isTikTokInfluencerMode && <>
                    <input ref={presenterInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="hidden" onChange={(event) => { selectPresenter(event.target.files); event.target.value = ''; }} />
                    <div className="rounded-xl border border-border bg-surface-2 p-3">
                      <div className="text-[11px] font-bold">Personagem <span className="text-fg-subtle">· opcional</span></div>
                      <p className="mt-1 text-[9px] leading-4 text-fg-subtle">Envie uma foto separada da pessoa para preencher o slot Influencer.</p>
                      {presenterRef ? <div className="mt-2 flex items-center gap-2"><img src={presenterRef.preview} alt="Referência da pessoa" className="size-14 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-[10px]">{presenterRef.file.name}</span><button type="button" onClick={() => { setPresenterRef(null); setPlan(null); }} aria-label="Remover foto do personagem" className="rounded-lg p-1 text-fg-subtle hover:text-danger"><X className="size-3.5" /></button></div> : <button type="button" onClick={() => presenterInputRef.current?.click()} className="mt-2 flex min-h-16 w-full items-center justify-center rounded-lg border border-dashed border-accent/35 px-3 text-[10px] font-semibold text-fg-muted hover:border-accent">Adicionar foto do personagem</button>}
                      {presenterRef && <button type="button" onClick={() => presenterInputRef.current?.click()} className="mt-2 text-[9px] font-semibold text-accent">Trocar foto do personagem</button>}
                    </div>
                  </>}
                </div>
              ) : <>
                <div className="mb-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setReferenceMode('frames'); setRefs((current) => current.slice(0, 2)); setPlan(null); }} className={`rounded-xl border p-3 text-left transition ${referenceMode === 'frames' ? 'border-accent bg-accent/10' : 'border-border bg-surface-2 hover:border-accent/50'}`}><span className="block text-[11px] font-bold">Frames</span><span className="mt-1 block text-[9px] leading-4 text-fg-muted">Imagem inicial obrigatória; final opcional.</span></button><button type="button" onClick={() => { setReferenceMode('elements'); setPlan(null); }} className={`rounded-xl border p-3 text-left transition ${referenceMode === 'elements' ? 'border-accent bg-accent/10' : 'border-border bg-surface-2 hover:border-accent/50'}`}><span className="block text-[11px] font-bold">Elementos</span><span className="mt-1 block text-[9px] leading-4 text-fg-muted">Até 8 imagens para manter personagem e produto.</span></button></div>
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple className="hidden" onChange={(event) => addFiles(event.target.files)} />
                <button type="button" onClick={() => inputRef.current?.click()} className="group flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-accent/35 bg-accent/[.035] px-5 py-5 transition hover:border-accent/70 hover:bg-accent/[.07]"><span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white"><UploadCloud className="size-4" /></span><span className="mt-2 text-xs font-bold">{referenceMode === 'frames' ? 'Anexar frame inicial e quadro final opcional' : 'Anexar personagem, produto ou storyboard'}</span><span className="mt-1 text-[10px] text-fg-subtle">{referenceMode === 'frames' ? 'Até 2 imagens' : 'Até 8 imagens'}</span></button>
                {refs.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{refs.map((item, index) => <div key={`${item.file.name}-${index}`} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-2"><img src={item.preview} alt="" className="size-9 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-[10px] font-semibold">{referenceMode === 'frames' ? (index === 0 ? 'Frame inicial · ' : 'Frame final · ') : 'Elemento · '}{item.file.name}</span><button type="button" onClick={() => setRefs((current) => current.filter((_, i) => i !== index))} className="rounded-lg p-1 text-fg-subtle hover:text-danger"><X className="size-3" /></button></div>)}</div>}
              </>}
            </div>
            <div className="flex flex-col items-end gap-2 border-t border-white/10 pt-5">
              {missingRequiredReference && <p role="status" className="text-right text-[10px] text-fg-subtle">{missingReferenceMessage}</p>}
              <button type="button" disabled={briefing.trim().length < 12 || loading || missingRequiredReference} onClick={createPlan} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-xs font-black text-white shadow-[0_12px_30px_rgba(121,85,232,.28)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{loading ? 'Diretor analisando…' : <><Sparkles className="size-4" /> Criar plano de produção <ArrowRight className="size-3.5" /></>}</button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="h-full rounded-[24px] border border-accent/20 bg-[linear-gradient(155deg,rgba(138,97,255,.12),rgba(18,18,29,.96)_42%)] p-5 shadow-[0_20px_55px_rgba(0,0,0,.18)]">
            <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-accent-light">Plano do Diretor</div>{plan && <h2 className="mt-1 text-base font-black">{plan.title}</h2>}</div>{plan && <span className="size-2.5 rounded-full bg-success shadow-[0_0_12px_rgba(39,201,143,.8)]" />}</div>
            {plan ? <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">{[[Target,'Objetivo',plan.objective],[Clock3,'Duração',`${plan.totalDurationSeconds}s`],[ImagePlus,'Referências',`${referenceCount} anexada(s)`],[Sparkles,'Motor',plan.engineLabel]].map(([Icon,label,value]) => { const I = Icon as typeof Target; return <div key={String(label)} className="rounded-xl border border-white/8 bg-white/[.025] p-3"><I className="size-3.5 text-accent" /><span className="mt-2 block text-[9px] uppercase text-fg-subtle">{String(label)}</span><span className="mt-0.5 block text-[10px] font-bold">{String(value)}</span></div>; })}</div>
              {plan.productAnalysis && <div className="rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="text-[9px] font-bold uppercase tracking-[.12em] text-fg-subtle">Análise do produto</div><p className="mt-2 text-[10px] leading-4 text-fg-muted">{plan.productAnalysis}</p></div>}
              <div className="rounded-xl border border-accent/25 bg-accent/[.05] p-3"><div className="text-[10px] font-bold">Pronto para o canvas</div><p className="mt-1 text-[9px] leading-4 text-fg-muted">O Diretor só prepara o material. Escolha o que quer abrir; nada será gerado ou cobrado até você clicar em Gerar no canvas.</p>
                <div className="mt-3 grid gap-2">{plan.coverImagePrompt && <button type="button" disabled={handingOff} onClick={() => void openCanvas('cover')} className="h-9 rounded-lg border border-border bg-surface-2 px-3 text-[10px] font-bold hover:border-accent disabled:opacity-50">{handingOff ? 'Preparando canvas…' : 'Abrir canvas · Capa promocional'}</button>}{plan.cleanImagePrompt && <button type="button" disabled={handingOff} onClick={() => void openCanvas('clean')} className="h-9 rounded-lg border border-border bg-surface-2 px-3 text-[10px] font-bold hover:border-accent disabled:opacity-50">{handingOff ? 'Preparando canvas…' : 'Abrir canvas · Imagem limpa'}</button>}<button type="button" disabled={handingOff || !plan.flowVideoPrompt} onClick={() => void openCanvas('video')} className="h-10 rounded-lg bg-accent px-3 text-[10px] font-black text-white hover:brightness-110 disabled:opacity-50">{handingOff ? 'Preparando canvas…' : 'Validar e abrir vídeo no canvas'}</button></div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="text-[9px] font-bold uppercase tracking-[.12em] text-fg-subtle">Cenas planejadas · editáveis</div>{plan.scenes.map((scene, index) => <div key={scene.index} className="mt-3 border-l-2 border-accent/40 pl-3"><div className="text-[10px] font-bold">Cena {index + 1} · {scene.durationSeconds}s</div><textarea aria-label={`Ação da cena ${index + 1}`} value={scene.action} onChange={(e) => setPlan((current) => current ? { ...current, scenes: current.scenes.map((item, i) => i === index ? { ...item, action: e.target.value } : item) } : current)} className="mt-1 min-h-14 w-full resize-y rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-[9px] leading-4 text-fg-muted outline-none focus:border-accent" /><textarea aria-label={`Fala da cena ${index + 1}`} value={scene.text} onChange={(e) => setPlan((current) => current ? { ...current, scenes: current.scenes.map((item, i) => i === index ? { ...item, text: e.target.value } : item) } : current)} className="mt-1 min-h-12 w-full resize-y rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-[9px] leading-4 text-fg-muted outline-none focus:border-accent" /></div>)}</div>
              {plan.coverImagePrompt && <PlanTextOutput title="Prompt · Capa promocional" value={plan.coverImagePrompt} />}{plan.cleanImagePrompt && <PlanTextOutput title="Prompt · Imagem limpa" value={plan.cleanImagePrompt} />}{plan.flowVideoPrompt && <PlanTextOutput title="Prompt · Vídeo para o canvas" value={plan.flowVideoPrompt} />}
              {plan.hook && <div className="rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="text-[9px] font-bold uppercase tracking-[.12em] text-fg-subtle">Gancho · Chamada para ação</div><p className="mt-2 text-[10px] leading-4 text-fg-muted">{plan.hook}</p><p className="mt-1 text-[10px] leading-4 text-fg">{plan.callToAction}</p></div>}
            </div> : <p className="mt-3 text-[11px] leading-5 text-fg-subtle">O plano editável aparecerá aqui depois que você criar o briefing.</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
