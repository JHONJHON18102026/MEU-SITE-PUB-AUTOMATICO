import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Globe2,
  History,
  ImageOff,
  Layers,
  Plus,
  RefreshCcw,
  ScanFace,
  Search,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import type { AvatarDTO } from '@shared/contracts';
import type { AttributeSelection } from '@shared/attributes';
import type { GenerationDTO } from '@shared/contracts';
import { useAvatarStudio, type GalleryTab } from './avatarStore';
import { useCommunityAvatars, useGenerations, useMyAvatars } from './useAvatarData';
import { AvatarDetailModal } from './AvatarDetailModal';
import { SHOWCASE_AVATARS } from './showcaseExamples';

const TABS: { id: GalleryTab; label: string; icon: typeof Compass }[] = [
  { id: 'explore', label: 'Explorar', icon: Compass },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'mine', label: 'Meus avatares', icon: UserRound },
];

function ratioClass(r: string) {
  return r === '1:1' ? 'aspect-square' : r === '16:9' ? 'aspect-video' : r === '4:3' ? 'aspect-[4/3]' : r === '3:4' ? 'aspect-[3/4]' : 'aspect-[9/16]';
}

export function GalleryTabs() {
  const { tab, set } = useAvatarStudio();
  const mine = useMyAvatars();
  return (
    <div className="flex items-center gap-1.5" role="tablist" aria-label="Visualização da galeria">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => set({ tab: t.id })}
          className={clsx(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            tab === t.id ? 'bg-surface-3 text-fg' : 'text-fg-muted hover:text-fg',
          )}
        >
          <t.icon className="size-3.5" />
          {t.label}
          {t.id === 'mine' && mine.data.length > 0 && <span className="text-[11px] opacity-75">{mine.data.length}</span>}
        </button>
      ))}
    </div>
  );
}

export function ExploreSubTabs() {
  const { exploreSub, set } = useAvatarStudio();
  const community = useCommunityAvatars();
  return (
    <div className="inline-flex rounded-full bg-surface-2 p-1 text-xs font-semibold ring-1 ring-inset ring-border" role="tablist" aria-label="Filtro de explorar">
      <button
        role="tab"
        aria-selected={exploreSub === 'modelos'}
        onClick={() => set({ exploreSub: 'modelos' })}
        className={clsx(
          'flex items-center gap-1.5 rounded-full px-4 py-1.5 transition',
          exploreSub === 'modelos' ? 'bg-brand text-white shadow-sm' : 'text-fg-muted hover:text-fg',
        )}
      >
        <Sparkles className="size-3.5" /> Modelos ({SHOWCASE_AVATARS.length})
      </button>
      <button
        role="tab"
        aria-selected={exploreSub === 'comunidade'}
        onClick={() => set({ exploreSub: 'comunidade' })}
        className={clsx(
          'flex items-center gap-1.5 rounded-full px-4 py-1.5 transition',
          exploreSub === 'comunidade' ? 'bg-brand text-white shadow-sm' : 'text-fg-muted hover:text-fg',
        )}
      >
        <Globe2 className="size-3.5" /> Comunidade ({community.data.length})
      </button>
    </div>
  );
}

