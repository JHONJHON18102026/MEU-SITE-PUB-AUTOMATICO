/**
 * Catálogo do AI UGC Creator + Biblioteca VIRAL + Central de Tutoriais do FUTURO DIGITAL Studio.
 * Modelos usam imagens locais otimizadas em /public para nunca quebrar fora da rede.
 */
import type { ViralManifestDTO } from './ugcContracts';

export interface UgcTemplate {
  id: string;
  title: string;
  niche: 'Skincare' | 'Saúde' | 'Tech' | 'Fitness' | 'Casa' | 'Moda';
  style: 'Depoimento' | 'Unboxing' | 'Review' | 'Rotina';
  orientation: '9:16' | '16:9';
  duration: 15 | 30 | 60;
  popular?: boolean;
  recent?: boolean;
  thumbnail: string;
  defaultAction: string;
  defaultScript: string;
}

export const UGC_TEMPLATES: UgcTemplate[] = [
  {
    id: 'tpl-skincare-serum',
    title: 'Sérum no Banheiro (Rotina)',
    niche: 'Skincare',
    style: 'Rotina',
    orientation: '9:16',
    duration: 15,
    popular: true,
    thumbnail: '/showcase/modelo-01.webp',
    defaultAction: 'Mostra o frasco para a câmera, aplica duas gotas no rosto e sorri mostrando a textura.',
    defaultScript: 'Gente, eu precisava mostrar esse produto para vocês. Uso há duas semanas toda manhã e a diferença na pele é surreal.',
  },
  {
    id: 'tpl-fitness-shake',
    title: 'Pós-Treino na Academia',
    niche: 'Fitness',
    style: 'Depoimento',
    orientation: '9:16',
    duration: 30,
    popular: true,
    thumbnail: '/showcase/modelo-02.webp',
    defaultAction: 'Segura o suplemento ao lado do rosto na academia, aponta o rótulo e fala com energia.',
    defaultScript: 'Se você treina pesado e ainda não testou isso aqui, presta atenção. Recuperação muito mais rápida e zero peso no estômago.',
  },
  {
    id: 'tpl-cafe-lifestyle',
    title: 'Café da Manhã em Casa',
    niche: 'Casa',
    style: 'Review',
    orientation: '9:16',
    duration: 30,
    popular: true,
    recent: true,
    thumbnail: '/showcase/modelo-06.webp',
    defaultAction: 'Segura a caneca e o produto na bancada clara da cozinha, mostra o detalhe de perto.',
    defaultScript: 'Meu ritual das 7 da manhã mudou completamente depois que coloquei isso na rotina. Prático e realmente funciona.',
  },
  {
    id: 'tpl-tech-escritorio',
    title: 'Produtividade no Escritório',
    niche: 'Tech',
    style: 'Unboxing',
    orientation: '16:9',
    duration: 30,
    recent: true,
    thumbnail: '/showcase/modelo-04.webp',
    defaultAction: 'Abre o produto sobre a mesa do escritório e demonstra o primeiro uso olhando para a webcam.',
    defaultScript: 'Testei esse acessório durante uma semana inteira de reuniões e trabalho focado. Vale cada centavo pelo ganho de tempo.',
  },
  {
    id: 'tpl-modafashion-cafe',
    title: 'Look e Estilo no Bistrô',
    niche: 'Moda',
    style: 'Review',
    orientation: '9:16',
    duration: 15,
    recent: true,
    thumbnail: '/showcase/modelo-03.webp',
    defaultAction: 'Ajusta a peça com naturalidade, gira levemente o ombro e sorri para a câmera.',
    defaultScript: 'Muita gente perguntou nos stories de onde é essa peça. O caimento fica perfeito e combina com tudo.',
  },
  {
    id: 'tpl-saude-praia',
    title: 'Energia & Sol ao Ar Livre',
    niche: 'Saúde',
    style: 'Depoimento',
    orientation: '9:16',
    duration: 60,
    popular: true,
    thumbnail: '/showcase/modelo-05.webp',
    defaultAction: 'Fala olhando direto para a câmera com luz natural dourada, segurando o frasco na altura do peito.',
    defaultScript: 'Eu vivia sem energia no meio da tarde até descobrir essa fórmula natural. Hoje chego no fim do dia com disposição total.',
  },
];

export const TALKING_EMOTIONS = [
  { id: 'feliz', label: 'Feliz', preview: '/showcase/modelo-01.webp' },
  { id: 'confiante', label: 'Confiante', preview: '/showcase/modelo-04.webp' },
  { id: 'empolgado', label: 'Empolgado', preview: '/showcase/modelo-02.webp' },
  { id: 'curioso', label: 'Curioso', preview: '/showcase/modelo-06.webp' },
  { id: 'raiva', label: 'Indignado', preview: '/showcase/modelo-07.webp' },
  { id: 'gargalhando', label: 'Gargalhando', preview: '/showcase/modelo-05.webp' },
  { id: 'surpreso', label: 'Surpreso', preview: '/showcase/modelo-08.webp' },
  { id: 'explicando', label: 'Didático', preview: '/showcase/modelo-09.webp' },
  { id: 'paquerador', label: 'Carismático', preview: '/showcase/modelo-03.webp' },
  { id: 'confuso', label: 'Dúvida', preview: '/characters/characterType-ousado.webp' },
  { id: 'urgencia', label: 'Urgência', preview: '/characters/characterType-extremo.webp' },
  { id: 'nostalgico', label: 'Nostálgico', preview: '/characters/characterType-vovo.webp' },
  { id: 'inspirador', label: 'Inspirador', preview: '/characters/characterType-monge.webp' },
  { id: 'serio', label: 'Especialista', preview: '/characters/characterType-saude.webp' },
] as const;

export const LINK_PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Meta Ads', 'Shopee Vídeo'] as const;
export const LINK_TONES = ['Natural e próximo', 'Direto para venda', 'Educativo / Curiosidade', 'Luxo e elegante'] as const;
export const LINK_AD_STYLES = [
  { id: 'lifestyle', label: 'Lifestyle', desc: 'Pessoa usando em ambiente real da casa ou trabalho' },
  { id: 'luxury', label: 'Luxury', desc: 'Iluminação editorial, estética sofisticada e foco premium' },
  { id: 'minimal', label: 'Minimal', desc: 'Fundo limpo e foco absoluto nos benefícios do produto' },
] as const;

export const MUSIC_MOODS = ['Sem música', 'Pop leve animado', 'Lo-fi aconchegante', 'Batida moderna (Reels/TikTok)', 'Corporativo suave'] as const;

