import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  Film,
  FolderOpen,
  Images,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AvatarGenerationHistory } from '@/features/avatars/Gallery';
import { useGenerations } from '@/features/avatars/useAvatarData';
import { usePreviewProjects, useProjectsData } from '@/features/projects/previewProjectsStore';
import { api, ApiClientError } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSession } from '@/store/session';
import type { VideoProjectDTO } from '@shared/ugcContracts';

type ProjectFilter = 'all' | 'history' | 'done' | 'processing' | 'slideshow' | 'talking';
type HistoryStatusFilter = 'all' | 'done' | 'processing' | 'failed';

type ReferenceAsset = { kind?: string; name?: string; url?: string | null };
type MotionVideoAsset = { name?: string; url?: string | null };
type DirectorQuality = {
  overall?: 'approved' | 'needs-review';
  checkedAt?: string;
  checks?: { label?: string; status?: 'passed' | 'warning' | 'failed'; detail?: string }[];
};

function getReferenceAssets(project: VideoProjectDTO): ReferenceAsset[] {
  const raw = project.params?.reference_assets;
  if (!Array.isArray(raw)) return [];
  return raw.filter((asset): asset is ReferenceAsset => Boolean(asset && typeof asset === 'object'));
}

function getMotionVideoAsset(project: VideoProjectDTO): MotionVideoAsset | null {
  const raw = project.params?.motion_video_asset;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as MotionVideoAsset;
}

function getDirectorQuality(project: VideoProjectDTO): DirectorQuality | null {
  const raw = project.params?.director_quality;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as DirectorQuality;
}

function referenceKindLabel(kind?: string) {
  if (kind === 'frame-inicial') return 'Frame inicial';
  if (kind === 'frame-final') return 'Frame final';
  if (kind === 'elemento') return 'Elemento';
  return 'Imagem enviada';
}

function projectEngineLabel(project: VideoProjectDTO) {
  const actual = project.params?.actual_engine;
  if (actual === 'veo-3.1-lowerpriority' || actual === 'lowerpriority') return 'Veo 3.1 · lower priority';
  if (actual === 'veo-3.1-fast') return 'Veo 3.1 Fast';
  if (actual === 'omni-flash') return 'Omni Flash 1.2';
  return 'Não registrado (projeto antigo)';
}

function projectBilledCost(project: VideoProjectDTO): number | null {
  const billed = project.params?.billing_cost;
  if (typeof billed === 'number' && Number.isFinite(billed)) return billed;
  if (project.mode !== 'image-ad' && project.mode !== 'slideshow') return null;
  return project.cost;
}

function projectEngineAccountLabel(project: VideoProjectDTO) {
  const account = project.params?.engine_account;
  if (account === 'conta_1') return 'Conta 1 · Omni Flash';
  if (account === 'conta_2') return 'Conta 2 · lower priority';
  if (account === 'conta_3') return 'Conta 3 · lower priority';
  return 'Não registrada (projeto antigo)';
}

const MODE_LABEL: Record<string, string> = {
  ads: 'ADS',
  link: 'LINK',
  talking: 'Falante',
  hook: 'Hook+Demo',
  slideshow: 'Slideshow',
  motion: 'Motion',
  'image-ad': 'Image Ad',
  remake: 'Remake',
  studio: 'Studio',
};

