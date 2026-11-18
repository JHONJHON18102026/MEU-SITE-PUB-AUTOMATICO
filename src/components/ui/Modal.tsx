import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}

/** Janela modal acessível: fecha com Esc/clique fora e prende o foco dentro. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('hidden') && element.getClientRects().length > 0);
      if (!focusable.length) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-layer fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="modal-backdrop absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={clsx(
          'modal-panel relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#191827_0%,#111019_100%)] shadow-[0_30px_100px_rgba(0,0,0,.48)] outline-none',
          size === 'md' && 'max-w-lg',
          size === 'lg' && 'max-w-3xl',
          size === 'xl' && 'max-w-5xl',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/[0.02] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-fg-subtle transition hover:border-accent/40 hover:bg-accent-soft hover:text-fg"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4 thin-scroll">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-white/10 bg-black/10 px-5 py-3.5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