export const HOOK_STYLES = [
  { id: 'classic', label: 'Branco Clássico', bgClass: 'bg-white text-black shadow-lg', dotColor: '#ffffff' },
  { id: 'viral-yellow', label: 'Amarelo Viral', bgClass: 'bg-amber-300 text-black shadow-lg', dotColor: '#fcd34d' },
  { id: 'brand-gradient', label: 'Futuro Digital', bgClass: 'bg-brand text-white shadow-lg', dotColor: '#c026d3' },
  { id: 'dark-box', label: 'Caixa Dark', bgClass: 'bg-black/85 text-white border border-white/25', dotColor: '#18181b' },
  { id: 'mint', label: 'Verde Destaque', bgClass: 'bg-emerald-400 text-black shadow-lg', dotColor: '#34d399' },
] as const;

export const SLIDESHOW_TONES = [
  'Informativo / Lista',
  'Antes e Depois',
  'Erros que as pessoas cometem',
  'Tutorial Passo a Passo',
  'Oferta com Benefícios',
] as const;

export interface ViralMotionPreset {
  id: string;
  title: string;
  category: 'Unboxing' | 'Apontar & Texto' | 'Reação' | 'Produto em mãos' | 'Lifestyle';
  durationSec: number;
  analyzed: true;
  thumbnail: string;
  promptDescription: string;
}

export const VIRAL_MOTIONS: ViralMotionPreset[] = [
  {
    id: 'motion-point-top',
    title: 'Aponta para o texto + sorri',
    category: 'Apontar & Texto',
    durationSec: 6,
    analyzed: true,
    thumbnail: '/showcase/modelo-01.webp',
    promptDescription: 'Subject looks directly into smartphone camera, raises one hand playfully pointing up at on-screen captions, nods confidently with a bright natural smile.',
  },
  {
    id: 'motion-product-zoom',
    title: 'Mostra produto de perto + aprovação',
    category: 'Produto em mãos',
    durationSec: 8,
    analyzed: true,
    thumbnail: '/showcase/modelo-06.webp',
    promptDescription: 'Handheld selfie movement: creator brings product close to the lens for 2 seconds so label stays crisp, pulls back smoothly and nods with impressed eyes.',
  },
  {
    id: 'motion-unboxing-flip',
    title: 'Abertura rápida estilo Unboxing',
    category: 'Unboxing',
    durationSec: 8,
    analyzed: true,
    thumbnail: '/showcase/modelo-04.webp',
    promptDescription: 'Energetic top-down tilt up transition, quick hand swipe revealing the item on desk, joyful reaction leaning closer to the camera.',
  },
  {
    id: 'motion-wow-reaction',
    title: 'Reação surpresa viral (Hook)',
    category: 'Reação',
    durationSec: 5,
    analyzed: true,
    thumbnail: '/showcase/modelo-08.webp',
    promptDescription: 'Eyes widen naturally in genuine surprise, hand touches cheek briefly then points toward camera, dynamic natural head tilt.',
  },
  {
    id: 'motion-walk-talk',
    title: 'Caminhada casual falando (POV)',
    category: 'Lifestyle',
    durationSec: 8,
    analyzed: true,
    thumbnail: '/showcase/modelo-02.webp',
    promptDescription: 'Smooth walking selfie motion in natural daylight, gentle camera sway, expressive hand gestures while speaking casually.',
  },
];

export interface ImageAdTemplate {
  id: string;
  title: string;
  niche: string;
  defaultRatio: '1:1' | '9:16' | '4:3';
  defaultBadge: string;
  defaultHeadline: string;
  defaultCta: string;
  thumbnail: string;
  compositionPrompt: string;
}

export const IMAGE_AD_TEMPLATES: ImageAdTemplate[] = [
  {
    id: 'oferta-relampago',
    title: 'Oferta Relâmpago + Destaque',
    niche: 'Conversão Direta',
    defaultRatio: '1:1',
    defaultBadge: 'HOJE -30%',
    defaultHeadline: 'Resultado real já na primeira semana de uso',
    defaultCta: 'Aproveitar oferta',
    thumbnail: '/showcase/modelo-01.webp',
    compositionPrompt: 'High-converting e-commerce hero studio shot, dramatic clean backdrop with soft rim lighting, floating graphic space at top for bold promo badge, crisp product front and center.',
  },
  {
    id: 'beneficios-topicos',
    title: 'Produto + 3 Benefícios',
    niche: 'Skincare / Saúde',
    defaultRatio: '9:16',
    defaultBadge: 'MAIS VENDIDO',
    defaultHeadline: 'Por que todo mundo trocou pelo novo modelo?',
    defaultCta: 'Ver benefícios',
    thumbnail: '/showcase/modelo-05.webp',
    compositionPrompt: 'Editorial vertical story advertisement with clean negative space around the product, natural sunlight shadows, minimalist floating aesthetic ready for benefit callouts.',
  },
  {
    id: 'prova-social',
    title: 'Criador Segurando + Avaliação',
    niche: 'UGC Estático',
    defaultRatio: '4:3',
    defaultBadge: '4.9 ★ APROVADO',
    defaultHeadline: '“Virou item obrigatório aqui em casa”',
    defaultCta: 'Conhecer agora',
    thumbnail: '/showcase/modelo-06.webp',
    compositionPrompt: 'Authentic smiling Brazilian creator holding the featured product near chest in bright home kitchen setting, shallow depth of field, realistic smartphone skin texture.',
  },
  {
    id: 'editorial-luxury',
    title: 'Estúdio Minimalista Premium',
    niche: 'Tech / Moda / Luxo',
    defaultRatio: '1:1',
    defaultBadge: 'EDIÇÃO LIMITADA',
    defaultHeadline: 'Design pensado para durar o dobro',
    defaultCta: 'Garantir o meu',
    thumbnail: '/showcase/modelo-03.webp',
    compositionPrompt: 'Luxury minimalist commercial still life photography on brushed stone pedestal, soft diffused key light, sharp reflections, refined editorial contrast.',
  },
];

export interface GuideStep {
  title: string;
  desc: string;
  target: string; // casa com data-guide-target no DOM
}

export type GuideId = 'ads' | 'link' | 'talking' | 'projects' | 'hook' | 'slideshows' | 'motion' | 'image-ads' | 'viral' | 'remake' | 'studio';

export const VIRAL_FOLDER_FORMATS = ['ADS', 'Hook+Demo', 'Remake Viral', 'Motion Control', 'POV'] as const;

