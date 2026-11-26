import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { KeyRound, MessageSquare, Sparkles, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useSession } from '@/store/session';

/** Moldura de todas as telas logadas: menu à esquerda + barra limpa no topo + botão flutuante de ajuda. */
export function AppShell() {
  const { pathname } = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const profileName = useSession((s) => s.profile?.name ?? '');
  const isPreview = profileName.toLowerCase().includes('visitante');

  useEffect(() => {
    const main = document.querySelector('main');
    main?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <div className={`app-shell app-route-${pathname.split('/')[1] || 'dashboard'} flex h-full bg-bg`}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 min-h-0 overflow-y-auto thin-scroll bg-[radial-gradient(circle_at_76%_-12%,rgba(138,97,255,.13),transparent_34%),radial-gradient(circle_at_6%_16%,rgba(56,189,248,.045),transparent_30%),linear-gradient(180deg,rgba(13,13,20,.18),transparent_30%)]">
          <div className="workspace-ribbon flex min-h-11 items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle md:px-8">
            <span className="inline-flex items-center"><span className="mr-2 inline-block size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(138,97,255,.8)]" />Futuro Digital Studio</span>
            <span className="hidden items-center gap-2 text-fg-muted/70 sm:inline-flex"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] tracking-[0.12em] ${isPreview ? 'border-accent/25 bg-accent/10 text-accent-light' : 'border-success/25 bg-success/10 text-success'}`}><span className={`size-1.5 rounded-full ${isPreview ? 'bg-accent-light' : 'bg-success'}`} /> {isPreview ? 'Prévia local' : 'Workspace ativo'}</span><span>Workspace de criação</span></span>
          </div>
          <div className="route-surface min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Botão flutuante de ajuda e suporte do FUTURO DIGITAL. */}
      {helpOpen && (
        <aside className="fixed bottom-[72px] right-6 z-50 w-72 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs font-bold">
            <span>Central Rápida FUTURO DIGITAL</span>
            <button type="button" onClick={() => setHelpOpen(false)} aria-label="Fechar ajuda" className="text-fg-muted hover:text-fg">
              <X className="size-4" />
            </button>
          </div>
          <div className="space-y-2 p-3 text-xs text-fg-muted">
            <p>Acesse as ferramentas disponíveis ou conecte suas chaves no painel de configuração.</p>
            <div className="flex flex-col gap-1.5 pt-1">
              <Link to="/ferramentas" onClick={() => setHelpOpen(false)} className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 font-semibold text-fg hover:bg-surface-hover">
                <Sparkles className="size-3.5 text-accent" /> Ver todas as ferramentas
              </Link>
              <Link to="/setup" onClick={() => setHelpOpen(false)} className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 font-semibold text-fg hover:bg-surface-hover">
                <KeyRound className="size-3.5 text-accent" /> Conectar Chaves (.env)
              </Link>
            </div>
          </div>
        </aside>
      )}
      <button
        type="button"
        onClick={() => setHelpOpen((v) => !v)}
        aria-label="Central de ajuda"
        className="fixed bottom-4 right-6 z-40 grid size-11 place-items-center rounded-full bg-gradient-to-br from-[#16bef2] to-[#6750f7] text-white shadow-lg transition hover:scale-105"
      >
        <MessageSquare className="size-[18px]" />
      </button>
    </div>
  );
}
