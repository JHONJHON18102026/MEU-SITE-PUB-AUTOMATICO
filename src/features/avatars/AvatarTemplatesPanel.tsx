import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Film, Image as ImageIcon, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { useCreateUgcProject } from '@/features/projects/previewProjectsStore';
import { prepareImageFromUrl } from '@/lib/image';
import { calculateUgcCost } from '@shared/ugcContracts';
import { clearDirectorCanvasHandoff, MAX_PENDING_VIDEO_REQUESTS, useAvatarStudio, type AvatarTemplateMode, type CustomAvatarTemplate } from './avatarStore';
import { useSession } from '@/store/session';
import { ApiClientError, api } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';

type TemplateSkillId = (typeof SKILLS)[number]['id'];

const SKILLS = [
  {
    id: 'identity',
    name: 'Identidade consistente',
    detail: 'Mantém o mesmo rosto e aparência da referência.',
    prompt: {
      image: 'Se uma imagem de referência de pessoa estiver anexada, preserve a identidade dela com fidelidade: rosto, cabelo, tom de pele, idade aparente e traços reconhecíveis. Não substitua nem misture a pessoa. Sem referência de pessoa, siga a descrição do prompt sem inventar uma identidade conflitante.',
      video: 'Se houver uma pessoa de referência, preserve a mesma identidade do primeiro ao último quadro: rosto, cabelo, tom de pele, idade aparente e proporções estáveis. Evite troca de pessoa, oscilação facial, duplicação ou deformação. Sem referência, mantenha consistente a pessoa descrita no prompt.',
    },
  },
  {
    id: 'product',
    name: 'Produto fiel',
    detail: 'Preserva formato, embalagem, cores e rótulo.',
    prompt: {
      image: 'Se houver imagem de referência do produto, preserve formato, proporções, cores, materiais e embalagem. Mantenha o produto reconhecível e sem deformações; não invente marca, rótulo, logotipo ou alegação. Sem referência, represente somente o produto descrito no prompt.',
      video: 'Se houver referência de produto, mantenha formato, proporções, cores, materiais e embalagem consistentes em todos os quadros. Mostre o produto com clareza durante a ação; não o duplique, distorça ou oculte, nem invente marca, rótulo ou alegação. Sem referência, siga a descrição do prompt.',
    },
  },
  {
    id: 'ugc',
    name: 'UGC natural',
    detail: 'Visual espontâneo, humano e próximo.',
    prompt: {
      image: 'Crie uma pose acessível e relaxada, com expressão espontânea, pele de textura natural e imperfeições sutis preservadas. Prefira sensação de conteúdo feito por criador real; evite retoque plástico, pose rígida e sorriso artificial.',
      video: 'Use expressão espontânea, piscadas e respiração naturais, contato visual confortável e gestos pequenos e legíveis. Sincronize fala apenas se o prompt pedir fala. Evite atuação exagerada, movimento robótico, gestos repetitivos e instabilidade das mãos ou do rosto.',
    },
  },
  {
    id: 'cinematic',
    name: 'Direção cinematográfica',
    detail: 'Mantém luz e composição coerentes com a cena.',
    prompt: {
      image: 'Use composição intencional com hierarquia visual clara, perspectiva plausível, luz coerente com o ambiente e profundidade de campo natural. Preserve detalhes da pessoa e do produto; evite filtros, efeitos ou elementos decorativos que desviem o foco.',
      video: 'Mantenha composição, exposição, direção da luz e aparência da lente coerentes ao longo da cena. Use movimento de câmera suave e contínuo somente quando combinar com o prompt. Evite flicker, mudanças de cenário, cortes, zooms ou movimentos bruscos não solicitados.',
    },
  },
  {
    id: 'hook',
    name: 'Gancho e demonstração',
    detail: 'Mostra o produto e seu benefício principal.',
    prompt: {
      image: 'Escolha um instante visual que comunique rapidamente a ação ou o benefício descrito, com pessoa e produto legíveis na composição. Não invente resultados, alegações, preço ou texto promocional; só inclua lettering se o prompt pedir.',
      video: 'Abra imediatamente com uma ação visual relevante, mostre uma única demonstração fácil de entender e conclua com pessoa e produto em uma posição clara. Mantenha continuidade entre ação e enquadramento; não invente resultados, alegações, preço ou texto promocional.',
    },
  },
] as const;