export interface ViralCatalogEntry {
  id: string;
  title: string;
  creatorHandle: string;
  platform: 'TikTok Shop' | 'Instagram Reels' | 'YouTube Shorts';
  market: 'Brasil' | 'EUA';
  niche: 'Skincare' | 'Fitness' | 'Tech' | 'Casa' | 'Moda' | 'Saúde';
  style: string;
  durationSec: 15 | 30 | 60;
  viralScore: number;
  viewsLabel: string;
  thumbnail: string;
  preAnalyzedManifest: ViralManifestDTO;
}

export const VIRAL_TRENDING_VIDEOS: ViralCatalogEntry[] = [
  {
    id: 'viral-serum-choque',
    title: '“Eu parei de usar base depois disso”',
    creatorHandle: '@camila.ugc',
    platform: 'TikTok Shop',
    market: 'EUA',
    niche: 'Skincare',
    style: 'Hook de Choque + Rotina',
    durationSec: 15,
    viralScore: 97,
    viewsLabel: '2.4M views',
    thumbnail: '/showcase/modelo-01.webp',
    preAnalyzedManifest: {
      sourceTitle: 'Eu parei de usar base depois disso (Skincare)',
      durationSeconds: 15,
      style: 'Hook de Choque + Rotina',
      niche: 'Skincare',
      scenes: [
        { index: 0, role: 'Hook', visualCues: 'Close no rosto no banheiro com luz da manhã segurando o frasco próximo à lente.', spokenTemplate: 'Eu literalmente aposentei minha base depois de testar isso por sete dias.', durationSeconds: 8 },
        { index: 1, role: 'Demonstração', visualCues: 'Aplica duas gotas na bochecha mostrando textura e brilho imediato com sorriso natural.', spokenTemplate: 'Olha o acabamento natural sem pesar — e o link com desconto tá fixado aqui.', durationSeconds: 8 },
      ],
    },
  },
  {
    id: 'viral-academia-creatina',
    title: '3 sinais de produto que realmente funciona no treino',
    creatorHandle: '@lucas.fitlab',
    platform: 'Instagram Reels',
    market: 'Brasil',
    niche: 'Fitness',
    style: 'Lista + Prova Física',
    durationSec: 30,
    viralScore: 94,
    viewsLabel: '1.8M views',
    thumbnail: '/showcase/modelo-02.webp',
    preAnalyzedManifest: {
      sourceTitle: '3 sinais na rotina de treino (Fitness)',
      durationSeconds: 24,
      style: 'Lista + Prova Física',
      niche: 'Fitness',
      scenes: [
        { index: 0, role: 'Hook', visualCues: 'Plano médio na academia com toalha no ombro olhando firme para a câmera.', spokenTemplate: 'Se você treina pesado e ainda sente fadiga na última série, olha esses 3 pontos.', durationSeconds: 8 },
        { index: 1, role: 'Demonstração', visualCues: 'Mostra o pote aberto preparando na coqueteleira em luz natural clara.', spokenTemplate: 'Dissolve em segundos sem empelotar e sem aquele gosto artificial enjoativo.', durationSeconds: 8 },
        { index: 2, role: 'Chamada', visualCues: 'Aponta para o botão inferior com expressão confiante.', spokenTemplate: 'Garante o teu hoje antes que o lote promocional acabe.', durationSeconds: 8 },
      ],
    },
  },
  {
    id: 'viral-cafe-rotina',
    title: 'POV: café cremoso em 90 segundos antes da reunião',
    creatorHandle: '@bruna.casa',
    platform: 'TikTok Shop',
    market: 'EUA',
    niche: 'Casa',
    style: 'POV Rotina Silenciosa',
    durationSec: 15,
    viralScore: 92,
    viewsLabel: '980K views',
    thumbnail: '/showcase/modelo-06.webp',
    preAnalyzedManifest: {
      sourceTitle: 'POV Café Cremoso em 90s (Casa)',
      durationSeconds: 16,
      style: 'POV Rotina',
      niche: 'Casa',
      scenes: [
        { index: 0, role: 'Hook', visualCues: 'Bancada de cozinha ensolarada, câmera baixa mostrando crema caindo na caneca.', spokenTemplate: 'Nunca mais paguei caro em cafeteria depois que coloquei isso na bancada.', durationSeconds: 8 },
        { index: 1, role: 'Demonstração', visualCues: 'Criadora toma o primeiro gole olhando para a câmera e mostra o aparelho de perto.', spokenTemplate: 'Em 90 segundos fica pronto com espuma igual de barista.', durationSeconds: 8 },
      ],
    },
  },
  {
    id: 'viral-tech-unboxing',
    title: 'Unboxing honesto: vale o preço em 2026?',
    creatorHandle: '@rafael.tech',
    platform: 'YouTube Shorts',
    market: 'EUA',
    niche: 'Tech',
    style: 'Unboxing Direto',
    durationSec: 30,
    viralScore: 91,
    viewsLabel: '1.1M views',
    thumbnail: '/showcase/modelo-04.webp',
    preAnalyzedManifest: {
      sourceTitle: 'Unboxing Honesto no Escritório (Tech)',
      durationSeconds: 16,
      style: 'Unboxing Direto',
      niche: 'Tech',
      scenes: [
        { index: 0, role: 'Hook', visualCues: 'Mesa de escritório minimalista, abre a caixa com corte seco em movimento rápido.', spokenTemplate: 'Todo mundo tá falando desse lançamento — bora testar ao vivo se entrega mesmo.', durationSeconds: 8 },
        { index: 1, role: 'Prova Social', visualCues: 'Demonstra o recurso principal com zoom limpo nos detalhes.', spokenTemplate: 'O acabamento e o ganho de produtividade no dia a dia valem cada centavo.', durationSeconds: 8 },
      ],
    },
  },
  {
    id: 'viral-moda-look',
    title: 'Como transformar 1 peça básica em 3 looks reais',
    creatorHandle: '@sofia.style',
    platform: 'Instagram Reels',
    market: 'Brasil',
    niche: 'Moda',
    style: 'Transição Rápida',
    durationSec: 15,
    viralScore: 90,
    viewsLabel: '860K views',
    thumbnail: '/showcase/modelo-03.webp',
    preAnalyzedManifest: {
      sourceTitle: '1 Peça em 3 Looks (Moda)',
      durationSeconds: 16,
      style: 'Transição Rápida',
      niche: 'Moda',
      scenes: [
        { index: 0, role: 'Hook', visualCues: 'Café ao ar livre, criadora gira o ombro mostrando caimento e textura do tecido.', spokenTemplate: 'Essa foi a compra mais inteligente do mês porque combina literalmente com tudo.', durationSeconds: 8 },
        { index: 1, role: 'Chamada', visualCues: 'Sorri natural aproximando o detalhe da costura sob luz solar.', spokenTemplate: 'Salva esse vídeo e confere os tamanhos disponíveis no link.', durationSeconds: 8 },
      ],
    },
  },
  {
    id: 'viral-saude-energia',
    title: 'O erro das 15h que acaba com seu foco (e o ajuste simples)',
    creatorHandle: '@dr.marcos.vida',
    platform: 'YouTube Shorts',
    market: 'Brasil',
    niche: 'Saúde',
    style: 'Mito vs Realidade',
    durationSec: 60,
    viralScore: 95,
    viewsLabel: '3.1M views',
    thumbnail: '/showcase/modelo-07.webp',
    preAnalyzedManifest: {
      sourceTitle: 'Erro das 15h sem Energia (Saúde)',
      durationSeconds: 24,
      style: 'Mito vs Realidade',
      niche: 'Saúde',
      scenes: [
        { index: 0, role: 'Hook', visualCues: 'Enquadramento sério em escritório claro apontando para câmera no primeiro segundo.', spokenTemplate: 'Se às 3 da tarde seu foco desaba, o problema quase nunca é falta de sono.', durationSeconds: 8 },
        { index: 1, role: 'Demonstração', visualCues: 'Mostra o produto de rotina diária ao lado do copo de água na mesa.', spokenTemplate: 'Quando você ajusta esse detalhe simples logo de manhã, a curva de energia estabiliza.', durationSeconds: 8 },
        { index: 2, role: 'Chamada', visualCues: 'Expressão didática e acolhedora olhando direto na lente.', spokenTemplate: 'Testa por duas semanas e depois me conta a diferença nos comentários.', durationSeconds: 8 },
      ],
    },
  },
];

