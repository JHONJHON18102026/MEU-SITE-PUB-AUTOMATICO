import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Film, Image as ImageIcon, LoaderCircle, RefreshCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AvatarDTO } from '@shared/contracts';
import type { VideoProjectDTO } from '@shared/ugcContracts';
import { Modal } from '@/components/ui/Modal';
import { AvatarDetailModal } from './AvatarDetailModal';
import { useGalleryVersion, useMyAvatars } from './useAvatarData';
import { api } from '@/lib/api';

type MediaTab = 'images' | 'videos';

const MEDIA_TABS: { id: MediaTab; label: string; icon: typeof ImageIcon }[] = [
  { id: 'images', label: 'Imagens geradas', icon: ImageIcon },
  { id: 'videos', label: 'Vídeos gerados', icon: Film },
];

export function GeneratedMediaTabs({ projects, projectsLoading = false, projectsHasMore = false, onLoadMoreProjects, onDeleteProject, onRecreateProject }: { projects: VideoProjectDTO[]; projectsLoading?: boolean; projectsHasMore?: boolean; onLoadMoreProjects?: () => void; onDeleteProject: (project: VideoProjectDTO) => Promise<void>; onRecreateProject: (project: VideoProjectDTO) => Promise<void> }) {
  const [params, setParams] = useSearchParams();
  const requestedMedia = params.get('media');
  const resolveMedia = (value: string | null): MediaTab => value === 'videos' ? 'videos' : 'images';
  const [active, setActive] = useState<MediaTab>(() => resolveMedia(requestedMedia));
  useEffect(() => setActive(resolveMedia(requestedMedia)), [requestedMedia]);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarDTO | null>(null);
  const avatars = useMyAvatars();
  const videos = useMemo(() => {
    const allVideos = projects.filter((project) => project.mediaType !== 'motion');
    const explicitlyReplaced = new Set(allVideos
      .filter((project) => project.status !== 'failed')
      .map((project) => project.params?.replaces_project_id)
      .filter((id): id is string => typeof id === 'string'));
    const implicitlyReplaced = new Set(allVideos
      .filter((project) => project.status === 'failed')
      .filter((failed) => allVideos.some((candidate) => candidate.id !== failed.id && candidate.status !== 'failed'
        && candidate.title === failed.title
        && Date.parse(candidate.created_at) > Date.parse(failed.created_at)))
      .map((project) => project.id));
    const replaced = new Set([...explicitlyReplaced, ...implicitlyReplaced]);
    return allVideos.filter((project) => !replaced.has(project.id));
  }, [projects]);
  const counts: Record<MediaTab, number> = {
    images: avatars.data.length,
    videos: videos.length,
  };

  function selectTab(id: MediaTab) {
    setActive(id);
    const next = new URLSearchParams(params);
    next.set('media', id);
    next.delete('panel');
    setParams(next, { replace: true });
  }

  return (
    <>
    <section className="mt-4 w-full max-w-[1600px] 2xl:max-w-[1880px] text-left" aria-label="Resultados gerados">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-fg">Seus resultados</h3>
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface-2/80 p-1" role="tablist" aria-label="Tipo de resultado gerado">
          {MEDIA_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active === id}
              onClick={() => selectTab(id)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition',
                active === id ? 'bg-brand text-white shadow-sm' : 'text-fg-muted hover:text-fg',
              )}
            >
              <Icon className="size-3.5" /> {label} <span className="opacity-75">{counts[id]}</span>
            </button>
          ))}
        </div>
      </div>

      {active === 'images' ? (
        avatars.loading ? (
          <div className="skeleton h-28 rounded-2xl" />
        ) : avatars.data.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
            {avatars.data.map((avatar) => (
              <GeneratedImageCard key={avatar.id} avatar={avatar} onOpen={() => setSelectedAvatar(avatar)} />
            ))}
          </div>
        ) : (
          <EmptyMedia text="As imagens que você gerar aparecerão aqui." />
        )
      ) : (
        projectsLoading && !videos.length ? <div className="skeleton h-28 rounded-2xl" /> : (
          <ProjectMedia
            projects={videos}
            loadingMore={projectsLoading}
            hasMore={projectsHasMore}
            onLoadMore={onLoadMoreProjects}
            onDeleteProject={onDeleteProject}
            onRecreateProject={onRecreateProject}
          />
        )
      )}
    </section>
    <AvatarDetailModal avatar={selectedAvatar} onClose={() => setSelectedAvatar(null)} />
    </>
  );
}

