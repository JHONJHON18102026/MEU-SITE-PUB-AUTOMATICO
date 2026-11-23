import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Bot, CheckCircle2, Clapperboard, Compass, Film, Flame, HelpCircle, ImagePlus, Layers3, LogIn, Menu, Play, Sparkles, Target, Users, Wand2, Workflow, X, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';

const FEATURES = [
  {
    id: 'influencer',
    eyebrow: 'INFLUENCER IA',
    title: 'Crie um avatar consistente para a sua marca',
    body: 'Monte personagens com aparência, estilo, cenário e mundo próprios. Salve o rosto e reutilize a mesma identidade em novas campanhas.',
    bullets: ['24 grupos de características', 'Foto base e produto no mesmo fluxo', 'Galeria de modelos prontos'],
    to: '/avatars',
    action: 'Explorar Influencer IA',
    image: '/showcase/internal-identity-new.png',
    icon: Bot,
    tint: 'from-[#23134b] via-[#372178] to-[#151526]',
  },
  {
    id: 'ugc',
    eyebrow: 'AI UGC',
    title: 'Do roteiro ao vídeo que parece gravado de verdade',
    body: 'Escolha o caminho que combina com a campanha: produto por link, anúncio em etapas, personagem falante, Hook + Demo ou slideshow.',
    bullets: ['Fluxos guiados por objetivo', 'Cenas de aproximadamente 8 segundos', 'Prévia vertical para redes sociais'],
    to: '/ai-ugc',
    action: 'Ver fluxos AI UGC',
    image: '/showcase/internal-ugc-new.png',
    icon: Clapperboard,
    tint: 'from-[#101c47] via-[#174d68] to-[#111b2b]',
  },
  {
    id: 'viral',
    eyebrow: 'VIRAL',
    title: 'Transforme referências em uma linha de produção',
    body: 'Organize vídeos por pastas, veja sinais de performance e gere um manifesto cena a cena para recriar a estrutura do que já funciona.',
    bullets: ['Pastas por campanha e nicho', 'Nota de projeção viral', 'Remake com roteiro editável'],
    to: '/viral',
    action: 'Abrir Biblioteca VIRAL',
    image: '/showcase/internal-viral-new.png',
    icon: Flame,
    tint: 'from-[#4a1e20] via-[#752c42] to-[#21172d]',
  },
  {
    id: 'image-ads',
    eyebrow: 'IMAGE ADS',
    title: 'Anúncios estáticos prontos para vender',
    body: 'Adicione produto, oferta, headline e chamada. O assistente organiza a composição para você testar criativos em vários formatos.',
    bullets: ['1:1, 4:3 e 9:16', 'Texto promocional editável', 'Desenho manual e preenchimento rápido'],
    to: '/image-ads',
    action: 'Criar Image Ad',
    image: '/showcase/internal-ads-new.png',
    icon: ImagePlus,
    tint: 'from-[#142d4c] via-[#205b7d] to-[#171d32]',
  },
  {
    id: 'studio',
    eyebrow: 'STUDIO',
    title: 'Uma operação de conteúdo, não só uma ferramenta',
    body: 'Crie o brandbook, organize projetos, escolha formatos, aplique legendas e prepare a rotina de publicação em um só lugar.',
    bullets: ['Brandbook e marca principal', '12 estilos de legenda', 'Contas, agenda e projetos'],
    to: '/studio',
    action: 'Conhecer o Studio',
    image: '/showcase/internal-studio-new.png',
    icon: Workflow,
    tint: 'from-[#2b174a] via-[#4d2677] to-[#15152b]',
  },
];

const PROMO_BANNERS = [
  { eyebrow: 'NOVO · AI UGC', title: 'Ads hiper-realistas', body: 'Seu produto, seu avatar e uma prévia pronta para revisar.', to: '/ai-ugc/ads', image: '/showcase/influencer-ai-new.png', tint: 'from-[#25124d] via-[#542d9a]/85 to-[#14131f]' },
  { eyebrow: 'FLUXO RÁPIDO', title: '1 Link = Resultado', body: 'Cole a URL do produto e comece pelo roteiro do anúncio.', to: '/ai-ugc/link', image: '/showcase/ugc-production-new.png', tint: 'from-[#0d3244] via-[#127a84]/75 to-[#10151f]' },
  { eyebrow: 'OPERAÇÃO DE CONTEÚDO', title: 'Studio em Massa', body: 'Marca, lotes, legendas, contas e agenda no mesmo espaço.', to: '/studio', image: '/showcase/studio-operation-new.png', tint: 'from-[#351449] via-[#742c7c]/75 to-[#171421]' },
];

const DEMO_VIDEOS = [
  { src: '/showcase/product-stage-identity.mp4', eyebrow: 'INFLUENCER IA', title: 'Comece pela identidade', body: 'Defina o rosto e o mundo visual antes de produzir.', to: '/avatars', poster: '/showcase/demo-influencer-card.png', accent: '#7c5cff' },
  { src: '/showcase/product-stage-ugc.mp4', eyebrow: 'AI UGC', title: 'Produza em ritmo de campanha', body: 'Conecte produto e avatar em um fluxo guiado.', to: '/ai-ugc', poster: '/showcase/demo-ugc-card.png', accent: '#22c7b8' },
  { src: '/showcase/product-stage-viral.mp4', eyebrow: 'BIBLIOTECA VIRAL', title: 'Repita o que funciona', body: 'Use referências, estrutura e remake para publicar melhor.', to: '/viral', poster: '/showcase/demo-viral-card.png', accent: '#ef8354' },
];

