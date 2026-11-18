import clsx from 'clsx';
import { ImagePlus, X } from 'lucide-react';
import { SHOWCASE_AVATARS } from './showcaseExamples';
import { useMyAvatars } from './useAvatarData';
import { ImagePicker } from './ImagePicker';
import type { PreparedImage } from '@/lib/image';

export interface SelectedVisualSource {
  label: string;
  previewUrl: string;
  uploaded: PreparedImage | null;
}

/**
 * Seletor reutilizável de rosto/personagem ou imagem base:
 * modelos prontos, "Meus avatares" ou upload direto do dispositivo.
 */
export function QuickAvatarSelect({
  value,
  onChange,
  compact = false,
}: {
  value: SelectedVisualSource;
  onChange: (next: SelectedVisualSource) => void;
  compact?: boolean;
}) {
  const { data: myAvatars } = useMyAvatars();
  const options = [
    ...myAvatars.slice(0, 4).map((a) => ({ id: a.id, label: a.name, url: a.image_url })),
    ...SHOWCASE_AVATARS.slice(0, 6).map((a) => ({ id: a.id, label: a.name, url: a.image_url })),
  ];

  return (
    <div className="space-y-2">
      {value.uploaded && (
        <div className="flex items-center gap-2.5 rounded-xl border border-accent/50 bg-accent-soft p-2">
          <img src={value.uploaded.previewUrl} alt="" className="size-10 rounded-lg object-cover object-top" />
          <div className="min-w-0 flex-1 text-xs">
            <div className="truncate font-semibold">{value.uploaded.name}</div>
            <div className="text-fg-muted">Foto enviada do aparelho</div>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                label: SHOWCASE_AVATARS[0]!.name,
                previewUrl: SHOWCASE_AVATARS[0]!.image_url,
                uploaded: null,
              })
            }
            className="rounded-lg p-1 hover:bg-surface-2"
            aria-label="Remover foto enviada"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className={clsx('grid gap-2', compact ? 'grid-cols-4' : 'grid-cols-5 sm:grid-cols-6')}>
        {options.slice(0, compact ? 3 : 5).map((item) => {
          const active = !value.uploaded && value.previewUrl === item.url;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange({ label: item.label, previewUrl: item.url, uploaded: null })}
              className={clsx(
                'overflow-hidden rounded-xl border text-left transition-all',
                active ? 'border-accent ring-brand' : 'border-border hover:border-fg-subtle',
              )}
              title={item.label}
            >
              <img src={item.url} alt={item.label} className="aspect-[3/4] w-full object-cover object-top" />
            </button>
          );
        })}

        <ImagePicker
          label="Enviar foto"
          onPicked={(img) => onChange({ label: img.name, previewUrl: img.previewUrl, uploaded: img })}
          className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface-2/60 p-1.5 text-center text-[10px] font-semibold text-fg-muted hover:border-accent/60 hover:text-fg"
        >
          <ImagePlus className="size-4 text-accent" />
          Enviar
        </ImagePicker>
      </div>
    </div>
  );
}
