import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

type Variant = 'brand' | 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  brand: 'bg-gradient-to-r from-[#7955e8] to-[#986cff] text-white shadow-[0_8px_24px_rgba(121,85,232,0.24)] hover:-translate-y-0.5 hover:brightness-110',
  primary: 'bg-accent text-accent-fg shadow-[0_8px_20px_rgba(138,97,255,0.18)] hover:-translate-y-0.5 hover:brightness-110',
  secondary: 'border border-white/10 bg-surface text-fg shadow-[0_6px_18px_rgba(0,0,0,.12)] hover:border-accent/40 hover:bg-[var(--surface-hover)]',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'border border-danger/20 bg-danger/10 text-danger hover:border-danger/40 hover:bg-danger/20',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5 rounded-[7px]',
  md: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-[8px]',
  lg: 'h-10 px-4 text-sm gap-2 rounded-[9px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
