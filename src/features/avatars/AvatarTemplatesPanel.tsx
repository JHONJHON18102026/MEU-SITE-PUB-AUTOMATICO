import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Dices, Film, Image as ImageIcon, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { useCreateUgcProject } from '@/features/projects/previewProjectsStore';
import { prepareImageFromUrl } from '@/lib/image';
import { calculateUgcCost } from '@shared/ugcContracts';
import { clearDirectorCanvasHandoff, MAX_PENDING_VIDEO_REQUESTS, restoreDirectorCanvasHandoff, useAvatarStudio, type AvatarTemplateMode, type CustomAvatarTemplate } from './avatarStore';
import { useSession } from '@/store/session';
import { ApiClientError, api } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';

type TemplateSkillId = (typeof SKILLS)[number]['id'];

const SKILLS = [
  {
    id: 'identity',
    name: 'Continuidade do personagem',
    detail: 'Mantém a aparência do personagem estável entre quadros e cenas.',
    prompt: {
      image: 'Siga a identidade visual e os traços descritos para o personagem. Se houver uma referência, use-a como orientação sem trocar a espécie, a aparência ou o papel definidos no prompt. Não invente uma identidade conflitante.',
      video: 'Preserve a identidade visual de cada personagem do primeiro ao último quadro: espécie, rosto, cores, proporções, roupa e acessórios. Evite troca de identidade, duplicação ou deformação.',
    },
  },
  {
    id: 'product',
    name: 'Fidelidade às referências',
    detail: 'Preserva os detalhes visuais das imagens de referência usadas na história.',
    prompt: {
      image: 'Se houver referência da fruta, personagem ou objeto central, preserve seus traços identificáveis, forma, cores e detalhes importantes. Use a referência como guia visual sem substituir a identidade definida pelo prompt.',
      video: 'Preserve os detalhes identificáveis da fruta, personagem ou objeto central de referência em todos os quadros. Não troque espécie, cores, formato, roupa ou atributos visuais definidos; não invente marcas ou elementos que não aparecem na referência.',
    },
  },
  {
    id: 'ugc',
    name: 'Movimento natural',
    detail: 'Evita gestos duros, movimentos robóticos e ações difíceis de entender.',
    prompt: {
      image: 'Escolha uma pose clara e natural para o personagem, com mãos, braços e postura coerentes com a ação. Evite membros extras, gestos impossíveis ou elementos que se fundam ao corpo.',
      video: 'Use movimentos contínuos, simples e naturais. Cada personagem deve executar uma ação compreensível; mantenha mãos, braços e objetos consistentes e evite movimentos robóticos, repetidos ou anatomicamente impossíveis.',
    },
  },
  {
    id: 'cinematic',
    name: 'Luz e câmera cinematográficas',
    detail: 'Mantém luz e composição coerentes com a cena.',
    prompt: {
      image: 'Use composição intencional, perspectiva plausível e iluminação coerente com o cenário. Mantenha personagem e ação em destaque, com profundidade de campo natural; evite efeitos decorativos que distraiam.',
      video: 'Mantenha enquadramento, exposição e direção da luz coerentes durante a cena. Use movimento de câmera suave quando combinar com a história; evite flicker, mudanças de cenário, cortes ou zooms não solicitados.',
    },
  },
  {
    id: 'hook',
    name: 'Gancho viral',
    detail: 'Começa com uma situação intrigante e termina mantendo a curiosidade.',
    prompt: {
      image: 'Escolha um instante visual intrigante que deixe claro quem está em cena e sugira o conflito ou a pergunta central. Não misture momentos diferentes na mesma imagem.',
      video: 'Abra já no momento mais intrigante, desenvolva a situação sem introdução longa e termine com uma revelação, escolha ou pergunta que desperte curiosidade pelo próximo episódio.',
    },
  },
  {
    id: 'fruit-identity',
    name: 'Identidade da fruta',
    detail: 'A fruta é reconhecível e continua sendo a base visual do personagem.',
    prompt: {
      image: 'A fruta escolhida deve ser a identidade visual do personagem, não apenas um acessório: preserve formato, casca, polpa, sementes, folhas e cores reconhecíveis, integrados a rosto e corpo humanoides coerentes.',
      video: 'Mantenha a fruta reconhecível em todos os quadros, preservando formato, casca, folhas, cores e proporções do personagem. Não transforme a fruta em uma pessoa comum nem altere sua espécie durante a cena.',
    },
  },
  {
    id: 'character-bible',
    name: 'Elenco sem duplicações',
    detail: 'Define aparência, papel, roupa e traços que não mudam entre cenas.',
    prompt: {
      image: 'Mostre um personagem original com olhos expressivos, boca, braços, mãos, pernas e postura legíveis. A roupa, o papel e os traços distintivos devem combinar com a descrição, sem adicionar outro personagem não solicitado.',
      video: 'Mantenha cada personagem com a mesma fruta, rosto, cores, proporções, roupa e acessórios em toda a cena. Diferencie os personagens por aparência e posição; não os duplique nem troque seus papéis.',
    },
  },
  {
    id: 'story-beats',
    name: 'Conflito e reviravolta',
    detail: 'Organiza gancho, conflito, reação e revelação com continuidade causal.',
    prompt: {
      image: 'Escolha um instante decisivo que revele o conflito e a emoção da história por meio de expressões e gestos. Não misture momentos diferentes nem acrescente texto à imagem.',
      video: 'Comece já com uma situação intrigante, desenvolva um conflito simples por meio de ação e reação e termine com uma revelação, escolha ou gancho coerente. Preserve causa e efeito; evite reviravolta aleatória.',
    },
  },
  {
    id: 'story-world',
    name: 'Ambiente e objetos da cena',
    detail: 'Usa ambiente e objetos para dar contexto à cena sem roubar o foco.',
    prompt: {
      image: 'Escolha um ambiente coerente com o papel e a situação. Inclua poucos objetos relevantes à ação e organize o cenário para manter personagem, emoção e objeto narrativo em destaque.',
      video: 'Mantenha o mesmo local e os mesmos objetos importantes durante a cena. Faça cada objeto apoiar a ação ou o conflito; não troque de ambiente nem introduza elementos sem motivação narrativa.',
    },
  },
  {
    id: 'visual-acting',
    name: 'Emoção em cena',
    detail: 'Traduz emoção em expressão facial, gesto e postura claros.',
    prompt: {
      image: 'Expresse a emoção indicada com olhos, sobrancelhas, boca, mãos e postura coerentes. Use uma pose fácil de ler e evite expressões contraditórias ou gestos escondidos pelo enquadramento.',
      video: 'Use movimentos naturais e contidos que expressem a emoção: olhar, expressão facial, postura e gesto devem acompanhar a fala e a ação. Evite gestos repetidos, braços extras ou mudanças bruscas de humor.',
    },
  },
  {
    id: 'dialogue-ptbr',
    name: 'Falas em português brasileiro',
    detail: 'Mantém falas naturais em pt-BR e curtas o bastante para terminar no vídeo.',
    prompt: {
      image: 'Como esta é uma imagem estática, não inclua balões de fala, legendas nem lettering, salvo se o prompt pedir texto explicitamente.',
      video: 'Todo diálogo e narração devem ser exclusivamente em português brasileiro (pt-BR), com vocabulário e pronúncia naturais do Brasil. Use frases curtas que terminem antes do vídeo acabar; não acrescente falas em outro idioma.',
    },
  },
] as const;

