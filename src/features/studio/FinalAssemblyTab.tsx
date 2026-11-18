import { useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle2, Clock, Download, Scissors, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useProjectsData } from '@/features/projects/previewProjectsStore';
import { STUDIO_CAPTION_STYLES } from '@shared/ugcCatalog';
import type { VideoProjectDTO } from '@shared/ugcContracts';

export function FinalAssemblyTab({
  captionStyle,
  onChangeCaptionStyle,
  onSendToSchedule,
}: {
  captionStyle: string;
  onChangeCaptionStyle: (styleId: string) => void;
  onSendToSchedule: (opts: { video: VideoProjectDTO | null; title: string; thumb: string; trimFooter: boolean; normalizeVoice: boolean }) => void;
}) {
  const { projects } = useProjectsData();
  const [selectedId, setSelectedId] = useState<string>('');
  const [trimFooter, setTrimFooter] = useState(false);
  const [normalizeVoice, setNormalizeVoice] = useState(true);

  const selected = projects.find((p) => p.id === selectedId) ?? projects[0] ?? null;
  const activeStyle = STUDIO_CAPTION_STYLES.find((s) => s.id === captionStyle) ?? STUDIO_CAPTION_STYLES[5]!;
  const previewThumb = selected?.thumbnail_url || '/showcase/modelo-01.webp';
  const sampleLine = selected?.scenes?.[0]?.text || 'Olha esse resultado real em poucos dias de uso!';

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Coluna esquerda: Player 9:16 + Auditoria */}
      <aside className="space-y-4 rounded-2xl border border-border bg-surface p-4 h-fit">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black tracking-wider text-fg-muted">MONTAGEM FINAL</span>
          <span className="rounded bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">Qualidade OK</span>
        </div>

        {projects.length > 0 && (
          <select
            value={selected?.id ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
            aria-label="Selecionar vídeo para montagem final"
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-semibold outline-none focus:border-accent"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}

        <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-surface-2">
          <img
            src={previewThumb}
            alt={selected?.title ?? 'Prévia'}
            className={clsx('h-full w-full object-cover object-top transition-transform', trimFooter && 'scale-[1.06] -translate-y-2')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
          <div className="absolute inset-x-4 bottom-12 text-center">
            <span className={clsx('inline-block rounded-xl px-3 py-1.5 text-sm leading-tight', activeStyle.badgeClass)}>
              {sampleLine.slice(0, 56)}
            </span>
          </div>
          <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between text-[10px] text-white/80">
            <span>Estilo: <strong>{activeStyle.label}</strong></span>
            <span>{normalizeVoice ? 'Áudio nivelado ✓' : 'Áudio original'}</span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <label className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2 cursor-pointer">
            <span className="inline-flex items-center gap-2 font-semibold">
              <Scissors className="size-3.5 text-accent" /> Cortar rodapé
            </span>
            <input type="checkbox" checked={trimFooter} onChange={(e) => setTrimFooter(e.target.checked)} className="accent-[var(--accent)]" />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2 cursor-pointer">
            <span className="inline-flex items-center gap-2 font-semibold">
              <Volume2 className="size-3.5 text-accent" /> Padronizar voz
            </span>
            <input type="checkbox" checked={normalizeVoice} onChange={(e) => setNormalizeVoice(e.target.checked)} className="accent-[var(--accent)]" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {selected?.video_url ? (
            <a
              href={selected.video_url}
              download={`studio-${selected.id.slice(0, 8)}.mp4`}
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-2 text-xs font-bold hover:border-accent/60"
            >
              <Download className="size-3.5" /> Baixar
            </a>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => toast.info('Gere o MP4 com sua API key no .env para baixar.')}>
              <Download className="size-3.5" /> Baixar
            </Button>
          )}
          <Button
            variant="brand"
            size="sm"
            onClick={() =>
              onSendToSchedule({
                video: selected,
                title: selected?.title || 'Vídeo do Studio',
                thumb: previewThumb,
                trimFooter,
                normalizeVoice,
              })
            }
          >
            <CalendarClock className="size-3.5" /> Agendar →
          </Button>
        </div>
      </aside>

      {/* Coluna direita: 12 estilos de legenda + Auditoria + Prazos */}
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-surface p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black">12 ESTILOS DE LEGENDA NA MONTAGEM FINAL</h3>
              <p className="text-xs text-fg-muted">Clique em qualquer estilo para ver a mudança instantânea no player à esquerda.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast.success(`Estilo "${activeStyle.label}" salvo para a montagem final!`)}
            >
              <Sparkles className="size-3.5 text-accent" /> Trocar estilo da legenda
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {STUDIO_CAPTION_STYLES.map((st) => {
              const active = captionStyle === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  data-testid={`caption-style-${st.id}`}
                  onClick={() => onChangeCaptionStyle(st.id)}
                  className={clsx(
                    'flex flex-col items-center justify-between gap-2 rounded-2xl border p-3 text-center transition-all',
                    active ? 'border-accent bg-accent-soft/60 ring-brand' : 'border-border bg-surface-2 hover:border-fg-subtle',
                  )}
                >
                  <div className="grid h-10 w-full place-items-center rounded-lg bg-[#141620] px-2">
                    <span className={clsx('rounded px-2 py-0.5 text-[11px]', st.badgeClass)}>Aa Bb</span>
                  </div>
                  <span className="text-xs font-bold">{st.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-2 text-xs">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-success" /> Auditoria de Qualidade
            </div>
            <ul className="space-y-1 text-fg-muted">
              <li>• Gancho visual nos primeiros 3 segundos</li>
              <li>• Legibilidade das legendas fora das áreas cobertas por botões</li>
              <li>• Ritmo entre takes ~8s e áudio nivelado</li>
            </ul>
          </div>

          <div className="badge-warn rounded-2xl border p-4 space-y-2 text-xs">
            <div className="font-bold flex items-center gap-1.5">
              <Clock className="size-4" /> Janela de Edição e Retenção
            </div>
            <p className="text-fg-muted">
              Você pode editar/refazer cenas individuais em até <strong className="text-fg">4 dias</strong> e o vídeo completo fica guardado por <strong className="text-fg">15 dias</strong> (ou +7 após postar).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
