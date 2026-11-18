/**
 * Preferências de interface que o app LEMBRA entre visitas
 * (tema, menu recolhido) + central de notificações da sessão.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  kind: 'success' | 'error' | 'info';
  createdAt: number;
  read: boolean;
}

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  avatarsRailExpanded: boolean;
  mobileNavOpen: boolean;
  hiddenNavPaths: string[];
  notifications: AppNotification[];
  toggleTheme: () => void;
  toggleSidebar: () => void;
  toggleAvatarsRail: () => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleNavVisibility: (path: string) => void;
  resetNavVisibility: () => void;
  notify: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('fd-theme', theme);
  } catch {
    /* modo privado: ignora */
  }
}

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      theme: (document.documentElement.dataset.theme as Theme) || 'dark',
      sidebarCollapsed: false,
      avatarsRailExpanded: false,
      mobileNavOpen: false,
      hiddenNavPaths: [],
      notifications: [],
      toggleTheme: () => {
        const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(theme);
        set({ theme });
      },
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      toggleAvatarsRail: () => set({ avatarsRailExpanded: !get().avatarsRailExpanded }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      toggleNavVisibility: (path) => {
        const hidden = get().hiddenNavPaths;
        set({ hiddenNavPaths: hidden.includes(path) ? hidden.filter((p) => p !== path) : [...hidden, path] });
      },
      resetNavVisibility: () => set({ hiddenNavPaths: [] }),
      notify: (n) =>
        set({
          notifications: [
            { ...n, id: crypto.randomUUID(), createdAt: Date.now(), read: false },
            ...get().notifications,
          ].slice(0, 30),
        }),
      markAllRead: () => set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) }),
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'fd-ui',
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, hiddenNavPaths: s.hiddenNavPaths, notifications: s.notifications }),
    },
  ),
);
