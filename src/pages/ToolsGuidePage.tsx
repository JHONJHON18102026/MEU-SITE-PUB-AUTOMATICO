import { useEffect, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, Clapperboard, Compass, Film, Flame, HelpCircle, ImagePlus, Layers3, LogIn, Menu, Sparkles, Wand2, Workflow, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';

const DEMO_VIDEOS = [
  { src: '/showcase/product-stage-identity.mp4', eyebrow: 'INFLUENCER IA', title: 'Monte a identidade do avatar', body: 'Combine descrição, atributos e referências para criar o personagem.', to: '/avatars', poster: '/showcase/landing/demo-influencer-card.jpg', accent: '#7c5cff' },
  { src: '/showcase/product-stage-ugc.mp4', eyebrow: 'AI UGC', title: 'Escolha como produzir o vídeo', body: 'Selecione uma modalidade e configure os materiais que ela pede.', to: '/ai-ugc', poster: '/showcase/landing/demo-ugc-card.jpg', accent: '#22c7b8' },
  { src: '/showcase/product-stage-viral.mp4', eyebrow: 'BIBLIOTECA VIRAL', title: 'Prepare um remake', body: 'Importe uma referência e organize as cenas para continuar no fluxo Remake Viral.', to: '/viral', poster: '/showcase/landing/demo-viral-card.jpg', accent: '#ef8354' },
];

const FEATURED_STORIES = [
  { eyebrow: 'AGENTE DIRETOR', navLabel: 'Diretor', title: 'Briefing, referências e plano antes de gerar.', body: 'O Diretor organiza a ideia em cenas e prompts editáveis. Você revisa e escolhe o que enviar ao canvas.', to: '/agente-diretor', image: '/showcase/landing/internal-identity-new.jpg' },
  { eyebrow: 'INFLUENCER IA', navLabel: 'Avatar', title: 'Crie e personalize a identidade do personagem.', body: 'Combine descrição, atributos e imagens de referência para preparar um avatar e reutilizar sua identidade.', to: '/avatars', image: '/showcase/landing/influencer-ai-new.jpg' },
  { eyebrow: 'AI UGC', navLabel: 'AI UGC', title: 'Escolha uma modalidade para criar seu vídeo.', body: 'Use ADS, Link, Personagem Falante, Hook + Demo, Slideshow ou Remake Viral conforme a campanha.', to: '/ai-ugc', image: '/showcase/landing/ugc-production-new.jpg' },
  { eyebrow: 'BIBLIOTECA VIRAL', navLabel: 'Viral', title: 'Da referência organizada ao Remake Viral.', body: 'Importe vídeos, organize pastas e abra um manifesto de cenas no fluxo de remake.', to: '/viral', image: '/showcase/landing/viral-library-new.jpg' },
];

const STEPS = [
  { icon: Wand2, title: 'Escolha como começar', body: 'Abra o Agente Diretor, Avatar, AI UGC, Image Ads ou a Biblioteca VIRAL.' },
  { icon: Layers3, title: 'Prepare os materiais', body: 'Adicione briefing, produto, personagem e referências conforme a modalidade.' },
  { icon: Film, title: 'Confira antes de gerar', body: 'Revise o plano no Diretor ou os parâmetros na ferramenta escolhida.' },
  { icon: Sparkles, title: 'Acompanhe o resultado', body: 'Consulte a área da criação: Avatares, Projetos ou Studio.' },
];

const UGC_MODES = [
  { label: 'ADS', title: 'Anúncio por etapas', body: 'Configure produto, avatar, cenas, voz e revise o resumo antes de gerar.', to: '/ai-ugc/ads', color: '#7c5cff' },
  { label: 'LINK', title: 'Anúncio com link', body: 'Use o endereço do produto para preparar as informações e o roteiro do anúncio.', to: '/ai-ugc/link', color: '#22c7b8' },
  { label: 'FALANTE', title: 'Vídeo com personagem falante', body: 'Escolha um avatar e prepare a fala que será apresentada no vídeo.', to: '/ai-ugc/falante', color: '#ef8354' },
  { label: 'HOOK + DEMO', title: 'Gancho e demonstração', body: 'Gere ideias de abertura e conecte o gancho à demonstração do produto.', to: '/ai-ugc/hook-demo', color: '#f2b84b' },
  { label: 'SLIDESHOW', title: 'Vídeo em slides', body: 'Organize tópicos e imagens em uma sequência com chamada final.', to: '/ai-ugc/slideshows', color: '#ef5ab5' },
  { label: 'REMAKE VIRAL', title: 'Remake a partir de cenas', body: 'Use uma referência e seu manifesto de cenas para preparar uma nova versão.', to: '/ai-ugc/remake', color: '#5e74ed' },
];

const TOOL_CATALOG = [
  { title: 'Agente Diretor', body: 'Organize briefing, referências, roteiro e prompts; revise e envie a etapa escolhida ao canvas.', to: '/agente-diretor', tag: 'PLANEJAMENTO', icon: Wand2, color: '#7c5cff', image: '/showcase/landing/internal-identity-new.jpg' },
  { title: 'Criar avatar', body: 'Rosto, características e mundo do personagem.', to: '/avatars', tag: 'INFLUENCER IA', icon: Bot, color: '#27c98f', image: '/showcase/landing/influencer-ai-new.jpg' },
  { title: 'Avatar com produto', body: 'Adicione uma foto do produto ao fluxo de criação do avatar.', to: '/avatars?product=1', tag: 'INFLUENCER IA', icon: ImagePlus, color: '#7357de', image: '/showcase/landing/ugc-production-new.jpg' },
  { title: 'Explorar modelos', body: 'Comece com rostos e referências já prontos.', to: '/avatars?tab=explore', tag: 'REFERÊNCIAS', icon: Compass, color: '#ae4fe0', image: '/showcase/hero-influencer.webp' },
  { title: 'Projetos', body: 'Acompanhe status, cenas, downloads e tentativas.', to: '/projects', tag: 'PRODUÇÃO', icon: Layers3, color: '#678ffe', image: '/showcase/landing/studio-operation-new.jpg' },
  { title: 'Biblioteca VIRAL', body: 'Importe links de vídeo, organize referências em pastas e gere manifestos de cenas.', to: '/viral', tag: 'VIRAL', icon: Flame, color: '#ef8354', image: '/showcase/landing/viral-library-new.jpg' },
  { title: 'Remake Viral', body: 'Use a estrutura de um manifesto de cenas para montar uma nova versão.', to: '/ai-ugc/remake', tag: 'AI UGC', icon: Clapperboard, color: '#7c5cff', image: '/showcase/landing/internal-ugc-new.jpg' },
  { title: 'Image Ads', body: 'Criativos de oferta em 1:1, 4:3 ou 9:16.', to: '/image-ads', tag: 'CRIATIVOS', icon: ImagePlus, color: '#16b9c7', image: '/showcase/landing/internal-ads-new.jpg' },
  { title: 'Brandbook IA', body: 'Paleta, voz, pilares e ganchos para sua marca.', to: '/studio/marca', tag: 'STUDIO', icon: Sparkles, color: '#845cff', image: '/showcase/landing/guide-overview-new.jpg' },
  { title: 'Produção em massa', body: 'Crie vídeos em lote usando um projeto ativo no Studio.', to: '/studio/criar', tag: 'STUDIO', icon: Workflow, color: '#f59e0b', image: '/showcase/landing/internal-identity-new.jpg' },
  { title: 'Montagem final', body: 'Revise o criativo e escolha entre 12 estilos de legenda.', to: '/studio/montagem', tag: 'STUDIO', icon: Film, color: '#ef5ab5', image: '/showcase/landing/overview-formats-new.jpg' },
  { title: 'Contas e agenda', body: 'Organize contas e posts agendados. A publicação direta requer conectar cada rede.', to: '/studio/contas', tag: 'PUBLICAÇÃO', icon: Layers3, color: '#22c7b8', image: '/showcase/landing/studio-operation-new.jpg' },
];

const FAQS = [
  ['Preciso saber editar vídeo?', 'Não. O Agente Diretor organiza briefing, referências, cenas e prompts para revisão. Nas outras ferramentas, você configura os materiais e parâmetros disponíveis antes de iniciar a geração.'],
  ['Posso criar sem configurar um avatar?', 'Image Ads cria imagens estáticas e não exige um avatar. Nos fluxos de vídeo, veja os campos da modalidade: alguns já abrem com um modelo selecionado, que pode ser trocado.'],
  ['Quais ferramentas estão disponíveis?', 'Agente Diretor, Influencer IA, seis modalidades de AI UGC, Biblioteca VIRAL, Image Ads, Projetos e Studio com Brandbook, criação em lote, montagem e contas/agenda.'],
  ['Quais formatos posso criar?', 'Image Ads oferece proporções 1:1, 4:3 e 9:16. As ferramentas de vídeo e Avatar exibem seus parâmetros na própria tela antes da geração.'],
  ['Onde encontro meus resultados?', 'As criações de Avatar ficam na aba Avatares. Os vídeos do AI UGC e do Studio são acompanhados em Projetos. O Agente Diretor prepara um plano e abre a etapa escolhida no canvas.'],
  ['Vejo o custo antes de gerar?', 'Confira o custo, a quantidade e os parâmetros indicados no resumo da ferramenta antes de confirmar. O valor depende do fluxo e das opções escolhidas.'],
  ['Onde vejo meu saldo?', 'O saldo de créditos aparece na sua conta. Confira também o resumo do fluxo antes de confirmar uma geração.'],
  ['O que acontece se uma geração falhar?', 'O status e as informações da tentativa ficam na área correspondente. A opção de tentar novamente depende do tipo de criação.'],
];

export function ToolsGuidePage() {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const featured = FEATURED_STORIES[featuredIndex]!;

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
      <div className="public-landing min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(121,85,232,0.12),transparent_32rem)]">
      <header className="sticky top-0 z-30 border-b border-border bg-[var(--top)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--top)]/75">
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5"><div className="h-full bg-[#8a61ff] shadow-[0_0_12px_rgba(138,97,255,0.8)] transition-[width] duration-150" style={{ width: `${scrollProgress}%` }} /></div>
        <div className="border-b border-white/10 bg-[linear-gradient(90deg,#20114d,#5b38d7_48%,#127a84)] px-5 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white md:px-10">
          <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#b7ff28]" /> Agente Diretor · Avatares · AI UGC · Studio</span>
            <a href="#catalogo" className="hidden items-center gap-1.5 text-white/80 transition hover:text-white sm:inline-flex">Explorar ferramentas <ArrowRight className="size-3" /></a>
          </div>
        </div>
        <div className="mx-auto flex h-16 max-w-[1560px] items-center justify-between gap-4 px-5 md:px-10">
          <Link to="/" className="group inline-flex items-center gap-2" aria-label="FUTURO DIGITAL — início">
            <img src="/brand/fd-emblema-v4.png" alt="" className="size-8 rounded-lg object-cover transition group-hover:scale-105" />
            <span className="text-xs font-black tracking-[0.12em] text-fg">FUTURO <span className="text-accent">DIGITAL</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <nav aria-label="Navegação principal" className="hidden items-center gap-1 sm:flex"><a href="#modos" className="rounded-lg px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">AI UGC</a><a href="#catalogo" className="rounded-lg px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Ferramentas</a><a href="#galeria" className="rounded-lg px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Avatares</a><a href="#faq" className="rounded-lg px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">FAQ</a></nav>
            <Link to="/login" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold transition hover:bg-surface-2"><LogIn className="size-3.5" /> Entrar</Link>
            <button type="button" aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMobileOpen((open) => !open)} className="grid size-9 place-items-center rounded-lg border border-border text-fg-muted transition hover:bg-surface-2 hover:text-fg sm:hidden">{mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}</button>
          </div>
        </div>
        {mobileOpen && <div className="border-t border-border bg-[var(--top)] px-5 py-3 shadow-2xl sm:hidden"><nav aria-label="Navegação principal" className="grid gap-1"><a onClick={() => setMobileOpen(false)} href="#modos" className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">AI UGC</a><a onClick={() => setMobileOpen(false)} href="#catalogo" className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Ferramentas</a><a onClick={() => setMobileOpen(false)} href="#galeria" className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Avatares</a><a onClick={() => setMobileOpen(false)} href="#faq" className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">FAQ</a><Link onClick={() => setMobileOpen(false)} to="/login" className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white">Entrar na minha conta <ArrowRight className="size-4" /></Link></nav></div>}
      </header>
      <section id="funcionalidades" className="public-hero-section relative overflow-hidden border-b border-border bg-[#0b0b11] py-3 md:py-4">
        <div className="public-hero-frame relative mx-auto min-h-[420px] max-w-[1560px] overflow-hidden rounded-[2rem] border border-white/15 md:min-h-[510px]">
          <img src={featured.image} alt={featured.title} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center opacity-95" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,5,12,.72)_0%,rgba(6,5,12,.28)_52%,rgba(6,5,12,.04)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(132,92,255,0.24),transparent_34rem)]" />
          <div className="relative flex min-h-[420px] flex-col justify-end px-6 pb-14 pt-24 md:min-h-[510px] md:px-14 md:pb-20">
            <div className="max-w-2xl text-white"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/65"><span className="size-1.5 rounded-full bg-[#b7ff28]" /> {featured.eyebrow}</div><h1 key={featured.title} className="mt-4 text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">{featured.title}</h1><p className="mt-5 max-w-xl text-sm leading-6 text-white/75 md:text-base">{featured.body}</p><div className="mt-7 flex flex-wrap gap-3"><Link to={featured.to} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#5b38d7] transition hover:bg-white/90">Abrir {featured.navLabel} <ArrowRight className="size-4" /></Link><a href="#catalogo" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/10">Ver ferramentas</a></div></div>
            <div role="group" aria-label="Destaques do FUTURO DIGITAL" className="public-hero-tabs absolute bottom-4 left-4 right-4 grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-black/35 p-1.5 backdrop-blur-xl md:bottom-6 md:left-auto md:right-10 md:w-[440px]">{FEATURED_STORIES.map((story, index) => <button key={story.title} type="button" aria-pressed={index === featuredIndex} onClick={() => setFeaturedIndex(index)} className={`rounded-xl px-2 py-2 text-[10px] font-bold transition-colors ${index === featuredIndex ? 'bg-white text-[#25164e]' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}>{story.navLabel}</button>)}</div>
          </div>
        </div>
      </section>
      <section className="border-b border-border bg-[#0c0b12] py-10 text-white md:py-14">
        <div className="mx-auto max-w-[1560px] px-5 md:px-10">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#976dff]">Demonstrações</span><h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Veja o que acontece em cada fluxo.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Assista às demonstrações de Influencer IA, AI UGC e Biblioteca VIRAL e abra a ferramenta correspondente.</p></div><span className="text-[11px] font-semibold text-white/45">Influencer IA · AI UGC · Biblioteca VIRAL</span></div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {DEMO_VIDEOS.map((video) => <article key={video.src} className="group overflow-hidden rounded-3xl border border-white/15 bg-[#15141f] shadow-2xl transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-white/35 hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)]"><div className="relative aspect-[4/3] bg-black"><video src={video.src} poster={video.poster} controls preload="none" playsInline aria-label={`Demonstração de ${video.eyebrow}`} className="h-full w-full object-cover" /><span className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/90 backdrop-blur">Demonstração</span></div><div className="p-5"><div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.2em]" style={{ color: video.accent }}><span className="size-1.5 rounded-full" style={{ backgroundColor: video.accent }} />{video.eyebrow}</div><h3 className="mt-1.5 text-lg font-black text-white">{video.title}</h3><p className="mt-1 text-xs leading-5 text-white/65">{video.body}</p><Link to={video.to} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-white transition-colors hover:text-white/70">Abrir ferramenta <ArrowRight className="size-3.5" /></Link></div></article>)}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1560px] px-5 pb-20 md:px-10">
        <section id="modos" className="scroll-mt-20 py-14 md:py-16">
          <div className="max-w-2xl"><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">AI UGC em detalhes</span><h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Seis modalidades, cada uma para um ponto de partida.</h2><p className="mt-2 text-sm leading-6 text-fg-muted">Abra ADS, Link, Personagem Falante, Hook + Demo, Slideshow ou Remake Viral.</p></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {UGC_MODES.map((mode, idx) => <Link key={mode.label} to={mode.to} className="public-mode-card group relative min-h-[190px] overflow-hidden rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl"><span className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-20 blur-2xl transition group-hover:opacity-45" style={{ backgroundColor: mode.color }} /><div className="relative flex items-center justify-between"><span className="rounded-full px-2.5 py-1.5 text-[9px] font-black tracking-[0.14em] text-white shadow-lg" style={{ backgroundColor: mode.color }}>{mode.label}</span><span className="text-[10px] font-black text-fg-subtle">0{idx + 1}</span></div><h3 className="relative mt-7 text-sm font-bold group-hover:text-accent">{mode.title}</h3><p className="relative mt-1.5 text-xs leading-5 text-fg-muted">{mode.body}</p><span className="relative mt-5 inline-flex items-center gap-1.5 text-[11px] font-bold text-accent">Abrir caminho <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span></Link>)}
          </div>
        </section>

        <section id="fluxo" className="scroll-mt-20 py-10 md:py-14">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-9">
            <div className="max-w-2xl"><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Como funciona</span><h2 className="mt-2 text-2xl font-black tracking-tight">Escolha por onde começar e revise antes de gerar.</h2><p className="mt-2 text-sm leading-6 text-fg-muted">O Agente Diretor é opcional: você também pode abrir Avatar, AI UGC, Image Ads ou Studio diretamente.</p></div>
             <div className="relative mt-8 grid gap-6 md:grid-cols-4">
               <div className="pointer-events-none absolute left-[12%] right-[12%] top-5 hidden h-px bg-gradient-to-r from-accent/10 via-accent/55 to-accent/10 md:block" />
               {STEPS.map((step, idx) => { const Icon = step.icon; return <div key={step.title} className="relative"><div className="flex items-center gap-3"><div className="relative z-10 grid size-11 place-items-center rounded-2xl border border-accent/20 bg-accent-soft text-accent shadow-sm"><Icon className="size-4" /></div><span className="text-[10px] font-black text-fg-subtle">0{idx + 1}</span></div><h3 className="mt-3 text-sm font-bold">{step.title}</h3><p className="mt-1 text-xs leading-5 text-fg-muted">{step.body}</p></div>; })}
            </div>
          </div>
        </section>

        <section id="creditos" className="scroll-mt-20 py-12 md:py-16"><div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 md:p-9"><div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-accent/15 blur-3xl" /><div className="relative max-w-2xl"><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Transparência</span><h2 className="mt-2 text-2xl font-black tracking-tight">Confira o custo antes de confirmar.</h2><p className="mt-2 text-sm leading-6 text-fg-muted">Cada fluxo apresenta seu resumo antes de iniciar a geração. Confira os detalhes e o saldo da conta nessa etapa.</p></div><div className="relative mt-6 grid gap-3 md:grid-cols-2">{[['Custo no resumo', 'Confira a quantidade e o valor indicado antes de confirmar.'], ['Saldo da conta', 'Acompanhe seus créditos no menu da sua conta.']].map(([title, body]) => <div key={title} className="group rounded-2xl border border-border bg-bg p-5 transition hover:-translate-y-1 hover:border-accent/40"><div className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="size-4 text-success transition group-hover:scale-110" />{title}</div><p className="mt-2 text-xs leading-5 text-fg-muted">{body}</p></div>)}</div></div></section>

        <section id="catalogo" className="scroll-mt-20 py-12 md:py-16">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Ferramentas disponíveis</span><h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Abra a ferramenta certa para a sua tarefa.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">Do planejamento à criação e ao acompanhamento, cada atalho leva à tela correspondente do produto.</p></div><Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">Entrar no FUTURO DIGITAL <ArrowRight className="size-3.5" /></Link></div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
             {TOOL_CATALOG.map(({ title, body, to, tag, icon: Icon, color, image }) => <Link key={title} to={to} className="public-product-card group relative min-h-[154px] overflow-hidden rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-accent/45 hover:shadow-xl"><img src={image} alt="" loading="lazy" decoding="async" className="absolute inset-y-0 right-0 h-full w-40 object-cover opacity-35 transition duration-300 group-hover:opacity-55" /><span className="absolute inset-y-0 right-0 w-48 bg-gradient-to-l from-transparent via-surface/70 to-surface" /><span className="absolute -right-7 -top-7 size-24 rounded-full opacity-15 blur-2xl transition group-hover:opacity-35" style={{ backgroundColor: color }} /><div className="relative flex items-start gap-3 pr-10"><span className="grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-sm" style={{ backgroundColor: color }}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="block text-sm font-bold group-hover:text-accent">{title}</span><ArrowRight className="size-3.5 shrink-0 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-accent" /></span><span className="mt-1 block text-[10px] font-extrabold tracking-[0.12em] text-accent">{tag}</span><span className="mt-2 block text-xs leading-5 text-fg-muted">{body}</span></span></div></Link>)}
          </div>
        </section>

        <section id="galeria" className="scroll-mt-20 py-12 md:py-20">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Galeria de avatares</span><h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Identidades para explorar e personalizar.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">Abra um modelo para usá-lo como base na Influencer IA.</p></div><Link to="/avatars?tab=explore" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">Ver todos os avatares <ArrowRight className="size-3.5" /></Link></div><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{SHOWCASE_AVATARS.slice(0, 6).map((avatar) => <Link key={avatar.id} to={`/avatars?modelo=${encodeURIComponent(avatar.id)}`} aria-label={`Usar ${avatar.name} como base`} className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-surface"><img src={avatar.image_url} alt={avatar.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8"><span className="text-[9px] font-extrabold tracking-[0.04em] text-white/90">{avatar.name}</span></div></Link>)}</div></section>

        <section className="pb-10 md:pb-14">
          <div className="relative overflow-hidden rounded-3xl bg-[#171126] px-6 py-10 text-center text-white shadow-2xl md:px-10 md:py-14">
            <div className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-[#7653ed]/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 size-80 rounded-full bg-[#8a61ff]/20 blur-3xl" />
            <div className="relative mx-auto max-w-2xl"><span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/60">Escolha seu próximo passo</span><h2 className="mt-3 text-2xl font-black tracking-tight md:text-4xl">Comece pelo fluxo que resolve sua tarefa.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/70">Planeje no Agente Diretor ou abra Avatar, AI UGC, Image Ads e Studio para criar e acompanhar suas peças.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link to="/login" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#5b38d7] transition hover:bg-white/90">Entrar no FUTURO DIGITAL <ArrowRight className="size-4" /></Link><a href="#catalogo" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/10">Ver ferramentas</a></div></div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 py-10 md:py-14"><div className="mx-auto max-w-3xl"><div className="text-center"><span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent"><HelpCircle className="size-3.5" /> Dúvidas rápidas</span><h2 className="mt-2 text-2xl font-black tracking-tight">Dúvidas sobre o FUTURO DIGITAL</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-fg-muted">Respostas sobre as ferramentas, custos e destinos das criações.</p></div><div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface px-5">{FAQS.map(([question, answer]) => <details key={question} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold"><span>{question}</span><span className="text-lg text-fg-subtle transition group-open:rotate-45">+</span></summary><p className="mt-2 max-w-2xl text-xs leading-5 text-fg-muted">{answer}</p></details>)}</div></div></section>
      </main>
      <footer className="border-t border-border bg-surface/70">
        <div className="mx-auto grid max-w-[1560px] gap-8 px-5 py-10 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-10">
          <div><Link to="/" className="text-sm font-black tracking-[0.12em] text-fg">FUTURO <span className="text-accent">DIGITAL</span></Link><p className="mt-3 max-w-xs text-xs leading-5 text-fg-muted">Ferramentas de planejamento, criação e acompanhamento de conteúdo com IA.</p></div>
          <div><div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">Criar</div><div className="mt-3 flex flex-col gap-2 text-xs text-fg-muted"><Link to="/avatars" className="hover:text-fg">Influencer IA</Link><Link to="/ai-ugc" className="hover:text-fg">AI UGC</Link><Link to="/image-ads" className="hover:text-fg">Image Ads</Link></div></div>
          <div><div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">Explorar</div><div className="mt-3 flex flex-col gap-2 text-xs text-fg-muted"><Link to="/viral" className="hover:text-fg">Biblioteca VIRAL</Link><Link to="/studio" className="hover:text-fg">Studio</Link><Link to="/projects" className="hover:text-fg">Projetos</Link></div></div>
          <div><div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">Recursos</div><div className="mt-3 flex flex-col gap-2 text-xs text-fg-muted"><a href="#faq" className="hover:text-fg">FAQ</a><Link to="/login" className="hover:text-fg">Entrar</Link></div></div>
        </div>
        <div className="border-t border-border"><div className="mx-auto flex max-w-[1560px] flex-col gap-2 px-5 py-5 text-[11px] text-fg-subtle md:flex-row md:items-center md:justify-between md:px-10"><span>© FUTURO DIGITAL Studio</span><span>Planejamento, criação e organização em um mesmo espaço.</span></div></div>
      </footer>
    </div>
  );
}
