import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Eye, EyeOff, FolderOpen, Plus, Rocket, UserRound, X } from 'lucide-react';
import type { useStudioWorkspace } from './studioStore';
import { Button } from '@/components/ui/Button';

type Workspace = ReturnType<typeof useStudioWorkspace>;

/** Visão geral separada das ferramentas internas de um projeto. */
export function StudioOverview({ workspace: ws, projectsOnly, onNewProject }: { workspace: Workspace; projectsOnly: boolean; onNewProject: () => void }) {
  const [guideOpen, setGuideOpen] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);
  const [projectFilter, setProjectFilter] = useState('all');
  const accounts = ws.accounts.filter(a => projectFilter === 'all' || a.project_id === projectFilter);
  const posts = ws.posts.filter(p => projectFilter === 'all' || p.project_id === projectFilter);
  const ready = accounts.filter(a => a.stage === 'Pronta' || a.stage === 'Ativa').length;
  const now = Date.now();
  const periodStart = new Date();
  periodStart.setHours(0, 0, 0, 0);
  periodStart.setDate(periodStart.getDate() - 29);
  const published = posts.filter(p => {
    const timestamp = new Date(p.scheduled_for).getTime();
    return p.status === 'published' && timestamp >= periodStart.getTime() && timestamp <= now;
  });
  const health = accounts.length ? Math.round(accounts.reduce((sum, a) => sum + a.health_score, 0) / accounts.length) : 0;
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - 29 + i);
    const count = published.filter(p => new Date(p.scheduled_for).toDateString() === date.toDateString()).length;
    return { label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), count };
  });
  const max = Math.max(4, ...days.map(d => d.count));
  const metricClass = privateMode ? 'blur-sm select-none' : '';
  const projectCards = <section className="rounded-xl border border-border bg-surface p-6">
    <div className="flex items-center justify-between"><h2 className="font-semibold">Projetos</h2><Button variant="brand" onClick={onNewProject}><Plus className="size-4" />Novo Projeto</Button></div>
    {ws.projects.length ? <div className="mt-5 grid gap-4 md:grid-cols-3">{ws.projects.map(p => <Link key={p.id} to="/studio/marca" onClick={() => ws.setActiveProjectId(p.id)} className="group rounded-2xl border border-accent/20 bg-[linear-gradient(145deg,#1b172b,#13121b)] p-5 shadow-[0_14px_32px_rgba(0,0,0,.16)] transition duration-200 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_20px_42px_rgba(72,42,150,.24)]"><span className="mb-4 grid size-11 place-items-center rounded-xl bg-accent-soft text-accent shadow-[0_0_18px_rgba(138,97,255,.2)]"><FolderOpen className="size-5" /></span><h3 className={`font-semibold group-hover:text-accent ${metricClass}`}>{p.name}</h3><p className="mt-2 text-xs text-fg-muted">{p.niche}</p><span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2 py-1 text-[10px] font-bold text-success">{p.is_active ? '● Ativo' : '○ Inativo'}</span></Link>)}</div> : <div className="py-14 text-center text-sm text-fg-muted"><FolderOpen className="mx-auto mb-4 size-10" /><p>Nenhum projeto criado ainda.</p><p className="mb-5">Crie um projeto para agrupar contas, avatares e conteúdo.</p><Button onClick={onNewProject}>Criar primeiro projeto</Button></div>}
  </section>;
  return <div className="premium-workspace mx-auto w-full max-w-[1520px] space-y-6 px-6 py-8">
    {!projectsOnly && guideOpen && <section className="rounded-xl border border-accent/25 bg-accent/5 p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Rocket className="size-5 text-accent" />Comece aqui: como você quer começar?</h2><button aria-label="Ocultar este guia" onClick={() => setGuideOpen(false)}><X className="size-4 text-fg-muted" /></button></div>
      <p className="mt-1 text-sm text-fg-muted">Escolha o caminho e a gente guia cada etapa — dá pra trocar depois.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">{[
      { title: 'Criar do zero', desc: 'Ainda não tem avatar? Descreva o seu nicho: a IA monta o brandbook da marca e sugere os avatares. Você aprova os que gostar e cria os vídeos.', to: '/studio/marca', icon: BookOpen },
      { title: 'Usar um avatar que já tenho', desc: 'Já criou avatares? Crie o projeto, adicione o seu avatar e vá direto para os vídeos.', to: '/studio/marca', icon: UserRound },
      { title: 'Vídeos para monetizar (sem avatar)', desc: 'Crie vídeos feitos para ganhar visualizações no Monetiza View, sem precisar de avatar. Depois é só baixar e postar ou publicar pelas suas contas.', to: '/studio/criar/monetiza-view', icon: Rocket },
      ].map(c => <Link to={c.to} key={c.title} className="group min-h-[202px] rounded-2xl border border-border bg-bg p-5 shadow-[0_12px_28px_rgba(0,0,0,.12)] transition duration-200 hover:-translate-y-1 hover:border-accent/60 hover:bg-accent-soft/10"><c.icon className="mb-5 size-7 text-accent transition group-hover:scale-110" /><h3 className="text-base font-semibold group-hover:text-accent">{c.title}</h3><p className="mt-2 text-sm leading-5 text-fg-muted">{c.desc}</p><span className="mt-5 inline-flex text-[11px] font-bold text-accent">Abrir caminho →</span></Link>)}</div>
    </section>}
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">FUTURO DIGITAL STUDIO</h1><p className="text-sm text-fg-muted">Crie vídeos com seus avatares e publique nas suas contas</p></div><button aria-label={privateMode ? 'Desativar modo sigilo' : 'Ativar modo sigilo'} onClick={() => setPrivateMode(v => !v)} className="p-3 text-fg-muted">{privateMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>
    <nav aria-label="Navegação do Studio" className="premium-tabbar flex w-fit rounded-xl p-1">{[{ title: 'Início', to: '/studio', active: !projectsOnly }, { title: 'Projetos', to: '/studio/projetos', active: projectsOnly }].map(t => <Link key={t.to} to={t.to} aria-current={t.active ? 'page' : undefined} className={`rounded-lg px-4 py-2 text-sm ${t.active ? 'bg-bg font-semibold' : 'text-fg-muted'}`}>{t.title}</Link>)}</nav>
    {projectsOnly ? projectCards : <>
      <div className="flex justify-end"><select aria-label="Filtrar métricas por projeto" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="h-10 rounded-xl border border-border bg-bg px-4 text-sm"><option value="all">Todos os projetos</option>{ws.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{[['Contas', accounts.length], ['Prontas p/ postar', ready], ['Vídeos prontos (30d)', '—'], ['Publicados (30d)', published.length], ['Saúde média', health]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-surface p-5"><p className="text-xs text-fg-muted">{label}</p><p className={`mt-2 text-2xl font-bold ${metricClass}`}>{value}</p></div>)}</div>
      <section className="rounded-xl border border-border bg-surface p-6"><h2 className="text-sm font-semibold">Crescimento (estimado por publicações)</h2><div className="mt-4 grid grid-cols-2 gap-5 lg:grid-cols-6">{['Seguidores', 'Views', 'Likes', 'Comentários', 'Salvamentos', 'Compartilhamentos'].map(label => <div key={label}><p className="text-xs text-fg-muted">{label}</p><p className="my-2 text-xl">—</p><p className="text-xs text-fg-subtle">coletando dados</p></div>)}</div></section>
      <section className="rounded-xl border border-border bg-surface p-6"><h2 className="text-sm font-semibold">Produção — últimos 30 dias</h2><p className="mt-2 text-xs text-fg-muted">Publicações nas contas, por dia. Os vídeos prontos aguardam a conexão das métricas.</p><div className={`mt-7 ${metricClass}`}><svg viewBox="0 0 1100 220" role="img" aria-label="Publicações dos últimos 30 dias" className="w-full">{[0, 1, 2, 3, 4].map(i => <g key={i}><text x="0" y={190 - i * 42} fill="currentColor" fontSize="11">{Math.round(max * i / 4)}</text><line x1="24" x2="1090" y1={186 - i * 42} y2={186 - i * 42} stroke="currentColor" opacity=".12" /></g>)}{days.map((d, i) => <g key={d.label}><rect x={30 + i * 35.8} y={186 - d.count / max * 168} width="20" height={d.count / max * 168} fill="#10b981" />{i % 4 === 0 && <text x={30 + i * 35.8} y="211" fill="currentColor" fontSize="11">{d.label}</text>}</g>)}</svg><p className="mt-2 text-center text-xs text-success">Publicações</p></div></section>
      <div className="grid gap-6 md:grid-cols-2"><section className="rounded-xl border border-border bg-surface p-6"><h2 className="text-sm font-semibold">Contas por status</h2>{accounts.length ? <ul className="mt-4 space-y-2 text-sm">{[...new Set(accounts.map(a => a.stage))].map(stage => <li key={stage} className="flex justify-between"><span>{stage}</span><span className={metricClass}>{accounts.filter(a => a.stage === stage).length}</span></li>)}</ul> : <p className="mt-5 text-sm text-fg-muted">Nenhuma conta ainda.</p>}</section><section className="rounded-xl border border-border bg-surface p-6"><h2 className="text-sm font-semibold">Atividade recente</h2><p className="mt-5 text-sm text-fg-muted">{posts.length ? `${posts.length} publicação(ões) na agenda.` : 'Sem eventos recentes.'}</p></section></div>
      {projectCards}
    </>}
  </div>;
}