const FEATURED_STORIES = [
  { eyebrow: 'FUTURO DIGITAL STUDIO', title: 'Uma operação visual inteira para sua marca.', body: 'Crie a identidade, produza em lote, revise as cenas e prepare a publicação em um único lugar.', to: '/studio', image: '/showcase/studio-operation-new.png', tint: 'from-[#1a1039]/95 via-[#30166a]/70 to-transparent' },
  { eyebrow: 'INFLUENCER IA', title: 'Um rosto consistente. Quantas campanhas você quiser.', body: 'Monte seu personagem, defina o mundo dele e use a mesma identidade em cada novo criativo.', to: '/avatars', image: '/showcase/influencer-ai-new.png', tint: 'from-[#0c1b42]/95 via-[#17367c]/65 to-transparent' },
  { eyebrow: 'AI UGC', title: 'Do produto ao vídeo que parece ter sido gravado.', body: 'Escolha Link, ADS, Falante, Hook + Demo ou Slideshows e comece com um fluxo guiado.', to: '/ai-ugc', image: '/showcase/ugc-production-new.png', tint: 'from-[#3d172b]/95 via-[#6d244b]/60 to-transparent' },
  { eyebrow: 'BIBLIOTECA VIRAL', title: 'Pare de salvar referências sem saber o que fazer com elas.', body: 'Organize pastas, leia sinais de performance e leve a estrutura vencedora para um remake.', to: '/viral', image: '/showcase/viral-library-new.png', tint: 'from-[#192c32]/95 via-[#245f64]/60 to-transparent' },
];

const SHOWCASE_STAGES = [
  { label: '01 · IDENTIDADE', title: 'Um rosto que a marca reconhece.', body: 'Defina avatar, estética e mundo visual antes de produzir a primeira cena.', image: '/showcase/influencer-ai-new.png', metric: '24 grupos de características', tone: 'from-[#281456] via-[#5b38d7] to-[#121329]', cta: '/avatars' },
  { label: '02 · PRODUÇÃO', title: 'A ideia vira um vídeo que parece real.', body: 'Escolha o fluxo AI UGC, conecte produto e avatar e revise a prévia vertical.', image: '/showcase/ugc-production-new.png', metric: '5 caminhos de AI UGC', tone: 'from-[#0b2c43] via-[#147b8a] to-[#101822]', cta: '/ai-ugc' },
  { label: '03 · ESCALA', title: 'O que funciona volta como sistema.', body: 'Compare referências, organize remakes e publique a próxima variação mais rápido.', image: '/showcase/viral-library-new.png', metric: '1 biblioteca para repetir', tone: 'from-[#421927] via-[#9b3e59] to-[#171326]', cta: '/viral' },
];

const STEPS = [
  { icon: Wand2, title: 'Escolha um caminho', body: 'Comece por um avatar, um produto, uma referência viral ou uma campanha.' },
  { icon: Layers3, title: 'Monte a ideia', body: 'Use exemplos, guias, presets e campos rápidos para chegar ao primeiro rascunho.' },
  { icon: Film, title: 'Revise a prévia', body: 'Ajuste cenas, proporção, estilo e texto antes de transformar o conceito em publicação.' },
  { icon: Sparkles, title: 'Publique mais', body: 'Salve tudo em Projetos e repita o formato que melhor performar.' },
];

const UGC_MODES = [
  { label: 'ADS', title: 'Anúncio hiper-realista', body: 'Assistente em 8 etapas para montar produto, avatar, cenas, voz e resumo.', to: '/ai-ugc/ads', color: '#7c5cff' },
  { label: 'LINK', title: '1 Link = roteiro + vídeo', body: 'Cole a URL do produto e transforme descrição, benefícios e imagens em anúncio.', to: '/ai-ugc/link', color: '#22c7b8' },
  { label: 'FALANTE', title: 'Personagem falando', body: 'Divida sua fala em cenas de aproximadamente 8 segundos com emoção e B-roll.', to: '/ai-ugc/falante', color: '#ef8354' },
  { label: 'HOOK + DEMO', title: 'Gancho nos 3 primeiros segundos', body: 'Gere ideias de hook e conecte o começo forte à demonstração do produto.', to: '/ai-ugc/hook-demo', color: '#f2b84b' },
  { label: 'SLIDESHOW', title: 'Lâminas animadas', body: 'Monte uma sequência vertical com tópicos, imagens e chamada final.', to: '/ai-ugc/slideshows', color: '#ef5ab5' },
];

const USE_CASES = [
  { title: 'Vender um produto', body: 'Comece por um link, gere o roteiro e saia com um anúncio vertical pronto para revisar.', to: '/ai-ugc/link', icon: Target, accent: '#22c7b8' },
  { title: 'Criar um rosto de marca', body: 'Monte um avatar consistente para repetir campanhas sem perder identidade.', to: '/avatars', icon: Users, accent: '#7c5cff' },
  { title: 'Recriar o que viralizou', body: 'Encontre uma referência, entenda a estrutura e faça um remake com a sua marca.', to: '/viral', icon: Flame, accent: '#ef8354' },
  { title: 'Produzir em escala', body: 'Organize marca, lotes, legendas e contas para publicar com mais frequência.', to: '/studio', icon: Zap, accent: '#f2b84b' },
];

const SOCIAL_PROOF = [
  ['5 caminhos', 'para começar uma criação'],
  ['12 estilos', 'para finalizar vídeos'],
  ['1 operação', 'para marca e conteúdo'],
];

const RESULT_STATES = [
  { label: 'ANTES', title: 'Ideia solta', body: 'Uma referência, um produto e várias possibilidades sem direção.', image: '/showcase/modelo-05.webp', color: '#7c5cff' },
  { label: 'DURANTE', title: 'Fluxo guiado', body: 'Avatar, roteiro, cenas e formato organizados no mesmo caminho.', image: '/showcase/hero-ugc.webp', color: '#22c7b8' },
  { label: 'DEPOIS', title: 'Criativo pronto', body: 'Uma peça revisável, consistente e preparada para publicar.', image: '/showcase/modelo-08.webp', color: '#8a61ff' },
];

const OVERVIEW_CARDS = [
  { title: 'Uma ideia', body: 'Comece com um prompt, uma imagem, um produto ou um link.', image: '/showcase/overview-idea-new.png', accent: '#7c5cff' },
  { title: 'Vários formatos', body: 'Vídeos UGC, anúncios, avatar, slideshow e criativos estáticos.', image: '/showcase/overview-formats-new.png', accent: '#22c7b8' },
  { title: 'Tudo organizado', body: 'Projetos, referências, marca, contas e resultados no mesmo espaço.', image: '/showcase/overview-organized-new.png', accent: '#ef8354' },
];

