import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Globe2, ImagePlus, Lock, Shuffle, Sparkles, X } from 'lucide-react';
import { ATTRIBUTE_GROUPS, type AttributeGroup } from '@shared/attributes';
import { avatarCost } from '@shared/contracts';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CoinIcon } from '@/components/ui/Brand';
import { useAvatarStudio } from './avatarStore';
import { ImagePicker } from './ImagePicker';
import { MotionPanel } from './MotionPanel';

const WORLD_EXAMPLES = [
  'Mora em São Paulo, trabalha de casa, ama café e academia às 6h. Grava vídeos na cozinha clara e no quarto com luz natural.',
  'Avó mineira que ensina receitas naturais. Casa de interior com fogão a lenha, horta no quintal e cachorro caramelo.',
  'Empresário jovem, escritório moderno com vista da cidade, estilo minimalista, fala de produtividade e finanças.',
];

function GroupSection({ group }: { group: AttributeGroup }) {
  const { selection, openGroups, toggleGroup, toggleOption } = useAvatarStudio();
  const open = openGroups.includes(group.id);
  const selected = selection[group.id] ?? [];
  const hasSwatch = group.options.some((o) => o.swatch);
  const hasEmoji = group.options.some((o) => o.emoji || o.image);
  const firstSelectedLabel = selected.length ? group.options.find((o) => o.id === selected[0])?.label : null;

  return (
    <section className="rounded-2xl bg-surface-2/65 ring-1 ring-inset ring-border">
      <button
        type="button"
        onClick={() => toggleGroup(group.id)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-fg-muted hover:text-fg"
      >
        <span className="shrink-0">
          {group.label} <span className="opacity-75">· {group.options.length}</span>
          {group.multi && <span className="ml-1 text-[10px] text-fg-subtle">(vários)</span>}
        </span>
        {!open && firstSelectedLabel && (
          <span className="ml-1 min-w-0 truncate text-xs font-semibold text-accent">
            {firstSelectedLabel}
            {selected.length > 1 ? ` +${selected.length - 1}` : ''}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {selected.length > 0 && (
            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">{selected.length}</span>
          )}
          {open ? <ChevronDown className="size-4 text-fg-subtle" /> : <ChevronRight className="size-4 text-fg-subtle" />}
        </span>
      </button>
      {open && (
        <div className={clsx('grid px-2 pb-2', hasEmoji ? 'grid-cols-3 gap-1.5' : 'grid-cols-2 gap-1.5')} role="group" aria-label={group.label}>
          {group.options.map((opt) => {
            const active = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleOption(group.id, opt.id)}
                className={clsx(
                  opt.image
                    ? clsx(
                        'flex h-[86px] flex-col items-center justify-between overflow-hidden rounded-[10px] border-2 bg-white p-[3px] text-center text-[#171717] transition-all',
                        active
                          ? 'border-[#845cff] shadow-[0_0_0_2px_rgba(132,92,255,0.28)]'
                          : 'border-transparent hover:border-[#845cff]/50',
                      )
                    : clsx(
                        'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition-all',
                        hasEmoji && 'flex-col justify-center py-2 text-center',
                        active ? 'border-accent bg-accent-soft text-fg ring-brand' : 'border-border/70 bg-surface hover:border-fg-subtle/50',
                      ),
                )}
              >
                {opt.image ? (
                  <img src={opt.image} alt="" decoding="async" className="h-[62px] w-full rounded-[6px] bg-[#f5f6f7] object-cover object-top" />
                ) : (
                  opt.emoji && <span className="text-xl leading-none" aria-hidden>{opt.emoji}</span>
                )}
                {hasSwatch && opt.swatch && (
                  <span className="size-4 shrink-0 rounded-full border border-black/20" style={{ background: opt.swatch }} aria-hidden />
                )}
                <span className={clsx('leading-tight', opt.image && 'w-full truncate px-0.5 text-[10px] font-semibold tracking-tight text-[#171717]')}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function AttributePanel({ onGenerate, busy, forceMotion = false }: { onGenerate: () => void; busy: boolean; forceMotion?: boolean }) {
  const st = useAvatarStudio();
  const motionActive = forceMotion || st.panelTab === 'motion';
  const [worldOpen, setWorldOpen] = useState(false);
  const [worldDraft, setWorldDraft] = useState(st.characterWorld);
  const [extraOpen, setExtraOpen] = useState(Boolean(st.extraDetails));
  const cost = avatarCost(st.count);
  const activeFacePreview = st.basePhoto?.previewUrl ?? st.baseAvatar?.image_url ?? null;
  const activeFaceLabel = st.basePhoto ? 'Foto base enviada' : st.baseAvatar ? st.baseAvatar.name : null;

  return (
    <aside
      className="order-2 flex w-full flex-col border-t border-accent/20 bg-[linear-gradient(180deg,#181525,#111019)] shadow-[0_18px_42px_rgba(0,0,0,.22)] lg:order-1 lg:mt-[18px] lg:ml-2 lg:mr-0 lg:mb-0 lg:h-[calc(100%-18px)] lg:w-[320px] lg:shrink-0 lg:overflow-hidden lg:rounded-t-2xl lg:rounded-b-none lg:border-none lg:ring-1 lg:ring-accent/20"
      aria-label="Criar influencer"
    >
      <div className="shrink-0 px-3 pb-5 pt-3 text-center">
        <p className="text-[10px] font-medium text-fg-muted">Crie seu próprio personagem com</p>
        <h1 className="mt-0.5 text-[24px] font-black uppercase leading-none tracking-tight text-fg">
          INFLUENCER IA
        </h1>
        <div className="mt-2.5 grid grid-cols-2 rounded-xl bg-surface-2/80 p-1 text-xs font-semibold" role="tablist">
          <button
            role="tab"
            aria-selected={st.panelTab === 'create'}
            onClick={() => st.set({ panelTab: 'create' })}
            className={clsx('rounded-lg py-1.5 transition', st.panelTab === 'create' ? 'bg-bg text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
          >
            Criar Influencer
          </button>
          <button
            role="tab"
            aria-selected={motionActive}
            onClick={() => st.set({ panelTab: 'motion' })}
            className={clsx('rounded-lg py-1.5 transition', st.panelTab === 'motion' ? 'bg-bg text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
          >
            Motion
          </button>
        </div>
      </div>

      {motionActive ? (
        <MotionPanel onBack={() => st.set({ panelTab: 'create' })} />
      ) : (
        <>
          <div className="max-h-[50vh] min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 pb-2.5 pt-1.5 thin-scroll lg:max-h-none">
            {/* Foto ou avatar base sincronizado com o slot AVATAR */}
            {activeFacePreview ? (
              <div className="flex items-center gap-3 rounded-2xl border border-accent/50 bg-accent-soft p-2.5">
                <img src={activeFacePreview} alt="Rosto base ativo" className="size-12 rounded-xl object-cover object-top" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{activeFaceLabel}</div>
                  <div className="text-[11px] text-fg-muted">A IA vai manter este rosto.</div>
                </div>
                <button
                  onClick={() => st.set({ basePhoto: null, baseAvatar: null })}
                  className="rounded-lg p-1.5 hover:bg-surface-2"
                  aria-label="Remover foto base"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <ImagePicker
                label="Envie sua foto"
                testId="base-photo-input"
                onPicked={(img) => st.set({ basePhoto: img, baseAvatar: null })}
                className="relative flex h-24 w-full items-center justify-center gap-2.5 rounded-2xl border border-dashed border-border bg-surface-2/40 px-3 text-[13px] font-semibold transition hover:border-accent/60"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-surface-3">
                  <ImagePlus className="size-3.5 text-fg-muted" />
                </span>
                <span>Envie sua foto</span>
                <span className="absolute right-2.5 top-2 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-medium text-fg-muted">
                  Opcional
                </span>
              </ImagePicker>
            )}

            {/* Mundo do personagem */}
            <button
              type="button"
              onClick={() => {
                setWorldDraft(st.characterWorld);
                setWorldOpen(true);
              }}
              className="mb-1 flex w-full items-center gap-2.5 rounded-2xl bg-surface-2/65 px-2.5 py-2.5 text-left ring-1 ring-inset ring-border transition hover:ring-accent/50"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Globe2 className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">Mundo do personagem</span>
                <span className="block truncate text-[11px] text-fg-muted">
                  {st.characterWorld || 'Elenco, locais, rotina e ganchos do dia'}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-medium text-fg-muted">
                {st.characterWorld ? 'Editar' : 'Opcional'}
              </span>
              <ChevronRight className="size-4 shrink-0 text-fg-subtle" />
            </button>

            {ATTRIBUTE_GROUPS.map((g) => (
              <GroupSection key={g.id} group={g} />
            ))}

            {/* Detalhes extras */}
            <section className="rounded-2xl bg-surface-2/65 ring-1 ring-inset ring-border">
              <button
                type="button"
                onClick={() => setExtraOpen((v) => !v)}
                aria-expanded={extraOpen}
                className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] font-medium text-fg-muted hover:text-fg"
              >
                Detalhes extras
                {extraOpen ? <ChevronDown className="size-4 text-fg-subtle" /> : <ChevronRight className="size-4 text-fg-subtle" />}
              </button>
              {extraOpen && (
                <div className="px-2.5 pb-2.5">
                  <textarea
                    value={st.extraDetails}
                    onChange={(e) => st.set({ extraDetails: e.target.value })}
                    maxLength={800}
                    rows={3}
                    aria-label="Detalhes extras"
                    placeholder="Ex.: camiseta branca básica, fundo de estúdio cinza, expressão confiante"
                    className="w-full resize-none rounded-xl border border-border bg-surface p-2.5 text-xs outline-none focus:border-accent"
                  />
                </div>
              )}
            </section>
          </div>

          <div className="shrink-0 space-y-2 border-t border-border/70 bg-surface/95 px-3 pb-3 pt-2.5 backdrop-blur">
            <div className="flex items-center justify-between gap-2 text-[11px] text-fg-muted">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={st.makePublic}
                  onChange={(e) => st.set({ makePublic: e.target.checked })}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <span className="flex max-w-[210px] items-start gap-1.5 leading-snug">
                  {st.makePublic ? <Globe2 className="size-3.5 shrink-0" /> : <Lock className="size-3.5 shrink-0" />}
                  {st.makePublic ? 'Mostrar na Comunidade (aba Explorar)' : 'Fica pública na Comunidade. Criação privada nos planos pagos.'}
                </span>
              </label>
              <button
                type="button"
                onClick={st.resetSelection}
                aria-label="Limpar escolhas"
                className="shrink-0 text-[10px] font-medium text-fg-subtle hover:text-fg"
              >
                Limpar
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={st.randomize}
                aria-label="Sortear características"
                title="Aleatório"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-neutral-900 shadow-sm transition hover:bg-neutral-100 active:scale-95"
              >
                <Shuffle className="size-5" />
              </button>
              <button
                type="button"
                onClick={onGenerate}
                disabled={busy}
                data-testid="generate-from-panel"
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 disabled:opacity-60"
              >
                <span>{busy ? 'Gerando…' : 'Gerar'}</span>
                <Sparkles className="size-4" />
                <span className="inline-flex items-center gap-1 text-sm font-bold">
                  <CoinIcon className="size-4" />
                  {cost}
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={worldOpen}
        onClose={() => setWorldOpen(false)}
        title="Mundo do personagem"
        description="Quem é, onde vive, rotina, pessoas ao redor e ganchos de conteúdo. A IA usa isso para criar cenas coerentes."
        footer={
          <>
            <Button variant="ghost" onClick={() => setWorldOpen(false)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => {
                st.set({ characterWorld: worldDraft.trim() });
                setWorldOpen(false);
              }}
            >
              Salvar
            </Button>
          </>
        }
      >
        <textarea
          value={worldDraft}
          onChange={(e) => setWorldDraft(e.target.value)}
          maxLength={1200}
          rows={6}
          aria-label="Descrição do mundo do personagem"
          placeholder="Descreva o mundo do seu personagem…"
          className="w-full resize-none rounded-xl border border-border bg-surface-2 p-3 text-sm outline-none focus:border-accent"
        />
        <div className="mt-1 text-right text-xs text-fg-subtle">{worldDraft.length}/1200</div>
        <div className="mt-3 text-xs font-semibold text-fg-muted">Exemplos (clique para usar):</div>
        <div className="mt-2 space-y-2">
          {WORLD_EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setWorldDraft(ex)}
              className="w-full rounded-xl border border-border bg-surface-2/60 p-3 text-left text-xs text-fg-muted hover:border-accent/50 hover:text-fg"
            >
              {ex}
            </button>
          ))}
        </div>
      </Modal>
    </aside>
  );
}
