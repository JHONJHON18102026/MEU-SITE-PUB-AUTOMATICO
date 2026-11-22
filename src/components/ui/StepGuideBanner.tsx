import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Compass, Wand2, X } from 'lucide-react';
import { UGC_GUIDES } from '@shared/ugcCatalog';

export function highlightGuideTarget(target: string) {
  const el = document.querySelector<HTMLElement>(`[data-guide-target="${target}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('guide-spotlight');
  setTimeout(() => el.classList.remove('guide-spotlight'), 2400);
}

/**
 * Guia discreto do FUTURO DIGITAL: vidro escuro, passos em linha e botão Mostrar onde.
 */
export function StepGuideBanner({
  guideKey,
  currentStep = 0,
}: {
  guideKey: keyof typeof UGC_GUIDES;
  currentStep?: number;
}) {
  const guide = UGC_GUIDES[guideKey];
  const [open, setOpen] = useState(true);
  const [stepIdx, setStepIdx] = useState(currentStep);

  useEffect(() => {
    setStepIdx(Math.min(currentStep, guide.steps.length - 1));
  }, [currentStep, guide.steps.length]);

  const active = guide.steps[stepIdx] ?? guide.steps[0]!;

  if (!open) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface/60 px-2.5 py-1 text-[11px] font-medium text-fg-muted hover:text-fg"
        >
          <Compass className="size-3.5 text-accent" /> Ver guia
        </button>
      </div>
    );
  }

  return (
    <div className={clsx(
      'rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(25,24,39,.96),rgba(16,15,24,.96))] shadow-[0_16px_40px_rgba(0,0,0,.16)] dark:border-[#34295b]',
      guideKey === 'link' || guideKey === 'talking' || guideKey === 'slideshows' || guideKey === 'viral' ? 'p-4' : 'px-3.5 py-2.5',
    )} data-testid={`guide-${guideKey}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={clsx('flex items-center gap-2 font-semibold text-fg', guideKey === 'link' || guideKey === 'talking' || guideKey === 'slideshows' || guideKey === 'viral' ? 'text-base' : 'text-xs')}>
          <Compass className="size-3.5 text-accent" />
          {guide.title}
        </div>
        <div className="flex items-center gap-3.5 text-[11px]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"
          >
            <X className="size-3.5" /> Fechar guia
          </button>
        </div>
      </div>

      <div className={clsx('flex flex-wrap items-center gap-x-4 gap-y-1', guideKey === 'link' || guideKey === 'talking' || guideKey === 'slideshows' || guideKey === 'viral' ? 'mt-3' : 'mt-2')}>
        {guide.steps.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setStepIdx(i)}
            className={clsx(
              'inline-flex items-center gap-1.5 text-[11px] transition-colors',
              i === stepIdx ? 'font-semibold text-fg' : 'text-fg-subtle hover:text-fg-muted',
            )}
          >
            <span
              className={clsx(
                'grid size-4 place-items-center rounded-full border text-[9px] font-bold',
                i === stepIdx ? 'border-accent bg-accent-soft text-accent' : 'border-border text-fg-subtle',
              )}
            >
              {i + 1}
            </span>
            {s.title}
          </button>
        ))}
      </div>

      <div className={clsx(
        'flex flex-wrap items-center justify-between rounded-xl border border-white/10 bg-black/10',
        guideKey === 'link' || guideKey === 'talking' || guideKey === 'slideshows' || guideKey === 'viral' ? 'mt-3 min-h-[104px] gap-3 px-3 py-3' : 'mt-2 gap-2.5 px-3 py-2',
      )}>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent dark:text-[#976dff]">
            Passo {stepIdx + 1} de {guide.steps.length}
          </div>
          <div className={clsx('text-fg-muted', guideKey === 'link' || guideKey === 'talking' || guideKey === 'slideshows' || guideKey === 'viral' ? 'text-sm leading-relaxed' : 'text-xs')}>{active.desc}</div>
        </div>
        <button
          type="button"
          onClick={() => highlightGuideTarget(active.target)}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7955e8] to-[#986cff] px-3 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(121,85,232,.22)] transition hover:-translate-y-0.5 hover:brightness-110"
        >
          <Wand2 className="size-3.5" /> Mostrar onde
        </button>
      </div>
    </div>
  );
}
