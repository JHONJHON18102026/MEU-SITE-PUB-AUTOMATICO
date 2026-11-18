import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';

/** Gancho simples: fecha quando clica fora ou aperta Esc. */
export function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

export interface SelectOption<V extends string> {
  value: V;
  label: string;
  hint?: string;
  disabled?: boolean;
}

interface PillSelectProps<V extends string> {
  value: V;
  options: SelectOption<V>[];
  onChange: (v: V) => void;
  icon?: ReactNode;
  label: string;
  placement?: 'top' | 'bottom';
  className?: string;
}

/** Botão-pílula que abre uma lista de opções (motor, enquadramento, proporção…). */
export function PillSelect<V extends string>({
  value,
  options,
  onChange,
  icon,
  label,
  placement = 'top',
  className,
}: PillSelectProps<V>) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-white/10 bg-surface px-2.5 text-[11px] font-semibold text-fg-muted shadow-sm transition hover:border-accent/40 hover:bg-surface-3/70 hover:text-fg"
      >
        {icon}
        <span>{current?.label ?? label}</span>
        <ChevronDown className="size-3 opacity-70" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className={clsx(
            'absolute left-0 z-40 min-w-48 rounded-xl border border-white/10 bg-[#171622] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,.38)]',
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                disabled={opt.disabled}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-accent-soft disabled:opacity-40"
              >
                <span>
                  <span className="font-medium">{opt.label}</span>
                  {opt.hint && <span className="block text-xs text-fg-subtle">{opt.hint}</span>}
                </span>
                {opt.value === value && <Check className="size-4 text-accent" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
