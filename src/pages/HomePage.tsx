import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  Clapperboard,
  Compass,
  Flame,
  Gift,
  Images,
  ImagePlus,
  Play,
  Presentation,
  ShoppingBag,
  UserRound,
  Wand2,
  Zap,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { useSession } from '@/store/session';
import { PRICING } from '@shared/contracts';

const HOME_STRIP_IMAGES = [
  '/showcase/internal-identity-new.png',
  '/showcase/internal-ugc-new.png',
  '/showcase/internal-viral-new.png',
  '/showcase/internal-ads-new.png',
  '/showcase/internal-studio-new.png',
];

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const TOOLS = [
  { icon: ImagePlus, color: '#678ffe', title: 'Image Ads', desc: 'Anúncios de imagem com IA', to: '/image-ads', badge: 'Novo' },
  { icon: UserRound, color: '#27c98f', title: 'Avatar Video', desc: 'Avatares de IA hiper-realistas', to: '/ai-ugc/falante', badge: '' },
  { icon: Play, color: '#16b9c7', title: 'Ad Clone', desc: 'Clone anúncios virais em segundos', to: '/ai-ugc/remake', badge: 'Novo' },
  { icon: ShoppingBag, color: '#fb8935', title: 'Vídeo do produto', desc: 'Transforme imagens em vídeos incríveis', to: '/ai-ugc/link', badge: '' },
  { icon: Presentation, color: '#5977ef', title: 'Slideshows', desc: 'Crie apresentações animadas', to: '/ai-ugc/slideshows', badge: '' },
  { icon: Wand2, color: '#d532b5', title: 'Motion Control', desc: 'Replique movimentos virais com IA', to: '/avatars?panel=motion', badge: 'Novo' },
  { icon: Images, color: '#7357de', title: 'Avatar com produto', desc: 'Seu influencer segurando o produto', to: '/avatars?product=1', badge: '' },
  { icon: Compass, color: '#ae4fe0', title: 'Explorar modelos', desc: 'Galeria pronta para usar como base', to: '/avatars?tab=explore', badge: '' },
  { icon: Clapperboard, color: '#6366f1', title: 'Vídeo UGC (ADS)', desc: 'Assistente completo em 8 etapas', to: '/ai-ugc/ads', badge: '' },
  { icon: UserRound, color: '#10b981', title: 'Personagem Falante', desc: 'Avatar falando seu roteiro por cenas', to: '/ai-ugc/falante', badge: '' },
  { icon: Zap, color: '#f59e0b', title: 'Hook + Demo', desc: 'Gancho forte nos 3s iniciais + demo', to: '/ai-ugc/hook-demo', badge: '' },
  { icon: Flame, color: '#845cff', title: 'Studio em Massa', desc: 'Marca, lotes de vídeos, legendas e agenda', to: '/studio', badge: 'Novo' },
];

