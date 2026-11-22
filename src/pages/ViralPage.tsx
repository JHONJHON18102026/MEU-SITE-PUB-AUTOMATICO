import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookmarkPlus,
  Flame,
  Folder,
  FolderPlus,
  Link2,
  Lock,
  Package,
  Plus,
  Repeat2,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StepGuideBanner } from '@/components/ui/StepGuideBanner';
import {
  MINED_PROFILES,
  VIRAL_FOLDER_FORMATS,
  VIRAL_TRENDING_VIDEOS,
} from '@shared/ugcCatalog';
import type { ViralItemDTO, ViralManifestDTO } from '@shared/ugcContracts';
import { EXAMPLE_VIRAL_LINKS, detectPlatformFromUrl } from '@/features/viral/viralCartridges';
import { useViralLibrary, useViralStore } from '@/features/viral/viralStore';
import { CuratedProfiles } from '@/features/viral/CuratedProfiles';

type ViralTab = 'trending' | 'products' | 'profiles' | 'folders';

export function ViralPage() {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { setRemakeSeed } = useViralStore();
  const {
    folders,
    items,
    loading,
    createFolder,
    toggleFolderFormat,
    deleteFolder,
    importReference,
    removeItem,
    analyzeManifest,
    reload: reloadLibrary,
    error: libraryError,
  } = useViralLibrary();

  const [searchParams, setSearchParams] = useSearchParams();
  const readTab = (value: string | null): ViralTab => value === 'products' || value === 'profiles' || value === 'folders' ? value : 'trending';
  const tab = readTab(searchParams.get('tab'));
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  const [importUrl, setImportUrl] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [importing, setImporting] = useState(false);

  const [search, setSearch] = useState('');
  const [manifestModal, setManifestModal] = useState<{ title: string; manifest: ViralManifestDTO } | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productMarket, setProductMarket] = useState('EUA e Brasil');
  const [productSort, setProductSort] = useState('score');

  function selectTab(next: ViralTab) {
    const params = new URLSearchParams(searchParams);
    if (next === 'trending') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  }

  const defaultFolder = folders[0] ?? null;
  const openFolder = folderId ? folders.find((f) => f.id === folderId) ?? null : null;
  const folderItems = openFolder ? items.filter((i) => i.folder_id === openFolder.id) : [];

  if (folderId && !loading && folders.length > 0 && !openFolder) {
    return <Navigate to="/viral" replace />;
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) {
      toast.error('Digite um nome para a pasta.');
      return;
    }
    const created = await createFolder(newFolderName.trim());
    if (created) {
      setNewFolderName('');
      setNewFolderOpen(false);
      navigate(`/viral/pasta/${created.id}`);
    }
  }

  async function handleImportByUrl() {
    if (!importUrl.trim()) {
      toast.error('Cole o link de um vídeo do TikTok, Instagram ou YouTube.');
      return;
    }
    const targetFolder = openFolder ?? defaultFolder;
    if (!targetFolder) return;
    setImporting(true);
    try {
      await importReference({
        folderId: targetFolder.id,
        title: importTitle.trim() || `Referência ${detectPlatformFromUrl(importUrl)}`,
        url: importUrl.trim(),
        platform: detectPlatformFromUrl(importUrl),
        niche: 'Geral',
        durationSec: 15,
      });
      setImportUrl('');
      setImportTitle('');
    } finally {
      setImporting(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    const targetFolder = openFolder ?? defaultFolder;
    if (!files?.length || !targetFolder) return;
    for (const f of Array.from(files).slice(0, 5)) {
      await importReference({
        folderId: targetFolder.id,
        title: f.name.replace(/\.[^.]+$/, ''),
        platform: 'Upload local',
        niche: 'Geral',
        durationSec: 15,
      });
    }
  }

  async function openManifestPreview(item: ViralItemDTO) {
    setAnalyzingId(item.id);
    try {
      const m =
        item.manifest ||
        (await analyzeManifest({
          itemId: item.id,
          sourceTitle: item.title,
          sourceUrl: item.source_url ?? undefined,
          niche: item.niche,
          durationSec: item.duration_sec,
        }));
      setManifestModal({ title: item.title, manifest: m });
    } finally {
      setAnalyzingId(null);
    }
  }

  function startRemake(seed: {
    sourceTitle: string;
    sourceUrl?: string;
    thumbnailUrl: string;
    niche: string;
    durationSec: number;
    manifest?: ViralManifestDTO | null;
  }) {
    setRemakeSeed(seed);
    navigate('/ai-ugc/remake');
  }

  const profilesFiltered = MINED_PROFILES.filter((p) =>
    !search.trim() || `${p.handle} ${p.niche} ${p.topFormat}`.toLowerCase().includes(search.toLowerCase()),
  );

  // PÁGINA DEDICADA DA PASTA (/viral/pasta/:folderId)
  if (openFolder) {
    return (
      <div className="mx-auto w-full max-w-[1480px] space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
          <div>
            <Link to="/viral" className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg">
              <ArrowLeft className="size-3.5" /> Voltar para Minhas pastas
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">{openFolder.name}</h1>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold text-fg-muted">
                {folderItems.length} vídeo(s)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {folders.length > 1 && openFolder.name !== 'Aleatórios' && (
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  await deleteFolder(openFolder.id);
                  navigate('/viral');
                }}
              >
                <Trash2 className="size-3.5" /> Excluir pasta
              </Button>
            )}
            <Button variant="brand" size="sm" onClick={() => navigate('/ai-ugc/remake')}>
              <Repeat2 className="size-3.5" /> Abrir Remake Viral
            </Button>
          </div>
        </div>

        {/* Formatos vinculados a esta pasta */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs">
          <span className="font-semibold text-fg-muted">Usar esta pasta em:</span>
          {VIRAL_FOLDER_FORMATS.map((fmt) => {
            const on = openFolder.formats.includes(fmt);
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => void toggleFolderFormat(openFolder, fmt)}
                className={clsx(
                  'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  on ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface-2 text-fg-muted hover:text-fg',
                )}
              >
                {fmt}
              </button>
            );
          })}
        </div>

        {/* Importador limpo exclusivo desta pasta */}
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4" data-guide-target="viral-feed-box">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-fg-muted">
                Importar referência para “{openFolder.name}”
              </h2>
              <p className="text-xs text-fg-muted">Guardar links ou vídeos e gerar Manifest de cenas não gasta créditos.</p>
            </div>
            <span className="badge-ok rounded-md border px-2 py-0.5 text-[11px] font-bold">0 créditos para salvar</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_190px_auto]">
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="Cole URL do TikTok, Instagram Reels ou YouTube Shorts…"
              data-testid="viral-import-url"
              className="h-9 rounded-xl border border-border bg-surface-2 px-3 text-xs outline-none focus:border-accent"
            />
            <input
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
              placeholder="Título curto (opcional)"
              className="h-9 rounded-xl border border-border bg-surface-2 px-3 text-xs outline-none focus:border-accent"
            />
            <Button variant="brand" onClick={() => void handleImportByUrl()} loading={importing} data-testid="viral-import-btn">
              <Link2 className="size-3.5" /> Salvar link
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-fg-muted">Testar em 1 clique:</span>
              {EXAMPLE_VIRAL_LINKS.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    setImportUrl(ex.url);
                    setImportTitle(ex.title);
                  }}
                  className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11px] hover:border-accent/60"
                >
                  {ex.label}
                </button>
              ))}
            </div>

            <div>
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="size-3.5" /> Enviar vídeos MP4/MOV
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                multiple
                className="hidden"
                onChange={(e) => void handleFiles(e.target.files)}
              />
            </div>
          </div>
        </section>

        {folderItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center text-xs text-fg-muted">
            Nenhum vídeo nesta pasta ainda. Importe um link acima ou salve de <strong>Novidades explodindo</strong>.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {folderItems.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="relative">
                  <img src={item.thumbnail_url} alt={item.title} className="aspect-[3/4] w-full object-cover object-top" />
                  <div className="absolute left-2 top-2 flex gap-1">
                    <span className="rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.platform}</span>
                    <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                      Nota {item.viral_score}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeItem(item.id)}
                    className="absolute right-2 top-2 rounded-lg bg-black/65 p-1 text-white hover:bg-danger"
                    aria-label="Excluir referência"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent p-2.5">
                    <div className="text-[10px] font-semibold text-white/80">{item.niche} · {item.duration_sec}s</div>
                    <div className="truncate text-xs font-bold text-white">{item.title}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={analyzingId === item.id}
                    onClick={() => void openManifestPreview(item)}
                  >
                    <Sparkles className="size-3 text-accent" /> {item.manifest ? 'Manifest' : 'Analisar'}
                  </Button>
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() =>
                      startRemake({
                        sourceTitle: item.title,
                        sourceUrl: item.source_url ?? undefined,
                        thumbnailUrl: item.thumbnail_url,
                        niche: item.niche,
                        durationSec: item.duration_sec,
                        manifest: item.manifest,
                      })
                    }
                  >
                    <Repeat2 className="size-3" /> Remake
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal open={Boolean(manifestModal)} onClose={() => setManifestModal(null)} title={`Manifest (Grátis) · ${manifestModal?.title ?? ''}`} size="lg">
          {manifestModal && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-fg-muted">
                <span>Estilo: <strong className="text-fg">{manifestModal.manifest.style}</strong></span>
                <span>·</span>
                <span>Nicho: <strong className="text-fg">{manifestModal.manifest.niche}</strong></span>
                <span>·</span>
                <span>Cenas: <strong className="text-fg">{manifestModal.manifest.scenes.length}</strong></span>
              </div>
              {manifestModal.manifest.scenes.map((sc) => (
                <div key={sc.index} className="space-y-1 rounded-xl border border-border bg-surface-2 p-3 text-xs">
                  <div className="font-bold text-accent">Cena #{sc.index + 1} · {sc.role} (~{sc.durationSeconds}s)</div>
                  <p><strong>Visual / Câmera:</strong> {sc.visualCues}</p>
                  <p className="text-fg-muted"><strong>Modelo de fala:</strong> “{sc.spokenTemplate}”</p>
                </div>
              ))}
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // TELA PRINCIPAL DA BIBLIOTECA VIRAL (/viral) — palco cheio + barra compacta.
  return (
    <div className="premium-workspace mx-auto w-full max-w-[1460px] space-y-[26px] px-6 py-14">
      <div className="relative min-h-[230px] overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_88%_8%,rgba(56,189,248,.24),transparent_38%),linear-gradient(135deg,#111a2f,#131024)] p-7 shadow-[0_28px_80px_rgba(13,89,120,.22)] md:min-h-[290px] md:p-9">
        <img src="/showcase/internal-viral-new.png" alt="" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[56%] object-cover object-center opacity-34" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-transparent via-[#111a2f]/72 to-[#111a2f]" />
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">VIRAL</h1>
            <p className="max-w-xl text-sm leading-6 text-fg-muted sm:text-base">
              Perfis que estão bombando, produtos que vendem com a estratégia de vídeos deles, os perfis que você minerou e suas pastas
            </p>
          </div>
        </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Referências monitoradas', value: items.length.toLocaleString('pt-BR'), Icon: TrendingUp },
          { label: 'Perfis em destaque', value: profilesFiltered.length.toLocaleString('pt-BR'), Icon: Users },
          { label: 'Pastas organizadas', value: folders.length.toLocaleString('pt-BR'), Icon: Folder },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br from-accent/12 via-surface to-surface px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,.12)]">
            <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><Icon className="size-4" /></span>
            <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle">{label}</div><div className="mt-0.5 text-lg font-black">{value}</div></div>
          </div>
        ))}
      </div>

      {/* Ordem e estilo das 4 abas do VIRAL. */}
      <div className="premium-tabbar inline-flex h-9 w-fit max-w-full items-center gap-1 overflow-x-auto rounded-[8px] p-1 thin-scroll" role="tablist" aria-label="Abas da Biblioteca Viral">
        {[
          { id: 'trending' as const, label: 'Novidades explodindo', icon: Flame },
          { id: 'products' as const, label: 'Produtos minerados', icon: Package },
          { id: 'profiles' as const, label: 'Perfis minerados', icon: Users },
          { id: 'folders' as const, label: 'Minhas pastas', icon: FolderPlus },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => selectTab(t.id)}
            className={clsx(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 py-1 text-xs font-medium transition sm:text-[13px]',
              tab === t.id ? 'bg-bg text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
            )}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Faixa roxa obsidian da área VIRAL. */}
      <div className="relative top-[3px] flex min-h-[73px] flex-col gap-3 rounded-[10px] border border-accent/25 bg-accent-soft/45 px-4 py-2.5 dark:border-[#36284f] dark:bg-[#181522] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-fg-muted sm:max-w-[700px] sm:text-[13px]">
          <strong className="text-fg">Vitrine do teste grátis:</strong> 8 perfis e produtos virais liberados de <strong className="text-fg">1.453</strong>. Clonar, minerar perfis e ver tudo fica nos planos do Studio.
        </p>
        <Button variant="brand" size="sm" onClick={() => navigate('/setup')}>
          Ver planos do Studio
        </Button>
      </div>

      {libraryError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-xs">
          <span className="text-fg-muted">{libraryError}</span>
          <Button variant="secondary" size="sm" onClick={() => void reloadLibrary()}>Tentar novamente</Button>
        </div>
      )}

      {tab === 'folders' && (
        <div className="space-y-1">
          <StepGuideBanner guideKey="viral" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" data-guide-target="viral-folders-box">
          {folders.map((f) => {
            const count = items.filter((i) => i.folder_id === f.id).length;
            return (
              <Link
                key={f.id}
                to={`/viral/pasta/${f.id}`}
                data-testid={`viral-folder-card-${f.name}`}
                className="group flex min-h-[164px] flex-col justify-between rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/60"
              >
                <div className="flex items-start justify-between">
                  <div className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
                    <Folder className="size-4" />
                  </div>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-fg-muted">
                    {count} vídeo(s)
                  </span>
                </div>
                <div>
                  <div className="truncate text-sm font-bold group-hover:text-accent">{f.name}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {f.formats.slice(0, 3).map((fmt) => (
                      <span key={fmt} className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle">
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setNewFolderOpen(true)}
            data-testid="viral-new-folder-btn"
            className="flex min-h-[164px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-accent/50 bg-surface p-4 text-xs font-semibold text-fg-muted transition-colors hover:border-accent hover:text-fg"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
              <Plus className="size-4" />
            </span>
            Nova pasta
          </button>
        </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-5">
          {/* Card de destaque com globo para Produtos minerados. */}
          <div className="grid items-center gap-6 rounded-2xl border border-border bg-surface p-6 md:grid-cols-[1.2fr_1fr] lg:h-[302px]">
            <div className="-translate-y-9 space-y-4">
              <div>
                <div className="text-xs text-fg-muted">Vendidos pelos produtos da biblioteca</div>
                <div className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">1,6 mi</div>
                <div className="mt-0.5 text-xs font-medium text-accent dark:text-indigo-300">EUA · 4 produtos</div>
              </div>

              {VIRAL_TRENDING_VIDEOS.slice(0, 1).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/70 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img src={item.thumbnail} alt="" className="size-12 shrink-0 rounded-lg object-cover object-top" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">LullaBites Sleep Gummies - 30 Servings - …</div>
                      <div className="text-xs text-fg-muted">EUA · 541,5 mil vendidos · +473/dia</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      startRemake({
                        sourceTitle: item.title,
                        thumbnailUrl: item.thumbnail,
                        niche: item.niche,
                        durationSec: item.durationSec,
                        manifest: item.preAnalyzedManifest,
                      })
                    }
                    className="shrink-0 text-xs font-semibold text-accent hover:underline dark:text-indigo-300"
                  >
                    Ver matéria →
                  </button>
                </div>
              ))}

              <p className="text-[11px] text-fg-subtle">
                Cada ponto no globo representa um produto no país onde ele vende. Arraste o globo, clique num ponto para abrir.
              </p>
            </div>

            {/* Globo pontilhado vetorial. */}
            <div className="relative ml-auto mr-[-1.5rem] flex size-80 -translate-y-8 items-center justify-center lg:size-[350px]" aria-hidden>
              <svg viewBox="0 0 220 220" className="size-full">
                <defs>
                  <radialGradient id="fd-globe-glow" cx="52%" cy="48%" r="50%">
                    <stop offset="0%" stopColor="rgba(99, 102, 241, 0.25)" />
                    <stop offset="100%" stopColor="rgba(17, 19, 23, 0)" />
                  </radialGradient>
                  <pattern id="fd-globe-map-dots" width="5" height="5" patternUnits="userSpaceOnUse">
                    <circle cx="1.3" cy="1.3" r="1.15" fill="#b7b4ca" />
                  </pattern>
                </defs>
                <circle cx="110" cy="110" r="96" fill="url(#fd-globe-glow)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <g transform="translate(0 -20) scale(1 1.3)" fill="url(#fd-globe-map-dots)" opacity="0.62">
                  <path d="M33 58 44 45 57 40 67 47 63 58 69 68 64 81 57 88 55 103 47 115 40 108 42 94 35 84 29 70Z" />
                  <path d="M75 36 83 30 92 33 95 42 90 49 81 48 75 43Z" />
                  <path d="M103 53 115 46 128 48 137 43 150 48 161 53 173 63 167 73 156 73 149 79 137 76 129 83 119 79 112 72 102 69Z" />
                  <path d="M117 83 131 79 143 86 146 99 140 111 136 123 127 132 119 124 115 111 108 101 111 91Z" />
                  <path d="M155 127 167 129 178 135 187 144 182 153 169 155 158 150 151 140Z" />
                  <path d="M92 137 99 133 106 138 103 145 96 146Z" />
                </g>
                {Array.from({ length: 140 }).map((_, idx) => {
                  const row = Math.floor(idx / 14);
                  const col = idx % 14;
                  const y = 32 + row * 16;
                  const rx = Math.sqrt(Math.max(0, 92 * 92 - (y - 110) * (y - 110)));
                  const x = 110 - rx + (col / 13) * rx * 2;
                  const hot = (row === 4 && col === 7) || (row === 6 && col === 9) || (row === 5 && col === 6);
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r={hot ? 2.5 : 1.2}
                      fill={hot ? '#818cf8' : 'currentColor'}
                      className={hot ? 'opacity-100' : 'text-fg-subtle/35'}
                    />
                  );
                })}
                <circle cx="118" cy="100" r="10" fill="rgba(129, 140, 248, 0.25)" />
                <circle cx="118" cy="100" r="4.5" fill="#ffffff" />
              </svg>
            </div>
          </div>

          <div className="space-y-3" data-guide-target="viral-product-filters">
            <div className="flex flex-wrap gap-2">
              <label className="flex h-10 min-w-56 flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3">
                <Search className="size-4 text-fg-muted" />
                <input aria-label="Buscar produtos" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Buscar produto, marca ou loja (ex.: magnésio, colágeno, creatina)" className="w-full bg-transparent text-xs outline-none" />
              </label>
              <select aria-label="Mercado de produtos" value={productMarket} onChange={(e) => setProductMarket(e.target.value)} className="h-10 rounded-xl border border-border bg-bg px-3 text-xs">
                <option>EUA e Brasil</option>
                <option>Brasil</option>
                <option>EUA</option>
              </select>
              <select aria-label="Ordenar produtos" value={productSort} onChange={(e) => setProductSort(e.target.value)} className="h-10 rounded-xl border border-border bg-bg px-3 text-xs">
                <option>Mais vendidos</option>
                <option>Mais recentes</option>
              </select>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button type="button" onClick={() => setProductMarket('EUA e Brasil')} className={clsx('shrink-0 rounded-full border border-border px-3 py-1 text-xs', productMarket === 'EUA e Brasil' ? 'bg-fg text-bg' : 'bg-surface text-fg-muted')}>Todos {VIRAL_TRENDING_VIDEOS.length}</button>
              <button type="button" onClick={() => setProductMarket('EUA')} className={clsx('shrink-0 rounded-full border border-border px-3 py-1 text-xs', productMarket === 'EUA' ? 'bg-fg text-bg' : 'bg-surface text-fg-muted')}>EUA {VIRAL_TRENDING_VIDEOS.filter(v => v.market === 'EUA').length}</button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {VIRAL_TRENDING_VIDEOS.filter(v => (!productSearch || `${v.title} ${v.niche} ${v.creatorHandle}`.toLowerCase().includes(productSearch.toLowerCase())) && (productMarket === 'EUA e Brasil' || v.market === productMarket)).slice().sort((a, b) => productSort === 'score' ? b.viralScore - a.viralScore : a.title.localeCompare(b.title)).map((v) => (
              <div key={v.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-3.5">
                <div className="flex items-center gap-3">
                  <img src={v.thumbnail} alt={v.title} className="size-12 shrink-0 rounded-lg object-cover object-top" />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">{v.title}</div>
                    <div className="text-[11px] text-fg-muted">{v.niche} · {v.viewsLabel}</div>
                  </div>
                </div>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() =>
                    startRemake({
                      sourceTitle: v.title,
                      thumbnailUrl: v.thumbnail,
                      niche: v.niche,
                      durationSec: v.durationSec,
                      manifest: v.preAnalyzedManifest,
                    })
                  }
                >
                  <Repeat2 className="size-3.5" /> Clonar produto
                </Button>
              </div>
            ))}
            {!VIRAL_TRENDING_VIDEOS.some(v => (!productSearch || `${v.title} ${v.niche} ${v.creatorHandle}`.toLowerCase().includes(productSearch.toLowerCase())) && (productMarket === 'EUA e Brasil' || v.market === productMarket)) && <p className="col-span-full py-10 text-center text-sm text-fg-muted">Nenhum produto encontrado para estes filtros.</p>}
          </div>
        </div>
      )}

      {tab === 'profiles' && (
        <div className="space-y-4">
          <div className="flex min-h-[270px] flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 text-center">
            <Lock className="size-8 text-accent" />
            <h2 className="mt-4 text-sm font-bold">Perfis minerados</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">Cole o @ de qualquer perfil do TikTok, Instagram ou YouTube e veja os vídeos que mais rodaram, com visualizações, para clonar. Disponível nos planos do Studio.</p>
            <Button variant="brand" size="md" className="mt-4" onClick={() => navigate('/setup')}>Ver planos do Studio</Button>
          </div>

          <div className="mt-5 space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
            <Search className="size-4 text-fg-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar perfil por arroba ou nicho…"
              className="h-9 w-full bg-transparent text-xs outline-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {profilesFiltered.map((p) => {
              const related = VIRAL_TRENDING_VIDEOS.find((v) => v.id === p.trendingEntryId) ?? VIRAL_TRENDING_VIDEOS[0]!;
              return (
                <div key={p.id} className="flex gap-3.5 rounded-2xl border border-border bg-surface p-3.5">
                  <img src={p.avatarUrl} alt={p.handle} className="size-16 shrink-0 rounded-xl object-cover object-top" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold">{p.handle}</div>
                        <div className="text-xs text-fg-muted">{p.platform} · {p.niche}</div>
                      </div>
                      <span className="badge-ok inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold">
                        <TrendingUp className="size-3" /> Nota {p.viralScore}/100
                      </span>
                    </div>
                    <div className="text-xs text-fg-muted">
                      Média: <strong className="text-fg">{p.avgViews}</strong> · Formato forte: <strong className="text-fg">{p.topFormat}</strong>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          defaultFolder &&
                          void importReference({
                            folderId: defaultFolder.id,
                            title: related.title,
                            platform: p.platform,
                            niche: related.niche,
                            durationSec: related.durationSec,
                            thumbnailUrl: p.avatarUrl,
                            manifest: related.preAnalyzedManifest,
                          })
                        }
                      >
                        <BookmarkPlus className="size-3.5" /> Salvar em {defaultFolder?.name ?? 'Aleatórios'}
                      </Button>
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() =>
                          startRemake({
                            sourceTitle: related.title,
                            thumbnailUrl: p.avatarUrl,
                            niche: related.niche,
                            durationSec: related.durationSec,
                            manifest: related.preAnalyzedManifest,
                          })
                        }
                      >
                        <Repeat2 className="size-3.5" /> Clonar formato
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {tab === 'trending' && <CuratedProfiles onRemake={v => startRemake({ sourceTitle: v.title, thumbnailUrl: v.thumbnail, niche: v.niche, durationSec: v.durationSec, manifest: v.preAnalyzedManifest })} />}
      <Modal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="Nova pasta na Biblioteca VIRAL"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>Cancelar</Button>
            <Button variant="brand" onClick={() => void handleCreateFolder()}>Criar pasta</Button>
          </>
        }
      >
        <input
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="Ex.: Hooks Skincare, Concorrentes Fitness…"
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </Modal>
    </div>
  );
}
