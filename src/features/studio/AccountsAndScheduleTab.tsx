import { useState } from 'react';
import { CalendarClock, Flame, Info, Plus, ShieldCheck, ShoppingBag, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import { STUDIO_ACCOUNT_STAGES } from '@shared/ugcCatalog';
import type { StudioAccountDTO, StudioBrandProjectDTO, StudioScheduledPostDTO } from '@shared/ugcContracts';
import { suggestSafeScheduleLocalInput } from './studioCartridges';

export function AccountsAndScheduleTab({
  project,
  accounts,
  posts,
  prefillTitle,
  prefillThumb,
  prefillVideoId,
  captionStyle,
  onAddAccount,
  onUpdateAccount,
  onRemoveAccount,
  onSchedulePost,
  onRemovePost,
  onToggleRoutine,
}: {
  project: StudioBrandProjectDTO;
  accounts: StudioAccountDTO[];
  posts: StudioScheduledPostDTO[];
  prefillTitle?: string;
  prefillThumb?: string;
  prefillVideoId?: string;
  captionStyle: string;
  onAddAccount: (opts: { handle: string; platform: 'TikTok' | 'Instagram Reels' | 'YouTube Shorts'; tiktokShop: boolean; avatarUrl: string }) => Promise<unknown>;
  onUpdateAccount: (id: string, patch: Partial<StudioAccountDTO>) => Promise<void>;
  onRemoveAccount: (id: string) => Promise<void>;
  onSchedulePost: (opts: {
    accountId: string;
    videoProjectId?: string;
    title: string;
    captionStyle: string;
    trimFooter: boolean;
    normalizeVoice: boolean;
    scheduledFor: string;
    thumbnailUrl: string;
  }) => Promise<unknown>;
  onRemovePost: (id: string) => Promise<void>;
  onToggleRoutine: (enabled: boolean, dailyTarget: number) => Promise<void>;
}) {
  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState<'TikTok' | 'Instagram Reels' | 'YouTube Shorts'>('TikTok');
  const [tiktokShop, setTiktokShop] = useState(false);

  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [postTitle, setPostTitle] = useState(prefillTitle || `Post ${project.product_name}`);
  const [scheduledFor, setScheduledFor] = useState(() => suggestSafeScheduleLocalInput(4));

  const targetAccountId = accounts.some((a) => a.id === accountId) ? accountId : accounts[0]?.id ?? '';

  async function handleCreateAccount() {
    if (!handle.trim()) return;
    await onAddAccount({
      handle: handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`,
      platform,
      tiktokShop,
      avatarUrl: SHOWCASE_AVATARS[accounts.length % SHOWCASE_AVATARS.length]!.image_url,
    });
    setHandle('');
  }

  async function handleCreateSchedule() {
    if (!targetAccountId || !postTitle.trim()) return;
    await onSchedulePost({
      accountId: targetAccountId,
      videoProjectId: prefillVideoId,
      title: postTitle.trim(),
      captionStyle,
      trimFooter: false,
      normalizeVoice: true,
      scheduledFor: new Date(scheduledFor).toISOString(),
      thumbnailUrl: prefillThumb || '/showcase/modelo-01.webp',
    });
  }

  return (
    <div className="space-y-6">
      {/* Aviso honesto sobre conexão OAuth oficial */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-accent/35 bg-accent-soft/50 px-4 py-3 text-xs">
        <Info className="mt-0.5 size-4 shrink-0 text-accent" />
        <div>
          <strong>Fila e planejamento prontos:</strong> o funil de 11 etapas, aquecimento, agenda e rotina automática salvam seus planos aqui. A publicação direta no TikTok/Instagram/YouTube ocorre depois de conectar as credenciais OAuth oficiais de cada rede.
        </div>
      </div>

      {/* 1. Contas e Funil de 11 etapas */}
      <section className="rounded-2xl border border-border bg-surface p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              <Users className="size-4 text-accent" /> CONTAS & FUNIL DE AQUECIMENTO ({accounts.length})
            </h3>
            <p className="text-xs text-fg-muted">11 estágios do funil, saúde da conta, vínculo de avatar e exigência de pausa segura.</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_170px_auto_auto] items-center">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="Ex.: @minhamarca.oficial"
            data-testid="studio-account-handle"
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as 'TikTok' | 'Instagram Reels' | 'YouTube Shorts')}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="TikTok">TikTok</option>
            <option value="Instagram Reels">Instagram Reels</option>
            <option value="YouTube Shorts">YouTube Shorts</option>
          </select>
          <label className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={tiktokShop} onChange={(e) => setTiktokShop(e.target.checked)} className="accent-[var(--accent)]" />
            TikTok Shop
          </label>
          <Button variant="brand" size="sm" onClick={() => void handleCreateAccount()} data-testid="studio-add-account-btn">
            <Plus className="size-3.5" /> Adicionar conta
          </Button>
        </div>

        <div className="space-y-2.5">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3 text-xs">
              <img src={acc.avatar_url} alt={acc.handle} className="size-10 rounded-xl object-cover object-top" />
              <div className="min-w-36 flex-1">
                <div className="font-black text-sm">{acc.handle}</div>
                <div className="text-fg-muted">{acc.platform} · Publicados (28d): <strong>{acc.published_28d}</strong></div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2 py-1 font-bold text-success">
                <ShieldCheck className="size-3.5" /> Saúde {acc.health_score}%
              </span>

              <select
                value={acc.stage}
                onChange={(e) => void onUpdateAccount(acc.id, { stage: e.target.value })}
                aria-label={`Estágio da conta ${acc.handle}`}
                className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-accent"
              >
                {STUDIO_ACCOUNT_STAGES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void onUpdateAccount(acc.id, { auto_warmup: !acc.auto_warmup })}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold ${
                  acc.auto_warmup ? 'border-accent bg-accent-soft text-fg' : 'border-border bg-surface text-fg-muted'
                }`}
              >
                <Flame className="size-3" /> Aquec. {acc.auto_warmup ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={() => void onUpdateAccount(acc.id, { tiktok_shop: !acc.tiktok_shop })}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold ${
                  acc.tiktok_shop ? 'badge-ok' : 'border-border bg-surface text-fg-muted'
                }`}
              >
                <ShoppingBag className="size-3" /> Shop
              </button>

              <button
                type="button"
                onClick={() => void onRemoveAccount(acc.id)}
                className="rounded-lg p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"
                aria-label={`Remover ${acc.handle}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Agenda de Publicações + Rotina Automática */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-border bg-surface p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black flex items-center gap-2">
              <CalendarClock className="size-4 text-accent" /> AGENDA E FILA DE PUBLICAÇÃO ({posts.length})
            </h3>
            <button
              type="button"
              onClick={() => setScheduledFor(suggestSafeScheduleLocalInput(6 + Math.floor(Math.random() * 12)))}
              className="rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold hover:border-accent/60"
            >
              Sugerir horário aleatório seguro
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <select
              value={targetAccountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-semibold outline-none focus:border-accent"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.handle} ({a.platform})</option>
              ))}
            </select>
            <input
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Título do post agendado"
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-2 py-2 text-xs outline-none focus:border-accent"
              />
              <Button variant="brand" size="sm" onClick={() => void handleCreateSchedule()} disabled={!accounts.length}>
                Agendar
              </Button>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-8 text-center text-xs text-fg-muted">
              Nenhum post na agenda ainda. Selecione conta e horário acima para organizar sua semana.
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => {
                const acc = accounts.find((a) => a.id === post.account_id);
                return (
                  <div key={post.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-2.5 text-xs">
                    <img src={post.thumbnail_url} alt="" className="size-11 rounded-lg object-cover object-top" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{post.title}</div>
                      <div className="text-fg-muted">
                        {acc?.handle ?? 'Conta'} · Legenda: <strong>{post.caption_style}</strong> ·{' '}
                        {new Date(post.scheduled_for).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <span className="rounded-lg bg-accent-soft px-2 py-1 text-[10px] font-bold text-accent">Agendado</span>
                    <button
                      type="button"
                      onClick={() => void onRemovePost(post.id)}
                      className="rounded-lg p-1.5 text-fg-subtle hover:text-danger"
                      aria-label="Cancelar agendamento"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Rotina Automática diária (Monetiza View) */}
        <aside className="rounded-2xl border border-border bg-surface p-4 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider text-fg-muted">ROTINA AUTOMÁTICA</span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${project.auto_routine_enabled ? 'bg-success/15 text-success' : 'bg-surface-2 text-fg-muted'}`}>
              {project.auto_routine_enabled ? 'Ativa' : 'Pausada'}
            </span>
          </div>
          <p className="text-xs text-fg-muted">
            Reserva vídeos diários (formato Monetiza View) com <strong>3 dias de antecedência</strong> e pausa segura entre posts.
          </p>
          <label className="block text-xs">
            <span className="mb-1 block font-semibold text-fg-muted">Meta diária de vídeos por conta</span>
            <select
              value={project.daily_target}
              onChange={(e) => void onToggleRoutine(project.auto_routine_enabled, Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n} vídeo(s) por dia</option>
              ))}
            </select>
          </label>
          <Button
            variant={project.auto_routine_enabled ? 'secondary' : 'brand'}
            className="w-full"
            onClick={() => void onToggleRoutine(!project.auto_routine_enabled, project.daily_target)}
          >
            {project.auto_routine_enabled ? 'Pausar rotina automática' : 'Ativar rotina automática'}
          </Button>
        </aside>
      </div>
    </div>
  );
}
