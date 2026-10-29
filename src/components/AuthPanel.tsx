import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LogIn, LogOut, UserPlus, ShieldCheck } from 'lucide-react';
import { supabase, supabaseStatus } from '../lib/supabase';

export function AuthPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setFeedback(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setFeedback({ type: 'success', text: 'Login realizado com sucesso!' });
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setFeedback({
          type: 'success',
          text: 'Conta criada! Verifique seu e-mail caso a confirmação esteja ativa no Supabase.',
        });
      }
      setPassword('');
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Erro ao processar autenticação.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setLoading(true);
    await supabase.auth.signOut();
    setFeedback(null);
    setLoading(false);
  };

  if (session) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="flex items-center gap-3 text-emerald-400">
          <ShieldCheck className="h-6 w-6" />
          <h2 className="text-lg font-semibold text-white">Sessão Ativa</h2>
        </div>
        <div className="mt-4 space-y-2 rounded-xl bg-slate-950/70 p-4 text-sm text-slate-300">
          <p>
            <span className="text-slate-500">E-mail:</span>{' '}
            <span className="font-medium text-slate-100">
              {session.user.email}
            </span>
          </p>
          <p className="break-all">
            <span className="text-slate-500">User ID:</span>{' '}
            <code className="text-xs text-slate-400">{session.user.id}</code>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={loading}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50 transition"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>
    );
  }

  const disabled = !supabaseStatus.configured || loading;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {mode === 'signin' ? 'Entrar na Conta' : 'Criar Nova Conta'}
        </h2>
        <div className="flex rounded-lg bg-slate-950 p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setFeedback(null);
            }}
            className={`rounded-md px-3 py-1 font-medium transition ${
              mode === 'signin'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setFeedback(null);
            }}
            className={`rounded-md px-3 py-1 font-medium transition ${
              mode === 'signup'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cadastro
          </button>
        </div>
      </div>

      <p className="mt-1 text-sm text-slate-400">
        Autenticação integrada ao Supabase Auth pronta para uso.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled}
            placeholder="voce@exemplo.com"
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={disabled}
            placeholder="Mínimo de 6 caracteres"
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {feedback && (
          <div
            className={`rounded-xl border px-3.5 py-2.5 text-xs ${
              feedback.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <button
          type="submit"
          disabled={disabled}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 transition"
        >
          {mode === 'signin' ? (
            <>
              <LogIn className="h-4 w-4" />
              {loading ? 'Entrando...' : 'Entrar'}
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              {loading ? 'Criando conta...' : 'Criar conta'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