const BUILT_INS: CustomAvatarTemplate[] = [
  { id: 'fruit-character', name: 'Personagem-fruta · Retrato 3D', mode: 'image', prompt: 'Crie um personagem antropomórfico original de [fruta], com traços humanos expressivos, postura legível, roupa ligada ao seu papel e detalhes visuais próprios. Use fundo e iluminação coerentes com sua personalidade.', skillIds: ['identity', 'product', 'fruit-identity', 'character-bible', 'visual-acting', 'cinematic'] },
  { id: 'fruit-drama-scene', name: 'Cena dramática · Dupla de frutas', mode: 'image', prompt: 'Mostre [personagem principal] e [segundo personagem] em um momento decisivo da história. Dê a cada um uma emoção contrastante e uma interação clara, usando um cenário e objetos que revelem o conflito.', skillIds: ['identity', 'product', 'fruit-identity', 'character-bible', 'story-world', 'visual-acting', 'cinematic'] },
  { id: 'fruit-family-drama', name: 'Novela de frutas · Drama familiar', mode: 'video', prompt: 'Crie um episódio de novela com frutas antropomórficas originais. Apresente rapidamente um conflito familiar, mostre uma reação emocional e termine com uma decisão ou revelação que abra o próximo capítulo.', skillIds: ['identity', 'product', 'fruit-identity', 'character-bible', 'story-beats', 'story-world', 'visual-acting', 'ugc', 'dialogue-ptbr'] },
  { id: 'fruit-secret-twist', name: 'Microdrama · Segredo revelado', mode: 'video', prompt: 'Comece no instante em que algo estranho é percebido. Construa a suspeita com pistas visuais claras, faça os personagens reagirem e revele um segredo coerente no final, deixando uma pergunta para o próximo episódio.', skillIds: ['identity', 'product', 'fruit-identity', 'character-bible', 'story-beats', 'story-world', 'hook', 'ugc', 'dialogue-ptbr'] },
  { id: 'fruit-romance-triangle', name: 'Romance frutado · Escolha difícil', mode: 'video', prompt: 'Crie uma cena romântica original entre personagens-fruta, com interesse, ciúme ou mal-entendido fácil de entender. Termine com uma escolha ou interrupção que deixe a relação em aberto.', skillIds: ['identity', 'product', 'fruit-identity', 'character-bible', 'story-beats', 'visual-acting', 'cinematic', 'ugc', 'dialogue-ptbr'] },
  { id: 'fruit-comedy', name: 'Comédia frutada · Confusão do dia', mode: 'video', prompt: 'Crie uma situação cotidiana engraçada protagonizada por frutas antropomórficas originais. A confusão deve nascer de uma ação simples, crescer com uma reação inesperada e terminar em um desfecho visual claro.', skillIds: ['identity', 'product', 'fruit-identity', 'character-bible', 'story-world', 'visual-acting', 'hook', 'ugc', 'dialogue-ptbr'] },
  { id: 'fruit-mystery', name: 'Mistério no pomar · Pista e gancho', mode: 'video', prompt: 'Crie uma cena curta de mistério em um mundo de frutas. Mostre uma pista concreta, uma investigação simples e uma descoberta parcial; encerre antes de explicar tudo para manter a curiosidade.', skillIds: ['identity', 'product', 'fruit-identity', 'character-bible', 'story-beats', 'story-world', 'cinematic', 'ugc', 'dialogue-ptbr'] },
];