function AvatarGrid({ items, pending, onOpen, emptyText }: { items: AvatarDTO[]; pending: number; onOpen: (a: AvatarDTO) => void; emptyText: string }) {
  const { aspectRatio, set } = useAvatarStudio();

  if (!items.length && !pending) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center text-xs text-fg-muted">
        <ImageOff className="size-8 text-fg-subtle" />
        {emptyText}
      </div>
    );
  }

  function handleUseBase(a: AvatarDTO) {
    set({ baseAvatar: a, basePhoto: null });
    toast.success(`Rosto "${a.name}" carregado no slot AVATAR.`);
  }

  function handleRecreate(a: AvatarDTO) {
    set({
      selection: (a.attributes ?? {}) as AttributeSelection,
      aspectRatio: (a.aspect_ratio as typeof aspectRatio) ?? '9:16',
      panelTab: 'create',
    });
    toast.success(`Características de "${a.name}" carregadas no painel esquerdo.`);
  }

  return (
    <div className="columns-2 gap-2.5 sm:columns-3 lg:columns-5 [&>*]:mb-2.5" data-testid="avatar-grid">
      {Array.from({ length: pending }).map((_, i) => (
        <div key={`p${i}`} className={clsx('skeleton break-inside-avoid rounded-2xl', ratioClass(aspectRatio))} aria-label="Gerando imagem" role="status">
          <div className="flex h-full items-end p-3 text-xs font-semibold text-fg-muted">Gerando com IA…</div>
        </div>
      ))}
      {items.map((a) => (
        <div key={a.id} className="group relative break-inside-avoid overflow-hidden rounded-2xl border border-accent/20 bg-[linear-gradient(145deg,#1a1629,#111019)] shadow-[0_14px_34px_rgba(0,0,0,.2)] transition duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_22px_48px_rgba(72,42,150,.3)]">
          <button type="button" onClick={() => onOpen(a)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <img src={a.image_url} alt={a.name} loading="lazy" className={clsx('w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]', ratioClass(a.aspect_ratio))} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="pointer-events-none absolute bottom-2.5 left-3 right-24 truncate text-xs font-semibold text-white opacity-90">
              {a.name}
            </div>
          </button>
          <div className="absolute right-2 top-2 flex flex-col gap-1.5 md:opacity-0 md:transition md:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => handleUseBase(a)}
              className="grid size-8 place-items-center rounded-lg bg-black/65 text-white backdrop-blur hover:bg-black"
              title="Usar este rosto como base"
              aria-label={`Usar rosto ${a.name}`}
            >
              <ScanFace className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleRecreate(a)}
            className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-md transition md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
            title="Copiar características para o painel"
          >
            <RefreshCcw className="size-3" /> Recriar
          </button>
        </div>
      ))}
    </div>
  );
}