function GeneratedImageCard({ avatar, onOpen }: { avatar: AvatarDTO; onOpen: () => void }) {
  const bump = useGalleryVersion((state) => state.bump);
  const [deleting, setDeleting] = useState(false);

  async function removeImage() {
    if (deleting || !window.confirm(`Excluir a imagem "${avatar.name}"? O arquivo será removido permanentemente.`)) return;
    setDeleting(true);
    try {
      await api.deleteAvatar(avatar.id);
      bump();
      toast.success('Imagem excluída.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não consegui excluir esta imagem.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-surface">
      <button type="button" onClick={onOpen} aria-label={`Abrir imagem ${avatar.name}`} className="block w-full text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <img src={avatar.image_url} alt={avatar.name} loading="lazy" className="aspect-[3/4] w-full object-cover object-top transition group-hover:scale-[1.02]" />
        <p className="truncate px-2 py-1.5 text-[11px] font-semibold">{avatar.name}</p>
      </button>
      <button type="button" onClick={() => void removeImage()} disabled={deleting} title="Excluir imagem" aria-label={`Excluir imagem ${avatar.name}`} className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg border border-white/20 bg-black/75 text-white opacity-0 shadow-md transition hover:bg-red-600 group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-50">
        {deleting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </button>
    </article>
  );
}

function EmptyMedia({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border px-4 py-7 text-center text-xs text-fg-muted">{text}</div>;
}

function videoFailureHint(error: string | null) {
  if (!error) return 'O vídeo não foi concluído. Abra Projetos > Histórico para ver o registro completo.';
  if (/failed to decrypt token|sem bearer_token|conta_1.*token/i.test(error)) {
    return 'A sessão da conta 1 no Google Flow precisa ser autenticada novamente.';
  }
  if (/timeout|timed out|limite total.*atingido/i.test(error)) {
    return 'O motor Hust/Flow excedeu o tempo limite. Tente novamente quando a conta estiver disponível.';
  }
  if (/ffprobe|ffmpeg/i.test(error)) {
    return 'O Flow gerou a mídia, mas o processamento final do vídeo falhou.';
  }
  return error.split('\n')[0]!.slice(0, 180);
}

function ProjectMedia({ projects, loadingMore, hasMore, onLoadMore, onDeleteProject, onRecreateProject }: { projects: VideoProjectDTO[]; loadingMore: boolean; hasMore: boolean; onLoadMore?: () => void; onDeleteProject: (project: VideoProjectDTO) => Promise<void>; onRecreateProject: (project: VideoProjectDTO) => void }) {
  if (!projects.length) {
    return <EmptyMedia text='Os vídeos gerados aparecerão aqui.' />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
      {projects.map((project) => (
        <ProjectMediaCard key={project.id} project={project} onDeleteProject={onDeleteProject} onRecreateProject={onRecreateProject} />
      ))}
      {hasMore && onLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="col-span-full mx-auto inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2 text-xs font-semibold text-fg transition hover:border-accent disabled:opacity-60"
        >
          {loadingMore && <LoaderCircle className="size-3.5 animate-spin" />}
          {loadingMore ? 'Carregando…' : 'Carregar mais vídeos'}
        </button>
      )}
    </div>
  );
}

function ProjectMediaCard({ project, onDeleteProject, onRecreateProject }: { project: VideoProjectDTO; onDeleteProject: (project: VideoProjectDTO) => Promise<void>; onRecreateProject: (project: VideoProjectDTO) => void }) {
  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [recreating, setRecreating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function handleRecreate() {
    if (recreating) return;
    setRecreating(true);
    try { await onRecreateProject(project); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não consegui recriar este vídeo.'); }
    finally { setRecreating(false); }
  }

  async function handleDelete() {
    if (deleting) return;
    const confirmed = window.confirm(`Excluir o vídeo "${project.title}"? O arquivo será removido permanentemente.`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await onDeleteProject(project);
      toast.success('Vídeo excluído.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não consegui excluir este vídeo.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article data-testid={`generated-video-card-${project.id}`} className="group relative overflow-hidden rounded-xl border border-border bg-surface">
      {project.status === 'done' && project.video_url ? (
        <div className="relative">
          <video
            src={project.video_url}
            poster={project.thumbnail_url}
            controls
            playsInline
            preload="metadata"
            className="aspect-[3/4] w-full bg-black object-contain"
            aria-label={project.title}
            onLoadedMetadata={(event) => {
              const duration = event.currentTarget.duration;
              if (Number.isFinite(duration) && duration > 0) setActualDuration(Math.round(duration));
            }}
          />
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            aria-label={`Abrir vídeo ${project.title} em tela cheia`}
            title="Abrir vídeo"
            className="absolute inset-x-0 top-0 bottom-16 z-10 cursor-default rounded-t-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          />
        </div>
      ) : (
        <div className="relative aspect-[3/4] bg-surface-2">
          {project.thumbnail_url && <img src={project.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-contain opacity-75" />}
          <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-fg">{project.status === 'failed' ? 'Falhou' : project.status === 'processing' ? 'Em geração…' : 'Prévia salva em Avatar'}</span>
        </div>
      )}
      {project.status === 'failed' || (project.status === 'done' && Boolean(project.video_url)) ? (
        <button type="button" onClick={() => void handleRecreate()} disabled={recreating} title="Criar outra versão deste vídeo" aria-label={"Recriar vídeo " + project.title} className="absolute left-2 top-2 z-20 inline-flex items-center gap-1.5 rounded-md border border-accent/50 bg-surface/95 px-2 py-1 text-[10px] font-bold text-fg opacity-0 shadow-md transition hover:bg-accent hover:text-white group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <RefreshCcw className={recreating ? "size-3 animate-spin" : "size-3"} /> {recreating ? "Enviando…" : "Recriar"}
        </button>
      ) : project.status === 'processing' ? (
        <span className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-1 text-[10px] font-semibold text-white">Em geração…</span>
      ) : null}
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={deleting}
        title="Excluir vídeo"
        aria-label={'Excluir vídeo ' + project.title}
        className="absolute right-2 top-2 z-30 grid size-8 place-items-center rounded-lg border border-white/20 bg-black/80 text-white opacity-0 shadow-md transition hover:bg-red-600 group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {deleting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </button>
      <div className="flex h-7 items-center px-2">
        <p className="truncate text-[11px] font-semibold" title={project.title}>{project.title}</p>
        {project.status === 'done' && actualDuration !== null && <span className="sr-only">{actualDuration} segundos</span>}
      </div>
      {project.status === 'failed' && (
        <p className="line-clamp-2 px-2 pb-2 text-[10px] leading-relaxed text-danger" title={project.error ?? undefined}>
          {videoFailureHint(project.error)}
        </p>
      )}
      {project.video_url && (
        <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={project.title} size="xl">
          <div className="grid max-h-[calc(90vh-5rem)] gap-4 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
            <div className="-mx-5 -mt-4 grid min-h-64 place-items-center bg-black md:mx-0 md:mt-0 md:rounded-xl">
              <video
                src={project.video_url}
                poster={project.thumbnail_url}
                controls
                autoPlay
                playsInline
                className="max-h-[calc(90vh-8rem)] max-w-full object-contain"
                aria-label={project.title}
              />
            </div>
            <VideoGenerationDetails project={project} actualDuration={actualDuration} />
          </div>
        </Modal>
      )}
    </article>
  );
}

function VideoGenerationDetails({ project, actualDuration }: { project: VideoProjectDTO; actualDuration: number | null }) {
  const params = project.params ?? {};
  const assets = Array.isArray(params.reference_assets)
    ? params.reference_assets.filter((asset): asset is Record<string, unknown> => Boolean(asset && typeof asset === 'object'))
    : [];
  const model = String(params.actual_engine ?? params.model_override ?? project.engine);
  const prompt = project.scenes
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((scene) => [scene.text, scene.action].filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n\n');

  return (
    <section className="space-y-3 pr-1 text-xs" aria-label="Detalhes da geração do vídeo" data-testid="video-generation-details">
      <h4 className="font-bold text-fg">Detalhes da geração</h4>
      <dl className="space-y-1.5 rounded-xl border border-border bg-surface-2 p-3">
        <DetailValue label="Modelo" value={model} />
        <DetailValue label="Custo" value={params.billing_mode === 'unlimited' || params.model_override === 'lowerpriority' ? `${project.cost} créditos · ilimitado` : `${project.cost} créditos`} />
        {project.refunded > 0 && <DetailValue label="Estornado" value={`${project.refunded} créditos`} />}
        <DetailValue label="Duração" value={`${actualDuration ?? project.duration_seconds} s`} />
        <DetailValue label="Formato" value={project.aspect_ratio} />
        <DetailValue label="Criado em" value={new Date(project.created_at).toLocaleString('pt-BR')} />
        <DetailValue label="Modo de referência" value={params.reference_mode ?? undefined} />
        <DetailValue label="Voz" value={params.voiceType ?? undefined} />
        <DetailValue label="Legendas" value={params.captions === true ? 'Ativadas' : params.captions === false ? 'Desativadas' : undefined} />
      </dl>
      {prompt && (
        <details open className="rounded-xl border border-border p-3 text-fg-muted">
          <summary className="cursor-pointer font-semibold text-fg">Prompt e instruções</summary>
          <p className="mt-2 whitespace-pre-wrap break-words">{prompt}</p>
        </details>
      )}
      <div className="rounded-xl border border-border p-3">
        <h5 className="font-semibold text-fg">Referências usadas ({assets.length})</h5>
        {assets.length ? (
          <ul className="mt-2 space-y-2">
            {assets.map((asset, index) => (
              <li key={`${String(asset.name ?? 'ref')}-${index}`} className="flex items-center gap-2">
                {typeof asset.url === 'string' && <img src={asset.url} alt="" className="size-10 rounded-md border border-border object-cover" loading="lazy" />}
                <span className="min-w-0 break-words text-fg-muted">{[asset.name, asset.kind].filter(Boolean).map(String).join(' · ') || `Referência ${index + 1}`}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-fg-muted">Nenhuma referência salva nesta geração.</p>}
      </div>
    </section>
  );
}

function DetailValue({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === '') return null;
  return <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2"><dt className="text-fg-muted">{label}</dt><dd className="min-w-0 break-words font-medium text-fg">{String(value)}</dd></div>;
}