export interface MinedProfileEntry {
  id: string;
  handle: string;
  platform: string;
  niche: string;
  avgViews: string;
  viralScore: number;
  topFormat: string;
  avatarUrl: string;
  trendingEntryId: string;
}

export const MINED_PROFILES: MinedProfileEntry[] = [
  {
    id: 'prof-camila',
    handle: '@camila.ugc',
    platform: 'TikTok Shop',
    niche: 'Skincare & Beleza',
    avgViews: '420K / vídeo',
    viralScore: 97,
    topFormat: 'Hook de Choque + Rotina 15s',
    avatarUrl: '/showcase/modelo-01.webp',
    trendingEntryId: 'viral-serum-choque',
  },
  {
    id: 'prof-lucas',
    handle: '@lucas.fitlab',
    platform: 'Instagram Reels',
    niche: 'Suplementos & Fitness',
    avgViews: '310K / vídeo',
    viralScore: 94,
    topFormat: 'Lista de 3 Sinais + Prova',
    avatarUrl: '/showcase/modelo-02.webp',
    trendingEntryId: 'viral-academia-creatina',
  },
  {
    id: 'prof-bruna',
    handle: '@bruna.casa',
    platform: 'TikTok Shop',
    niche: 'Casa & Portáteis',
    avgViews: '260K / vídeo',
    viralScore: 92,
    topFormat: 'POV Cozinha Estética',
    avatarUrl: '/showcase/modelo-06.webp',
    trendingEntryId: 'viral-cafe-rotina',
  },
  {
    id: 'prof-marcos',
    handle: '@dr.marcos.vida',
    platform: 'YouTube Shorts',
    niche: 'Saúde & Bem-estar',
    avgViews: '580K / vídeo',
    viralScore: 95,
    topFormat: 'Mito vs Realidade',
    avatarUrl: '/showcase/modelo-07.webp',
    trendingEntryId: 'viral-saude-energia',
  },
];

