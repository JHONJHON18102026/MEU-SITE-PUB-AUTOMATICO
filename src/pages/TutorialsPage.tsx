import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight, BookOpen, CheckCircle2, Play, Search } from 'lucide-react';
import { TUTORIAL_ARTICLES, type TutorialArticle } from '@shared/ugcCatalog';
import { Modal } from '@/components/ui/Modal';

const CATEGORIES = ['Todos', 'Primeiros passos', 'Influencer IA', 'AI UGC', 'VIRAL', 'Studio'] as const;

const VIDEO_BY_SLUG: Record<string, string> = {
  'primeiros-passos': '/tutorials/primeiros-passos.webm',
  projetos: '/tutorials/projetos.webm',
  'influencer-ia': '/tutorials/influencer-ia.webm',
  'motion-control': '/tutorials/controle-de-movimento.webm',
  'ai-ugc-ads': '/tutorials/ai-ugc-ads.webm',
  'ai-ugc-link': '/tutorials/ai-ugc-link.webm',
  'ai-ugc-personagem-falante': '/tutorials/ai-ugc-falante.webm',
  'ai-ugc-hook-demo': '/tutorials/ai-ugc-hook-demo.webm',
  'ai-ugc-slideshows': '/tutorials/ai-ugc-slideshows.webm',
  'biblioteca-viral': '/tutorials/biblioteca-viral.webm',
  'remake-viral': '/tutorials/clonar-anuncio.webm',
  'studio-marca-e-massa': '/tutorials/studio-brandbook.webm',
  'studio-agenda-e-legendas': '/tutorials/studio-publicacao-agenda.webm',
  'studio-comece-aqui': '/tutorials/studio-comece-aqui.webm',
  'studio-criar-videos': '/tutorials/studio-criar-videos.webm',
  'studio-montagem-video': '/tutorials/studio-detalhe-do-video.webm',
  'studio-aquecimento': '/tutorials/studio-aquecimento.webm',
  'studio-contas': '/tutorials/studio-contas.webm',
  'studio-pov-monetiza': '/tutorials/studio-pov.webm',
  'studio-automatico': '/tutorials/studio-automatico.webm',
  'studio-celular-desktop': '/tutorials/studio-celular-desk.webm',
};

export function TutorialsPage() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('Todos');
  const [search, setSearch] = useState('');
  const [openArticle, setOpenArticle] = useState<TutorialArticle | null>(null);

  const filtered = TUTORIAL_ARTICLES.filter((a) => {
    if (cat !== 'Todos' && a.category !== cat) return false;
    if (search.trim() && !`${a.title} ${a.summary}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const grouped = CATEGORIES.slice(1)
    .map((category) => ({ category, articles: filtered.filter((article) => article.category === category) }))
    .filter((group) => group.articles.length > 0);

  return (
      <div className="premium-workspace mx-auto w-full max-w-[1800px] space-y-6 px-5 py-7 xl:px-8">
      <div className="relative min-h-[190px] overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_90%_10%,rgba(56,189,248,.24),transparent_40%),linear-gradient(135deg,#111a2f,#131024)] p-6 shadow-[0_24px_60px_rgba(13,89,120,.2)] md:min-h-[220px] md:p-8">
        <img src="/showcase/guide-overview-new.png" alt="" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[48%] object-cover object-center opacity-65 mix-blend-screen" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-3/5 bg-gradient-to-l from-transparent via-[#111a2f]/75 to-[#111a2f]" />
        <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative max-w-xl">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-light">FUTURO DIGITAL · APRENDA O FLUXO</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Central de Tutoriais</h1>
        <p className="mt-1 text-xs text-fg-muted">
          Passo a passo direto ao ponto de cada ferramenta do FUTURO DIGITAL Studio.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] font-semibold text-white/75"><Play className="size-3.5 text-accent-light" /> Aprenda fazendo, dentro do próprio Studio</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex h-10 min-w-56 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-3 shadow-sm">
          <Search className="size-4 text-fg-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tutorial (ex.: link, falante, avatar)…"
            className="h-9 w-full bg-transparent text-xs outline-none"
          />
        </div>
        <div className="premium-tabbar inline-flex h-10 max-w-full items-center gap-1 overflow-x-auto rounded-xl p-1 shadow-sm thin-scroll">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={clsx(
                'rounded-[6px] px-2.5 py-1.5 text-xs font-medium transition-colors',
                cat === c ? 'bg-bg text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-7">
        {(cat === 'Todos' ? grouped : [{ category: cat, articles: filtered }]).map((group) => (
          <section key={group.category}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-bold tracking-tight">{group.category}</h2>
                <p className="mt-0.5 text-xs text-fg-muted">Guias rápidos para usar esta parte do Studio.</p>
              </div>
              <span className="rounded-full bg-accent-soft px-2 py-1 text-[10px] font-bold text-accent">{group.articles.length} guias</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.articles.map((art) => (
                <div key={art.slug} className="group flex min-h-[206px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-[0_12px_30px_rgba(0,0,0,.14)] transition duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_20px_44px_rgba(0,0,0,.25)]">
                  {VIDEO_BY_SLUG[art.slug] && (
                    <div className="relative aspect-video w-full overflow-hidden bg-[#0d0c14] ring-1 ring-inset ring-white/5">
                      <video className="h-full w-full object-cover" controls preload="metadata" playsInline aria-label={`Vídeo tutorial: ${art.title}`}>
                        <source src={VIDEO_BY_SLUG[art.slug]} type="video/webm" />
                      </video>
                    </div>
                  )}
                  <div className="relative flex h-16 items-center justify-between overflow-hidden bg-gradient-to-br from-[#25183b] via-[#39216b] to-[#11131a] px-4">
                    <span className="absolute -right-5 -top-8 size-28 rounded-full bg-[#8b5cf6]/25 blur-2xl transition group-hover:bg-[#8b5cf6]/40" />
                    <span className="relative inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold text-white/90">
                      <Play className="size-3 fill-current" /> {VIDEO_BY_SLUG[art.slug] ? 'GUIA EM VÍDEO' : 'GUIA PASSO A PASSO'}
                    </span>
                    <span className="relative rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80">{art.readTime}</span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between text-xs text-accent font-bold">
                <span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" /> {art.category}</span>
                <span className="text-fg-subtle">{art.readTime}</span>
              </div>
              <h2 className="mt-2 text-base font-bold">{art.title}</h2>
              <p className="mt-1 text-xs text-fg-muted">{art.summary}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setOpenArticle(art)}
                className="text-xs font-bold text-accent hover:underline"
              >
                Ler passo a passo
              </button>
              <Link to={art.to} className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg">
                Abrir ferramenta <ArrowRight className="size-3.5" />
              </Link>
            </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Modal open={Boolean(openArticle)} onClose={() => setOpenArticle(null)} title={openArticle?.title ?? ''} size="lg">
        {openArticle && (
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">{openArticle.summary}</p>
            <ol className="space-y-2.5">
              {openArticle.steps.map((s, idx) => (
                <li key={s.title} className="flex gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{idx + 1}</span>
                  <div>
                    <div className="text-sm font-bold">{s.title}</div>
                    <div className="text-xs text-fg-muted">{s.body}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="rounded-xl bg-accent-soft p-3 text-xs space-y-1">
              <div className="font-bold text-accent">Dicas rápidas</div>
              {openArticle.tips.map((tip) => (
                <div key={tip} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
            <Link
              to={openArticle.to}
              onClick={() => setOpenArticle(null)}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white"
            >
              Ir para {openArticle.category} <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
