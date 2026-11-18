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
}: {
  onPicked: (img: PreparedImage) => void;
  children: ReactNode;
  label: string;
  className?: string;
  disabled?: boolean;
  testId?: string;
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
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            onPicked(await prepareImage(file));
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Não consegui abrir essa imagem.');
          }
        }}
      />
    </>
  );
}
