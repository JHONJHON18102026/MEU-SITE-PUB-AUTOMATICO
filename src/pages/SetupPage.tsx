import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/ui/Brand';

const STEPS = [
  {
    title: 'Abra o arquivo .env',
    body: 'Na pasta persona-studio, copie .env.example para .env. O arquivo .env não acompanha o pacote por segurança.',
  },
  {
    title: 'Cole as chaves do Supabase',
    body: 'Supabase > Project Settings > API: copie "Project URL", "anon public" e "service_role".',
  },
  {
    title: 'Cole a chave da Gemini',
    body: 'Em aistudio.google.com/apikey crie uma chave e cole em GEMINI_API_KEY.',
  },
  {
    title: 'Crie as tabelas',
    body: 'Copie o conteúdo de supabase/migrations/0001_init.sql e cole no Supabase > SQL Editor > Run.',
  },
  {
    title: 'Reinicie o sistema',
    body: 'Feche o terminal e rode "npm run dev" de novo. Para conferir tudo, rode "npm run check".',
  },
];

/** Mostrada quando o .env ainda não tem as chaves públicas do Supabase. */
export function SetupPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <div className="flex items-center justify-between gap-4">
        <BrandLogo />
        <Link
          to="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:border-accent/60"
        >
          <ArrowLeft className="size-4" /> Voltar para a prévia
        </Link>
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tight">Falta só ligar as chaves</h1>
      <p className="mt-2 text-fg-muted">
        O sistema está em Modo Prévia porque as chaves privadas ainda não foram configuradas. Siga os 5 passos para ativar banco e IA; até lá, a prévia local continua disponível:
      </p>
      <ol className="mt-8 space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">
              {i + 1}
            </span>
            <div>
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-fg-muted">{s.body}</div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-fg-subtle">
        Segurança: as chaves "service_role" e "GEMINI_API_KEY" ficam só no servidor e nunca aparecem no navegador.
      </p>
    </div>
  );
}
