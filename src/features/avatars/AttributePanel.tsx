import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Globe2, ImagePlus, LoaderCircle, Lock, Minus, Plus, Shuffle, Sparkles, X } from 'lucide-react';
import { ATTRIBUTE_GROUPS, type AttributeGroup } from '@shared/attributes';
import { MAX_IMAGES_PER_REQUEST, avatarCost } from '@shared/contracts';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Brand';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { ApiClientError, api } from '@/lib/api';
import { useAvatarStudio } from './avatarStore';
import { ImagePicker } from './ImagePicker';
import { AvatarTemplatesPanel } from './AvatarTemplatesPanel';

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

export function AttributePanel({ onGenerate, busy }: { onGenerate: () => void; busy: boolean }) {
  const st = useAvatarStudio();
  const [characterModalOpen, setCharacterModalOpen] = useState(false);
  const [characterDraft, setCharacterDraft] = useState(st.extraDetails);
  const [worldDraft, setWorldDraft] = useState(st.characterWorld);
  const [buildingCharacterPrompt, setBuildingCharacterPrompt] = useState(false);
  const activeFacePreview = st.basePhoto?.previewUrl ?? st.baseAvatar?.image_url ?? null;
  const activeFaceLabel = st.basePhoto ? 'Foto base enviada' : st.baseAvatar ? st.baseAvatar.name : null;
  const cost = avatarCost(st.attributeCount);

  async function buildCharacterPrompt() {
    if (characterDraft.trim().length < 3) {
      toast.info('Descreva a ideia do personagem para montar o prompt.');
      return;
    }
    setBuildingCharacterPrompt(true);
    try {
      const { prompt } = await api.enhanceCharacterPrompt({
        description: characterDraft.trim(),
        attributes: st.selection as Record<string, string[]>,
        characterWorld: worldDraft.trim(),
        hasBasePhoto: Boolean(st.basePhoto || st.baseAvatar),
      });
      setCharacterDraft(prompt);
      toast.success('Prompt do personagem montado. Nenhum crédito foi consumido.');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Não consegui montar o prompt do personagem.');
    } finally {
      setBuildingCharacterPrompt(false);
    }
  }

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
        <div className="mt-2.5 grid grid-cols-2 rounded-xl bg-surface-2/80 p-1 text-xs font-semibold" role="tablist" aria-label="Personalização e templates">
          <button
            type="button"
            role="tab"
            aria-selected={st.panelTab === 'create'}
            onClick={() => st.set({ panelTab: 'create' })}
            className={clsx('rounded-lg py-1.5 transition', st.panelTab === 'create' ? 'bg-bg text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
          >
            Criar Influencer
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={st.panelTab === 'templates'}
            onClick={() => st.set({ panelTab: 'templates' })}
            className={clsx('rounded-lg py-1.5 transition', st.panelTab === 'templates' ? 'bg-bg text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
          >
            Templates IA
          </button>
        </div>
        <div className="mt-1 flex justify-center">
          <button
            type="button"
            role="switch"
            aria-label="Aplicar opções da lateral ao canvas"
            aria-checked={st.useInfluencerPreset}
            title={st.useInfluencerPreset ? 'Personalização da lateral ativada' : 'Personalização da lateral desativada'}
            onClick={() => st.set({ useInfluencerPreset: !st.useInfluencerPreset })}
            className={clsx('relative h-[18px] w-8 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg', st.useInfluencerPreset ? 'bg-accent' : 'bg-surface-3')}
          >
          <span className={clsx('absolute top-0.5 size-3.5 rounded-full bg-white shadow transition-transform', st.useInfluencerPreset ? 'translate-x-[15px]' : 'translate-x-0.5')} />
          </button>
        </div>
      </div>

      <div className={clsx('min-h-0 flex-1 flex-col', st.panelTab === 'templates' ? 'flex' : 'hidden')}>
        <AvatarTemplatesPanel />
      </div>
      {st.panelTab !== 'templates' && (
        <>
          {!st.useInfluencerPreset && (
            <p role="status" className="mx-3 mb-2 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-[11px] leading-relaxed text-fg-muted">
              Painel desativado. Ligue a chave acima para editar e validar o influencer.
            </p>
          )}
          <fieldset disabled={!st.useInfluencerPreset} className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col border-0 p-0 disabled:opacity-50">
          <div className="max-h-[50vh] min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 pb-2.5 pt-1.5 thin-scroll lg:max-h-none">
            {/* Foto ou influencer base sincronizado com o slot INFLUENCER */}
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

            {/* A skill de personalização fica no mesmo fluxo do campo de criação. */}
            <button
              type="button"
              onClick={() => {
                setCharacterDraft(st.extraDetails);
                setWorldDraft(st.characterWorld);
                setCharacterModalOpen(true);
              }}
              className="mb-1 flex w-full items-center gap-2.5 rounded-2xl bg-surface-2/65 px-2.5 py-2.5 text-left ring-1 ring-inset ring-border transition hover:ring-accent/50"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Sparkles className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">Monte seu Personagem</span>
                <span className="block truncate text-[11px] text-fg-muted">
                  {st.extraDetails || st.characterWorld || 'Aparência, estilo e identidade visual'}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-medium text-fg-muted">
                {st.extraDetails || st.characterWorld ? 'Editar' : 'Opcional'}
              </span>
              <ChevronRight className="size-4 shrink-0 text-fg-subtle" />
            </button>

            {ATTRIBUTE_GROUPS.map((g) => (
              <GroupSection key={g.id} group={g} />
            ))}

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
              <div className="flex h-12 shrink-0 items-center gap-0.5 rounded-xl border border-border bg-surface-2 px-1 text-[11px] font-semibold text-fg-muted" aria-label="Quantidade de gerações do influencer">
                <button
                  type="button"
                  onClick={() => st.set({ attributeCount: Math.max(1, st.attributeCount - 1) })}
                  disabled={busy || st.attributeCount <= 1}
                  aria-label="Menos gerações do influencer"
                  className="rounded-lg p-1.5 hover:bg-surface-3 hover:text-fg disabled:opacity-40"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-8 text-center tabular-nums" data-testid="attribute-generation-count">{st.attributeCount}/{MAX_IMAGES_PER_REQUEST}</span>
                <button
                  type="button"
                  onClick={() => st.set({ attributeCount: Math.min(MAX_IMAGES_PER_REQUEST, st.attributeCount + 1) })}
                  disabled={busy || st.attributeCount >= MAX_IMAGES_PER_REQUEST}
                  aria-label="Mais gerações do influencer"
                  className="rounded-lg p-1.5 hover:bg-surface-3 hover:text-fg disabled:opacity-40"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={onGenerate}
                disabled={busy}
                data-testid="generate-from-panel"
                aria-label={busy ? 'Gerando influencer' : `Validar influencer, ${cost} créditos`}
                aria-busy={busy}
                className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-2 text-[12px] font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <LoaderCircle className="size-3.5 shrink-0 animate-spin" />
                    <span role="status">Gerando…</span>
                  </>
                ) : (
                  <>
                    <span>Validar influencer</span>
                    <Sparkles className="size-3.5 shrink-0" />
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold">
                      <CoinIcon className="size-3.5" /> {cost}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          </fieldset>
        </>
      )}

      <Modal
        open={characterModalOpen}
        onClose={() => setCharacterModalOpen(false)}
        title="Monte seu Personagem"
        description="Descreva o personagem com liberdade. A skill organiza sua ideia e combina com a foto e as características selecionadas."
        className="character-builder-modal"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCharacterModalOpen(false)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => {
                st.set({ extraDetails: characterDraft.trim(), characterWorld: worldDraft.trim() });
                setCharacterModalOpen(false);
              }}
            >
              Salvar
            </Button>
          </>
        }
      >
        <section>
          <label htmlFor="avatar-character-prompt" className="mb-1.5 block text-sm font-semibold text-fg">
            Monte seu Personagem
          </label>
          <p className="mb-2 text-xs leading-relaxed text-fg-muted">
            Conte como ele deve ser: aparência, estilo, roupa e traços especiais. Você pode criar personagens realistas, fantásticos ou bem diferentes.
          </p>
          <textarea
            id="avatar-character-prompt"
            value={characterDraft}
            onChange={(e) => setCharacterDraft(e.target.value)}
            maxLength={1800}
            rows={5}
            aria-label="Descrição para montar seu personagem"
            placeholder="Descreva a aparência e o estilo do personagem…"
            className="w-full resize-y rounded-xl border border-border bg-surface-2 p-3 text-sm outline-none focus:border-accent"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-fg-subtle">{characterDraft.length}/1800 · sem custo em créditos</span>
            <Button
              variant="secondary"
              size="sm"
              loading={buildingCharacterPrompt}
              disabled={characterDraft.trim().length < 3}
              onClick={() => void buildCharacterPrompt()}
              aria-label="Montar prompt do personagem com a skill"
            >
              {!buildingCharacterPrompt && <Sparkles className="size-3.5" />}
              {buildingCharacterPrompt ? 'Montando…' : 'Montar prompt'}
            </Button>
          </div>
        </section>

        <section className="mt-5 border-t border-border pt-4">
          <label htmlFor="avatar-character-world" className="mb-1.5 block text-sm font-semibold text-fg">
            Mundo do personagem
          </label>
          <p className="mb-2 text-xs leading-relaxed text-fg-muted">
            Defina onde vive, sua rotina e o contexto que ajuda a manter as próximas criações coerentes.
          </p>
          <textarea
            id="avatar-character-world"
            value={worldDraft}
            onChange={(e) => setWorldDraft(e.target.value)}
            maxLength={1200}
            rows={4}
            aria-label="Descrição do mundo do personagem"
            placeholder="Descreva o mundo e a rotina do personagem…"
            className="w-full resize-y rounded-xl border border-border bg-surface-2 p-3 text-sm outline-none focus:border-accent"
          />
          <div className="mt-1 text-right text-xs text-fg-subtle">{worldDraft.length}/1200</div>
        </section>
      </Modal>
    </aside>
  );
}
