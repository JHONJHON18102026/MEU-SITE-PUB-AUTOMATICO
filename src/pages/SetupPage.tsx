import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles, Zap } from 'lucide-react';
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
    <div className="relative mx-auto max-w-6xl px-6 py-10 lg:py-14">
      <div className="pointer-events-none absolute inset-x-1/3 top-0 h-72 rounded-full bg-brand/15 blur-3xl" />
      <div className="flex items-center justify-between gap-4">
        <BrandLogo />
        <Link
          to="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:border-accent/60"
        >
          <ArrowLeft className="size-4" /> Voltar para a prévia
        </Link>
      </div>
      <section className="relative mt-14 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-brand">
          <Sparkles className="size-3.5" /> FUTURO DIGITAL PRO
        </div>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Escolha o ritmo da sua produção.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-fg-muted">Mais créditos, mais velocidade e um fluxo completo para transformar ideias em campanhas prontas para publicar.</p>
      </section>

      <section className="relative mt-10 grid gap-4 lg:grid-cols-3">
        {[
          { name: 'Grátis', price: '30', caption: 'para experimentar', icon: Sparkles, items: ['30 créditos iniciais', 'Acesso à prévia do Studio', 'Galeria de projetos'], cta: 'Continuar na prévia' },
          { name: 'Pro', price: '10.000', caption: 'créditos por ciclo', icon: Zap, items: ['10.000 créditos', 'Imagens sem limite prático', 'Prioridade de processamento'], cta: 'Escolher Pro', featured: true },
          { name: 'Ilimitado', price: '∞', caption: 'produção contínua', icon: ShieldCheck, items: ['Imagens ilimitadas', 'Vídeos lower priority', 'Fluxo completo de produção'], cta: 'Escolher Ilimitado' },
        ].map((plan) => (
          <article key={plan.name} className={`relative flex flex-col rounded-3xl border p-6 text-left transition-colors ${plan.featured ? 'border-brand/70 bg-brand/[0.12] shadow-[0_0_50px_-20px_rgba(124,92,255,0.8)]' : 'border-border bg-surface/80 hover:border-brand/40'}`}>
            {plan.featured && <span className="absolute right-5 top-5 rounded-full bg-brand px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Mais escolhido</span>}
            <plan.icon className="size-5 text-brand" />
            <h2 className="mt-5 text-xl font-bold">{plan.name}</h2>
            <div className="mt-5 flex items-end gap-2"><span className="text-5xl font-black tracking-tight">{plan.price}</span><span className="pb-2 text-sm text-fg-muted">{plan.caption}</span></div>
            <ul className="mt-6 space-y-3 border-t border-border/70 pt-5 text-sm text-fg-muted">
              {plan.items.map((item) => <li key={item} className="flex items-center gap-2"><Check className="size-4 text-brand" />{item}</li>)}
            </ul>
            <Link to="/dashboard" className={`mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${plan.featured ? 'bg-brand text-white hover:bg-brand/90' : 'border border-border bg-surface-2 hover:border-brand/50'}`}>
              {plan.cta}<ArrowRight className="size-4" />
            </Link>
          </article>
        ))}
      </section>

      <section className="relative mt-10 rounded-3xl border border-border bg-surface/60 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-brand">Configuração técnica</p><h2 className="mt-2 text-xl font-bold">Ative o ambiente completo quando estiver pronto</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">As chaves privadas ficam somente no servidor. A prévia continua disponível enquanto a integração não é concluída.</p></div><ShieldCheck className="hidden size-6 text-brand sm:block" /></div>
        <ol className="mt-6 grid gap-3 md:grid-cols-2">
          {STEPS.map((s, i) => <li key={s.title} className="flex gap-3 rounded-2xl border border-border/70 bg-surface p-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span><div><div className="text-sm font-semibold">{s.title}</div><div className="mt-1 text-xs leading-5 text-fg-muted">{s.body}</div></div></li>)}
        </ol>
      </section>
    </div>
  );
}