function buildTemplatePrompt(prompt: string, skillIds: string[], mode: AvatarTemplateMode) {
  const selectedSkills = SKILLS.filter((skill) => skillIds.includes(skill.id));
  const expanded = [prompt.trim(), ...selectedSkills.map((skill) => skill.prompt[mode])].filter(Boolean).join('\n\n');
  if (expanded.length <= 2000) return { text: expanded, compacted: false };

  const compactRules: Record<TemplateSkillId, Record<AvatarTemplateMode, string>> = {
    identity: {
      image: 'Mantenha os traços descritos ou referenciados; sem criar identidade conflitante.',
      video: 'Mantenha rosto, espécie, cores, roupa e proporções em todos os quadros.',
    },
    product: {
      image: 'Preserve forma, cores e detalhes da referência anexada; não troque o personagem.',
      video: 'Preserve a referência em todos os quadros; sem mudar espécie, cor, forma ou roupa.',
    },
    ugc: {
      image: 'Use pose legível e natural; evite membros extras e gestos impossíveis.',
      video: 'Movimentos naturais e contínuos; sem repetição, membros extras ou deformações.',
    },
    cinematic: {
      image: 'Luz e composição coerentes; personagem e ação sempre em foco.',
      video: 'Mantenha luz e enquadramento; câmera suave, sem cortes ou flicker.',
    },
    hook: {
      image: 'Mostre um instante intrigante que deixe o conflito claro.',
      video: 'Comece pela tensão e termine com revelação ou pergunta.',
    },
    'fruit-identity': {
      image: 'A fruta define o personagem: preserve casca, forma, folhas e cores.',
      video: 'Mantenha espécie, casca, forma e cores estáveis em todos os quadros.',
    },
    'character-bible': {
      image: 'Personagens legíveis e distintos; não acrescente outros sem pedido.',
      video: 'Não duplique nem troque personagens, roupas ou papéis.',
    },
    'story-beats': {
      image: 'Escolha um instante decisivo com conflito e emoção claros.',
      video: 'Construa gancho, conflito e reação; termine com reviravolta coerente.',
    },
    'story-world': {
      image: 'Use cenário e poucos objetos que expliquem a situação.',
      video: 'Mantenha local e objetos principais estáveis durante a cena.',
    },
    'visual-acting': {
      image: 'Mostre emoção por rosto, mãos e postura coerentes.',
      video: 'Gestos e expressão acompanham ação; sem braços extras.',
    },
    'dialogue-ptbr': {
      image: 'Sem texto na imagem, salvo pedido explícito.',
      video: 'Falas em pt-BR, com frases curtas e completas antes do fim.',
    },
  };
  const compact = [prompt.trim(), ...selectedSkills.map((skill) => compactRules[skill.id][mode])]
    .filter(Boolean)
    .join('\n\n');
  return { text: compact, compacted: true };
}

