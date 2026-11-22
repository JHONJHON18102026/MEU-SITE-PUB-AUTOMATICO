import { useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { prepareImage, type PreparedImage } from '@/lib/image';

/** Envolve qualquer botão e abre o seletor de arquivo de imagem. */
export function ImagePicker({
  onPicked,
  children,
  label,
  className,
  disabled,
  testId,
  multiple,
  onPickedMany,
}: {
  onPicked: (img: PreparedImage) => void;
  children: ReactNode;
  label: string;
  className?: string;
  disabled?: boolean;
  testId?: string;
  multiple?: boolean;
  onPickedMany?: (imgs: PreparedImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        data-testid={testId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        multiple={multiple}
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (!files.length) return;
          try {
            const images = await Promise.all(files.map((file) => prepareImage(file)));
            if (onPickedMany) onPickedMany(images);
            else if (images[0]) onPicked(images[0]);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Não consegui abrir essa imagem.');
          }
        }}
      />
    </>
  );
}