export const UGC_GUIDES: Record<GuideId, { title: string; steps: GuideStep[] }> = {
  ads: {
    title: 'Como criar um vídeo no ADS',
    steps: [
      { title: 'Clique em "Novo Projeto" ou escolha um modelo', desc: 'Você começa por um modelo viral da biblioteca ou deixa a IA criar do zero.', target: 'ads-start' },
      { title: 'Escolha produto, cenas e voz', desc: 'O assistente guia 8 etapas curtas (ou use o preenchimento automático em 1 clique).', target: 'ads-templates' },
      { title: 'Pegue o vídeo pronto em Projetos', desc: 'O custo por cena aparece antes de confirmar; falhas são devolvidas.', target: 'ads-start' },
    ],
  },
  link: {
    title: 'Como criar um vídeo a partir do link do produto',
    steps: [
      { title: 'Cole o link do produto', desc: 'Cole a URL da página do produto (loja, Shopee, Mercado Livre, Amazon…) e clique em "Continuar" — a IA puxa nome, descrição e imagens. Sem link? Clique em "Criar do zero".', target: 'link-current-box' },
      { title: 'Confira o produto', desc: 'Revise nome, descrição e imagens antes de continuar.', target: 'link-current-box' },
      { title: 'Configure o vídeo', desc: 'Defina plataforma, proporção, idioma e público.', target: 'link-current-box' },
      { title: 'Escolha o roteiro', desc: 'Confira a fala e ajuste o texto para seu anúncio.', target: 'link-current-box' },
      { title: 'Escolha o avatar (opcional)', desc: 'Selecione um personagem ou continue sem avatar.', target: 'link-current-box' },
      { title: 'Escolha o estilo', desc: 'Defina a direção visual do anúncio.', target: 'link-current-box' },
      { title: 'Cenas e Gerar Vídeo', desc: 'Confira cenas, motor e custo antes de gerar.', target: 'link-current-box' },
      { title: 'Acompanhe em Projetos', desc: 'Veja o andamento e baixe o resultado quando estiver pronto.', target: 'link-current-box' },
    ],
  },
  talking: {
    title: 'Como criar um anúncio de personagem falante',
    steps: [
      { title: 'Idioma e avatar', desc: 'Escolha o idioma e quem vai falar: um avatar realista, um dos seus avatares (os que você criou ou enviou) ou uma foto (Upload). Dá para mudar o cenário com IA, se quiser.', target: 'talking-avatar' },
      { title: 'B-roll (opcional)', desc: 'Adicione um vídeo de fundo para o personagem.', target: 'talking-broll' },
      { title: 'Roteiro, voz e legenda', desc: 'Escreva a fala, escolha a voz e confira as opções de legenda.', target: 'talking-script' },
      { title: 'Confira e crie o vídeo', desc: 'Revise cenas e custo no painel da direita.', target: 'talking-submit' },
    ],
  },
  projects: {
    title: 'Onde ficam seus vídeos e produções',
    steps: [
      { title: 'Filtre por status', desc: 'Separe rapidamente Concluídos, Processando, Falhados e Personagem Falante.', target: 'projects-tabs' },
      { title: 'Baixe ou refaça cenas com erro', desc: 'Conteúdos não agendados expiram em 14 dias — baixe os prontos para guardar.', target: 'projects-grid' },
    ],
  },
  hook: {
    title: 'Como montar um Hook + Demo viral',
    steps: [
      { title: 'Gere ou escreva o Gancho (primeiros 3s)', desc: 'Use o botão "Gerar ganchos com IA" para receber frases prontas que prendem atenção.', target: 'hook-text-box' },
      { title: 'Escolha quem abre e qual cena demonstra', desc: 'Combine rosto/abertura + foto ou cena do seu produto funcionando.', target: 'hook-media-box' },
      { title: 'Ajuste cor e posição na prévia ao lado', desc: 'Clique em Topo, Centro ou Inferior e gere seu vídeo para Projetos.', target: 'hook-preview-box' },
    ],
  },
  slideshows: {
    title: 'Como criar um slideshow (carrossel)',
    steps: [
      { title: 'Produto ou nicho', desc: 'No canto do card “1. Prompt”, clique em “• Nenhum contexto” e escolha um produto seu ou um nicho. Prefere partir de algo pronto? Use “Comece com o modelo” ou “A partir de URL”.', target: 'slideshow-prompt-box' },
      { title: 'Texto dos slides', desc: 'Escolha o formato do texto e confira o roteiro que a IA montou para o carrossel.', target: 'slideshow-prompt-box' },
      { title: 'Coleção de imagens', desc: 'Escolha o motor, proporção e posição do texto para as imagens.', target: 'slideshow-prompt-box' },
      { title: 'Gerar', desc: 'Gere as imagens e acompanhe a apresentação no editor de pré-visualização.', target: 'slideshow-player-box' },
      { title: 'Edite e baixe', desc: 'Revise os slides, reproduza em diferentes velocidades e envie o resultado para Projetos.', target: 'slideshow-player-box' },
    ],
  },
  motion: {
    title: 'Como funciona o Controle de Movimento',
    steps: [
      { title: 'Escolha o rosto do seu personagem', desc: 'Selecione um avatar pronto ou envie uma foto nítida.', target: 'motion-character-box' },
      { title: 'Escolha um Movimento Viral já analisado', desc: 'Movimentos marcados como "Já analisado" não cobram custo extra de leitura.', target: 'motion-preset-box' },
    ],
  },
  'image-ads': {
    title: 'Como gerar anúncios estáticos que vendem',
    steps: [
      { title: 'Escolha um modelo de anúncio ou preencha em 1 clique', desc: 'Cada layout já vem ajustado para feed (1:1) ou stories/reels (9:16).', target: 'image-ad-templates' },
      { title: 'Anexe o produto e confira a prévia ao lado', desc: 'A IA compõe a arte final já com a identidade visual da sua marca.', target: 'image-ad-submit' },
    ],
  },
  viral: {
    title: 'Como montar a sua biblioteca de vídeos virais',
    steps: [
      { title: 'Crie uma pasta', desc: 'Clique em "Nova pasta" e dê um nome (o perfil ou o nicho de onde vêm os vídeos). Vídeo enviado sem pasta cai em "Aleatórios".', target: 'viral-folders-box' },
      { title: 'Coloque os vídeos na pasta', desc: 'Salve referências do TikTok/Reels e mantenha os exemplos organizados na pasta certa.', target: 'viral-folders-box' },
      { title: 'Marque os formatos do Studio', desc: 'Use ADS, Hook+Demo, Remake Viral e outros formatos para encontrar rápido o próximo vídeo.', target: 'viral-folders-box' },
      { title: 'Use a pasta no Studio', desc: 'Abra a pasta e leve o vídeo vencedor para o Remake Viral com a estrutura pronta para o seu produto.', target: 'viral-folders-box' },
    ],
  },
  remake: {
    title: 'Como clonar um anúncio para o seu produto',
    steps: [
      { title: 'Escolha o vídeo de referência e gere o Manifest (Grátis)', desc: 'A IA mapeia Hook, Demonstração e Chamada sem descontar nenhum crédito.', target: 'remake-source-box' },
      { title: 'Adapte para a sua marca e compare lado a lado', desc: 'Só cobra créditos quando você confirmar Gerar Vídeo Remake.', target: 'remake-compare-box' },
    ],
  },
  studio: {
    title: 'Como operar sua linha de produção no Studio',
    steps: [
      { title: 'Defina o Brandbook da marca com IA (0 créditos)', desc: 'Gere paleta, tom de voz e ganchos antes de produzir vídeos em lote.', target: 'studio-brand-box' },
      { title: 'Escolha um formato e estilize as legendas', desc: 'Teste os 12 estilos de legenda na Montagem Final e agende nas Contas.', target: 'studio-main-box' },
    ],
  },
};