export function AvatarTemplatesPanel() {
  const navigate = useNavigate();
  const { createProject, busy } = useCreateUgcProject();
  const setStudio = useAvatarStudio((s) => s.set);
  const legacyLocalTemplates = useAvatarStudio((s) => s.customTemplates);
  const sessionStatus = useSession((s) => s.status);
  const profile = useSession((s) => s.profile);
  const [savedTemplates, setSavedTemplates] = useState<CustomAvatarTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [migratingTemplates, setMigratingTemplates] = useState(false);
  const [mode, setMode] = useState<AvatarTemplateMode>('video');
  const [selectedId, setSelectedId] = useState('fruit-family-drama');
  const [name, setName] = useState(BUILT_INS.find((template) => template.id === 'fruit-family-drama')!.name);
  const [prompt, setPrompt] = useState(BUILT_INS.find((template) => template.id === 'fruit-family-drama')!.prompt);
  const [skillIds, setSkillIds] = useState<string[]>([...BUILT_INS.find((template) => template.id === 'fruit-family-drama')!.skillIds]);
  const [preparing, setPreparing] = useState(false);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  const [randomIdea, setRandomIdea] = useState('');
  const recentIdeasRef = useRef<string[]>([]);
  const recentIdeasKey = `fd-avatar-random-ideas:${profile?.id ?? 'local'}`;
  const submitRef = useRef<() => Promise<void>>(async () => undefined);
  const videoSubmitLockRef = useRef(false);
  const videoEngine = useAvatarStudio((s) => s.videoEngine);
  const videoCost = calculateUgcCost({ engine: videoEngine, sceneCount: 1 });
  const visibleTemplates = useMemo(() => [...BUILT_INS, ...savedTemplates].filter((template) => template.mode === mode), [mode, savedTemplates]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(recentIdeasKey) ?? '[]');
      recentIdeasRef.current = Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string').slice(0, 20) : [];
    } catch {
      recentIdeasRef.current = [];
    }
    setRandomIdea('');
  }, [recentIdeasKey]);

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
    return () => setStudio({ videoSubmit: null });
  }, [setStudio]);

  function chooseTemplate(template: CustomAvatarTemplate) {
    setRandomIdea('');
    setSelectedId(template.id);
    setName(template.name);
    setPrompt(template.prompt);
    setSkillIds([...template.skillIds]);
  }

  function switchMode(nextMode: AvatarTemplateMode) {
    setRandomIdea('');
    setMode(nextMode);
    const nextTemplate = [...BUILT_INS, ...savedTemplates].find((template) => template.mode === nextMode);
    if (nextTemplate) chooseTemplate(nextTemplate);
  }

  function toggleSkill(id: string) {
    setSkillIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function generateRandomIdea() {
    if (generatingIdea || !prompt.trim()) return;
    setGeneratingIdea(true);
    try {
      const skills = SKILLS.filter((skill) => skillIds.includes(skill.id)).map((skill) => ({
        name: skill.name,
        instruction: skill.prompt.image,
      }));
      const { idea } = await api.generateAvatarIdea({
        templateName: name.trim() || 'Personagem personalizado',
        templatePrompt: prompt.trim(),
        skills,
        recentPrompts: recentIdeasRef.current.slice(0, 12),
      });
      setRandomIdea(idea);
      recentIdeasRef.current = [idea, ...recentIdeasRef.current.filter((item) => item !== idea)].slice(0, 20);
      localStorage.setItem(recentIdeasKey, JSON.stringify(recentIdeasRef.current));
      toast.success('Nova ideia criada pelo Argon, sem consumir créditos.');
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : 'Não consegui criar uma nova ideia agora.');
    } finally {
      setGeneratingIdea(false);
    }
  }

  function applyTemplate() {
    const { text: finalPrompt, compacted } = randomIdea.trim()
      ? { text: randomIdea.trim(), compacted: false }
      : buildTemplatePrompt(prompt, skillIds, mode);
    if (!finalPrompt) {
      toast.error('Escreva a ideia do template antes de aplicar.');
      return;
    }
    if (finalPrompt.length > 2000) {
      toast.error('O prompt passou do limite de 2000 caracteres. Encurte a ideia ou remova uma skill.');
      return;
    }
    setStudio({ prompt: finalPrompt, composerMode: mode });
    toast.success(compacted
      ? 'Prompt aplicado ao canvas com as Skills compactadas para caber. Nenhuma geração foi feita.'
      : 'Prompt aplicado ao canvas. Nenhuma geração ou cobrança foi feita.');
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
    if (videoSubmitLockRef.current || useAvatarStudio.getState().videoBusy || preparing || busy) return;
    // Reserve this media queue synchronously before the network round-trip.
    // React state alone leaves a short window where rapid clicks submit twice.
    videoSubmitLockRef.current = true;
    setPreparing(true);
    setStudio({ videoBusy: true });
    try {
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
      const directorScene = restoreDirectorCanvasHandoff()?.directorScene;
      const brief = studio.prompt.trim();
      if (!brief) {
        toast.error('Descreva a cena ou aplique um template antes de gerar.');
        return;
      }
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
          scenes: [{
            text: directorScene?.text ?? brief.slice(0, 600),
            action: directorScene?.action ?? brief.slice(0, 400),
            durationSeconds: studio.videoEngine === 'omni-flash' ? Math.min(10, studio.videoDurationSeconds || 10) : 8,
          }],
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
      videoSubmitLockRef.current = false;
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
          <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">Combine skills de personagens, narrativa, cenário, referências e direção. Os templates ficam salvos na conta; aplicar preenche o canvas sem cobrar créditos.</p>
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
          <input value={name} onChange={(event) => { setName(event.target.value); setSelectedId(''); setRandomIdea(''); }} maxLength={60} placeholder="Nome do template" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs outline-none focus:border-accent" />
          <textarea value={prompt} onChange={(event) => { setPrompt(event.target.value); setSelectedId(''); setRandomIdea(''); }} maxLength={1200} rows={4} placeholder="Escreva a estrutura ou a ideia principal..." className="w-full resize-y rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed outline-none focus:border-accent" />
          {mode === 'image' && (
            <div className="space-y-2">
              <button type="button" onClick={() => void generateRandomIdea()} disabled={generatingIdea || !prompt.trim()} className="flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-accent/50 bg-accent-soft/50 px-3 py-2 text-[11px] font-semibold text-fg hover:border-accent disabled:cursor-wait disabled:opacity-60">
                <Dices className={`size-3.5 ${generatingIdea ? 'animate-spin' : ''}`} />
                {generatingIdea ? 'Criando uma ideia inédita…' : 'Gerar nova ideia com o Argon'}
              </button>
              {randomIdea && (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold text-fg-muted">NOVA IDEIA · EDITÁVEL · SEM CUSTO EM CRÉDITOS</span>
                  <textarea value={randomIdea} onChange={(event) => setRandomIdea(event.target.value)} maxLength={1800} rows={5} className="w-full resize-y rounded-xl border border-accent/40 bg-surface-2 p-3 text-xs leading-relaxed outline-none focus:border-accent" />
                </label>
              )}
            </div>
          )}
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
