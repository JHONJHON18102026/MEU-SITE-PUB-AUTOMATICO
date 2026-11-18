/**
 * Estado de login + perfil (nome, plano, saldo de créditos).
 * Zustand = uma "caixinha" global: qualquer tela lê o saldo sem passar
 * props de pai para filho, e só re-renderiza quem usa o pedaço que mudou.
 */
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  name: string;
  plan: 'free' | 'starter' | 'pro' | 'agency';
  coins_balance: number;
}

interface SessionState {
  session: Session | null;
  profile: Profile | null;
  status: 'loading' | 'signed-out' | 'signed-in';
  init: () => () => void;
  refreshProfile: () => Promise<void>;
  setBalance: (balance: number) => void;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  session: null,
  profile: null,
  status: 'loading',

  init: () => {
    if (!supabase) {
      // Sem .env: libera prévia visual com perfil local sem tocar em banco/IA reais.
      set({
        status: 'signed-in',
        profile: { id: 'preview', name: 'Visitante (Prévia)', plan: 'free', coins_balance: 20 },
      });
      return () => undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, status: data.session ? 'signed-in' : 'signed-out' });
      if (data.session) void get().refreshProfile();
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, status: session ? 'signed-in' : 'signed-out' });
      if (session) void get().refreshProfile();
      else set({ profile: null });
    });
    return () => data.subscription.unsubscribe();
  },

  refreshProfile: async () => {
    const userId = get().session?.user.id;
    if (!supabase || !userId) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, plan, coins_balance')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) set({ profile: data as Profile });
  },

  setBalance: (balance) => {
    const profile = get().profile;
    if (profile) set({ profile: { ...profile, coins_balance: balance } });
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, profile: null, status: 'signed-out' });
  },
}));