export function ProjectsPage() {
  const { projects, loading, error, reload, loadMore, hasMore } = useProjectsData();
  const history = useGenerations();
  const { retryPreviewScene, deletePreviewProject } = usePreviewProjects();
  const setBalance = useSession((s) => s.setBalance);

  const [searchParams, setSearchParams] = useSearchParams();
  const readFilter = (value: string | null): ProjectFilter => value === 'history' || value === 'done' || value === 'processing' || value === 'slideshow' || value === 'talking' ? value : 'all';
  const [tab, setTab] = useState<ProjectFilter>(() => readFilter(searchParams.get('filter')));
  const [historyStatus, setHistoryStatus] = useState<HistoryStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [bannerVisible, setBannerVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openProject, setOpenProject] = useState<VideoProjectDTO | null>(null);
  const [retryingIdx, setRetryingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!openProject) return;
    const fresh = projects.find((project) => project.id === openProject.id);
    if (fresh) setOpenProject(fresh);
  }, [projects, openProject?.id]);

  function selectFilter(next: ProjectFilter) {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('filter');
    else params.set('filter', next);
    setSearchParams(params, { replace: true });
  }

  const counts = {
    all: projects.length,
    history: history.data.length,
    done: projects.filter((p) => p.status === 'done').length,
    processing: projects.filter((p) => p.status === 'processing').length,
    slideshow: projects.filter((p) => p.mode === 'slideshow').length,
    talking: projects.filter((p) => p.mode === 'talking').length,
  };

  const filtered = projects.filter((p) => {
    if (tab === 'done' && p.status !== 'done') return false;
    if (tab === 'processing' && p.status !== 'processing') return false;
    if (tab === 'slideshow' && p.mode !== 'slideshow') return false;
    if (tab === 'talking' && p.mode !== 'talking') return false;
    if (search.trim() && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const filteredHistory = history.data.filter((generation) => {
    if (historyStatus !== 'all' && generation.status !== historyStatus) return false;
    if (!search.trim()) return true;
    const params = generation.params as { mode?: string; prompt?: string };
    return `${params.prompt ?? ''} ${params.mode ?? ''}`.toLowerCase().includes(search.toLowerCase());
  });
  const historyStatusCounts: Record<HistoryStatusFilter, number> = {
    all: history.data.length,
    done: history.data.filter((generation) => generation.status === 'done').length,
    processing: history.data.filter((generation) => generation.status === 'processing').length,
    failed: history.data.filter((generation) => generation.status === 'failed').length,
  };

  function toggleSelectAll() {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map((p) => p.id));
  }

  async function handleRetryScene(project: VideoProjectDTO, sceneIndex: number) {
    if (project.is_preview || !isSupabaseConfigured) {
      retryPreviewScene(project.id, sceneIndex);
      setOpenProject((curr) =>
        curr && curr.id === project.id
          ? { ...curr, status: 'done', scenes: curr.scenes.map((s) => (s.index === sceneIndex ? { ...s, status: 'done', error: null } : s)) }
          : curr,
      );
      toast.success(`Cena #${sceneIndex + 1} atualizada na prévia.`);
      return;
    }
    setRetryingIdx(sceneIndex);
    try {
      const res = await api.retryProjectScene(project.id, sceneIndex);
      setBalance(res.balance);
      setOpenProject(res.project);
      await reload();
      toast.success(`Cena #${sceneIndex + 1} gerada novamente!`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Falha ao refazer a cena.');
    } finally {
      setRetryingIdx(null);
    }
  }

  async function handleDelete(project: VideoProjectDTO) {
    if (!window.confirm(`Apagar o projeto "${project.title}"?`)) return;
    if (project.is_preview || !isSupabaseConfigured) {
      deletePreviewProject(project.id);
      if (openProject?.id === project.id) setOpenProject(null);
      toast.success('Projeto removido.');
      return;
    }
    try {
      await api.deleteProject(project.id);
      if (openProject?.id === project.id) setOpenProject(null);
      await reload();
      toast.success('Projeto apagado.');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Não consegui apagar.');
    }
  }

  const TABS: { id: ProjectFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'done', label: 'Concluídos', count: counts.done },
    { id: 'processing', label: 'Processando', count: counts.processing },
    { id: 'slideshow', label: 'Slideshows', count: counts.slideshow },
    { id: 'talking', label: 'Personagem Falante', count: counts.talking },
    { id: 'history', label: 'Histórico', count: counts.history },
  ];

  return (
    <div className="premium-workspace mx-auto w-full max-w-[1280px] space-y-6 px-6 pb-8 pt-8">
      {/* Cabeçalho limpo da área de projetos. */}
      <div className="relative min-h-[220px] overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_90%_15%,rgba(56,189,248,.24),transparent_42%),linear-gradient(135deg,#111a2f,#131024)] p-7 shadow-[0_28px_80px_rgba(13,89,120,.22)] md:min-h-[270px] md:p-9">
        <img src="/showcase/internal-studio-new.png" alt="" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[54%] object-cover object-center opacity-60 mix-blend-screen" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-transparent via-[#111a2f]/52 to-[#111a2f]" />
        <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-light">FUTURO DIGITAL · PRODUÇÃO</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-fg md:text-5xl">Meus Projetos</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-fg-muted">Todo vídeo e criativo gerado no estúdio fica salvo aqui, pronto para revisar, baixar e publicar.</p>
        </div>
        {bannerVisible && (
          <div className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-1.5 text-[11px] text-fg-muted">
            <AlertTriangle className="size-3.5 shrink-0 text-cyan-200" />
            <span>Sem agendamento expiram em <strong className="text-fg">14 dias</strong>.</span>
            <button type="button" onClick={() => setBannerVisible(false)} aria-label="Fechar aviso" className="opacity-75 hover:opacity-100">
              <X className="size-3" />
            </button>
          </div>
        )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'No workspace', value: counts.all, tone: 'from-accent/20 to-surface', icon: FolderOpen },
          { label: 'Concluídos', value: counts.done, tone: 'from-success/15 to-surface', icon: CheckCircle2 },
          { label: 'Em andamento', value: counts.processing, tone: 'from-cyan-300/15 to-surface', icon: Clock },
        ].map(({ label, value, tone, icon: Icon }) => (
          <div key={label} className={`flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br ${tone} px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,.12)]`}>
            <span className="grid size-9 place-items-center rounded-xl bg-surface text-accent shadow-sm"><Icon className="size-4" /></span>
            <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle">{label}</div><div className="mt-0.5 text-lg font-black">{value}</div></div>
          </div>
        ))}
      </div>

      {/* Barra de ações dos projetos. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-guide-target="projects-tabs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-3 shadow-sm sm:w-80">
            <Search className="size-4 text-fg-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'history' ? 'Buscar geração...' : 'Buscar projeto...'}
              className="w-full bg-transparent text-sm outline-none placeholder:text-fg-subtle"
            />
          </div>
          {tab !== 'history' && (
            <Button variant="secondary" size="md" onClick={toggleSelectAll} disabled={!filtered.length}>
              {selectedIds.length === filtered.length && filtered.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>
          )}
          {isSupabaseConfigured && (
            <Button variant="ghost" size="md" onClick={() => void reload()}>
              <RefreshCcw className="size-4" /> Atualizar
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/studio/contas"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-surface px-4 text-sm font-medium text-fg shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-[var(--surface-hover)]"
          >
            <CalendarClock className="size-4 text-accent" /> Criar uma publicação
          </Link>
          <Link
            to="/ai-ugc/ads"
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-brand px-4 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(121,85,232,0.28)] transition hover:brightness-110"
          >
            <Plus className="size-4" /> Novo Projeto
          </Link>
        </div>
      </div>

      {/* Barra de abas em pílula escura. */}
      <div className="space-y-2.5">
        <div className="premium-tabbar inline-flex h-10 max-w-full flex-nowrap items-center overflow-x-auto rounded-xl p-1 text-fg-muted thin-scroll" role="tablist" aria-label="Projetos e histórico">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => selectFilter(t.id)}
              className={clsx(
                'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[6px] px-3 py-1 text-[13px] font-medium transition-all',
                tab === t.id ? 'bg-bg text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
              )}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        {tab === 'history' ? (
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrar histórico por status">
            {([
              ['all', 'Todos'],
              ['done', 'Concluídos'],
              ['processing', 'Processando'],
              ['failed', 'Falhados'],
            ] as const).map(([status, label]) => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={historyStatus === status}
                onClick={() => setHistoryStatus(status)}
                className={clsx(
                  'rounded-full border px-3 py-1.5 text-[11px] font-semibold transition',
                  historyStatus === status ? 'border-accent/50 bg-accent-soft text-accent' : 'border-border bg-surface text-fg-muted hover:text-fg',
                )}
              >
                {label} ({historyStatusCounts[status]})
              </button>
            ))}
            <span className="ml-auto text-xs text-fg-subtle">Exibindo {filteredHistory.length} de {history.data.length}</span>
          </div>
        ) : (
          <div className="text-xs text-fg-subtle">Total {filtered.length} itens</div>
        )}
      </div>

      {tab === 'history' ? (
        history.loading ? (
          <div className="skeleton h-40 rounded-2xl" />
        ) : history.error ? (
          <p className="text-sm text-danger">Erro ao carregar o histórico: {history.error}</p>
        ) : (
          <AvatarGenerationHistory items={filteredHistory} />
        )
      ) : <>
      {error && <p className="text-sm text-danger">Erro ao carregar projetos: {error}</p>}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton aspect-[9/14] rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="premium-empty flex flex-col items-center gap-3 rounded-2xl border border-dashed border-accent/30 py-16 text-center shadow-[0_16px_40px_rgba(0,0,0,.12)]">
          <FolderOpen className="size-8 text-fg-subtle" />
          <div className="text-sm font-semibold">Nenhum projeto encontrado neste filtro.</div>
          <Link to="/ai-ugc/ads" className="rounded-[8px] bg-brand px-4 py-2 text-xs font-semibold text-white">
            Criar primeiro vídeo no AI UGC
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" data-guide-target="projects-grid">
          {filtered.map((p) => {
            const selected = selectedIds.includes(p.id);
            const referenceCount = getReferenceAssets(p).length;
            return (
              <div
                key={p.id}
                className={clsx(
                  'group relative overflow-hidden rounded-2xl border bg-surface shadow-[0_12px_30px_rgba(0,0,0,.14)] transition duration-200 hover:-translate-y-1',
                  selected ? 'border-accent ring-brand' : 'border-white/10 hover:border-accent/45',
                )}
              >
                <button type="button" onClick={() => setOpenProject(p)} className="relative block w-full text-left">
                  {p.status === 'done' && p.video_url && p.mode !== 'image-ad' && p.mode !== 'slideshow' && !p.is_preview ? (
                    <video
                      src={p.video_url}
                      poster={p.thumbnail_url || '/showcase/modelo-01.webp'}
                      muted
                      playsInline
                      preload="none"
                      aria-label={`Quadro do vídeo ${p.title}`}
                      onLoadedMetadata={(event) => { event.currentTarget.currentTime = Math.min(0.5, event.currentTarget.duration || 0); }}
                      className="aspect-[9/14] w-full object-cover object-top"
                    />
                  ) : (
                    <img
                      src={p.thumbnail_url || '/showcase/modelo-01.webp'}
                      alt={p.title}
                      className={clsx('aspect-[9/14] w-full object-cover object-top', p.status === 'failed' && 'opacity-40 grayscale')}
                    />
                  )}
                  <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
                    <span className="rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                      {MODE_LABEL[p.mode] ?? p.mode.toUpperCase()}
                    </span>
                    {p.is_preview && (
                      <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-white">Prévia local</span>
                    )}
                    {referenceCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white" title={`${referenceCount} referência(s) anexada(s)`}>
                        <Images className="size-3" /> {referenceCount} ref.
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      {p.status === 'done' && <CheckCircle2 className="size-3.5 text-success" />}
                      {p.status === 'processing' && <Clock className="size-3.5 animate-spin text-accent" />}
                      {p.status === 'failed' && <AlertTriangle className="size-3.5 text-danger" />}
                      <span className="text-white">
                        {p.status === 'done' ? 'Concluído' : p.status === 'processing' ? 'Processando…' : 'Falhou'}
                      </span>
                      <span className="ml-auto text-white/75">{p.scene_count} cena(s)</span>
                    </div>
                    <div className="mt-1 truncate text-sm font-bold text-white">{p.title}</div>
                  </div>
                </button>
                <div className="grid grid-cols-2 gap-1 border-t border-border p-1.5">
                  <button
                    type="button"
                    onClick={() => setOpenProject(p)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg"
                  >
                    <Film className="size-3.5 text-accent" /> Ver cenas e referências
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(p)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold text-fg-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="size-3.5" /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && hasMore && (
        <div className="flex justify-center pt-1">
          <Button variant="secondary" onClick={() => void loadMore()}>
            Carregar mais projetos
          </Button>
        </div>
      )}
      </>}

      <Modal open={Boolean(openProject)} onClose={() => setOpenProject(null)} title={openProject?.title ?? ''} size="xl">
        {openProject && (() => {
          const isImageBatch = openProject.mode === 'slideshow' || openProject.mode === 'image-ad';
          const hasDownload = Boolean(openProject.video_url);
          const referenceAssets = getReferenceAssets(openProject);
          const motionVideoAsset = getMotionVideoAsset(openProject);
          const directorQuality = getDirectorQuality(openProject);
          return (
            <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
              <div className="space-y-3">
                {openProject.video_url && !isImageBatch ? (
                  <>
                    <video src={openProject.video_url} controls className="aspect-[9/16] w-full rounded-2xl bg-black" />
                    <p className="text-[10px] leading-4 text-fg-subtle">
                      Duração validada: {openProject.scenes.reduce((total, scene) => total + (scene.duration_seconds || 0), 0)}s. O controle do navegador pode arredondar a contagem visual para baixo.
                    </p>
                  </>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-2">
                    <img
                      src={openProject.video_url || openProject.thumbnail_url}
                      alt={openProject.title}
                      className="aspect-[9/14] w-full object-cover object-top"
                    />
                    <div className="p-3 text-xs text-fg-muted">
                      {openProject.is_preview
                        ? 'Modo prévia local: estrutura e prévias salvas; preencha sua GEMINI_API_KEY para renderizar os arquivos finais.'
                        : isImageBatch
                          ? 'Imagens geradas e salvas com a marca FUTURO DIGITAL.'
                          : 'Quando todas as cenas concluírem, o player aparece aqui automaticamente.'}
                    </div>
                  </div>
                )}
                {hasDownload && openProject.video_url && (
                  <a
                    href={openProject.video_url}
                    download={`futuro-digital-${openProject.id.slice(0, 8)}.${isImageBatch ? 'png' : 'mp4'}`}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand text-xs font-bold text-white"
                  >
                    <Download className="size-4" /> {isImageBatch ? 'Baixar imagem principal' : 'Baixar vídeo final (MP4)'}
                  </a>
                )}
              </div>

              <div className="space-y-3">
                <section className="rounded-2xl border border-accent/25 bg-accent/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-fg"><Images className="size-4 text-accent" /> Referências anexadas</div>
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">{referenceAssets.length || '—'}</span>
                    </div>
                    {referenceAssets.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {referenceAssets.map((asset, index) => (
                          <div key={`${asset.name ?? 'reference'}-${index}`} className="overflow-hidden rounded-xl border border-border bg-surface-2">
                            {asset.url ? <img src={asset.url} alt={asset.name || `Referência ${index + 1}`} className="aspect-[3/4] w-full bg-black/20 object-contain" /> : <div className="grid aspect-[3/4] place-items-center text-[10px] text-fg-subtle">Prévia indisponível</div>}
                            <div className="p-2">
                              <div className="truncate text-[11px] font-semibold text-fg" title={asset.name}>{asset.name || `Referência ${index + 1}`}</div>
                              <div className="mt-0.5 text-[10px] text-fg-subtle">{referenceKindLabel(asset.kind)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] leading-4 text-fg-muted">Nenhuma referência foi registrada neste projeto. Novas gerações mostrarão aqui cada imagem anexada, com nome e tipo.</p>
                    )}
                  </section>
                {motionVideoAsset && (
                  <section className="rounded-2xl border border-accent/25 bg-accent/5 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-fg"><Film className="size-4 text-accent" /> Vídeo-base usado</div>
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 p-2">
                      <span className="truncate text-[11px] font-semibold text-fg" title={motionVideoAsset.name}>{motionVideoAsset.name || 'Vídeo-base'}</span>
                      {motionVideoAsset.url && <a href={motionVideoAsset.url} target="_blank" rel="noreferrer" className="shrink-0 text-[10px] font-bold text-accent hover:underline">Abrir</a>}
                    </div>
                  </section>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-fg-muted">
                  <span>Motor: <strong className="text-fg">{projectEngineLabel(openProject)}</strong></span>
                  <span>·</span>
                  <span>Itens: <strong className="text-fg">{openProject.scene_count}</strong></span>
                  <span>·</span>
                  <span>Custo: <strong className={projectBilledCost(openProject) === 0 ? 'text-success' : 'text-accent'}>{projectBilledCost(openProject) === null ? 'Não registrado' : projectBilledCost(openProject) === 0 ? '0 créditos (ilimitado)' : `${projectBilledCost(openProject)} créditos`}</strong></span>
                  <span>·</span>
                  <span>Conta: <strong className="text-fg">{projectEngineAccountLabel(openProject)}</strong></span>
                  {openProject.refunded > 0 && <span>· Estornado: <strong className="text-success">+{openProject.refunded}</strong></span>}
                </div>

                {directorQuality?.checks?.length ? (
                  <section className="rounded-2xl border border-white/10 bg-white/[.025] p-3">
                    <div className="flex items-center justify-between gap-3"><div className="text-xs font-bold text-fg">Análise do Diretor</div><span className={clsx('rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[.1em]', directorQuality.overall === 'approved' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>{directorQuality.overall === 'approved' ? 'Aprovado' : 'Revisar'}</span></div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">{directorQuality.checks.map((check, index) => <div key={`${check.label}-${index}`} className="rounded-xl border border-border bg-surface-2 p-2.5"><div className="flex items-center gap-1.5 text-[10px] font-bold">{check.status === 'passed' ? <CheckCircle2 className="size-3.5 text-success" /> : check.status === 'failed' ? <AlertTriangle className="size-3.5 text-danger" /> : <Clock className="size-3.5 text-warning" />}{check.label || 'Verificação'}</div><p className="mt-1 text-[10px] leading-4 text-fg-muted">{check.detail || 'Sem detalhes.'}</p></div>)}</div>
                  </section>
                ) : null}

                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 thin-scroll">
                  {openProject.scenes.map((sc) => (
                    <div key={sc.index} className="rounded-xl border border-border bg-surface-2 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-accent">
                          {isImageBatch ? `Arte #${sc.index + 1}` : `Cena #${sc.index + 1} · ${sc.duration_seconds}s validados`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={clsx('text-[11px] font-semibold', sc.status === 'done' ? 'text-success' : sc.status === 'failed' ? 'text-danger' : 'text-accent')}>
                            {sc.status === 'done' ? 'Pronta' : sc.status === 'failed' ? 'Falhou' : 'Renderizando…'}
                          </span>
                          {!isImageBatch && (
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={retryingIdx === sc.index}
                              onClick={() => void handleRetryScene(openProject, sc.index)}
                            >
                              <RefreshCcw className="size-3.5" /> Refazer cena
                            </Button>
                          )}
                        </div>
                      </div>
                      {sc.headline && <div className="mt-1 text-xs font-bold">{sc.headline}</div>}
                      <p className="mt-1 text-xs">{sc.text}</p>
                      {sc.action && <p className="mt-1 text-[11px] text-fg-muted">Ação: {sc.action}</p>}
                      {sc.error && <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 p-2 text-[11px] leading-4 text-danger">Detalhe: {sc.error}</p>}
                      {sc.image_url && (
                        <img src={sc.image_url} alt="" className="mt-2 h-24 rounded-lg object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
