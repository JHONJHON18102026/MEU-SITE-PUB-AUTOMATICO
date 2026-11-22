import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Bell, ChevronRight, KeyRound, LogOut, Menu, PanelLeft, Sun, UserRound, CheckCheck, Trash2 } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useUi } from '@/store/ui';
import { useSession } from '@/store/session';
import { useDismiss } from '@/components/ui/PillSelect';
import { BrandLogo, CoinIcon } from '@/components/ui/Brand';

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86400)} d`;
}

export function Topbar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme, toggleSidebar, toggleAvatarsRail, setMobileNavOpen, notifications, markAllRead, clearNotifications } = useUi();
  const { session, profile, signOut } = useSession();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useDismiss<HTMLDivElement>(notifOpen, () => setNotifOpen(false));
  const userRef = useDismiss<HTMLDivElement>(userOpen, () => setUserOpen(false));
  const unread = notifications.filter((n) => !n.read).length;
  const initial = (profile?.name || session?.user.email || '?').charAt(0).toUpperCase();
  const onAvatars = pathname.startsWith('/avatars');
  const routeLabels: Record<string, string> = {
    dashboard: 'Home', 'agente-diretor': 'Agente Diretor', avatars: 'Avatares', projects: 'Projetos', viral: 'VIRAL', 'ai-ugc': 'AI UGC', studio: 'Studio', ferramentas: 'Ferramentas', setup: 'Configuração',
  };
  const routeParts = pathname.split('/').filter(Boolean);
  const routeCrumbs = routeParts.map((part, index) => ({
    label: routeLabels[part] ?? (part === 'pasta' ? 'Pasta' : part.replaceAll('-', ' ')),
    to: `/${routeParts.slice(0, index + 1).join('/')}`,
  }));

  return (
    <header className="relative sticky top-0 z-30 border-b border-accent/20 bg-[linear-gradient(180deg,rgba(27,23,48,0.99),rgba(13,13,20,0.94))] shadow-[0_10px_34px_rgba(0,0,0,0.2)] backdrop-blur-xl after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px after:bg-gradient-to-r after:from-transparent after:via-accent after:to-transparent after:opacity-70">
      <div className="flex h-[64px] items-center gap-2 px-3 md:px-5">
        <button
          type="button"
          onClick={() => (onAvatars ? toggleAvatarsRail() : toggleSidebar())}
          className="hidden md:inline-flex size-9 items-center justify-center rounded-xl border border-white/10 text-fg-muted transition hover:border-accent/30 hover:bg-accent-soft hover:text-fg"
          aria-label="Recolher/abrir menu"
        >
          <PanelLeft className="size-4" />
        </button>

        {/* Botão de menu lateral + marca no celular (evita cortar texto) */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-xl p-2 text-fg-muted hover:bg-white/[0.05] hover:text-fg"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <Link
            to="/"
            aria-label="Voltar para a página inicial do FUTURO DIGITAL"
            className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <BrandLogo compact />
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {!isSupabaseConfigured && (
            <Link
              to="/setup"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent-soft px-3 py-1 text-[11px] font-semibold text-fg hover:border-accent"
              title="Preencha suas chaves no .env para habilitar geração real"
            >
              <KeyRound className="size-3 text-accent" />
              Modo prévia · <span className="text-accent">Ligar chaves</span>
            </Link>
          )}

          <div className="md:hidden flex items-center gap-1 rounded-full border border-[#9d6a20] bg-surface-2 px-2.5 py-1 text-xs font-bold text-[#efa917]">
            <CoinIcon className="size-3.5" />
            {profile?.coins_balance ?? '—'}
          </div>

          {/* Botão compacto de alternância de tema. */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-2.5 transition hover:border-accent/30 hover:bg-white/[0.04]"
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] text-white shadow-[0_0_14px_rgba(138,97,255,0.35)]">
              {theme === 'dark' ? '☾' : '☀'}
            </span>
            <Sun className="size-3.5 text-[#eebd42]" />
          </button>

          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold text-fg-muted">
            PT
          </span>

          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setNotifOpen((v) => !v);
                if (!notifOpen) markAllRead();
              }}
              className="relative grid size-9 place-items-center rounded-xl border border-transparent text-fg-muted transition hover:border-white/10 hover:bg-white/[0.04] hover:text-fg"
              aria-label={`Notificações${unread ? ` (${unread} novas)` : ''}`}
            >
              <Bell className="size-[16px]" />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 grid min-w-3.5 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-surface p-2 shadow-2xl">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm font-bold">Notificações</span>
                  {notifications.length > 0 && (
                    <button onClick={clearNotifications} className="text-xs text-fg-subtle hover:text-fg inline-flex items-center gap-1">
                      <Trash2 className="size-3.5" /> Limpar
                    </button>
                  )}
                </div>
                <ul className="max-h-80 overflow-y-auto thin-scroll">
                  {notifications.length === 0 && (
                    <li className="flex items-center gap-2 px-2 py-6 text-sm text-fg-subtle justify-center">
                      <CheckCheck className="size-4" /> Tudo em dia por aqui.
                    </li>
                  )}
                  {notifications.map((n) => (
                    <li key={n.id} className="rounded-xl px-2 py-2 hover:bg-surface-2">
                      <div className="flex items-start gap-2">
                        <span
                          className={clsx(
                            'mt-1.5 size-2 shrink-0 rounded-full',
                            n.kind === 'success' && 'bg-success',
                            n.kind === 'error' && 'bg-danger',
                            n.kind === 'info' && 'bg-accent',
                          )}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{n.title}</div>
                          <div className="text-xs text-fg-muted">{n.description}</div>
                          <div className="text-[11px] text-fg-subtle mt-0.5">{timeAgo(n.createdAt)}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div ref={userRef} className="relative">
            <button
              onClick={() => setUserOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-transparent py-1.5 pl-1.5 pr-2.5 transition hover:border-white/10 hover:bg-white/[0.04]"
              aria-label="Menu da conta"
              aria-expanded={userOpen}
            >
              <span className="grid size-[26px] place-items-center rounded-full bg-[#35304e] text-[11px] font-bold text-[#d8cffb]">{initial}</span>
              <span className="hidden sm:block max-w-32 truncate text-[11px] font-semibold">{profile?.name}</span>
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-surface p-2 shadow-2xl">
                <div className="px-3 py-2">
                  <div className="font-semibold truncate">{profile?.name}</div>
                  <div className="text-xs text-fg-subtle truncate">{session?.user.email ?? 'Prévia local sem chaves'}</div>
                </div>
                <Link
                  to="/avatars?tab=mine"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
                >
                  <UserRound className="size-4" /> Meus avatares
                </Link>
                {isSupabaseConfigured ? (
                  <button
                    onClick={() => void signOut()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
                  >
                    <LogOut className="size-4" /> Sair
                  </button>
                ) : (
                  <Link
                    to="/setup"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-accent hover:bg-accent-soft"
                  >
                    <KeyRound className="size-4" /> Ligar minhas chaves
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {routeCrumbs.length > 0 && pathname !== '/dashboard' && (
        <div className="flex h-8 items-center gap-1 overflow-x-auto border-t border-white/[0.05] px-4 text-[11px] text-fg-muted md:px-5" aria-label="Navegação estrutural">
          <Link to="/dashboard" className="shrink-0 transition-colors hover:text-fg">Home</Link>
          {routeCrumbs.map((crumb, index) => (
            <span key={`${crumb.to}-${index}`} className="inline-flex shrink-0 items-center gap-1">
              <ChevronRight className="size-3 text-fg-subtle" />
              {index === routeCrumbs.length - 1 ? <span className="font-semibold capitalize text-fg">{crumb.label}</span> : <Link to={crumb.to} className="capitalize transition-colors hover:text-fg">{crumb.label}</Link>}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
