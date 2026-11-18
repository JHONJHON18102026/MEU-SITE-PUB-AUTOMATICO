import clsx from 'clsx';

/**
 * Logo oficial FUTURO DIGITAL branca/prata transparente (v4).
 * No Tema Claro recebe selo escuro discreto para manter 100% de leitura.
 */
export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div
      className={clsx(
        'group inline-flex items-center gap-2 select-none rounded-xl transition-all duration-200 ease-out hover:scale-[1.06] hover:shadow-md',
        'bg-[#0e1018] px-2.5 py-1.5 text-white shadow-sm ring-1 ring-black/10',
        'dark:bg-transparent dark:px-0 dark:py-0 dark:shadow-none dark:ring-0',
        compact && 'px-1.5 py-1 dark:p-0',
        className,
      )}
    >
      <img
        src="/brand/fd-emblema-v4.png"
        alt="FUTURO DIGITAL"
        className="h-7 w-auto drop-shadow-[0_1px_6px_rgba(99,102,241,0.35)]"
      />
      {!compact && (
        <div className="leading-none">
          <div className="text-[13px] font-black tracking-wide text-white">FUTURO</div>
          <div className="text-[10px] font-extrabold tracking-[0.22em] text-indigo-300">DIGITAL</div>
        </div>
      )}
    </div>
  );
}

/** Versão empilhada completa branca transparente (login, loader e marca d'água). */
export function BrandFullMark({ className = 'h-24 w-auto' }: { className?: string }) {
  return (
    <div
      className={clsx(
        'group inline-flex items-center justify-center rounded-2xl transition-all duration-200 ease-out hover:scale-[1.06] hover:shadow-lg',
        'bg-[#0e1018] p-3 shadow-md ring-1 ring-black/10',
        'dark:bg-transparent dark:p-0 dark:shadow-none dark:ring-0',
      )}
    >
      <img
        src="/brand/fd-logo-v4.png"
        alt="FUTURO DIGITAL"
        className={clsx('w-auto select-none', className)}
      />
    </div>
  );
}

/** Moeda de crédito (ícone próprio, sem usar arte de terceiros). */
export function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={clsx('size-4', className)} aria-hidden>
      <defs>
        <linearGradient id="fd-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd75e" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#fd-coin)" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#b45309" strokeOpacity=".45" strokeWidth="1.4" />
      <path d="M10 8.5h4.2M10 8.5v7M10 12h3.2" stroke="#7c2d12" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
