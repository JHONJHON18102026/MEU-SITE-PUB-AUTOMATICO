import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clapperboard,
  Film,
  Home,
  Palette,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StepGuideBanner } from '@/components/ui/StepGuideBanner';
import { BrandAndAvatarsTab } from '@/features/studio/BrandAndAvatarsTab';
import { StudioCreateTab } from '@/features/studio/StudioCreateTab';
import { FinalAssemblyTab } from '@/features/studio/FinalAssemblyTab';
import { AccountsAndScheduleTab } from '@/features/studio/AccountsAndScheduleTab';
import { useStudioWorkspace } from '@/features/studio/studioStore';
import { StudioOverview } from '@/features/studio/StudioOverview';
import type { VideoProjectDTO } from '@shared/ugcContracts';

const STUDIO_SECTIONS = [
  { id: 'home', slug: '', label: 'Início', icon: Home },
  { id: 'brand', slug: 'marca', label: 'Avatares e marca', icon: Palette },
  { id: 'create', slug: 'criar', label: 'Criar vídeos', icon: Clapperboard },
  { id: 'assembly', slug: 'montagem', label: 'Montagem final', icon: Film },
  { id: 'accounts', slug: 'contas', label: 'Contas e publicação', icon: CalendarClock },
] as const;

type StudioSectionId = (typeof STUDIO_SECTIONS)[number]['id'];

const LEGACY_TAB_TO_SLUG: Record<string, string> = {
  home: '',
  brand: 'marca',
  create: 'criar',
  assembly: 'montagem',
  accounts: 'contas',
};

