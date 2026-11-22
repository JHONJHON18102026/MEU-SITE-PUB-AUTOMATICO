import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Film, Image as ImageIcon, Video } from 'lucide-react';
import clsx from 'clsx';
import type { AvatarDTO } from '@shared/contracts';
import { Modal } from '@/components/ui/Modal';
import { useProjectsData } from '@/features/projects/previewProjectsStore';
import { useMyAvatars } from './useAvatarData';

type MediaTab = 'images' | 'videos' | 'motion';
const TABS: { id: MediaTab; label: string; icon: typeof ImageIcon }[] = [
  { id: 'images', label: 'Imagens geradas', icon: ImageIcon },
  { id: 'videos', label: 'Vídeos gerados', icon: Video },
  { id: 'motion', label: 'Motion Control', icon: Film },
];

export function GeneratedMediaTabs() {
  const [params, setParams] = useSearchParams();
  const active: MediaTab = params.get('media') === 'videos' || params.get('media') === 'motion' ? params.get('media') as MediaTab : 'images';
  const images = useMyAvatars();
  const avatarProjects = useProjectsData('avatar');
  const [openImage, setOpenImage] = useState<AvatarDTO | null>(null);
  const media = useMemo(() => avatarProjects.projects.filter((project) =>
    active === 'motion' ? project.mediaType === 'motion' : active === 'videos' ? project.mediaType !== 'motion' : false,
  ), [active, avatarProjects.projects]);

  function select(tab: MediaTab) {
    const next = new URLSearchParams(params);
    next.set('media', tab);
    next.delete('panel');
    setParams(next, { replace: true });
  }

  return (
    <section className="mt-5 w-full rounded-2xl border border-border/80 bg-surface/75 p-3 text-left sm:p-4" aria-label="Mídia gerada em Avatar">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-fg">Suas criações</h3>
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Mídia gerada em Avatar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              onClick={() => select(tab.id)}
              className={clsx('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition sm:text-xs', active === tab.id ? 'bg-brand text-white' : 'text-fg-muted hover:text-fg')}
            >
              <tab.icon className="size-3.5" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {active === 'images' ? (
        images.loading ? <div className="skeleton h-40 rounded-xl" /> : images.data.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {images.data.map((image) => (
              <button key={image.id} type="button" onClick={() => setOpenImage(image)} className="overflow-hidden rounded-xl border border-border text-left hover:border-accent">
                <img src={image.image_url} alt={image.name} className="aspect-[3/4] w-full object-cover object-top" loading="lazy" />
                <span className="block truncate px-2 py-1.5 text-[11px] font-medium">{image.name}</span>
              </button>
            ))}
          </div>
        ) : <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-xs text-fg-muted">As imagens que você gerar em Avatar aparecerão aqui.</p>
      ) : avatarProjects.loading ? <div className="skeleton h-40 rounded-xl" /> : media.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {media.map((project) => (
            <article key={project.id} className="overflow-hidden rounded-xl border border-border bg-surface-2">
              {project.video_url ? (
                <video src={project.video_url} poster={project.thumbnail_url} controls className="aspect-[9/16] w-full bg-black object-cover" />
              ) : (
                <div className="relative aspect-[9/16] bg-black">
                  <img src={project.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded bg-black/75 px-2 py-1 text-[10px] font-bold text-white">{project.status === 'processing' ? 'GERANDO' : project.is_preview ? 'PRÉVIA' : project.status === 'failed' ? 'FALHOU' : 'VÍDEO'}</span>
                </div>
              )}
              <div className="truncate px-2 py-1.5 text-[11px] font-semibold" title={project.title}>{project.title}</div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-xs text-fg-muted">
          {active === 'motion' ? 'Os Motion Control criados nesta aba aparecerão aqui.' : 'Os vídeos que você gerar em Avatar aparecerão aqui.'}
        </p>
      )}
      <AvatarImageModal avatar={openImage} onClose={() => setOpenImage(null)} />
    </section>
  );
}

function AvatarImageModal({ avatar, onClose }: { avatar: AvatarDTO | null; onClose: () => void }) {
  return (
    <Modal open={Boolean(avatar)} onClose={onClose} title={avatar?.name ?? 'Imagem gerada'} size="lg">
      {avatar && <img src={avatar.image_url} alt={avatar.name} className="mx-auto max-h-[72vh] w-auto rounded-xl object-contain" />}
    </Modal>
  );
}
