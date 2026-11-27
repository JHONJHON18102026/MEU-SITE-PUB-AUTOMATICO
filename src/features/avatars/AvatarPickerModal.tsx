import type { AvatarDTO } from '@shared/contracts';
import { Modal } from '@/components/ui/Modal';
import { useMyAvatars } from './useAvatarData';
import { SHOWCASE_AVATARS } from './showcaseExamples';
import { avatarCardName } from './avatarCardName';

function PickerGrid({ items, onPick }: { items: AvatarDTO[]; onPick: (avatar: AvatarDTO) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {items.map((a) => (
        <button key={a.id} onClick={() => onPick(a)} className="group relative overflow-hidden rounded-xl border border-border hover:border-accent">
          <img src={a.thumbnail_url ?? a.image_url} alt={avatarCardName(a)} className="aspect-[3/4] w-full object-cover object-top transition group-hover:scale-105" loading="lazy" decoding="async" />
          <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 text-left text-[11px] font-semibold text-white">
            {avatarCardName(a)}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Escolher um dos meus influencers ou modelos prontos para usar como rosto base. */
export function AvatarPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (avatar: AvatarDTO) => void;
}) {
  const { data, loading } = useMyAvatars();
  return (
    <Modal open={open} onClose={onClose} title="Escolher influencer" description="O rosto escolhido será mantido na nova imagem e no vídeo." size="lg">
      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          {data.length > 0 && (
            <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-subtle">Meus Avatares</h3>
              <PickerGrid items={data} onPick={onPick} />
            </div>
          )}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-subtle">Presets de Avatares</h3>
            <PickerGrid items={SHOWCASE_AVATARS} onPick={onPick} />
          </div>
        </div>
      )}
    </Modal>
  );
}