const BUILT_INS: CustomAvatarTemplate[] = [
  { id: 'ugc-product', name: 'UGC · Apresentação de produto', mode: 'video', prompt: 'A influencer apresenta o produto com naturalidade, mostra os detalhes importantes e demonstra como ele é usado.', skillIds: ['identity', 'product', 'ugc', 'hook'] },
  { id: 'fashion-editorial', name: 'Moda · Editorial de luxo', mode: 'image', prompt: 'Crie uma imagem editorial de moda sofisticada, valorizando o caimento, os materiais e os detalhes da peça em um cenário elegante.', skillIds: ['identity', 'cinematic'] },
  { id: 'honest-review', name: 'Review · Demonstração sincera', mode: 'video', prompt: 'A influencer demonstra o produto em uso, destaca um benefício concreto e reage de forma espontânea, como em uma recomendação pessoal.', skillIds: ['identity', 'product', 'ugc'] },
  { id: 'brand-campaign', name: 'Campanha · Cena de marca', mode: 'image', prompt: 'Crie uma imagem de campanha premium com foco no produto, cenário coerente com a marca e composição limpa, pronta para anúncio.', skillIds: ['product', 'cinematic'] },
];

function buildTemplatePrompt(prompt: string, skillIds: string[], mode: AvatarTemplateMode) {
  return [prompt.trim(), ...SKILLS.filter((skill) => skillIds.includes(skill.id)).map((skill) => skill.prompt[mode])]
    .filter(Boolean)
    .join('\n\n');
}