export const STUDIO_CAPTION_STYLES = [
  { id: 'minimalista', label: 'Minimalista', badgeClass: 'bg-black/55 text-white font-medium' },
  { id: 'negrito', label: 'Negrito', badgeClass: 'bg-transparent text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]' },
  { id: 'destaque', label: 'Destaque', badgeClass: 'bg-amber-300 text-black font-black' },
  { id: 'contorno', label: 'Contorno', badgeClass: 'bg-black/40 text-white font-black ring-2 ring-white' },
  { id: 'sombra', label: 'Sombra', badgeClass: 'bg-black/80 text-zinc-100 font-bold shadow-2xl' },
  { id: 'karaoke', label: 'Karaokê', badgeClass: 'bg-black/75 text-emerald-300 font-black' },
  { id: 'karaoke-3', label: 'Karaokê 3 palavras', badgeClass: 'bg-black/75 text-cyan-300 font-extrabold uppercase' },
  { id: 'animado', label: 'Animado', badgeClass: 'bg-brand text-white font-black shadow-lg' },
  { id: 'caixa', label: 'Caixa', badgeClass: 'bg-white text-black font-black px-3 py-1.5 rounded-lg' },
  { id: 'gradiente', label: 'Gradiente', badgeClass: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-black' },
  { id: 'neon', label: 'Neon', badgeClass: 'bg-zinc-950/90 text-fuchsia-400 font-black ring-1 ring-fuchsia-400' },
  { id: 'maquina', label: 'Máquina', badgeClass: 'bg-zinc-900/90 text-lime-300 font-mono font-bold' },
] as const;

export const STUDIO_ACCOUNT_STAGES = [
  'Criada',
  'Conexão pendente',
  'Conexão validada',
  'Aquecimento 1',
  'Aquecimento 2',
  'Aquecimento 3',
  'Pronta',
  'Ativa',
  'Em observação',
  'Recuperação',
  'Aposentada',
] as const;

export const STUDIO_FORMATS = [
  {
    id: 'creator-viral',
    title: 'Creator Viral IA',
    badge: 'RECOMENDADO',
    desc: 'Combina seus avatares aprovados + referências da Biblioteca VIRAL em lote.',
    defaultPrompt: 'Apresenta o produto com energia natural olhando para a lente em estilo UGC autêntico.',
  },
  {
    id: 'monetiza-view',
    title: 'Monetiza View',
    badge: 'SEM ROSTO',
    desc: 'Vídeos dinâmicos de alta retenção por tema/curiosidade para monetizar alcance.',
    defaultPrompt: 'Narração envolvente com curiosidade visual focada em retenção dos 3 segundos ao final.',
  },
  {
    id: 'pov',
    title: 'POV',
    badge: 'ROTEIRO RÁPIDO',
    desc: 'Ponto de vista em primeira pessoa mostrando uso real no dia a dia.',
    defaultPrompt: 'Câmera POV em primeira pessoa usando o produto na rotina real da manhã.',
  },
  {
    id: 'motion-mass',
    title: 'Controle de Movimentos',
    badge: 'EM MASSA',
    desc: 'Replica movimentos virais pré-analisados nos avatares escolhidos da marca.',
    defaultPrompt: 'Avatar replicando movimento viral já analisado apontando para legenda e produto.',
  },
] as const;

export interface TutorialArticle {
  slug: string;
  category: 'Primeiros passos' | 'Influencer IA' | 'AI UGC' | 'VIRAL' | 'Studio' | 'Próximas entregas';
  title: string;
  summary: string;
  readTime: string;
  to: string;
  steps: { title: string; body: string }[];
  tips: string[];
}

export const TUTORIAL_ARTICLES: TutorialArticle[] = [
  {
    slug: 'primeiros-passos',
    category: 'Primeiros passos',
    title: 'Por onde começar no FUTURO DIGITAL Studio',
    summary: 'Qual ferramenta usar para cada objetivo: avatar em foto, anúncio de produto por link ou personagem falando.',
    readTime: '2 min',
    to: '/dashboard',
    steps: [
      { title: 'Quero criar o rosto do meu influencer', body: 'Abra Influencer IA no menu, escolha características reais ou envie sua foto de referência.' },
      { title: 'Quero um anúncio em vídeo de um produto', body: 'Use AI UGC: aba LINK (colando a URL da loja) ou ADS (assistente em 8 etapas).' },
      { title: 'Quero uma pessoa falando meu texto para a câmera', body: 'Use AI UGC > Personagem Falante: cada ~8 segundos vira uma cena pronta.' },
    ],
    tips: ['Toda tela exibe um guia rápido no topo com o botão "Mostrar onde".', 'Se qualquer geração falhar na IA, seus créditos voltam automaticamente.'],
  },
  {
    slug: 'influencer-ia',
    category: 'Influencer IA',
    title: 'Criando avatares consistentes com sua marca',
    summary: 'Como combinar características físicas, Mundo do Personagem e fotos de produto mantendo o mesmo rosto.',
    readTime: '3 min',
    to: '/avatars',
    steps: [
      { title: 'Escolha tipo, rosto e estilo', body: 'Abra os grupos na esquerda ou escolha um modelo pronto em Explorar > Modelos e clique em "Usar rosto".' },
      { title: 'Defina o Mundo do Personagem', body: 'Descreva onde ele mora, rotina e cenário para suas próximas gerações combinarem.' },
      { title: 'Anexe seu produto', body: 'No slot PRODUTO da barra central, envie a foto em fundo limpo para o avatar segurar o item.' },
    ],
    tips: ['Toda imagem gerada recebe automaticamente a marca d’água FUTURO DIGITAL no servidor.'],
  },
  {
    slug: 'ai-ugc-ads',
    category: 'AI UGC',
    title: 'AI UGC · Anúncio hiper-realista (ADS)',
    summary: 'Passo a passo do assistente em 8 etapas: modelo viral, produto, cenas de ~10s, voz e resumo.',
    readTime: '4 min',
    to: '/ai-ugc/ads',
    steps: [
      { title: 'Escolha um modelo viral (ou IA Criativa)', body: 'Filtre por formato 9:16 ou 16:9, duração e nicho.' },
      { title: 'Anexe produto e avatar (opcional)', body: 'Foto com boa iluminação aumenta a fidelidade da embalagem.' },
      { title: 'Use o preenchimento automático ou edite as cenas', body: 'Revise custo por cena no Resumo antes de clicar em Gerar Vídeo.' },
    ],
    tips: ['Você pode voltar em qualquer etapa do assistente sem perder o que preencheu.'],
  },
  {
    slug: 'ai-ugc-link',
    category: 'AI UGC',
    title: 'AI UGC · Vídeo a partir de 1 Link',
    summary: 'Transforme a URL da página do produto em roteiro e anúncio sem digitar tudo do zero.',
    readTime: '3 min',
    to: '/ai-ugc/link',
    steps: [
      { title: 'Cole o link do produto', body: 'Lemos título, descrição e imagem sem gastar créditos — ou use "Criar do zero" manualmente.' },
      { title: 'Escolha plataforma, tom e roteiro', body: 'A IA sugere roteiros prontos para TikTok, Reels ou Shorts.' },
      { title: 'Confirme avatar e gere', body: 'Acompanhe a produção na aba Projetos.' },
    ],
    tips: ['Quanto mais claros os benefícios na descrição do produto, mais persuasivo sai o roteiro.'],
  },
  {
    slug: 'ai-ugc-personagem-falante',
    category: 'AI UGC',
    title: 'AI UGC · Anúncio de Personagem Falante',
    summary: 'Seu influencer lê o roteiro cena por cena (~8s), com escolha de emoção, voz e B-roll atrás.',
    readTime: '4 min',
    to: '/ai-ugc/falante',
    steps: [
      { title: 'Escolha o idioma e o avatar + emoção', body: 'Use seus avatares, modelos prontos ou envie uma foto nítida do peito para cima.' },
      { title: 'Escreva a fala (até 3.000 caracteres)', body: 'A barra conta palavras e divide em cenas de ~8 segundos nos fins de frase.' },
      { title: 'Defina voz, B-roll opcional e gere', body: 'Confira no painel lateral quantas cenas serão geradas e o total de créditos.' },
    ],
    tips: ['Escreva frases curtas e naturais como se estivesse falando com um amigo.'],
  },
  {
    slug: 'projetos',
    category: 'Primeiros passos',
    title: 'Onde ficam seus vídeos (Projetos)',
    summary: 'Acompanhe fila de produção, assista cena por cena, baixe ou tente novamente se alguma cena falhar.',
    readTime: '2 min',
    to: '/projects',
    steps: [
      { title: 'Filtre por status', body: 'Use Todos, Concluídos, Processando, Falhados ou Personagem Falante.' },
      { title: 'Baixe dentro de 14 dias', body: 'Vídeos não agendados expiram automaticamente após 14 dias para liberar espaço.' },
    ],
    tips: ['Se alguma cena falhar, só o valor dela volta ao seu saldo.'],
  },
  {
    slug: 'ai-ugc-hook-demo',
    category: 'AI UGC',
    title: 'AI UGC · Hook + Demo (Gancho nos 3 primeiros segundos)',
    summary: 'Combine um gancho de curiosidade com texto na tela seguido imediatamente pela demonstração do produto.',
    readTime: '3 min',
    to: '/ai-ugc/hook-demo',
    steps: [
      { title: 'Gere 5 ideias de gancho com IA', body: 'Use o gerador de hooks para evitar começos frios e testá-los na prévia.' },
      { title: 'Posicione e estilize a legenda do gancho', body: 'Escolha Topo, Centro ou Inferior e uma das 5 paletas de alto contraste.' },
    ],
    tips: ['Ganchos curtos (até 12 palavras) aumentam a retenção até a parte do produto.'],
  },
  {
    slug: 'ai-ugc-slideshows',
    category: 'AI UGC',
    title: 'AI UGC · Slideshows Animados para Reels e TikTok',
    summary: 'Gere sequência de 3 a 8 lâminas com imagens geradas por IA e texto sincronizado em formato vertical.',
    readTime: '3 min',
    to: '/ai-ugc/slideshows',
    steps: [
      { title: 'Gere os tópicos por quantidade de slides', body: 'A IA estrutura gancho no Slide 1, lista no meio e chamada no último.' },
      { title: 'Teste o ritmo no player antes de renderizar', body: 'Alternar entre 1x e 2x ajuda a garantir que o público consiga ler tudo.' },
    ],
    tips: ['Use Nano Banana 2 (2 créditos/slide) para testar rápido e Pro para peças finais.'],
  },
  {
    slug: 'motion-control',
    category: 'Influencer IA',
    title: 'Motion Control · Transfira movimentos virais para seu avatar',
    summary: 'Coloque seu influencer falando, apontando ou reagindo usando movimentos virais pré-analisados.',
    readTime: '3 min',
    to: '/avatars?panel=motion',
    steps: [
      { title: 'Carregue seu personagem ou modelo pronto', body: 'Quanto mais nítido o rosto e tronco, mais consistente fica a animação.' },
      { title: 'Escolha um movimento viral já analisado', body: 'Presets com selo "Já analisado" economizam créditos e aceleram o envio.' },
    ],
    tips: ['Você pode escolher manter a roupa da foto original ou adaptar ao movimento.'],
  },
  {
    slug: 'image-ads',
    category: 'AI UGC',
    title: 'Image Ads · Anúncios estáticos de produto com IA',
    summary: 'Monte criativos de oferta, prova social ou editorial estúdio em 1:1, 9:16 ou 4:3 prontos para rodar tráfego.',
    readTime: '2 min',
    to: '/image-ads',
    steps: [
      { title: 'Escolha um formato campeão', body: 'Selecione Oferta Relâmpago, Benefícios ou Minimalista e ajuste título e CTA.' },
      { title: 'Gere de 1 a 4 variações de uma vez', body: 'Cada variação sai com qualidade de estúdio e vai para Projetos.' },
    ],
    tips: ['Fotos de produto com boa luz na frente geram embalagens muito mais fiéis.'],
  },
  {
    slug: 'biblioteca-viral',
    category: 'VIRAL',
    title: 'Biblioteca VIRAL · Pastas, Perfis Minerados e Tendências',
    summary: 'Salve referências por link ou arquivo, acompanhe notas de projeção viral (0–100) e vincule pastas a formatos.',
    readTime: '3 min',
    to: '/viral',
    steps: [
      { title: 'Crie pastas por nicho ou produto', body: 'Importe links do TikTok/Reels ou faça upload de referências sem gastar créditos.' },
      { title: 'Explore Perfis Minerados e Novidades Explodindo', body: 'Veja o que já está convertendo agora e leve direto para o Remake Viral.' },
    ],
    tips: ['Guardar vídeos e extrair o Manifest cena a cena nunca consome créditos.'],
  },
  {
    slug: 'remake-viral',
    category: 'AI UGC',
    title: 'AI UGC · Remake Viral / Clonar Anúncio Vencedor',
    summary: 'Transforme qualquer anúncio validado em uma nova versão autêntica para o seu produto com comparador lado a lado.',
    readTime: '4 min',
    to: '/ai-ugc/remake',
    steps: [
      { title: 'Escolha uma referência ou cole o link e gere o Manifest', body: 'O Manifest separa Hook, Demonstração e Chamada gratuitamente.' },
      { title: 'Adapte para sua marca em 1 clique', body: 'Compare Original × Seu Remake na coluna da direita e gere o vídeo no Veo.' },
    ],
    tips: ['Use "1 take rápido (8s)" para testar ângulos novos gastando apenas 10 créditos.'],
  },
  {
    slug: 'studio-marca-e-massa',
    category: 'Studio',
    title: 'Studio · Brandbook com IA & Produção em Massa (4 Formatos)',
    summary: 'Estruture a identidade da marca em 0 créditos e gere lotes inteiros com Creator Viral IA, Monetiza View, POV e Motion.',
    readTime: '4 min',
    to: '/studio',
    steps: [
      { title: 'Gere o Brandbook do seu nicho e produto', body: 'Paleta de cores, tom de voz, pilares e ganchos prontos em 1 clique sem gastar saldo.' },
      { title: 'Escolha 1 dos 4 formatos na aba Criar vídeos', body: 'Produza múltiplos roteiros em lote mantendo consistência de avatar e estilo.' },
    ],
    tips: ['O formato Creator Viral IA usa automaticamente o rosto e a estética da sua marca.'],
  },
  {
    slug: 'studio-agenda-e-legendas',
    category: 'Studio',
    title: 'Studio · Montagem Final (12 Legendas) & Agenda de Contas',
    summary: 'Personalize legendas com 12 estilos visuais e gerencie aquecimento e agenda de publicação das suas contas.',
    readTime: '3 min',
    to: '/studio/montagem',
    steps: [
      { title: 'Teste os 12 estilos de legenda na Montagem final', body: 'Alterne entre Karaokê, Neon, Destaque, Minimalista e outros antes de agendar.' },
      { title: 'Cadastre contas, acompanhe o funil de aquecimento e agende', body: 'Respeite pausas seguras entre publicações e configure rotinas diárias no Automático.' },
    ],
    tips: ['Cenas individuais podem ser ajustadas em até 4 dias; baixe vídeos prontos em até 15 dias.'],
  },
  {
    slug: 'studio-comece-aqui',
    category: 'Studio',
    title: 'Studio · Comece aqui: escolha seu caminho',
    summary: 'Entenda a diferença entre criar uma marca do zero, usar um avatar existente e produzir sem avatar.',
    readTime: '2 min',
    to: '/studio',
    steps: [{ title: 'Escolha o ponto de partida', body: 'Use o onboarding para ir direto à marca, aos vídeos ou ao Monetiza View.' }, { title: 'Troque de caminho quando quiser', body: 'O Studio mantém projetos, marca e avatares organizados para você continuar depois.' }],
    tips: ['O onboarding pode ser ocultado e reaberto pela visão geral do Studio.'],
  },
  {
    slug: 'studio-criar-videos',
    category: 'Studio',
    title: 'Studio · Criar vídeos em lote',
    summary: 'Escolha Creator Viral IA, POV, Monetiza View ou Motion e produza vários roteiros com a mesma identidade.',
    readTime: '3 min',
    to: '/studio/criar',
    steps: [{ title: 'Escolha um formato', body: 'Cada formato tem uma estrutura pronta para o objetivo da publicação.' }, { title: 'Revise e produza', body: 'Ajuste roteiros, cenas e quantidade antes de levar para a montagem final.' }],
    tips: ['A produção em lote mantém o brandbook como referência de voz e estética.'],
  },
  {
    slug: 'studio-montagem-video',
    category: 'Studio',
    title: 'Studio · Detalhe do vídeo e montagem final',
    summary: 'Abra um projeto, assista cena por cena, confira o status e selecione o acabamento antes do download.',
    readTime: '3 min',
    to: '/studio/montagem',
    steps: [{ title: 'Abra o projeto', body: 'Use Projetos para encontrar vídeos processando, concluídos ou com falha.' }, { title: 'Aplique o acabamento', body: 'Escolha legenda, ritmo e revisão final antes de publicar.' }],
    tips: ['Se uma cena falhar, você consegue identificar o trecho sem perder o restante do projeto.'],
  },
  {
    slug: 'studio-aquecimento',
    category: 'Studio',
    title: 'Studio · Aquecimento seguro de contas',
    summary: 'Veja como o funil de aquecimento organiza uma conta nova antes de receber uma rotina de publicação.',
    readTime: '2 min',
    to: '/studio/contas',
    steps: [{ title: 'Cadastre a conta', body: 'Informe plataforma, @handle e projeto principal.' }, { title: 'Acompanhe o estágio', body: 'Respeite a progressão de volume antes de ativar o automático.' }],
    tips: ['Use o modo manual enquanto a conta ainda está aquecendo.'],
  },
  {
    slug: 'studio-contas',
    category: 'Studio',
    title: 'Studio · Contas, rotina automática e agenda',
    summary: 'Centralize contas, horários, meta diária e fila de publicações para não depender de planilhas.',
    readTime: '3 min',
    to: '/studio/contas',
    steps: [{ title: 'Configure a rotina', body: 'Defina meta diária, janela de publicação e pausas entre posts.' }, { title: 'Revise antes de ativar', body: 'O resumo mostra contas, próximos horários e itens aguardando publicação.' }],
    tips: ['Desative o automático para revisar uma campanha manualmente.'],
  },
  {
    slug: 'studio-pov-monetiza',
    category: 'Studio',
    title: 'Studio · POV e Monetiza View',
    summary: 'Crie vídeos verticais para retenção e monetização sem precisar começar com um avatar falante.',
    readTime: '3 min',
    to: '/studio/criar/monetiza-view',
    steps: [{ title: 'Escolha o formato', body: 'POV cria uma experiência em primeira pessoa; Monetiza View prioriza retenção e volume.' }, { title: 'Defina o roteiro', body: 'Use ganchos, cenas e CTA adequados para a publicação.' }],
    tips: ['Formatos sem avatar são ideais para testar temas antes de criar um personagem.'],
  },
  {
    slug: 'studio-automatico',
    category: 'Studio',
    title: 'Studio · Modo automático',
    summary: 'Ative uma rotina para transformar projetos prontos em uma fila contínua de publicação.',
    readTime: '2 min',
    to: '/studio/contas',
    steps: [{ title: 'Escolha o projeto ativo', body: 'Defina qual marca e qual conta recebem a rotina automática.' }, { title: 'Configure a meta', body: 'Escolha quantidade diária, horários e pausas seguras.' }],
    tips: ['Comece com uma meta pequena e aumente depois de validar o formato.'],
  },
  {
    slug: 'studio-celular-desktop',
    category: 'Studio',
    title: 'Studio · Celular e desktop',
    summary: 'Veja como continuar o trabalho em telas diferentes com navegação responsiva e menu adaptável.',
    readTime: '2 min',
    to: '/studio',
    steps: [{ title: 'Use o menu compacto no celular', body: 'Abra a gaveta lateral pelo botão hambúrguer para trocar de ferramenta.' }, { title: 'Continue no desktop', body: 'O Studio mantém projetos e marca sincronizados quando você volta para uma tela maior.' }],
    tips: ['A prévia vertical continua legível em telas estreitas.'],
  },
];