export function StudioPage() {
  const { section, subId } = useParams<{ section?: string; subId?: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ws = useStudioWorkspace();

  const [newProjOpen, setNewProjOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [schedulePrefill, setSchedulePrefill] = useState<{
    video: VideoProjectDTO | null;
    title: string;
    thumb: string;
  } | null>(null);

  const legacyTab = params.get('tab');
  if (!section && legacyTab && legacyTab in LEGACY_TAB_TO_SLUG) {
    const slug = LEGACY_TAB_TO_SLUG[legacyTab];
    return <Navigate to={slug ? `/studio/${slug}` : '/studio'} replace />;
  }

  const matched = section
    ? STUDIO_SECTIONS.find((s) => s.slug === section)
    : STUDIO_SECTIONS[0];

  if (section && !matched && section !== 'projetos') {
    return <Navigate to="/studio" replace />;
  }

  const activeSection: StudioSectionId = matched?.id ?? 'home';
  const overview = !section || section === 'projetos';

  const readyAccounts = ws.accounts.filter((a) => a.stage === 'Pronta' || a.stage === 'Ativa').length;
  const totalPublished = ws.accounts.reduce((sum, a) => sum + a.published_28d, 0);
  const avgHealth = ws.accounts.length
    ? Math.round(ws.accounts.reduce((sum, a) => sum + a.health_score, 0) / ws.accounts.length)
    : 100;

  async function handleNewBrandProject() {
    if (newName.trim().length < 2 || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      await ws.createBrandProject(newName.trim(), 'Geral', '', { client: newClient.trim(), description: newDescription.trim() });
      setNewName(''); setNewClient(''); setNewDescription('');
      setNewProjOpen(false);
      navigate('/studio/marca');
    } catch {
      setCreateError('Não foi possível criar o projeto. Tente novamente.');
    } finally { setCreating(false); }
  }

  return (
    <div className={overview ? '' : 'premium-workspace mx-auto w-full max-w-[1480px] space-y-5 px-6 py-5'}>
      {ws.error && (
        <div role="alert" className="mx-auto mb-4 flex max-w-[1480px] flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-xs text-fg-muted">
          <span>{ws.error}</span>
          <Button variant="secondary" size="sm" onClick={() => void ws.reload()}>Tentar novamente</Button>
        </div>
      )}
      {overview && <StudioOverview workspace={ws} projectsOnly={section === 'projetos'} onNewProject={() => setNewProjOpen(true)} />}
      {!overview && <>
      <div className="relative overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_88%_8%,rgba(56,189,248,.24),transparent_40%),linear-gradient(135deg,#111a2f,#131024)] p-6 shadow-[0_24px_60px_rgba(13,89,120,.2)]">
      <img src="/showcase/internal-studio-new.png" alt="" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[42%] object-cover object-center opacity-28 mix-blend-screen" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-transparent via-[#111a2f]/65 to-[#111a2f]" />
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            FUTURO DIGITAL <span className="text-brand">STUDIO</span>
          </h1>
          <p className="text-xs text-fg-muted">Crie vídeos com seus avatares, configure marca e publique nas suas contas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={ws.activeProject.id}
            onChange={(e) => ws.setActiveProjectId(e.target.value)}
            aria-label="Projeto Studio ativo"
            className="h-9 rounded-[8px] border border-border bg-surface px-3 text-xs font-semibold outline-none focus:border-accent"
          >
            {ws.projects.map((p) => (
              <option key={p.id} value={p.id}>
                Projeto: {p.name}
              </option>
            ))}
          </select>
          <Button variant="brand" size="md" onClick={() => setNewProjOpen(true)}>
            <Plus className="size-3.5" /> Novo Projeto Studio
          </Button>
        </div>
      </div>
      </div>

      {/* Navegação interna compacta idêntica ao Influai Studio */}
      <div className="premium-tabbar inline-flex h-9 w-fit max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-[8px] p-1 thin-scroll" role="tablist" aria-label="Abas do Studio">
        {STUDIO_SECTIONS.map((t) => {
          const active = activeSection === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => navigate(t.slug ? `/studio/${t.slug}` : '/studio')}
              className={clsx(
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 py-1 text-xs font-semibold transition-all sm:text-[13px]',
                active ? 'bg-bg text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
              )}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'home' && (
        <div className="space-y-6">
          <StepGuideBanner guideKey="studio" />

          {/* Os 5 KPIs compactos estilo Influai Studio */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="flex h-[94px] flex-col justify-between rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Contas</span>
                <Users className="size-4 text-accent" />
              </div>
              <div className="text-2xl font-bold">{ws.accounts.length}</div>
            </div>
            <div className="flex h-[94px] flex-col justify-between rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Prontas p/ postar</span>
                <CheckCircle2 className="size-4 text-success" />
              </div>
              <div className="text-2xl font-bold">{readyAccounts}</div>
            </div>
            <div className="flex h-[94px] flex-col justify-between rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Publicados (30d)</span>
                <TrendingUp className="size-4 text-accent" />
              </div>
              <div className="text-2xl font-bold">{totalPublished}</div>
            </div>
            <div className="flex h-[94px] flex-col justify-between rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Agendamentos</span>
                <CalendarClock className="size-4 text-accent" />
              </div>
              <div className="text-2xl font-bold">{ws.posts.length}</div>
            </div>
            <div className="col-span-2 flex h-[94px] flex-col justify-between rounded-xl border border-border bg-surface p-4 sm:col-span-1">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Saúde média</span>
                <ShieldCheck className="size-4 text-success" />
              </div>
              <div className="text-2xl font-bold">{avgHealth}%</div>
            </div>
          </div>

          {/* Bloco Crescimento idêntico ao painel Influai */}
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-fg">Crescimento (estimado por publicações)</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ['Seguidores', Math.round(totalPublished * 18)],
                ['Views', totalPublished * 420],
                ['Likes', Math.round(totalPublished * 34)],
                ['Comentários', Math.round(totalPublished * 3.5)],
                ['Salvamentos', Math.round(totalPublished * 9)],
                ['Compartilhamentos', Math.round(totalPublished * 5)],
              ].map(([lbl, val]) => (
                <div key={String(lbl)} className="space-y-1">
                  <div className="text-xs text-fg-muted">{lbl}</div>
                  <div className="text-xl font-bold tabular-nums">{val}</div>
                  <div className="text-[11px] text-fg-subtle">{totalPublished ? 'estimado 30d' : 'coletando dados'}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-bold">Por onde você quer começar neste projeto?</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  title: '1. Criar marca e avatar do zero',
                  desc: 'Defina paleta, voz, pilares e ganchos oficiais com IA sem gastar créditos.',
                  cta: 'Abrir Brandbook',
                  to: '/studio/marca',
                },
                {
                  title: '2. Produzir em lote com meu avatar',
                  desc: 'Use Creator Viral IA, POV ou Controle de Movimentos para gerar múltiplos vídeos.',
                  cta: 'Criar vídeos em lote',
                  to: '/studio/criar',
                },
                {
                  title: '3. Vídeos para monetizar sem rosto',
                  desc: 'Escolha Monetiza View, aplique um dos 12 estilos de legenda e agende.',
                  cta: 'Abrir Montagem final',
                  to: '/studio/montagem',
                },
              ].map((card) => (
                <Link
                  key={card.title}
                  to={card.to}
                  className="group flex flex-col justify-between space-y-3 rounded-xl border border-border bg-surface-2 p-4 transition-colors hover:border-accent/55"
                >
                  <div>
                    <div className="text-xs font-bold group-hover:text-accent">{card.title}</div>
                    <p className="mt-1 text-xs text-fg-muted">{card.desc}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    <Sparkles className="size-3.5" /> {card.cta} <ArrowRight className="size-3" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeSection === 'brand' && (
        <BrandAndAvatarsTab project={ws.activeProject} onGenerateBrandbook={ws.generateBrandbook} />
      )}

      {activeSection === 'create' && (
        <StudioCreateTab
          project={ws.activeProject}
          formatSlug={subId}
          onBatchCreated={() => navigate('/studio/montagem')}
        />
      )}

      {activeSection === 'assembly' && (
        <FinalAssemblyTab
          captionStyle={ws.selectedCaptionStyle}
          onChangeCaptionStyle={ws.setSelectedCaptionStyle}
          onSendToSchedule={({ video, title, thumb }) => {
            setSchedulePrefill({ video, title, thumb });
            navigate('/studio/contas');
          }}
        />
      )}

      {activeSection === 'accounts' && (
        <AccountsAndScheduleTab
          project={ws.activeProject}
          accounts={ws.accounts}
          posts={ws.posts}
          prefillTitle={schedulePrefill?.title}
          prefillThumb={schedulePrefill?.thumb}
          prefillVideoId={schedulePrefill?.video?.id}
          captionStyle={ws.selectedCaptionStyle}
          onAddAccount={ws.addAccount}
          onUpdateAccount={ws.updateAccount}
          onRemoveAccount={ws.removeAccount}
          onSchedulePost={ws.schedulePost}
          onRemovePost={ws.removePost}
          onToggleRoutine={(enabled, daily) =>
            ws.updateProjectSettings({ auto_routine_enabled: enabled, daily_target: daily })
          }
        />
      )}

      </>}
      <Modal
        open={newProjOpen}
        onClose={() => setNewProjOpen(false)}
        title="Novo projeto"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewProjOpen(false)}>Cancelar</Button>
            <Button variant="brand" disabled={newName.trim().length < 2 || creating} onClick={() => void handleNewBrandProject()}>{creating ? 'Criando…' : 'Criar'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm font-semibold">Nome do projeto
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex.: Minha marca — Nicho fitness"
            maxLength={80}
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          </label>
          <label className="block text-sm font-semibold">Cliente (opcional)
          <input
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            placeholder="Nome do cliente dono do projeto"
            maxLength={160}
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          </label>
          <label className="block text-sm font-semibold">Descrição (opcional)
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          </label>
          {createError && <p role="alert" className="text-sm text-danger">{createError}</p>}
        </div>
      </Modal>
    </div>
  );
}
