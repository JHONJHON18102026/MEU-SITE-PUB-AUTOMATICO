import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  Gift,
  Globe2,
  Sparkles,
  Zap,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { useSession } from '@/store/session';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import { useCommunityAvatars } from '@/features/avatars/useAvatarData';

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function HomePage() {
  const profile = useSession((s) => s.profile);
  const firstName = (profile?.name ?? '').split(' ')[0];
  const isPreview = (profile?.name ?? '').toLowerCase().includes('visitante');

  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 pb-20 pt-8 md:px-10 md:pt-10 2xl:px-0">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-accent-light">FUTURO DIGITAL · STUDIO</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight" data-testid="home-greeting">
            {greeting()}{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="mt-1 text-sm text-fg-muted">Crie um avatar, prepare um vídeo ou organize uma campanha a partir dos fluxos do Studio.</p>
        </div>
        <Link to="/studio" className="hidden items-center gap-2 rounded-xl border border-white/10 bg-surface px-3.5 py-2 text-xs font-semibold text-fg-muted shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:text-fg sm:inline-flex">
          Explorar o Studio <ChevronDown className="size-3 -rotate-90 text-accent" />
        </Link>
      </div>

      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent-soft via-surface to-surface px-4 py-3 shadow-[0_14px_34px_rgba(72,42,150,0.22)]">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-white shadow-[0_0_22px_rgba(138,97,255,.38)]"><Activity className="size-4" /></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle">Workspace</div><div className="mt-0.5 text-xs font-semibold">{isPreview ? 'Prévia visual' : 'Workspace ativo'}</div></div>
          <span className={`ml-auto size-2 rounded-full ${isPreview ? 'bg-accent-light' : 'bg-success shadow-[0_0_10px_rgba(39,201,143,.7)]'}`} />
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-300/10 via-surface to-surface px-4 py-3 shadow-[0_14px_34px_rgba(13,89,120,0.16)]">
          <span className="grid size-10 place-items-center rounded-xl bg-cyan-300 text-[#071521] shadow-[0_0_22px_rgba(56,189,248,.24)]"><Zap className="size-4" /></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle">Créditos</div><div className="mt-0.5 text-xs font-semibold">{profile?.coins_balance ?? '—'} disponíveis</div></div>
          <Link to="/setup" className="ml-auto text-[10px] font-bold text-accent hover:underline">Gerenciar</Link>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-gradient-to-br from-success/10 via-surface to-surface px-4 py-3 shadow-[0_14px_34px_rgba(24,132,92,0.16)]">
          <span className="grid size-10 place-items-center rounded-xl bg-success text-[#06150f] shadow-[0_0_22px_rgba(39,201,143,.28)]"><ShieldCheck className="size-4" /></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle">Ambiente</div><div className="mt-0.5 text-xs font-semibold">{isPreview ? 'Prévia local' : 'Conectado'}</div></div>
          <span className={`ml-auto rounded-full border px-2 py-0.5 text-[9px] font-bold ${isPreview ? 'border-accent/25 bg-accent/10 text-accent-light' : 'border-success/25 bg-success/10 text-success'}`}>{isPreview ? 'PRÉVIA' : 'OK'}</span>
        </div>
      </div>

      {/* Explica o limite da demonstração local sem prometer gerações reais. */}
      {isPreview && <div className="mb-6 flex min-h-[80px] flex-col justify-between gap-3 rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/10 via-surface to-surface px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <Gift className="mt-0.5 size-[18px] shrink-0 text-[#936bff] sm:mt-0" />
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-fg">Prévia visual do Studio</div>
            <div className="mt-0.5 text-[11px] text-fg-muted">As gerações reais não estão ativadas nesta demonstração local. Veja os planos e a configuração do ambiente para continuar.</div>
          </div>
        </div>
        <Link
          to="/setup"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white shadow-[0_8px_22px_rgba(121,85,232,0.25)] transition hover:-translate-y-0.5 hover:brightness-110"
        >
          Ver planos e configuração
        </Link>
      </div>}

      {/* Hero editorial do workspace: mesma hierarquia visual da página de visitante, sem esconder os atalhos funcionais. */}
      <section className="group relative mb-6 min-h-[280px] overflow-hidden rounded-[2rem] border border-accent/30 bg-[#171229] shadow-[0_24px_70px_rgba(28,14,64,.36)] transition duration-300 hover:border-accent/55">
        <img src="/showcase/studio-operation-new.png" alt="Operação visual do Studio" className="absolute inset-0 h-full w-full object-cover object-center opacity-85 transition duration-700 group-hover:scale-[1.02]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#171229_0%,rgba(23,18,41,.94)_30%,rgba(23,18,41,.55)_58%,rgba(23,18,41,.18)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(138,97,255,.42),transparent_38%)]" />
        <div className="relative flex min-h-[280px] max-w-2xl flex-col justify-center px-7 py-8 md:px-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/75"><span className="size-1.5 rounded-full bg-[#b7ff28] shadow-[0_0_10px_rgba(183,255,40,.7)]" /> Studio em movimento</span>
          <h2 className="mt-4 max-w-xl text-3xl font-black leading-[1.04] tracking-tight text-white md:text-4xl">Escolha como começar sua criação.</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">Monte um avatar na Influencer IA ou organize produto, roteiro e campanha no Studio.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/studio" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#5b38d7] shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90">Abrir Studio <ChevronDown className="size-4 -rotate-90" /></Link>
            <Link to="/avatars" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/10">Criar avatar</Link>
          </div>
        </div>
      </section>

      <section className="mb-6 grid overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/10 via-surface to-surface shadow-[0_16px_38px_rgba(0,0,0,.14)] md:grid-cols-3">
        {[
          ['01', 'Defina a identidade', 'Avatar, estética e mundo visual da campanha.', '/avatars'],
          ['02', 'Produza o criativo', 'Produto, roteiro, cenas e preview no AI UGC.', '/ai-ugc'],
          ['03', 'Revise e organize', 'Acompanhe em Projetos e prepare a montagem final.', '/projects'],
        ].map(([number, title, body, to], index) => (
          <Link key={number} to={to ?? '/dashboard'} className={`group relative flex items-center gap-3 px-5 py-4 transition hover:bg-accent-soft/35 ${index < 2 ? 'border-b border-border md:border-b-0 md:border-r' : ''}`}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-xs font-black text-white shadow-[0_0_18px_rgba(138,97,255,.3)]">{number}</span>
            <span className="min-w-0"><span className="block text-xs font-bold group-hover:text-accent">{title}</span><span className="mt-0.5 block text-[11px] leading-4 text-fg-muted">{body}</span></span>
            <ChevronDown className="ml-auto size-4 -rotate-90 text-fg-subtle transition group-hover:translate-x-1 group-hover:text-accent" />
          </Link>
        ))}
      </section>

      {/* Atalhos diretos para os dois caminhos de criação mais usados. */}
      <div className="mb-6 grid gap-5 md:grid-cols-2">
        <Link
          to="/avatars"
          className="group relative flex min-h-[232px] md:aspect-[620/232] flex-col justify-between overflow-hidden rounded-3xl border border-accent/30 bg-[#171229] p-7 text-white shadow-[0_22px_60px_rgba(72,42,150,0.24)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-accent/65 hover:shadow-[0_28px_70px_rgba(72,42,150,.34)] md:p-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(138,97,255,0.34),rgba(23,18,41,0.94)_65%)]" />
          <img src="/showcase/landing/influencer-ai-new.jpg" alt="" loading="lazy" decoding="async" className="absolute inset-y-0 right-0 h-full w-[58%] object-cover object-center opacity-80 transition-transform duration-300 group-hover:scale-[1.03]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#171229] via-[#171229]/80 to-transparent" />
          <img src="/brand/fd-logo-v4.png" alt="" className="absolute right-3.5 top-3 h-7 w-auto opacity-80" />

          <div className="relative z-10 max-w-[84%]">
            <h2 className="text-[19px] font-extrabold leading-tight tracking-tight lg:text-[23px]">
              Influencer IA
            </h2>
            <p className="mt-1.5 max-w-[250px] text-[11px] leading-snug text-white/80">
              Crie um personagem com aparência, características e mundo próprios.
            </p>
          </div>
          <span className="relative z-10 inline-flex w-fit items-center gap-1.5 rounded-[9px] bg-white px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#4d32ad] shadow-md">
            <Sparkles className="size-3.5" /> CRIAR AVATAR
          </span>
        </Link>

        <Link
          to="/ai-ugc/link"
          className="group relative flex min-h-[232px] md:aspect-[620/232] flex-col justify-between overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#111a2f] p-7 text-white shadow-[0_22px_60px_rgba(13,89,120,0.2)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-cyan-200/60 hover:shadow-[0_28px_70px_rgba(13,89,120,.3)] md:p-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(56,189,248,0.38),rgba(17,26,47,0.84)_42%,rgba(10,18,31,0.98)_100%)]" />
          <img
            src="/showcase/internal-ugc-new.png"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute right-0 top-0 h-full w-[62%] object-cover object-center opacity-90 transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#111a2f] via-[#111a2f]/82 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d0d18]/80 to-transparent" />
          <img src="/brand/fd-logo-v4.png" alt="" className="absolute right-3.5 top-3 h-7 w-auto opacity-80" />

          <div className="relative z-10 max-w-[82%]">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100"><span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" /> Fluxo AI UGC</span>
            <h2 className="text-[19px] font-extrabold leading-tight tracking-tight lg:text-[23px]">
              AI UGC · anúncio com link
            </h2>
            <p className="mt-1.5 max-w-[235px] text-[11px] leading-snug text-white/85">
              Cole a URL do produto e prepare o roteiro do anúncio em vídeo.
            </p>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-[9px] bg-white px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#34225d] shadow-md">
            <Zap className="size-3.5" /> ABRIR FLUXO LINK
            </span>
            <span className="text-[10px] font-semibold text-white/65">URL · roteiro · prévia</span>
          </div>
        </Link>
      </div>

      <HomeAvatarPresets />
    </div>
  );
}

function HomeAvatarPresets() {
  const [active, setActive] = useState<'presets' | 'community'>('presets');
  const community = useCommunityAvatars();
  const avatars = active === 'presets' ? SHOWCASE_AVATARS : community.data;

  return (
    <section aria-labelledby="home-avatar-presets" className="mt-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="home-avatar-presets" className="text-[18px] font-bold tracking-tight text-fg">Templates de avatares</h2>
          <p className="mt-1 text-xs text-fg-muted">Escolha um influencer pronto para abrir e personalizar no estúdio.</p>
        </div>
        <div className="inline-flex flex-wrap rounded-full bg-surface-2 p-1 text-xs font-semibold ring-1 ring-inset ring-border" role="tablist" aria-label="Biblioteca de avatares">
          <button type="button" role="tab" aria-selected={active === 'presets'} onClick={() => setActive('presets')} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 transition ${active === 'presets' ? 'bg-brand text-white shadow-sm' : 'text-fg-muted hover:text-fg'}`}>
            <Sparkles className="size-3.5" /> Presets de Avatares ({SHOWCASE_AVATARS.length})
          </button>
          <button type="button" role="tab" aria-selected={active === 'community'} onClick={() => setActive('community')} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 transition ${active === 'community' ? 'bg-brand text-white shadow-sm' : 'text-fg-muted hover:text-fg'}`}>
            <Globe2 className="size-3.5" /> Avatares da Comunidade ({community.data.length})
          </button>
        </div>
      </div>

      {active === 'community' && community.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"><div className="skeleton aspect-[3/4] rounded-2xl" /><div className="skeleton aspect-[3/4] rounded-2xl" /><div className="skeleton aspect-[3/4] rounded-2xl" /></div>
      ) : avatars.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {avatars.map((avatar) => (
            <Link key={avatar.id} to={active === 'presets' ? `/avatars?modelo=${encodeURIComponent(avatar.id)}` : '/avatars?tab=explore&sub=comunidade'} title={`Abrir ${avatar.name} no estúdio`} className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-accent/25 bg-surface shadow-[0_14px_34px_rgba(0,0,0,.2)] transition duration-300 hover:-translate-y-1 hover:border-accent/70 hover:shadow-[0_22px_48px_rgba(72,42,150,.3)]">
              <img src={avatar.image_url} alt={avatar.name} loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <span className="absolute inset-x-3 bottom-3 truncate text-left text-xs font-semibold text-white">{avatar.name}</span>
              <span className="absolute right-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100">Usar template</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <Globe2 className="size-6 text-fg-subtle" />
          <p className="text-sm font-semibold text-fg">Ainda não há avatares públicos na comunidade.</p>
          <p className="max-w-md text-xs text-fg-muted">Quando alguém publicar um avatar, ele aparece aqui para você abrir no estúdio.</p>
          {community.error && <Link to="/avatars?tab=explore&sub=comunidade" className="mt-1 text-xs font-bold text-accent hover:underline">Abrir galeria de avatares</Link>}
        </div>
      )}
    </section>
  );
}
