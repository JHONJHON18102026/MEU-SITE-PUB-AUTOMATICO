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
  brand: 'border border-white/20 bg-gradient-to-br from-[#a88aff] via-[#8759ff] to-[#6541df] text-white shadow-[0_12px_28px_rgba(121,85,232,0.34),inset_0_1px_0_rgba(255,255,255,.24)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_16px_34px_rgba(121,85,232,0.42)]',
  primary: 'border border-accent-light/35 bg-gradient-to-br from-accent to-[#6946db] text-accent-fg shadow-[0_10px_24px_rgba(138,97,255,0.26),inset_0_1px_0_rgba(255,255,255,.16)] hover:-translate-y-0.5 hover:brightness-110',
  secondary: 'border border-white/15 bg-[linear-gradient(145deg,var(--surface-hover),var(--surface))] text-fg shadow-[0_6px_18px_rgba(0,0,0,.16),inset_0_1px_0_rgba(255,255,255,.05)] hover:-translate-y-px hover:border-accent/55 hover:bg-[var(--surface-hover)] hover:text-white',
  ghost: 'border border-transparent text-fg-muted hover:border-white/10 hover:bg-white/[.06] hover:text-fg',
  danger: 'border border-danger/30 bg-gradient-to-br from-danger/15 to-danger/5 text-danger shadow-[inset_0_1px_0_rgba(255,255,255,.04)] hover:border-danger/55 hover:bg-danger/20',
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
        'inline-flex items-center justify-center font-semibold transition-[transform,border-color,background-color,box-shadow,color,filter] duration-150 ease-out select-none',
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