const PLANS = [
  { slug: 'free', name: 'Comece grátis', body: 'Explore os fluxos antes de decidir.', features: ['Acesso à página de criação', 'Projetos organizados', 'Prévia antes de confirmar'], featured: false },
  { slug: 'creator', name: 'Creator', body: 'Para quem publica toda semana.', features: ['Créditos recorrentes', 'Brandbook e presets', 'Produção em lote'], featured: true },
  { slug: 'team', name: 'Equipe', body: 'Para marcas e operações enxutas.', features: ['Contas e permissões', 'Agenda de publicação', 'Suporte prioritário'], featured: false },
];

const TOOL_CATALOG = [
  { title: 'Criar avatar', body: 'Rosto, características e mundo do personagem.', to: '/avatars', tag: 'INFLUENCER IA', icon: Bot, color: '#27c98f', image: '/showcase/hero-influencer.webp' },
  { title: 'Avatar com produto', body: 'Faça o influencer segurar e apresentar seu produto.', to: '/avatars?product=1', tag: 'INFLUENCER IA', icon: ImagePlus, color: '#7357de', image: '/showcase/modelo-03.webp' },
  { title: 'Explorar modelos', body: 'Comece com rostos e referências já prontos.', to: '/avatars?tab=explore', tag: 'REFERÊNCIAS', icon: Compass, color: '#ae4fe0', image: '/showcase/modelo-02.webp' },
  { title: 'Projetos', body: 'Acompanhe status, cenas, downloads e tentativas.', to: '/projects', tag: 'PRODUÇÃO', icon: Layers3, color: '#678ffe', image: '/showcase/modelo-05.webp' },
  { title: 'Biblioteca VIRAL', body: 'Pastas, perfis minerados e tendências por nicho.', to: '/viral', tag: 'VIRAL', icon: Flame, color: '#ef8354', image: '/showcase/modelo-06.webp' },
  { title: 'Remake Viral', body: 'Compare o original com a nova versão da sua marca.', to: '/ai-ugc/remake', tag: 'AI UGC', icon: Clapperboard, color: '#7c5cff', image: '/showcase/modelo-07.webp' },
  { title: 'Image Ads', body: 'Criativos de oferta em 1:1, 4:3 ou 9:16.', to: '/image-ads', tag: 'CRIATIVOS', icon: ImagePlus, color: '#16b9c7', image: '/showcase/modelo-08.webp' },
  { title: 'Brandbook IA', body: 'Paleta, voz, pilares e ganchos para sua marca.', to: '/studio/marca', tag: 'STUDIO', icon: Sparkles, color: '#845cff', image: '/showcase/modelo-09.webp' },
  { title: 'Produção em massa', body: 'Creator Viral, POV e campanhas em lote.', to: '/studio/criar', tag: 'STUDIO', icon: Workflow, color: '#f59e0b', image: '/showcase/hero-ugc.webp' },
  { title: 'Montagem final', body: '12 estilos de legenda e revisão antes de publicar.', to: '/studio/montagem', tag: 'STUDIO', icon: Film, color: '#ef5ab5', image: '/showcase/modelo-01.webp' },
  { title: 'Contas e agenda', body: 'Aquecimento, rotinas e publicação organizada.', to: '/studio/contas', tag: 'PUBLICAÇÃO', icon: Layers3, color: '#22c7b8', image: '/showcase/modelo-04.webp' },
];

const FAQS = [
  ['Preciso saber editar vídeo?', 'Não. Cada fluxo começa com um assistente guiado e termina com uma prévia que você pode revisar antes de gerar.'],
  ['Posso começar sem ter um avatar?', 'Sim. Use Vídeo do Produto, Image Ads, Hook + Demo ou um dos formatos do Studio sem avatar.'],
  ['Quais ferramentas estão disponíveis?', 'Você pode criar avatares, vídeos AI UGC, remakes virais, Image Ads, projetos e fluxos de produção dentro do Studio.'],
  ['Para quais formatos posso criar conteúdo?', 'Os fluxos foram pensados para vídeos verticais, anúncios, slideshows, criativos estáticos e variações para redes sociais.'],
  ['Onde encontro meus resultados?', 'Tudo que for gerado aparece em Projetos, com filtros por formato e status.'],
  ['Os créditos aparecem antes de gerar?', 'Sim. O resumo de cada fluxo mostra cenas, custo estimado e saldo antes da confirmação.'],
  ['Posso usar o Studio sem contratar um plano?', 'Sim. Você pode explorar os fluxos e entender o caminho ideal antes de escolher a opção mais adequada.'],
  ['O que acontece se uma geração falhar?', 'A etapa com falha é identificada no fluxo e o crédito correspondente pode ser estornado conforme a regra da geração.'],
];