export function HomePage() {
  const profile = useSession((s) => s.profile);
  const [showAllTools, setShowAllTools] = useState(false);
  const firstName = (profile?.name ?? '').split(' ')[0];
  const imagesLeft = Math.floor((profile?.coins_balance ?? 0) / PRICING.avatarImage);
  const visibleTools = showAllTools ? TOOLS : TOOLS.slice(0, 6);
  const isPreview = (profile?.name ?? '').toLowerCase().includes('visitante');

  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 pb-20 pt-8 md:px-10 md:pt-10 2xl:px-0">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-accent-light">FUTURO DIGITAL · STUDIO</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight" data-testid="home-greeting">
            {greeting()}{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="mt-1 text-sm text-fg-muted">Escolha um caminho e transforme a próxima ideia em conteúdo publicável.</p>
        </div>
        <Link to="/studio" className="hidden items-center gap-2 rounded-xl border border-white/10 bg-surface px-3.5 py-2 text-xs font-semibold text-fg-muted shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:text-fg sm:inline-flex">
          Explorar o Studio <ChevronDown className="size-3 -rotate-90 text-accent" />
        </Link>
      </div>

      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent-soft via-surface to-surface px-4 py-3 shadow-[0_14px_34px_rgba(72,42,150,0.22)]">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-white shadow-[0_0_22px_rgba(138,97,255,.38)]"><Activity className="size-4" /></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle">Workspace</div><div className="mt-0.5 text-xs font-semibold">Operação pronta</div></div>
          <span className="ml-auto size-2 rounded-full bg-success shadow-[0_0_10px_rgba(39,201,143,.7)]" />
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-300/10 via-surface to-surface px-4 py-3 shadow-[0_14px_34px_rgba(13,89,120,0.16)]">
          <span className="grid size-10 place-items-center rounded-xl bg-cyan-300 text-[#071521] shadow-[0_0_22px_rgba(56,189,248,.24)]"><Zap className="size-4" /></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle">Créditos</div><div className="mt-0.5 text-xs font-semibold">{profile?.coins_balance ?? 0} disponíveis</div></div>
          <Link to="/setup" className="ml-auto text-[10px] font-bold text-accent hover:underline">Gerenciar</Link>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-gradient-to-br from-success/10 via-surface to-surface px-4 py-3 shadow-[0_14px_34px_rgba(24,132,92,0.16)]">
          <span className="grid size-10 place-items-center rounded-xl bg-success text-[#06150f] shadow-[0_0_22px_rgba(39,201,143,.28)]"><ShieldCheck className="size-4" /></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle">Ambiente</div><div className="mt-0.5 text-xs font-semibold">{isPreview ? 'Prévia local' : 'Conectado'}</div></div>
          <span className="ml-auto rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[9px] font-bold text-success">OK</span>
        </div>
      </div>

      {/* Faixa de status/créditos exata do influai-replica (62px, #191724, borda #3a305a) */}
      <div className="mb-6 flex min-h-[80px] flex-col justify-between gap-3 rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/10 via-surface to-surface px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <Gift className="mt-0.5 size-[18px] shrink-0 text-[#936bff] sm:mt-0" />
          <div className="min-w-0">
            {isPreview ? (
              <>
                <div className="text-[12px] font-bold text-fg">Teste grátis: 3 vídeos + 3 imagens</div>
                <div className="mt-0.5 text-[11px] text-fg-muted">Confirme seu WhatsApp e crie seus primeiros anúncios com a qualidade completa, sem marca d'água.</div>
              </>
            ) : (
              <>
                <div className="text-[12px] font-bold text-fg">Você tem {profile?.coins_balance ?? 0} créditos — dá para criar {imagesLeft} imagem(ns) de influencer.</div>
                <div className="mt-0.5 text-[11px] text-fg-muted">Cada imagem custa {PRICING.avatarImage} créditos. Se a IA falhar, o valor volta na hora.</div>
              </>
            )}
          </div>
        </div>
        <Link
          to={isPreview ? '/setup' : '/avatars?tab=mine'}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white shadow-[0_8px_22px_rgba(121,85,232,0.25)] transition hover:-translate-y-0.5 hover:brightness-110"
        >
          {isPreview ? 'Liberar meu teste' : 'Meus avatares'}
        </Link>
      </div>

      {/* Hero editorial do workspace: mesma hierarquia visual da página de visitante, sem esconder os atalhos funcionais. */}
      <section className="group relative mb-6 min-h-[280px] overflow-hidden rounded-[2rem] border border-accent/30 bg-[#171229] shadow-[0_24px_70px_rgba(28,14,64,.36)] transition duration-300 hover:border-accent/55">
        <img src="/showcase/studio-operation-new.png" alt="Operação visual do Studio" className="absolute inset-0 h-full w-full object-cover object-center opacity-85 transition duration-700 group-hover:scale-[1.02]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#171229_0%,rgba(23,18,41,.94)_30%,rgba(23,18,41,.55)_58%,rgba(23,18,41,.18)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(138,97,255,.42),transparent_38%)]" />
        <div className="relative flex min-h-[280px] max-w-2xl flex-col justify-center px-7 py-8 md:px-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/75"><span className="size-1.5 rounded-full bg-[#b7ff28] shadow-[0_0_10px_rgba(183,255,40,.7)]" /> Studio em movimento</span>
          <h2 className="mt-4 max-w-xl text-3xl font-black leading-[1.04] tracking-tight text-white md:text-4xl">Sua próxima campanha começa com uma ideia.</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">Escolha um caminho, organize a identidade e leve o criativo até a revisão — tudo no mesmo workspace.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/studio" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#5b38d7] shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90">Abrir Studio <ChevronDown className="size-4 -rotate-90" /></Link>
            <Link to="/avatars" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/10">Criar identidade</Link>
          </div>
        </div>
      </section>

      <section className="mb-6 grid overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/10 via-surface to-surface shadow-[0_16px_38px_rgba(0,0,0,.14)] md:grid-cols-3">
        {[
          ['01', 'Defina a identidade', 'Avatar, estética e mundo visual da campanha.', '/avatars'],
          ['02', 'Produza o criativo', 'Produto, roteiro, cenas e preview no AI UGC.', '/ai-ugc'],
          ['03', 'Revise e publique', 'Projetos, montagem e publicação organizada.', '/projects'],
        ].map(([number, title, body, to], index) => (
          <Link key={number} to={to ?? '/dashboard'} className={`group relative flex items-center gap-3 px-5 py-4 transition hover:bg-accent-soft/35 ${index < 2 ? 'border-b border-border md:border-b-0 md:border-r' : ''}`}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-xs font-black text-white shadow-[0_0_18px_rgba(138,97,255,.3)]">{number}</span>
            <span className="min-w-0"><span className="block text-xs font-bold group-hover:text-accent">{title}</span><span className="mt-0.5 block text-[11px] leading-4 text-fg-muted">{body}</span></span>
            <ChevronDown className="ml-auto size-4 -rotate-90 text-fg-subtle transition group-hover:translate-x-1 group-hover:text-accent" />
          </Link>
        ))}
      </section>

      {/* 2 Hero Cards 440/178 exatos do influai-replica: roxo vibrante + retratos em faixa na base / direita */}
      <div className="mb-6 grid gap-5 md:grid-cols-2">
        <Link
          to="/avatars"
          className="group relative flex min-h-[232px] md:aspect-[620/232] flex-col justify-between overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#111a2f] p-8 text-white shadow-[0_22px_60px_rgba(13,89,120,0.28)] transition duration-300 hover:-translate-y-1.5 hover:border-cyan-200/60"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(56,189,248,0.38),rgba(17,26,47,0.92))]" />
          {/* Tira horizontal P&B de influenciadores na parte inferior, espelhada do banner-ads.png */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[56%] items-end justify-end overflow-hidden opacity-90">
            {HOME_STRIP_IMAGES.map((image) => (
              <img
                key={image}
                src={image}
                alt=""
                className="h-full min-w-0 flex-1 object-cover object-top saturate-[1.08] contrast-[1.04]"
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#111a2f] via-[#111a2f]/72 to-transparent" />
          <img src="/brand/fd-logo-v4.png" alt="" className="absolute right-3.5 top-3 h-7 w-auto opacity-80" />

          <div className="relative z-10 max-w-[84%]">
            <h2 className="text-[19px] font-extrabold leading-tight tracking-tight lg:text-[23px]">
              Ads Hiper Realista 🔥
            </h2>
            <p className="mt-1.5 max-w-[230px] text-[11px] leading-snug text-white/85">
              Crie vídeos de avatar ultrarrealistas com uma única imagem.
            </p>
          </div>
          <span className="relative z-10 inline-flex w-fit items-center gap-1.5 rounded-[9px] bg-black px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-md">
            <Play className="size-3 fill-white" /> CRIE AGORA
          </span>
        </Link>

        <Link
          to="/ai-ugc/link"
          className="group relative flex min-h-[232px] md:aspect-[620/232] flex-col justify-between overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#111a2f] p-8 text-white shadow-[0_22px_60px_rgba(13,89,120,0.28)] transition duration-300 hover:-translate-y-1.5 hover:border-cyan-200/60 hover:shadow-[0_28px_70px_rgba(13,89,120,.38)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(56,189,248,0.38),rgba(17,26,47,0.84)_42%,rgba(10,18,31,0.98)_100%)]" />
          <img
            src="/showcase/internal-ugc-new.png"
            alt=""
            className="absolute right-0 top-0 h-full w-[62%] object-cover object-center opacity-95 transition duration-700 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#111a2f] via-[#111a2f]/82 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d0d18]/80 to-transparent" />
          <img src="/brand/fd-logo-v4.png" alt="" className="absolute right-3.5 top-3 h-7 w-auto opacity-80" />

          <div className="relative z-10 max-w-[82%]">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100"><span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" /> Fluxo AI UGC</span>
            <h2 className="text-[19px] font-extrabold leading-tight tracking-tight lg:text-[23px]">
              1 Link = Resultado
            </h2>
            <p className="mt-1.5 max-w-[235px] text-[11px] leading-snug text-white/85">
              Transforme URLs de produtos, recursos ou scripts em anúncios em vídeo.
            </p>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-[9px] bg-white px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#34225d] shadow-md">
            <Play className="size-3 fill-[#34225d]" /> CRIE AGORA
            </span>
            <span className="text-[10px] font-semibold text-white/65">URL · roteiro · prévia</span>
          </div>
        </Link>
      </div>

      {/* Ferramentas populares (88px cards com caixas coloridas idênticas ao influai-replica) */}
      <div>
        <h2 className="mb-4 text-[18px] font-bold tracking-tight text-fg">Ferramentas populares</h2>
        <Link to="/ferramentas" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3 text-xs transition hover:border-accent/50 hover:bg-accent-soft/80">
          <span><span className="font-bold text-fg">Ainda não sabe por onde começar?</span> <span className="text-fg-muted">Veja a demonstração de todas as ferramentas.</span></span>
          <span className="inline-flex shrink-0 items-center gap-1 font-bold text-accent">Ver guia <ChevronDown className="size-3 -rotate-90" /></span>
        </Link>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTools.map((t) => (
            <Link
              key={t.title}
              to={t.to}
                className="group flex h-[116px] w-full items-center gap-4 rounded-2xl border border-white/10 bg-surface p-5 text-left shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition duration-200 hover:-translate-y-1 hover:border-accent/45 hover:bg-[var(--surface-hover)] hover:shadow-[0_20px_44px_rgba(0,0,0,0.24)]"
            >
              <span
                className="grid size-[48px] shrink-0 place-items-center rounded-[14px] text-white"
                style={{ backgroundColor: t.color }}
              >
                <t.icon className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-[14px] font-bold text-fg">{t.title}</span>
                  {t.badge && (
                    <span className="rounded-full bg-[#efc400] px-1.5 py-0.5 text-[8px] font-extrabold text-[#16130b]">
                      {t.badge}
                    </span>
                  )}
                </div>
                <div className="truncate text-[12px] text-fg-muted">{t.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllTools((v) => !v)}
            className="inline-flex items-center gap-2 rounded-[9px] border border-border bg-surface-2 px-4 py-2 text-[11px] font-semibold text-fg-muted transition hover:bg-surface-3 hover:text-fg"
          >
            {showAllTools ? 'Mostrar menos' : `Ver todas (${TOOLS.length})`}
            <ChevronDown className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
