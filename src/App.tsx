import { Zap, GitBranch, Database, Globe } from 'lucide-react';
import { ConnectionStatus } from './components/ConnectionStatus';
import { AuthPanel } from './components/AuthPanel';

export function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra superior */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              Meu Site
            </span>
          </div>
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-400">
            React + Vite + Vercel + Supabase
          </span>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          {/* Coluna Esquerda: Home Base */}
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300">
              Pronto para Deploy Automático
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Estrutura base limpa e conectada ao{' '}
              <span className="text-emerald-400">Supabase</span>.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-slate-400">
              Edite <code className="text-slate-200">src/App.tsx</code> pelo
              Antigravity, valide o código e envie ao GitHub. Cada atualização
              na branch <code className="text-slate-200">main</code> publica
              automaticamente uma nova versão na Vercel.
            </p>

            <ConnectionStatus />

            <div className="grid gap-4 pt-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-4">
                <GitBranch className="h-5 w-5 text-emerald-400" />
                <h3 className="mt-2.5 text-sm font-semibold text-white">
                  GitHub CI
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Validação automática de tipos, testes e build a cada push ou PR.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-4">
                <Globe className="h-5 w-5 text-emerald-400" />
                <h3 className="mt-2.5 text-sm font-semibold text-white">
                  Vercel Auto-Deploy
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Produção na branch main e links de Preview para branches de teste.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-4">
                <Database className="h-5 w-5 text-emerald-400" />
                <h3 className="mt-2.5 text-sm font-semibold text-white">
                  Supabase Seguro
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Autenticação pronta com bloqueio contra chaves secretas no cliente.
                </p>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Painel de Autenticação */}
          <div className="lg:col-span-5">
            <AuthPanel />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Template Base • GitHub + Vercel + Supabase
      </footer>
    </div>
  );
}

export default App;
