import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Clapperboard, Crown, FolderOpen, Home, SlidersHorizontal, Sparkles, TrendingUp, Users, X } from 'lucide-react';
import { BrandLogo, CoinIcon } from '@/components/ui/Brand';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/avatars', label: 'Avatars', icon: Users },
  { to: '/projects', label: 'Projetos', icon: FolderOpen },
  { to: '/viral', label: 'VIRAL', icon: TrendingUp },
  { to: '/ai-ugc', label: 'AI UGC', icon: Clapperboard },
  { to: '/studio', label: 'Studio', icon: Sparkles },
] as const;

const PLAN_LABEL: Record<string, string> = {
  free: 'Plano Gratuito',
  starter: 'Plano Starter',
  pro: 'Plano Pro',
  agency: 'Plano Agência',
  unlimited: 'Plano Ilimitado',
};

function SidebarInner({
  collapsed = false,
  onNavigate,
  onOpenCustomize,
  onCloseMobile,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onOpenCustomize: () => void;
  onCloseMobile?: () => void;
}) {
  const hiddenNavPaths = useUi((s) => s.hiddenNavPaths);
  const profile = useSession((s) => s.profile);
  const visibleItems = NAV_ITEMS.filter((i) => i.to === '/dashboard' || !hiddenNavPaths.includes(i.to));

  return (
    <>
      <div className={clsx('flex h-[64px] items-center justify-between border-b border-white/10', collapsed ? 'justify-center px-1' : 'px-4')}>
        <Link
          to="/"
          onClick={onNavigate}
          aria-label="Voltar para a página inicial do FUTURO DIGITAL"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <BrandLogo compact={collapsed} />
        </Link>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="border-b border-white/10 px-4 py-4">
          <div className="truncate text-[11px] font-bold text-white/90">{profile?.name || 'Carregando…'}</div>
          <div className="mt-1 inline-flex rounded-full border border-accent/20 bg-accent-soft px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-accent-light">{PLAN_LABEL[profile?.plan ?? 'free']}</div>
        </div>
      )}

      <nav className={clsx('flex-1 space-y-0.5', collapsed ? 'px-1 py-2' : 'px-1.5 py-2.5')} aria-label="Menu principal">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              clsx(
                'group relative flex items-center gap-2.5 rounded-xl border text-[12px] font-medium transition-all duration-200',
                collapsed ? 'h-10 justify-center px-0' : 'h-8 px-2.5',
                isActive
                  ? 'border-accent/25 bg-accent-soft text-white font-semibold shadow-[0_8px_24px_rgba(138,97,255,0.16)] before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-accent-light'
                  : 'border-transparent text-fg-muted hover:translate-x-0.5 hover:bg-white/[0.04] hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={clsx('shrink-0', collapsed ? 'size-[17px]' : 'size-3.5', isActive && 'opacity-100')} />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={clsx(collapsed ? 'space-y-1.5 px-1 pb-2.5 pt-1.5' : 'space-y-2 p-2.5')}>
        <button
          type="button"
          onClick={onOpenCustomize}
          title={collapsed ? 'Personalizar menu' : undefined}
          className={clsx(
            'flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[11px] font-medium text-fg-muted hover:bg-white/[0.04] hover:text-fg',
            collapsed && 'justify-center px-0',
          )}
        >
          <SlidersHorizontal className="size-3.5 shrink-0" />
          {!collapsed && <span>Personalizar menu</span>}
        </button>

        {/* Pílula de créditos + Upgrade idêntica ao rodapé lateral do Influai */}
        <div
          className={clsx(
            'flex items-center rounded-2xl border border-accent/25 bg-gradient-to-r from-accent/10 to-surface-2 shadow-[0_12px_30px_rgba(0,0,0,0.2)] transition',
            collapsed ? 'mx-auto h-8 w-full justify-center px-1' : 'h-[42px] gap-2.5 px-3',
          )}
          data-testid="credits-balance"
          aria-label={`Saldo: ${profile?.coins_balance ?? 0} créditos`}
        >
          <div className={clsx('flex items-center font-bold text-[#f2c55f]', collapsed ? 'gap-1 text-[10px]' : 'gap-1.5 text-xs')}>
            <CoinIcon className={clsx(collapsed ? 'size-3' : 'size-4', 'shrink-0')} />
            <span>{profile?.coins_balance ?? '—'}</span>
          </div>
          {!collapsed && (
            <Link
              to="/setup"
              className="ml-auto inline-flex h-7 items-center gap-1 rounded-xl bg-accent px-3 text-[10px] font-extrabold text-white transition hover:brightness-110"
            >
              <Crown className="size-3" /> Upgrade
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const { pathname } = useLocation();
  const {
    sidebarCollapsed,
    avatarsRailExpanded,
    mobileNavOpen,
    setMobileNavOpen,
    hiddenNavPaths,
    toggleNavVisibility,
    resetNavVisibility,
  } = useUi();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Na tela /avatars, o menu inicia recolhido em trilho fino (50px) igual ao Influai para dar palco total ao estúdio
  const collapsed = pathname.startsWith('/avatars') ? !avatarsRailExpanded : sidebarCollapsed;

  return (
    <>
      <aside
        className={clsx(
          'hidden md:flex shrink-0 flex-col border-r border-white/10 bg-[linear-gradient(180deg,#11101a_0%,#0b0b11_100%)] transition-[width] duration-200',
          collapsed ? 'w-[50px]' : 'w-[256px]',
        )}
      >
        <SidebarInner collapsed={collapsed} onOpenCustomize={() => setCustomizeOpen(true)} />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative flex h-full w-64 max-w-[82vw] flex-col border-r border-white/10 bg-[#11101a] shadow-2xl">
            <SidebarInner
              onNavigate={() => setMobileNavOpen(false)}
              onCloseMobile={() => setMobileNavOpen(false)}
              onOpenCustomize={() => {
                setMobileNavOpen(false);
                setCustomizeOpen(true);
              }}
            />
          </aside>
        </div>
      )}

      <Modal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Personalizar menu"
        description="Escolha quais áreas quer deixar visíveis na barra lateral."
        footer={
          <>
            <Button variant="ghost" onClick={resetNavVisibility}>Mostrar tudo</Button>
            <Button variant="primary" onClick={() => setCustomizeOpen(false)}>Pronto</Button>
          </>
        }
      >
        <div className="space-y-1.5">
          {NAV_ITEMS.filter((i) => i.to !== '/dashboard').map((item) => {
            const visible = !hiddenNavPaths.includes(item.to);
            return (
              <label key={item.to} className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs">
                <span className="flex items-center gap-2 font-medium">
                  <item.icon className="size-4 text-accent" />
                  {item.label}
                </span>
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={() => toggleNavVisibility(item.to)}
                  className="size-4 accent-[var(--accent)]"
                />
              </label>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