export function AvatarTemplatesPanel() {
  const navigate = useNavigate();
  const { createProject, busy } = useCreateUgcProject();
  const setStudio = useAvatarStudio((s) => s.set);
  const legacyLocalTemplates = useAvatarStudio((s) => s.customTemplates);
  const sessionStatus = useSession((s) => s.status);
  const [savedTemplates, setSavedTemplates] = useState<CustomAvatarTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [migratingTemplates, setMigratingTemplates] = useState(false);
  const [mode, setMode] = useState<AvatarTemplateMode>('video');
  const [selectedId, setSelectedId] = useState('ugc-product');
  const [name, setName] = useState(BUILT_INS[0]!.name);
  const [prompt, setPrompt] = useState(BUILT_INS[0]!.prompt);
  const [skillIds, setSkillIds] = useState<string[]>([...BUILT_INS[0]!.skillIds]);
  const [preparing, setPreparing] = useState(false);
  const submitRef = useRef<() => Promise<void>>(async () => undefined);
  const videoEngine = useAvatarStudio((s) => s.videoEngine);
  const videoCost = calculateUgcCost({ engine: videoEngine, sceneCount: 1 });
  const visibleTemplates = useMemo(() => [...BUILT_INS, ...savedTemplates].filter((template) => template.mode === mode), [mode, savedTemplates]);

  useEffect(() => {
    if (sessionStatus !== 'signed-in') return;
    let active = true;
    if (!isSupabaseConfigured) {
      setLoadingTemplates(false);
      return;
    }
    void api.listAvatarTemplates()
      .then(({ templates }) => {
        if (active) setSavedTemplates(templates.map((template) => ({
          id: template.id,
          name: template.name,
          mode: template.mode,
          prompt: template.prompt,
          skillIds: template.skillIds,
        })));
      })
      .catch((error: unknown) => {
        if (active) toast.error(error instanceof ApiClientError ? error.message : 'Não consegui carregar os templates da sua conta.');
      })
      .finally(() => { if (active) setLoadingTemplates(false); });
    return () => { active = false; };
  }, [sessionStatus]);

  useEffect(() => {
    setStudio({ videoSubmit: () => submitRef.current() });
    return () => setStudio({ videoSubmit: null, videoBusy: false });
  }, [setStudio]);

  function chooseTemplate(template: CustomAvatarTemplate) {
    setSelectedId(template.id);
    setName(template.name);
    setPrompt(template.prompt);
    setSkillIds([...template.skillIds]);
  }

  function switchMode(nextMode: AvatarTemplateMode) {
    setMode(nextMode);
    const nextTemplate = [...BUILT_INS, ...savedTemplates].find((template) => template.mode === nextMode);
    if (nextTemplate) chooseTemplate(nextTemplate);
  }

  function toggleSkill(id: string) {
    setSkillIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function applyTemplate() {
    const finalPrompt = buildTemplatePrompt(prompt, skillIds, mode);
    if (!finalPrompt) {
      toast.error('Escreva a ideia do template antes de aplicar.');
      return;
    }
    if (finalPrompt.length > 2000) {
      toast.error('O prompt passou do limite de 2000 caracteres. Encurte a ideia ou remova uma skill.');
      return;
    }
    setStudio({ prompt: finalPrompt, composerMode: mode });
    toast.success('Prompt aplicado ao canvas. Nenhuma geração ou cobrança foi feita.');
  }

  async function saveTemplate() {
    if (!name.trim() || !prompt.trim()) {
      toast.error('Dê um nome ao template e escreva a ideia principal.');
      return;
    }
    if (savedTemplates.length >= 30) {
      toast.error('Você já salvou 30 templates. Exclua um para salvar outro.');
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error('O banco da conta não está conectado; não vou salvar só neste computador.');
      return;
    }
    setSavingTemplate(true);
    try {
      const { template: created } = await api.createAvatarTemplate({
      name: name.trim().slice(0, 60),
      mode,
      prompt: prompt.trim().slice(0, 1200),
       skillIds: skillIds.filter((id): id is TemplateSkillId => SKILLS.some((skill) => skill.id === id)),
      });
      const template: CustomAvatarTemplate = { id: created.id, name: created.name, mode: created.mode, prompt: created.prompt, skillIds: created.skillIds };
      setSavedTemplates((current) => [template, ...current]);
      setSelectedId(template.id);
      toast.success('Template salvo na sua conta. Você poderá reutilizá-lo em outros dispositivos.');
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : 'Não consegui salvar o template na sua conta.');
    } finally {
      setSavingTemplate(false);
    }
  }

  async function deleteTemplate(id: string) {
    try {
      await api.deleteAvatarTemplate(id);
      setSavedTemplates((current) => current.filter((template) => template.id !== id));
      if (selectedId === id) setSelectedId('');
      toast.success('Template removido da sua conta.');
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : 'Não consegui remover o template.');
    }
  }

  async function migrateLocalTemplates() {
    if (!legacyLocalTemplates.length || migratingTemplates) return;
    if (savedTemplates.length + legacyLocalTemplates.length > 30) {
      toast.error(`Sua conta tem ${savedTemplates.length} templates salvos. Exclua alguns para migrar os ${legacyLocalTemplates.length} deste navegador.`);
      return;
    }
    setMigratingTemplates(true);
    const migratedIds = new Set<string>();
    const created: CustomAvatarTemplate[] = [];
    try {
      for (const old of legacyLocalTemplates) {
        const { template } = await api.createAvatarTemplate({
          name: old.name.slice(0, 60),
          mode: old.mode,
          prompt: old.prompt.slice(0, 1200),
          skillIds: old.skillIds.filter((id): id is TemplateSkillId => SKILLS.some((skill) => skill.id === id)),
        });
        migratedIds.add(old.id);
        created.push({ id: template.id, name: template.name, mode: template.mode, prompt: template.prompt, skillIds: template.skillIds });
      }
      setSavedTemplates((current) => [...created, ...current]);
      setStudio({ customTemplates: legacyLocalTemplates.filter((item) => !migratedIds.has(item.id)) });
      toast.success(`${created.length} template(s) migrado(s) para sua conta.`);
    } catch (error) {
      setSavedTemplates((current) => [...created, ...current]);
      setStudio({ customTemplates: legacyLocalTemplates.filter((item) => !migratedIds.has(item.id)) });
      toast.error(`${created.length} template(s) migrado(s). ${error instanceof ApiClientError ? error.message : 'Os demais continuam neste navegador para tentar novamente.'}`);
    } finally {
      setMigratingTemplates(false);
    }
  }

  async function generateCanvasVideo() {
    if (preparing || busy) return;
    let queuedProjects: Awaited<ReturnType<typeof api.listProjects>> | null = null;
    if (isSupabaseConfigured) {
      try {
        queuedProjects = await api.listProjects(1, 100, 'avatar');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não consegui verificar a fila de vídeos.');
        return;
      }
    }
    const pendingVideoRequests = queuedProjects?.projects.filter(
      (project) => project.status === 'processing' && project.mediaType !== 'motion',
    ).length ?? 0;
    if (pendingVideoRequests >= MAX_PENDING_VIDEO_REQUESTS) {
      toast.info('Já existem 4 vídeos em andamento. Aguarde um terminar antes de enviar outro.');
      return;
    }
    const studio = useAvatarStudio.getState();
    const brief = studio.prompt.trim();
    if (!brief) {
      toast.error('Descreva a cena ou aplique um template antes de gerar.');
      return;
    }
    setPreparing(true);
    setStudio({ videoBusy: true });
    try {
      // A foto enviada pela lateral só entra no vídeo se o painel Criar Influencer
      // estiver ligado. O avatar escolhido diretamente no canvas permanece independente.
      let avatarImageData = studio.useInfluencerPreset && studio.basePhoto
        ? `data:${studio.basePhoto.mimeType};base64,${studio.basePhoto.data}`
        : undefined;
      let avatarUrl = studio.baseAvatar?.image_url;
      if (!avatarImageData && studio.baseAvatar?.image_url) {
        const prepared = await prepareImageFromUrl(studio.baseAvatar.image_url, `${studio.baseAvatar.name}.jpg`);
        avatarImageData = `data:${prepared.mimeType};base64,${prepared.data}`;
      }
      if (avatarUrl?.startsWith('data:') || (avatarUrl && avatarUrl.length > 1000)) avatarUrl = undefined;

      const productImageData = studio.productImage
        ? `data:${studio.productImage.mimeType};base64,${studio.productImage.data}`
        : undefined;
      const references = [
        ...studio.referenceImages.map((image) => ({ data: `data:${image.mimeType};base64,${image.data}`, name: image.name })),
        ...(productImageData ? [{ data: productImageData, name: 'Produto' }] : []),
      ];
      const selectedVideoModel = studio.videoEngine;
      const maxVideoReferences = selectedVideoModel === 'omni-flash' ? 6 : 3;
      const uniqueVisualReferences = new Set(
        [avatarImageData, productImageData, ...references.map((image) => image.data)]
          .filter((image): image is string => Boolean(image))
          .map((image) => image.replace(/^data:[^,]*,/, '')),
      ).size;
      if (uniqueVisualReferences > maxVideoReferences) {
        toast.error('Este modelo aceita até ' + maxVideoReferences + ' imagens de referência. Reduza os anexos antes de gerar.');
        return;
      }
      const availableVideoSlots = MAX_PENDING_VIDEO_REQUESTS - pendingVideoRequests;
      const requestedCount = Math.max(1, Math.min(availableVideoSlots, 4, Math.floor(studio.videoCount || 1)));
      const account = useSession.getState().profile;
      const totalCost = videoCost * requestedCount;
      if (account && account.plan !== 'unlimited' && account.coins_balance < totalCost) {
        toast.error(`Saldo insuficiente para ${requestedCount} vídeo(s): são necessários ${totalCost} créditos.`);
        return;
      }

      let createdCount = 0;
      const baseTitle = `Avatar · ${studio.baseAvatar?.name ?? (name.trim() || 'Vídeo personalizado')}`;
      for (let index = 0; index < requestedCount; index += 1) {
        const result = await createProject({
          mode: 'avatar-video',
          origin: 'avatar',
          mediaType: 'video',
          title: requestedCount > 1 ? `${baseTitle} · ${index + 1}/${requestedCount}` : baseTitle,
          engine: studio.videoEngine,
          aspectRatio: studio.aspectRatio,
          avatarUrl,
          avatarImageData,
          productImageData,
          productName: productImageData ? 'Produto enviado como referência' : undefined,
          referenceMode: references.length ? 'elements' : undefined,
          referenceImages: references.length ? references.map((image) => image.data) : undefined,
          referenceImageNames: references.length ? references.map((image) => image.name) : undefined,
          avatarPrompt: brief.slice(0, 2000),
          scenes: [{ text: brief.slice(0, 600), action: brief.slice(0, 400), durationSeconds: studio.videoEngine === 'omni-flash' ? Math.min(10, studio.videoDurationSeconds || 10) : 8 }],
        });
        if (!result) break;
        createdCount += 1;
      }
      if (createdCount > 0) {
        clearDirectorCanvasHandoff();
        if (createdCount < requestedCount) toast.warning(`Foram enviados ${createdCount} de ${requestedCount} vídeos.`);
        navigate('/avatars?media=videos');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não consegui gerar o vídeo pelo canvas.');
    } finally {
      setPreparing(false);
      setStudio({ videoBusy: false });
    }
  }

  submitRef.current = generateCanvasVideo;

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3 thin-scroll">
        <div className="rounded-2xl border border-accent/40 bg-accent-soft/50 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-fg"><Sparkles className="size-4 text-accent" /> Templates personalizados</div>
          <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">Combine skills de identidade, produto, UGC e direção para montar o prompt. Seus templates ficam salvos na conta e disponíveis em outros dispositivos. Aplicar só preenche o canvas; os créditos são cobrados ao gerar.</p>
        </div>

        {legacyLocalTemplates.length > 0 && (
          <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
            <p className="text-[11px] leading-relaxed text-fg-muted">Encontramos {legacyLocalTemplates.length} template(s) antigo(s) salvos neste navegador. Transfira-os para sua conta para acessá-los em outros dispositivos.</p>
            <button type="button" onClick={() => void migrateLocalTemplates()} disabled={migratingTemplates || !isSupabaseConfigured || loadingTemplates} className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] font-semibold text-fg transition hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50">
              <Save className="size-3.5" />{migratingTemplates ? 'Transferindo…' : `Transferir ${legacyLocalTemplates.length} para minha conta`}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-[11px] font-semibold" role="tablist" aria-label="Tipo de template">
          {(['image', 'video'] as const).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => switchMode(item)} aria-label={item === 'image' ? 'Estilos e templates de imagem' : 'Estilos e templates de vídeo'} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 ${mode === item ? 'bg-bg text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}>
              {item === 'image' ? <ImageIcon className="size-3.5 shrink-0" /> : <Film className="size-3.5 shrink-0" />}
              <span className="text-center text-[10px] leading-tight">{item === 'image' ? 'Estilos e templates de imagem' : 'Estilos e templates de vídeo'}</span>
            </button>
          ))}
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-fg-muted"><span>BIBLIOTECA DE TEMPLATES DE {mode === 'image' ? 'IMAGEM' : 'VÍDEO'}</span><span className="text-[10px] font-medium normal-case text-fg-subtle">{loadingTemplates ? 'Carregando da conta…' : `${savedTemplates.length}/30 salvos`}</span></div>
          <div className="space-y-1.5">
            {visibleTemplates.map((template) => {
              const active = selectedId === template.id;
              const isCustom = savedTemplates.some((saved) => saved.id === template.id);
              return (
                <div key={template.id} className={`flex items-center gap-1 rounded-xl border p-1 ${active ? 'border-accent bg-accent-soft/70' : 'border-border bg-surface-2 hover:border-fg-subtle'}`}>
                  <button type="button" aria-pressed={active} onClick={() => chooseTemplate(template)} className="min-w-0 flex-1 px-2 py-1.5 text-left">
                    <span className="block truncate text-xs font-semibold text-fg">{template.name}</span>
                    <span className="mt-0.5 block text-[10px] text-fg-muted">{template.skillIds.length} skills aplicáveis</span>
                  </button>
                  {isCustom && <button type="button" onClick={() => deleteTemplate(template.id)} aria-label={`Excluir template ${template.name}`} title="Excluir template" className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-subtle hover:bg-surface hover:text-danger"><Trash2 className="size-3.5" /></button>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <div className="text-[11px] font-bold text-fg-muted">MONTE SEU TEMPLATE</div>
          <input value={name} onChange={(event) => { setName(event.target.value); setSelectedId(''); }} maxLength={60} placeholder="Nome do template" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs outline-none focus:border-accent" />
          <textarea value={prompt} onChange={(event) => { setPrompt(event.target.value); setSelectedId(''); }} maxLength={1200} rows={4} placeholder="Escreva a estrutura ou a ideia principal..." className="w-full resize-y rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed outline-none focus:border-accent" />
          <div className="text-[10px] font-bold text-fg-muted">SKILLS</div>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((skill) => {
              const active = skillIds.includes(skill.id);
              return <button key={skill.id} type="button" aria-pressed={active} title={skill.detail} onClick={() => toggleSkill(skill.id)} className={`rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition ${active ? 'border-accent bg-accent-soft text-fg' : 'border-border bg-surface-2 text-fg-muted hover:text-fg'}`}>{active && <Check className="mr-1 inline size-3" />}{skill.name}</button>;
            })}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 pb-1">
          <button type="button" onClick={() => void saveTemplate()} disabled={savingTemplate || loadingTemplates || !isSupabaseConfigured} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-2 px-2 py-2.5 text-[11px] font-semibold hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"><Save className="size-3.5" /> {savingTemplate ? 'Salvando…' : 'Salvar template'}</button>
          <button type="button" onClick={applyTemplate} className="flex items-center justify-center gap-1.5 rounded-xl bg-accent px-2 py-2.5 text-[11px] font-bold text-white hover:brightness-110"><Plus className="size-3.5" /> Aplicar prompt no canvas</button>
        </div>
      </div>
    </>
  );
}