function HistoryList({ items }: { items: GenerationDTO[] }) {
  if (!items.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold text-fg">Você ainda não criou nenhum influencer</p>
        <p className="mt-1.5 max-w-md text-xs text-fg-muted">
          Escolha as opções no painel e clique em Gerar, ou recrie um modelo em Explorar.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl px-5 py-6">
      <ul className="space-y-2.5" data-testid="history-list">
        {items.map((g) => {
          const p = g.params as { mode?: string; prompt?: string; count?: number; aspectRatio?: string };
          return (
            <li key={g.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
              {g.status === 'done' ? (
                <CheckCircle2 className="size-5 shrink-0 text-success" />
              ) : g.status === 'failed' ? (
                <AlertTriangle className="size-5 shrink-0 text-danger" />
              ) : (
                <Clock className="size-5 shrink-0 animate-pulse text-accent" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {p.mode === 'prompt' && p.prompt ? p.prompt : 'Influencer por características'}
                </div>
                <div className="text-xs text-fg-subtle">
                  {new Date(g.created_at).toLocaleString('pt-BR')} · {p.count ?? 1} imagem(ns) · {p.aspectRatio}
                  {g.status === 'failed' && g.error ? ` · ${g.error}` : ''}
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold">{g.status === 'failed' ? 'estornado' : `-${g.cost}`}</div>
                <div className="text-fg-subtle">{g.result_count} pronta(s)</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Aba "Meus avatares" espelhada da tela Avatar Personalizado do Influai (Foto 3 + steps/2809). */
function MyAvatarsPanel({
  items,
  pending,
  loading,
  onOpen,
}: {
  items: AvatarDTO[];
  pending: number;
  loading: boolean;
  onOpen: (a: AvatarDTO) => void;
}) {
  const { set } = useAvatarStudio();
  const [groupView, setGroupView] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [styleType, setStyleType] = useState<'realista' | 'estilizado'>('realista');
  const [search, setSearch] = useState('');
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyFav, setOnlyFav] = useState(false);
  const [genderFilter, setGenderFilter] = useState('Todas');
  const [styleFilter, setStyleFilter] = useState('Todos');
  const [favIds, setFavIds] = useState<string[]>([]);

  const filteredCatalog = useMemo(() => {
    let list = SHOWCASE_AVATARS.filter((m) => {
      const types = m.attributes.characterType ?? [];
      if (styleType === 'estilizado' && !types.some((t) => t !== 'realista' && t !== 'socialite' && t !== 'milionario')) {
        return SHOWCASE_AVATARS.indexOf(m) % 2 === 1;
      }
      if (onlyFav && !favIds.includes(m.id)) return false;
      if (onlyNew && SHOWCASE_AVATARS.indexOf(m) > 5) return false;
      if (genderFilter !== 'Todas') {
        const g = (m.attributes.gender ?? []).join(' ').toLowerCase();
        if (genderFilter === 'Feminino' && !g.includes('feminino')) return false;
        if (genderFilter === 'Masculino' && !g.includes('masculino')) return false;
      }
      if (styleFilter !== 'Todos') {
        const hay = `${m.name} ${m.prompt}`.toLowerCase();
        if (!hay.includes(styleFilter.toLowerCase())) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!`${m.name} ${m.prompt}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (sortAsc) list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [styleType, onlyFav, onlyNew, genderFilter, styleFilter, search, sortAsc, favIds]);

  function toggleFav(id: string) {
    setFavIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="bg-bg">
      {/* Cabeçalho horizontal idêntico ao Influai */}
      <header className="border-b border-border bg-bg/95">
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <h2 className="text-lg font-semibold tracking-tight text-fg">Avatar Personalizado</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGroupView((v) => !v)}
              className={clsx(
                'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition',
                groupView ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-fg-muted hover:text-fg',
              )}
            >
              <Layers className="size-3.5" /> Visualização em grupo
            </button>
            <button
              type="button"
              onClick={() => setSortAsc((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-fg-muted hover:text-fg"
            >
              <ArrowUpDown className="size-3.5" /> {sortAsc ? 'A–Z' : 'Ordenar'}
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-6">
        {/* Card + Criar Avatar e grade de avatares criados pelo usuário (mantém data-testid="avatar-grid") */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          <button
            type="button"
            onClick={() => {
              set({ panelTab: 'create' });
              document.querySelector<HTMLElement>('[aria-label="Criar influencer"]')?.scrollIntoView({ behavior: 'smooth' });
              toast.info('Configure as características no painel esquerdo ou envie sua foto.');
            }}
            className="flex aspect-[3/4] flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border bg-surface/60 text-center transition hover:scale-[1.02] hover:border-accent/60"
          >
            <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
              <Plus className="size-5" />
            </span>
            <span className="text-xs font-semibold text-fg">Criar Avatar</span>
          </button>

          {loading && !pending ? (
            <div className="skeleton aspect-[3/4] rounded-xl" />
          ) : (
            <div className="contents" data-testid="avatar-grid">
              {Array.from({ length: pending }).map((_, i) => (
                <div key={`p${i}`} className="skeleton aspect-[3/4] rounded-xl" aria-label="Gerando imagem" role="status">
                  <div className="flex h-full items-end p-3 text-xs font-semibold text-fg-muted">Gerando…</div>
                </div>
              ))}
              {items.map((a) => (
                <div key={a.id} className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-accent/20 bg-[linear-gradient(145deg,#1a1629,#111019)] shadow-[0_12px_30px_rgba(0,0,0,.18)] transition duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_20px_44px_rgba(72,42,150,.28)]">
                  <button type="button" onClick={() => onOpen(a)} className="block h-full w-full text-left">
                    <img src={a.image_url} alt={a.name} className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-2.5">
                      <div className="truncate text-xs font-semibold text-white">{a.name}</div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Barra de catálogo Avatar Realista | Avatar Estilizado + Busca + Favoritos */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-surface-2 p-1 text-xs font-medium" role="tablist">
              {(
                [
                  ['realista', 'Avatar Realista'],
                  ['estilizado', 'Avatar Estilizado'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={styleType === id}
                  onClick={() => setStyleType(id)}
                  className={clsx(
                    'rounded-md px-3 py-1.5 transition',
                    styleType === id ? 'bg-bg text-fg shadow-sm font-semibold' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3">
              <Search className="size-3.5 text-fg-subtle" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, categoria ou estilo..."
                className="w-full bg-transparent text-xs outline-none placeholder:text-fg-subtle"
              />
            </div>

            <button
              type="button"
              onClick={() => setSortAsc((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-fg-muted hover:text-fg"
            >
              <ArrowUpDown className="size-3.5" /> Mais Variações
            </button>

            <button
              type="button"
              onClick={() => setOnlyNew((v) => !v)}
              className={clsx(
                'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition',
                onlyNew ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:text-fg',
              )}
            >
              <Flame className="size-3.5 text-accent" /> Novidades
            </button>

            <button
              type="button"
              onClick={() => setOnlyFav((v) => !v)}
              className={clsx(
                'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition',
                onlyFav ? 'bg-amber-500/15 text-amber-400' : 'text-fg-muted hover:text-fg',
              )}
            >
              <Star className={clsx('size-3.5', onlyFav && 'fill-amber-400')} /> Favoritos
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
              aria-label="Filtrar categoria"
              className="h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-fg outline-none"
            >
              <option value="Todos">Todos</option>
              <option value="Skincare">Skincare</option>
              <option value="Fitness">Fitness</option>
              <option value="Negócios">Negócios</option>
              <option value="Café">Café & Moda</option>
            </select>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              aria-label="Filtrar gênero"
              className="h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-fg outline-none"
            >
              <option value="Todas">Todas</option>
              <option value="Feminino">Feminino</option>
              <option value="Masculino">Masculino</option>
            </select>
          </div>

          <div className={clsx('grid gap-4', groupView ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6')}>
            {filteredCatalog.map((m, idx) => {
              const starred = favIds.includes(m.id);
              return (
                <div key={m.id} className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-accent/20 bg-[linear-gradient(145deg,#1a1629,#111019)] shadow-[0_12px_30px_rgba(0,0,0,.18)] transition duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_20px_44px_rgba(72,42,150,.28)]">
                  <button
                    type="button"
                    onClick={() => onOpen(m)}
                    className="block h-full w-full text-left"
                  >
                    <img src={m.image_url} alt={m.name} className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <div className="pointer-events-none absolute bottom-2.5 left-2.5 right-2.5">
                      <span className="inline-block rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white/85">
                        {idx < 2 ? '11 estilos' : `${Math.max(1, 9 - idx)} estilos`}
                      </span>
                      <div className="mt-1 truncate text-xs font-semibold text-white">{m.name.split('·')[0]?.trim()}</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFav(m.id)}
                    aria-label={`Favoritar ${m.name}`}
                    className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black"
                  >
                    <Star className={clsx('size-3.5', starred && 'fill-amber-400 text-amber-400')} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Gallery({ hideTabs, hideExploreSwitch }: { hideTabs?: boolean; hideExploreSwitch?: boolean }) {
  const { tab, exploreSub, set, pendingCount } = useAvatarStudio();
  const [open, setOpen] = useState<AvatarDTO | null>(null);
  const mine = useMyAvatars();
  const community = useCommunityAvatars();
  const history = useGenerations();

  return (
    <section aria-label="Galeria">
      {!hideTabs && <GalleryTabs />}

      <div className={clsx(!hideTabs && 'mt-4')}>
        {tab === 'explore' && (
          <div className="space-y-4">
            {!hideExploreSwitch && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-full bg-surface-2 p-1 text-xs font-semibold ring-1 ring-inset ring-border" role="tablist" aria-label="Filtro de explorar">
                  <button
                    role="tab"
                    aria-selected={exploreSub === 'modelos'}
                    onClick={() => set({ exploreSub: 'modelos' })}
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition',
                      exploreSub === 'modelos' ? 'bg-brand text-white shadow-sm' : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    <Sparkles className="size-3.5" /> Modelos ({SHOWCASE_AVATARS.length})
                  </button>
                  <button
                    role="tab"
                    aria-selected={exploreSub === 'comunidade'}
                    onClick={() => set({ exploreSub: 'comunidade' })}
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition',
                      exploreSub === 'comunidade' ? 'bg-brand text-white shadow-sm' : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    <Globe2 className="size-3.5" /> Comunidade ({community.data.length})
                  </button>
                </div>
                <span className="text-xs text-fg-subtle">
                  {exploreSub === 'modelos' ? 'Clique para abrir, usar como rosto base ou recriar' : 'Criações marcadas como públicas pelos usuários'}
                </span>
              </div>
            )}

            {exploreSub === 'modelos' ? (
              <AvatarGrid items={SHOWCASE_AVATARS} pending={0} onOpen={setOpen} emptyText="Sem modelos disponíveis." />
            ) : community.loading ? (
              <div className="skeleton h-64 rounded-2xl" />
            ) : (
              <AvatarGrid
                items={community.data}
                pending={0}
                onOpen={setOpen}
                emptyText="A Comunidade ainda está vazia. Para aparecer aqui, desmarque 'Criação privada' ao gerar."
              />
            )}
          </div>
        )}
        {tab === 'history' && (history.loading ? <div className="skeleton h-40 rounded-2xl" /> : <HistoryList items={history.data} />)}
        {tab === 'mine' && (
          <MyAvatarsPanel items={mine.data} pending={pendingCount} loading={mine.loading} onOpen={setOpen} />
        )}
        {(mine.error || community.error || history.error) && (
          <p className="mt-3 px-6 text-sm text-danger">Erro ao carregar: {mine.error || community.error || history.error}</p>
        )}
      </div>

      <AvatarDetailModal avatar={open} onClose={() => setOpen(null)} />
    </section>
  );
}
