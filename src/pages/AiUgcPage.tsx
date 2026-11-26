import { NavLink, Navigate, useParams, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Clapperboard, Link2, Mic, Presentation, Repeat2, Zap, type LucideIcon } from 'lucide-react';
import { AdsCreator } from '@/features/aiUgc/AdsCreator';
import { HookDemoCreator } from '@/features/aiUgc/HookDemoCreator';
import { LinkCreator } from '@/features/aiUgc/LinkCreator';
import { RemakeViralCreator } from '@/features/aiUgc/RemakeViralCreator';
import { SlideshowCreator } from '@/features/aiUgc/SlideshowCreator';
import { TalkingCreator } from '@/features/aiUgc/TalkingCreator';
import { useSession } from '@/store/session';

interface UgcModeMeta {
  slug: string;
  label: string;
  title: string;
  icon: LucideIcon;
}

export const UGC_MODES: UgcModeMeta[] = [
  { slug: 'ads', label: 'ADS', title: 'Anúncio Hiper-Realista', icon: Clapperboard },
  { slug: 'link', label: 'LINK', title: '1 Link = Anúncio', icon: Link2 },
  { slug: 'falante', label: 'ANÚNCIO DE PERSONAGEM FALANTE', title: 'Personagem Falante', icon: Mic },
  { slug: 'hook-demo', label: 'HOOK+DEMO', title: 'Hook + Demo', icon: Zap },
  { slug: 'slideshows', label: 'SLIDESHOWS', title: 'Slideshows', icon: Presentation },
  { slug: 'remake', label: 'REMAKE VIRAL', title: 'Remake Viral', icon: Repeat2 },
];

// Mantém links antigos (/ai-ugc?tab=...) redirecionando para a URL limpa.
const LEGACY_TAB_MAP: Record<string, string> = {
  ads: 'ads',
  link: 'link',
  talking: 'falante',
  falante: 'falante',
  hook: 'hook-demo',
  'hook-demo': 'hook-demo',
  slideshows: 'slideshows',
  remake: 'remake',
};

export function AiUgcPage() {
  const { mode } = useParams<{ mode?: string }>();
  const [params] = useSearchParams();
  const plan = useSession((s) => s.profile?.plan);

  const legacyTab = params.get('tab');
  if (!mode && legacyTab && LEGACY_TAB_MAP[legacyTab]) {
    return <Navigate to={`/ai-ugc/${LEGACY_TAB_MAP[legacyTab]}`} replace />;
  }

  // Sem :mode -> entra direto em ADS, mantendo as sub-rotas dedicadas na barra superior.
  const activeSlug = mode ?? 'ads';
  const current = UGC_MODES.find((m) => m.slug === activeSlug);
  if (mode && !current) {
    return <Navigate to="/ai-ugc/ads" replace />;
  }

  return (
    <div className="premium-workspace mx-auto w-full max-w-[1480px] space-y-6 px-4 py-6">
      <div className="relative min-h-[220px] overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_88%_8%,rgba(56,189,248,.28),transparent_36%),linear-gradient(135deg,#19152b,#111019)] p-7 shadow-[0_28px_80px_rgba(13,89,120,.24)] md:min-h-[260px] md:p-9">
        <img src="/showcase/internal-ugc-new.png" alt="" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[56%] object-cover object-center opacity-65 mix-blend-screen" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-transparent via-[#19152b]/50 to-[#19152b]" />
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-accent-light">FUTURO DIGITAL · PRODUÇÃO</div>
          <h1 className="mt-3 max-w-xl text-3xl font-black uppercase tracking-tight md:text-5xl">AI UGC <span className="text-cyan-300">CREATOR</span></h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-fg-muted md:text-base">Do produto ao vídeo que parece gravado de verdade, com roteiro, cenas e prévia no mesmo fluxo.</p>
        </div>
        </div>
      </div>

      {/* Barra de abas compacta; cada botão navega para /ai-ugc/:mode. */}
      <nav
        className="premium-tabbar inline-flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-[8px] p-1 text-fg-muted thin-scroll"
        aria-label="Ferramentas do AI UGC"
      >
        {UGC_MODES.map((m) => {
          const active = m.slug === activeSlug;
          return (
            <NavLink
              key={m.slug}
              to={`/ai-ugc/${m.slug}`}
              className={clsx(
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all sm:px-3.5 sm:text-[13px]',
                active ? 'bg-bg text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
              )}
            >
              {m.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/10 via-surface to-surface px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,.12)]">
        <span className="mr-2 text-[10px] font-black uppercase tracking-[0.18em] text-accent-light">Fluxo recomendado</span>
        {['Produto', 'Roteiro', 'Cenas', 'Prévia'].map((step, index) => (
          <span key={step} className="inline-flex items-center gap-2 text-xs font-semibold text-fg-muted"><span className="grid size-6 place-items-center rounded-full bg-accent text-[10px] font-black text-white">{index + 1}</span>{step}{index < 3 && <span className="mx-1 text-fg-subtle">→</span>}</span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-3 text-xs">
        {plan === 'unlimited' ? (
          <>
            <span className="font-bold text-cyan-200">Plano Ilimitado ativo</span>
            <span className="text-fg-muted">Vídeos de 8s · motor lowerpriority · sem desconto de créditos</span>
          </>
        ) : (
          <>
            <span className="font-bold text-fg">Omni Flash 1.2</span>
            <span className="text-fg-muted">30 créditos por vídeo de até 10s · o saldo é debitado na geração</span>
          </>
        )}
      </div>

      {activeSlug === 'ads' && <AdsCreator />}
      {activeSlug === 'link' && <LinkCreator />}
      {activeSlug === 'falante' && <TalkingCreator />}
      {activeSlug === 'hook-demo' && <HookDemoCreator />}
      {activeSlug === 'slideshows' && <SlideshowCreator />}
      {activeSlug === 'remake' && <RemakeViralCreator />}
    </div>
  );
}
