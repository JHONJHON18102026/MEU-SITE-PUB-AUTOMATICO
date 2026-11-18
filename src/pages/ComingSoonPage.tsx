import { Link, useSearchParams } from 'react-router-dom';
import { Construction } from 'lucide-react';
import clsx from 'clsx';

const UGC_TABS = [
  { id: 'ads', label: 'ADS', desc: 'Assistente em 8 etapas (60 modelos virais, produto, cenas, voz e trilha)' },
  { id: 'link', label: '1 LINK = ANÚNCIO', desc: 'Cole a URL do produto: a IA lê imagens, texto e cores para montar o vídeo' },
  { id: 'talking', label: 'PERSONAGEM FALANTE', desc: 'Coloque seu avatar falando o roteiro com sincronia labial' },
  { id: 'hook', label: 'HOOK + DEMO', desc: 'Gancho viral automático seguido de demonstração do produto' },
  { id: 'slideshows', label: 'SLIDESHOWS', desc: 'Sequência animada de fotos com texto sincronizado para Reels e TikTok' },
];

const ROADMAP: Record<string, { title: string; delivery: string; items: string[] }> = {
  '/projects': {
    title: 'Projetos',
    delivery: 'Entrega 2',
    items: ['Lista de vídeos com status (processando, concluído, falhou)', 'Download e política de armazenamento (14 dias)', 'Filtros por tipo e pesquisa'],
  },
  '/ai-ugc': {
    title: 'AI UGC Creator',
    delivery: 'Entrega 2',
    items: ['Assistente de 8 etapas (modelo, imagem, ação, cenas, fala, voz, música, resumo)', 'Biblioteca de modelos virais e criação 1 Link = Anúncio', 'Geração de vídeo por cena com Veo'],
  },
  '/image-ads': {
    title: 'Image Ads',
    delivery: 'Entrega 3',
    items: ['Anúncios estáticos de alta conversão com IA a partir de produto e cena', 'Escolha rápida de proporção (1:1, 9:16, 4:3)', 'Aplicação automática da identidade FUTURO DIGITAL'],
  },
  '/viral': {
    title: 'VIRAL',
    delivery: 'Entrega 4',
    items: ['Perfis e produtos em alta (TikTok Shop e Reels)', 'Nota de projeção viral (0–100)', 'Pastas e clonagem de estratégia'],
  },
  '/studio': {
    title: 'Studio',
    delivery: 'Entrega 5',
    items: ['Painel de métricas das contas', 'Publicação e agendamento nas redes', 'Brandbook gerado por IA e planos'],
  },
};

/** Tela honesta para áreas que chegam nas próximas entregas (cada rota/aba exibe o foco exato). */
export function ComingSoonPage({ path }: { path: string }) {
  const [params, setParams] = useSearchParams();
  const activeTab = params.get('tab') || 'ads';
  const info = ROADMAP[path];
  const ugcDetail = path === '/ai-ugc' ? UGC_TABS.find((t) => t.id === activeTab) ?? UGC_TABS[0] : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-14 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft">
        <Construction className="size-7 text-accent" />
      </div>
      <h1 className="mt-5 text-2xl font-black">{ugcDetail ? `AI UGC · ${ugcDetail.label}` : (info?.title ?? 'Em construção')}</h1>
      <p className="mt-2 text-fg-muted">
        Esta área chega na <strong className="text-fg">{info?.delivery ?? 'próxima entrega'}</strong>.{' '}
        {ugcDetail ? ugcDetail.desc : 'O que entra nela:'}
      </p>

      {path === '/ai-ugc' && (
        <div className="mt-6 flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Modos do AI UGC">
          {UGC_TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setParams({ tab: t.id })}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                activeTab === t.id ? 'bg-brand text-white' : 'border border-border bg-surface text-fg-muted hover:text-fg',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <ul className="mx-auto mt-6 max-w-md space-y-2 text-left">
        {info?.items.map((i) => (
          <li key={i} className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">{i}</li>
        ))}
      </ul>
      <Link to="/avatars" className="mt-8 inline-flex h-10 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white glow-brand">
        Enquanto isso, crie seu Influencer IA
      </Link>
    </div>
  );
}
