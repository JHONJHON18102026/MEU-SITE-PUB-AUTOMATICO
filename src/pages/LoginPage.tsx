import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { BrandFullMark } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { requireSupabase } from '@/lib/supabase';
import { useSession } from '@/store/session';

type Mode = 'login' | 'signup' | 'reset';

const ERROR_PT: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  'User already registered': 'Este e-mail já tem conta. Use "Entrar".',
};

export function LoginPage() {
  const status = useSession((s) => s.status);
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  if (status === 'signed-in') return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const sb = requireSupabase();
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success('Conta criada! Abra seu e-mail e clique no link de confirmação.');
          setMode('login');
        }
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        toast.success('Enviamos um link para redefinir a senha.');
        setMode('login');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(ERROR_PT[msg] ?? msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-full place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand opacity-15 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-5 flex flex-col items-center text-center">
          <BrandFullMark className="h-24 w-auto" />
          <p className="mt-2.5 text-xs text-fg-muted">Crie influencers e anúncios UGC com IA em minutos.</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
          <h1 className="text-xl font-bold">
            {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta grátis' : 'Recuperar senha'}
          </h1>

          {mode === 'signup' && (
            <label className="block">
              <span className="text-sm font-medium">Seu nome</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 focus-within:border-accent">
                <User className="size-4 text-fg-subtle" />
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 w-full bg-transparent text-sm outline-none"
                  placeholder="Como quer ser chamado"
                  autoComplete="name"
                />
              </div>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium">E-mail</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 focus-within:border-accent">
              <Mail className="size-4 text-fg-subtle" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full bg-transparent text-sm outline-none"
                placeholder="voce@email.com"
                autoComplete="email"
              />
            </div>
          </label>

          {mode !== 'reset' && (
            <label className="block">
              <span className="text-sm font-medium">Senha</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 focus-within:border-accent">
                <Lock className="size-4 text-fg-subtle" />
                <input
                  required
                  minLength={6}
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full bg-transparent text-sm outline-none"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="text-fg-subtle hover:text-fg"
                  aria-label={showPass ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>
          )}

          <Button type="submit" variant="brand" size="lg" className="w-full" loading={loading}>
            {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta e ganhar 20 créditos' : 'Enviar link'}
          </Button>

          <div className="flex items-center justify-between text-sm">
            {mode === 'login' ? (
              <>
                <button type="button" onClick={() => setMode('signup')} className="font-semibold text-accent hover:underline">
                  Criar conta grátis
                </button>
                <button type="button" onClick={() => setMode('reset')} className="text-fg-subtle hover:text-fg">
                  Esqueci a senha
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setMode('login')} className="font-semibold text-accent hover:underline">
                Já tenho conta
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