export function ToolsGuidePage() {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [showcaseStage, setShowcaseStage] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const featured = FEATURED_STORIES[featuredIndex]!;
  const activeShowcase = SHOWCASE_STAGES[showcaseStage]!;

  useEffect(() => {
    const timer = window.setInterval(() => setFeaturedIndex((index) => (index + 1) % FEATURED_STORIES.length), 6500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setShowcaseStage((index) => (index + 1) % SHOWCASE_STAGES.length), 5200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => { window.removeEventListener('scroll', updateProgress); window.removeEventListener('resize', updateProgress); };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(121,85,232,0.12),transparent_32rem)]">
      <header className="sticky top-0 z-30 border-b border-border bg-[var(--top)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--top)]/75">
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5"><div className="h-full bg-[#8a61ff] shadow-[0_0_12px_rgba(138,97,255,0.8)] transition-[width] duration-150" style={{ width: `${scrollProgress}%` }} /></div>
        <div className="border-b border-white/10 bg-[linear-gradient(90deg,#20114d,#5b38d7_48%,#127a84)] px-5 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white md:px-10">
          <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2"><span className="size-1.5 animate-pulse rounded-full bg-[#b7ff28]" /> Novo no Studio · crie, revise e publique no mesmo fluxo</span>
            <a href="#funcionalidades" className="hidden items-center gap-1.5 text-white/80 transition hover:text-white sm:inline-flex">Explorar ferramentas <ArrowRight className="size-3" /></a>
          </div>
        </div>
        <div className="mx-auto flex h-16 max-w-[1560px] items-center justify-between gap-4 px-5 md:px-10">
          <Link to="/" className="group inline-flex items-center gap-2" aria-label="FUTURO DIGITAL — início">
            <img src="/brand/fd-emblema-v4.png" alt="" className="size-8 rounded-lg object-cover transition group-hover:scale-105" />
            <span className="text-xs font-black tracking-[0.12em] text-fg">FUTURO <span className="text-accent">DIGITAL</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 sm:flex"><a href="#funcionalidades" className="rounded-lg px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Funcionalidades</a><a href="#objetivos" className="rounded-lg px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Objetivos</a><a href="#galeria" className="rounded-lg px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Galeria</a><a href="#planos" className="rounded-lg px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Planos</a><a href="#faq" className="rounded-lg px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">FAQ</a></div>
            <Link to="/login" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold transition hover:bg-surface-2"><LogIn className="size-3.5" /> Entrar</Link>
            <Link to="/login" className="hidden h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-bold text-white shadow-sm transition hover:brightness-110 sm:inline-flex">Começar grátis <ArrowRight className="size-3.5" /></Link>
            <button type="button" aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMobileOpen((open) => !open)} className="grid size-9 place-items-center rounded-lg border border-border text-fg-muted transition hover:bg-surface-2 hover:text-fg sm:hidden">{mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}</button>
          </div>
        </div>
        {mobileOpen && <div className="border-t border-border bg-[var(--top)] px-5 py-3 shadow-2xl sm:hidden"><nav className="grid gap-1"><a onClick={() => setMobileOpen(false)} href="#funcionalidades" className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Funcionalidades</a><a onClick={() => setMobileOpen(false)} href="#objetivos" className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Objetivos</a><a onClick={() => setMobileOpen(false)} href="#galeria" className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Galeria</a><a onClick={() => setMobileOpen(false)} href="#planos" className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Planos</a><a onClick={() => setMobileOpen(false)} href="#faq" className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">FAQ</a><Link onClick={() => setMobileOpen(false)} to="/login" className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white">Começar grátis <ArrowRight className="size-4" /></Link></nav></div>}
      </header>
      <section className="relative overflow-hidden border-b border-border bg-[#0b0b11] py-3 md:py-4">
        <div className="relative mx-auto min-h-[420px] max-w-[1560px] overflow-hidden rounded-[2rem] border border-white/15 md:min-h-[510px]">
          <img src={featured.image} alt="Demonstração visual do FUTURO DIGITAL" className="absolute inset-0 h-full w-full object-cover object-center opacity-95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(132,92,255,0.24),transparent_34rem)]" />
          <div className="relative flex min-h-[420px] flex-col justify-end px-6 pb-14 pt-24 md:min-h-[510px] md:px-14 md:pb-20">
            <div className="max-w-2xl text-white"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/65"><span className="size-1.5 rounded-full bg-[#b7ff28]" /> {featured.eyebrow}</div><h1 key={featured.title} className="mt-4 text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">{featured.title}</h1><p className="mt-5 max-w-xl text-sm leading-6 text-white/75 md:text-base">{featured.body}</p><div className="mt-7 flex flex-wrap gap-3"><Link to={featured.to} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#5b38d7] transition hover:bg-white/90">Explorar agora <ArrowRight className="size-4" /></Link><a href="#funcionalidades" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/10">Ver tudo</a></div></div>
            <div className="absolute bottom-5 right-6 flex items-center gap-2 md:right-14">{FEATURED_STORIES.map((story, index) => <button key={story.title} type="button" onClick={() => setFeaturedIndex(index)} aria-label={`Ver destaque ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === featuredIndex ? 'w-9 bg-white' : 'w-2 bg-white/35 hover:bg-white/65'}`} />)}</div>
          </div>
        </div>
      </section>
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid w-full max-w-[1560px] gap-10 px-5 pb-12 pt-10 md:grid-cols-[1.05fr_.95fr] md:px-10 md:pb-16 md:pt-14">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-accent">
              <Sparkles className="size-3.5" /> Guia do FUTURO DIGITAL
            </span>
            <h1 className="max-w-[680px] text-3xl font-black tracking-tight md:text-5xl md:leading-[1.05]">
              Tudo para criar conteúdo que parece grande, sem montar uma equipe enorme.
            </h1>
            <p className="mt-4 max-w-[620px] text-sm leading-6 text-fg-muted md:text-base">
              Conheça cada ferramenta, entenda o caminho ideal para sua campanha e veja como sair da ideia até um criativo pronto para publicar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:brightness-110">
                Começar agora <ArrowRight className="size-4" />
              </Link>
              <a href="#funcionalidades" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold transition hover:bg-surface-2">
                Ver funcionalidades
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-fg-muted">
              <span>5 caminhos de criação</span><span>•</span><span>Fluxos guiados</span><span>•</span><span>Prévia vertical</span>
            </div>
          </div>
          <div className="relative min-h-[300px] overflow-hidden rounded-3xl border border-white/15 bg-[#171426] shadow-2xl md:min-h-[390px]">
            <div className="absolute inset-0 bg-[#5b38d7]/15" />
            <img src="/showcase/guide-overview-new.png" alt="Planejamento visual criado no FUTURO DIGITAL" className="absolute inset-0 h-full w-full object-cover object-top opacity-95" />
            <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/15 bg-black/30 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60"><Play className="size-3 fill-current text-indigo-300" /> Da ideia ao criativo</div>
              <div className="mt-2 text-lg font-extrabold text-white">Uma interface. Vários formatos.</div>
            </div>
            <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/80">GUIA INTERATIVO</div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/10 py-8 text-white md:py-12">
        <div className="pointer-events-none absolute -right-24 top-1/2 size-96 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className={`relative mx-auto grid max-w-[1560px] gap-10 overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br ${activeShowcase.tone} px-5 py-10 md:grid-cols-[.82fr_1.18fr] md:items-center md:px-14 md:py-16`}>
          <div><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/75"><span className="size-1.5 animate-pulse rounded-full bg-[#b7ff28]" /> Veja a operação acontecendo</div><div className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#976dff]">{activeShowcase.label}</div><h2 className="mt-3 max-w-xl text-3xl font-black leading-[1.03] tracking-tight md:text-5xl">{activeShowcase.title}</h2><p className="mt-4 max-w-lg text-sm leading-6 text-white/70 md:text-base">{activeShowcase.body}</p><div className="mt-6 flex flex-wrap gap-3"><Link to={activeShowcase.cta} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#5b38d7] transition hover:-translate-y-0.5 hover:bg-white/90">Testar este caminho <ArrowRight className="size-4" /></Link><span className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-semibold text-white/75"><CheckCircle2 className="size-3.5 text-[#8a61ff]" /> {activeShowcase.metric}</span></div><div className="mt-8 flex gap-2">{SHOWCASE_STAGES.map((stage, index) => <button key={stage.label} type="button" aria-label={`Mostrar etapa ${index + 1}`} onClick={() => setShowcaseStage(index)} className={`h-1.5 rounded-full transition-all ${index === showcaseStage ? 'w-12 bg-[#8a61ff]' : 'w-5 bg-white/25 hover:bg-white/50'}`} />)}</div></div>
          <div className="relative min-h-[300px] overflow-hidden rounded-[2rem] border border-white/15 bg-black/20 shadow-2xl md:min-h-[430px]"><img key={activeShowcase.image} src={activeShowcase.image} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-95 transition duration-700" /><div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" /><div className="absolute left-5 top-5 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 backdrop-blur-md"><div className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/55">FUTURO DIGITAL</div><div className="mt-1 text-xs font-bold text-white">Campanha em construção</div></div><div className="absolute bottom-5 left-5 right-5 grid gap-2 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-black/30 p-3 backdrop-blur-md"><div className="text-[9px] uppercase tracking-[0.16em] text-white/50">Entrada</div><div className="mt-1 text-xs font-bold">Produto + ideia</div></div><div className="rounded-xl border border-white/10 bg-black/30 p-3 backdrop-blur-md"><div className="text-[9px] uppercase tracking-[0.16em] text-white/50">Processo</div><div className="mt-1 text-xs font-bold">Fluxo guiado</div></div><div className="rounded-xl border border-[#8a61ff]/35 bg-[#8a61ff]/10 p-3 backdrop-blur-md"><div className="text-[9px] uppercase tracking-[0.16em] text-[#976dff]/85">Saída</div><div className="mt-1 text-xs font-bold text-white">Pronto para revisar</div></div></div></div>
        </div>
      </section>

      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto grid max-w-[1560px] gap-4 px-5 py-5 md:grid-cols-3 md:px-10">
          {PROMO_BANNERS.map((banner) => <Link key={banner.title} to={banner.to} className="group relative min-h-[170px] overflow-hidden rounded-2xl border border-white/10 bg-[#171426] p-5 text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"><img src={banner.image} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-45 transition duration-700 group-hover:scale-105 group-hover:opacity-60" /><div className={`absolute inset-0 bg-gradient-to-r ${banner.tint}`} /><div className="relative flex h-full flex-col justify-between"><div><span className="text-[9px] font-extrabold tracking-[0.18em] text-white/60">{banner.eyebrow}</span><h2 className="mt-2 text-xl font-black tracking-tight">{banner.title}</h2><p className="mt-1 max-w-[250px] text-xs leading-5 text-white/75">{banner.body}</p></div><span className="inline-flex w-fit items-center gap-1.5 text-[11px] font-bold text-white">Conhecer fluxo <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span></div></Link>)}
        </div>
      </section>

      <section className="border-b border-border bg-[#0c0b12] py-10 text-white md:py-14">
        <div className="mx-auto max-w-[1560px] px-5 md:px-10">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#976dff]">Veja em movimento</span><h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Uma operação visual que acompanha o ritmo da sua marca.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Microdemonstrações próprias para mostrar onde cada parte do FUTURO DIGITAL entra no seu fluxo.</p></div><span className="text-[11px] font-semibold text-white/45">Demonstrações do produto</span></div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <style>{`@keyframes demoKenBurns{0%{transform:scale(1) translate3d(0,0,0)}100%{transform:scale(1.08) translate3d(-1.2%,-0.8%,0)}}`}</style>
            {DEMO_VIDEOS.map((video, index) => <Link key={video.src} to={video.to} className="group relative overflow-hidden rounded-3xl border border-white/15 bg-[#15141f] shadow-2xl transition duration-300 hover:-translate-y-1 hover:border-white/35 hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)]"><img src={video.poster} alt={`Demonstração ${video.eyebrow}`} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105" style={{ animation: 'demoKenBurns 10s ease-in-out infinite alternate', animationDelay: `${index * -1.7}s` }} /><div className="absolute left-4 top-4 flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full border border-white/30 bg-black/45 text-[10px] font-black text-white backdrop-blur"><span>0{index + 1}</span></span><span className="rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/90 backdrop-blur">Demonstração</span></div><div className="absolute inset-x-0 bottom-0 bg-black/55 p-5 backdrop-blur-[2px]"><div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.2em]" style={{ color: video.accent }}><span className="size-1.5 rounded-full" style={{ backgroundColor: video.accent }} />{video.eyebrow}</div><h3 className="mt-1.5 text-lg font-black text-white">{video.title}</h3><p className="mt-1 text-xs leading-5 text-white/80">{video.body}</p><span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-white">Explorar <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span></div></Link>)}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1560px] px-5 pb-20 md:px-10">
        <section id="visao-geral" className="scroll-mt-20 py-12 md:py-16">
          <div className="grid gap-5 md:grid-cols-3">
            {OVERVIEW_CARDS.map(({ title, body, image, accent }, i) => (
              <div key={title} className="group relative min-h-[190px] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl">
                <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 grayscale transition duration-700 group-hover:scale-105 group-hover:opacity-35 group-hover:grayscale-0" /><div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 to-transparent" /><span className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-20 blur-2xl transition group-hover:opacity-45" style={{ backgroundColor: accent }} /><div className="relative p-5"><div className="mb-5 flex items-center justify-between"><div className="grid size-10 place-items-center rounded-xl text-sm font-black text-white shadow-lg" style={{ backgroundColor: accent }}>0{i + 1}</div><span className="h-1.5 w-12 rounded-full opacity-80" style={{ backgroundColor: accent }} /></div><h2 className="text-base font-bold">{title}</h2><p className="mt-1.5 max-w-[260px] text-xs leading-5 text-fg-muted">{body}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Resumo da plataforma" className="py-4 md:py-5">
          <div className="mx-auto grid max-w-[1180px] gap-2 sm:grid-cols-3">
            {SOCIAL_PROOF.map(([value, label]) => <div key={value} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface/70 px-4 py-3 text-center transition hover:border-accent/40 hover:bg-accent-soft/20"><BadgeCheck className="size-4 text-accent" /><span className="text-sm font-black text-fg">{value}</span><span className="text-xs text-fg-muted">{label}</span></div>)}
          </div>
        </section>

        <section id="funcionalidades" className="scroll-mt-20 space-y-6 py-8 md:py-12">
          <div className="max-w-2xl">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Funcionalidades</span>
            <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Escolha a ferramenta certa para cada momento.</h2>
            <p className="mt-2 text-sm leading-6 text-fg-muted">Role a página para conhecer os caminhos principais e abrir cada experiência no ponto certo.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            {FEATURES.map((feature, idx) => {
              const Icon = feature.icon;
              const wide = idx < 2;
              return (
                <article key={feature.id} id={feature.id} className={`group relative min-h-[360px] scroll-mt-24 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition duration-500 hover:-translate-y-1 hover:border-accent/45 hover:shadow-2xl ${wide ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.tint}`} />
                  <img src={feature.image} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-65 transition duration-1000 group-hover:scale-110 group-hover:opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08070d] via-[#08070d]/35 to-transparent" />
                  <div className="relative flex h-full flex-col justify-between p-5 text-white md:p-6">
                    <div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-2xl border border-white/20 bg-black/25 text-white backdrop-blur"><Icon className="size-5" /></span><span className="rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[10px] font-bold text-white/75 backdrop-blur">0{idx + 1} / 05</span></div>
                    <div><div className="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-white/65"><span className="size-1.5 rounded-full bg-[#976dff]" />{feature.eyebrow}</div><h3 className={`mt-2 font-black leading-tight ${wide ? 'text-2xl md:text-3xl' : 'text-xl'}`}>{feature.title}</h3><p className="mt-3 line-clamp-2 max-w-xl text-sm leading-6 text-white/75">{feature.body}</p><Link to={feature.to} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-[#5b38d7] transition hover:-translate-y-0.5 hover:bg-white/90">{feature.action}<ArrowRight className="size-3.5" /></Link></div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="objetivos" className="scroll-mt-20 py-14 md:py-18">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Comece pelo objetivo</span><h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">O próximo passo depende do que você quer publicar.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">Escolha uma intenção e entre direto no fluxo mais curto para chegar ao primeiro resultado.</p></div><span className="inline-flex items-center gap-2 text-xs font-semibold text-fg-muted"><Target className="size-3.5 text-accent" /> Fluxos guiados</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map(({ title, body, to, icon: Icon, accent }) => <Link key={title} to={to} className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl"><span className="absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40" style={{ backgroundColor: accent }} /><div className="relative"><span className="grid size-10 place-items-center rounded-xl text-white shadow-sm" style={{ backgroundColor: accent }}><Icon className="size-4" /></span><h3 className="mt-5 text-sm font-bold group-hover:text-accent">{title}</h3><p className="mt-2 text-xs leading-5 text-fg-muted">{body}</p><span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-accent">Abrir fluxo <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span></div></Link>)}
          </div>
        </section>

        <section id="modos" className="scroll-mt-20 py-14 md:py-16">
          <div className="max-w-2xl"><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">AI UGC em detalhes</span><h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Cinco caminhos para o mesmo objetivo: publicar melhor.</h2><p className="mt-2 text-sm leading-6 text-fg-muted">Escolha pelo ponto de partida da sua campanha, não pelo modelo de IA.</p></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
             {UGC_MODES.map((mode, idx) => <Link key={mode.label} to={mode.to} className="group relative min-h-[190px] overflow-hidden rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl"><span className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-20 blur-2xl transition group-hover:opacity-45" style={{ backgroundColor: mode.color }} /><div className="relative flex items-center justify-between"><span className="rounded-full px-2.5 py-1.5 text-[9px] font-black tracking-[0.14em] text-white shadow-lg" style={{ backgroundColor: mode.color }}>{mode.label}</span><span className="text-[10px] font-black text-fg-subtle">0{idx + 1}</span></div><h3 className="relative mt-7 text-sm font-bold group-hover:text-accent">{mode.title}</h3><p className="relative mt-1.5 text-xs leading-5 text-fg-muted">{mode.body}</p><span className="relative mt-5 inline-flex items-center gap-1.5 text-[11px] font-bold text-accent">Abrir caminho <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span></Link>)}
          </div>
        </section>

        <section id="catalogo" className="scroll-mt-20 py-12 md:py-16">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Catálogo completo</span><h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Tudo o que existe dentro do Studio.</h2></div><Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">Abrir o Studio <ArrowRight className="size-3.5" /></Link></div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
             {TOOL_CATALOG.map(({ title, body, to, tag, icon: Icon, color, image }) => <Link key={title} to={to} className="group relative min-h-[154px] overflow-hidden rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-accent/45 hover:shadow-xl"><img src={image} alt="" className="absolute inset-y-0 right-0 h-full w-36 object-cover opacity-20 grayscale transition duration-700 group-hover:scale-110 group-hover:opacity-45 group-hover:grayscale-0" /><span className="absolute inset-y-0 right-0 w-44 bg-gradient-to-l from-transparent to-surface" /><span className="absolute -right-7 -top-7 size-24 rounded-full opacity-15 blur-2xl transition group-hover:opacity-35" style={{ backgroundColor: color }} /><div className="relative flex items-start gap-3 pr-10"><span className="grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-sm" style={{ backgroundColor: color }}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="block text-sm font-bold group-hover:text-accent">{title}</span><ArrowRight className="size-3.5 shrink-0 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-accent" /></span><span className="mt-1 block text-[10px] font-extrabold tracking-[0.12em] text-accent">{tag}</span><span className="mt-2 block text-xs leading-5 text-fg-muted">{body}</span></span></div></Link>)}
          </div>
        </section>

        <section className="py-12 md:py-20">
          <div className="rounded-[2rem] border border-border bg-[#0d0c14] p-6 text-white shadow-2xl md:p-10">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#976dff]">Do caos ao criativo</span><h2 className="mt-2 max-w-3xl text-2xl font-black tracking-tight md:text-4xl">A diferença não é só gerar. É saber o que fazer depois.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Veja como a mesma ideia atravessa o FUTURO DIGITAL e ganha identidade, formato e direção.</p></div><span className="inline-flex items-center gap-2 text-xs font-semibold text-white/45"><Sparkles className="size-3.5 text-[#8a61ff]" /> Fluxo visual</span></div>
            <div className="mt-8 grid gap-3 lg:grid-cols-3">
              {RESULT_STATES.map((state, index) => <div key={state.label} className="group relative overflow-hidden rounded-2xl border border-white/15 bg-black/20"><img src={state.image} alt="" className="aspect-[16/10] w-full object-cover opacity-95 transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-5"><div className="flex items-center justify-between"><span className="rounded-full px-2 py-1 text-[9px] font-black tracking-[0.18em] text-black" style={{ backgroundColor: state.color }}>{state.label}</span><span className="text-[10px] font-black text-white/65">0{index + 1}</span></div><h3 className="mt-3 text-lg font-black">{state.title}</h3><p className="mt-1 text-xs leading-5 text-white/80">{state.body}</p></div></div>)}
            </div>
          </div>
        </section>

        <section id="fluxo" className="scroll-mt-20 py-14 md:py-20">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-9">
            <div className="max-w-2xl"><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Como funciona</span><h2 className="mt-2 text-2xl font-black tracking-tight">Um fluxo simples para repetir o que funciona.</h2></div>
             <div className="relative mt-8 grid gap-6 md:grid-cols-4">
               <div className="pointer-events-none absolute left-[12%] right-[12%] top-5 hidden h-px bg-gradient-to-r from-accent/10 via-accent/55 to-accent/10 md:block" />
               {STEPS.map((step, idx) => { const Icon = step.icon; return <div key={step.title} className="relative"><div className="flex items-center gap-3"><div className="relative z-10 grid size-11 place-items-center rounded-2xl border border-accent/20 bg-accent-soft text-accent shadow-sm"><Icon className="size-4" /></div><span className="text-[10px] font-black text-fg-subtle">0{idx + 1}</span></div><h3 className="mt-3 text-sm font-bold">{step.title}</h3><p className="mt-1 text-xs leading-5 text-fg-muted">{step.body}</p></div>; })}
            </div>
          </div>
        </section>

        <section id="creditos" className="scroll-mt-20 py-12 md:py-16"><div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 md:p-9"><div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-accent/15 blur-3xl" /><div className="relative max-w-2xl"><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Transparência</span><h2 className="mt-2 text-2xl font-black tracking-tight">Você sabe o custo antes de confirmar.</h2><p className="mt-2 text-sm leading-6 text-fg-muted">Cada fluxo mostra o consumo estimado no resumo. A plataforma não esconde o custo atrás do botão gerar.</p></div><div className="relative mt-6 grid gap-3 md:grid-cols-3">{[['Custo visível', 'Veja cenas, quantidade e créditos antes de gerar.'], ['Saldo centralizado', 'Acompanhe seus créditos no menu em qualquer tela.'], ['Falhou? Estorna.', 'Se uma geração de IA falhar, o valor daquela etapa volta.']].map(([title, body]) => <div key={title} className="group rounded-2xl border border-border bg-bg p-5 transition hover:-translate-y-1 hover:border-accent/40"><div className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="size-4 text-success transition group-hover:scale-110" />{title}</div><p className="mt-2 text-xs leading-5 text-fg-muted">{body}</p></div>)}</div></div></section>

        <section id="planos" className="scroll-mt-20 py-12 md:py-16">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Planos e créditos</span><h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Comece leve. Escale quando fizer sentido.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">Uma visão simples para você entender o próximo nível sem interromper o fluxo de criação.</p></div><Link to="/login?from=plans" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">Ver detalhes no Studio <ArrowRight className="size-3.5" /></Link></div>
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {PLANS.map((plan) => <div key={plan.name} className="group relative overflow-hidden rounded-3xl border border-border bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/80 hover:bg-accent-soft/20 hover:shadow-xl hover:shadow-indigo-500/15 focus-within:-translate-y-1 focus-within:border-accent/80 focus-within:shadow-xl focus-within:shadow-indigo-500/15"><div className="absolute inset-x-0 top-0 h-1 bg-border transition-colors group-hover:bg-brand group-focus-within:bg-brand" /><div className="flex items-center justify-between gap-3"><h3 className="text-base font-black">{plan.name}</h3>{plan.featured && <span className="rounded-full bg-accent px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">Mais escolhido</span>}</div><p className="mt-2 text-xs leading-5 text-fg-muted">{plan.body}</p><ul className="mt-5 space-y-2.5">{plan.features.map((feature) => <li key={feature} className="flex items-center gap-2 text-xs font-semibold"><CheckCircle2 className="size-3.5 text-accent transition group-hover:scale-110" />{feature}</li>)}</ul><Link to={`/login?plan=${plan.slug}`} aria-label={`${plan.featured ? 'Começar agora com o plano' : 'Explorar o plano'} ${plan.name}`} className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg text-xs font-bold transition hover:border-accent hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{plan.featured ? 'Começar agora' : 'Explorar opção'} <ArrowRight className="size-3.5" /></Link></div>)}
          </div>
          <p className="mt-4 text-center text-[11px] text-fg-subtle">Os valores e créditos são apresentados no momento da contratação.</p>
        </section>

        <section id="galeria" className="scroll-mt-20 py-12 md:py-20">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Galeria FUTURO DIGITAL</span><h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Veja o tipo de resultado que você pode construir.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">Uma seleção de avatares e cenas para mostrar a amplitude dos fluxos antes de você entrar no Studio.</p></div><Link to="/avatars?tab=explore" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">Explorar modelos <ArrowRight className="size-3.5" /></Link></div><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{SHOWCASE_AVATARS.slice(0, 9).map((avatar, idx) => <Link key={avatar.id} to={idx % 3 === 0 ? '/avatars' : '/avatars?tab=explore'} className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-surface"><img src={avatar.image_url} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8"><span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/70">{idx % 3 === 0 ? 'Avatar IA' : idx % 3 === 1 ? 'Produto + rosto' : 'Modelo pronto'}</span></div></Link>)}</div></section>

        <section id="para-quem" className="scroll-mt-20 pb-10 pt-4 md:pb-16">
          <div className="grid gap-5 md:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-3xl bg-brand p-7 text-white shadow-xl shadow-indigo-500/20 md:p-9"><div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/70">Para quem é</div><h2 className="mt-2 max-w-xl text-2xl font-black tracking-tight md:text-3xl">Para quem precisa publicar com consistência.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/80">Criadores, marcas, social medias e equipes enxutas que querem testar mais ideias sem perder a identidade visual.</p><Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#5b38d7] transition hover:bg-white/90">Começar agora <ArrowRight className="size-3.5" /></Link></div>
            <div className="grid grid-cols-3 gap-2 rounded-3xl border border-border bg-surface p-3">{SHOWCASE_AVATARS.slice(0, 6).map((avatar) => <img key={avatar.id} src={avatar.image_url} alt="" className="aspect-square rounded-2xl object-cover" />)}</div>
          </div>
        </section>

        <section className="pb-12 md:pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-[#171126] px-6 py-10 text-center text-white shadow-2xl md:px-10 md:py-14">
            <div className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-[#7653ed]/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 size-80 rounded-full bg-[#8a61ff]/20 blur-3xl" />
            <div className="relative mx-auto max-w-2xl"><span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/60">Pronto para começar?</span><h2 className="mt-3 text-2xl font-black tracking-tight md:text-4xl">A próxima ideia da sua marca pode começar agora.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/70">Entre no FUTURO DIGITAL, escolha um caminho e veja como transformar uma ideia em conteúdo publicável.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link to="/login" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#5b38d7] transition hover:bg-white/90">Começar grátis <ArrowRight className="size-4" /></Link><a href="#visao-geral" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/10">Rever o guia</a></div></div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 py-12 md:py-16"><div className="mx-auto max-w-3xl"><div className="text-center"><span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent"><HelpCircle className="size-3.5" /> Dúvidas rápidas</span><h2 className="mt-2 text-2xl font-black tracking-tight">Dúvidas sobre o FUTURO DIGITAL</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-fg-muted">As respostas mais importantes antes de entrar no Studio e escolher um fluxo.</p></div><div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface px-5">{FAQS.map(([question, answer]) => <details key={question} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold"><span>{question}</span><span className="text-lg text-fg-subtle transition group-open:rotate-45">+</span></summary><p className="mt-2 max-w-2xl text-xs leading-5 text-fg-muted">{answer}</p></details>)}</div></div></section>
      </main>
      <footer className="border-t border-border bg-surface/70">
        <div className="mx-auto grid max-w-[1560px] gap-8 px-5 py-10 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-10">
          <div><Link to="/" className="text-sm font-black tracking-[0.12em] text-fg">FUTURO <span className="text-accent">DIGITAL</span></Link><p className="mt-3 max-w-xs text-xs leading-5 text-fg-muted">Uma operação visual para criar, testar e publicar conteúdo com IA.</p></div>
          <div><div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">Criar</div><div className="mt-3 flex flex-col gap-2 text-xs text-fg-muted"><Link to="/avatars" className="hover:text-fg">Influencer IA</Link><Link to="/ai-ugc" className="hover:text-fg">AI UGC</Link><Link to="/image-ads" className="hover:text-fg">Image Ads</Link></div></div>
          <div><div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">Explorar</div><div className="mt-3 flex flex-col gap-2 text-xs text-fg-muted"><Link to="/viral" className="hover:text-fg">Biblioteca VIRAL</Link><Link to="/studio" className="hover:text-fg">Studio</Link><Link to="/projects" className="hover:text-fg">Projetos</Link></div></div>
          <div><div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">Recursos</div><div className="mt-3 flex flex-col gap-2 text-xs text-fg-muted"><a href="#faq" className="hover:text-fg">FAQ</a><Link to="/login" className="hover:text-fg">Entrar</Link></div></div>
        </div>
        <div className="border-t border-border"><div className="mx-auto flex max-w-[1560px] flex-col gap-2 px-5 py-5 text-[11px] text-fg-subtle md:flex-row md:items-center md:justify-between md:px-10"><span>© FUTURO DIGITAL Studio</span><span>Conteúdo com IA, do primeiro frame à publicação.</span></div></div>
      </footer>
    </div>
  );
}
