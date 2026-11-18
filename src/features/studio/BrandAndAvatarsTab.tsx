import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Palette, Sparkles, UserPlus, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QuickAvatarSelect, type SelectedVisualSource } from '@/features/avatars/QuickAvatarSelect';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import type { StudioBrandProjectDTO, StudioBrandbookDTO } from '@shared/ugcContracts';

export function BrandAndAvatarsTab({
  project,
  onGenerateBrandbook,
}: {
  project: StudioBrandProjectDTO;
  onGenerateBrandbook: (opts: {
    brandName: string;
    niche: string;
    productName: string;
    targetAudience: string;
    voiceTone: string;
  }) => Promise<StudioBrandbookDTO>;
}) {
  const bb = project.brandbook;
  const [brandName, setBrandName] = useState(project.name);
  const [niche, setNiche] = useState(project.niche);
  const [productName, setProductName] = useState(project.product_name);
  const [targetAudience, setTargetAudience] = useState(bb?.targetAudience ?? 'Público brasileiro buscando praticidade');
  const [voiceTone, setVoiceTone] = useState(bb?.voiceTone ?? 'Natural, próximo e confiante');
  const [avatar, setAvatar] = useState<SelectedVisualSource>({
    label: SHOWCASE_AVATARS[0]!.name,
    previewUrl: bb?.heroVisualUrl || SHOWCASE_AVATARS[0]!.image_url,
    uploaded: null,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBrandName(project.name);
    setNiche(project.niche);
    setProductName(project.product_name);
    setTargetAudience(project.brandbook?.targetAudience ?? '');
    setVoiceTone(project.brandbook?.voiceTone ?? '');
  }, [project]);

  async function handleGenerate() {
    setBusy(true);
    try {
      await onGenerateBrandbook({ brandName, niche, productName, targetAudience, voiceTone });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <section data-guide-target="studio-brand-box" className="rounded-2xl border border-border bg-surface p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black flex items-center gap-2">
                <Palette className="size-4 text-accent" /> BRANDBOOK DA MARCA COM IA
              </h3>
              <p className="text-xs text-fg-muted">Define paleta, pilares e ganchos oficiais sem gastar créditos (0 créditos).</p>
            </div>
            <Button variant="brand" size="sm" onClick={() => void handleGenerate()} loading={busy} data-testid="studio-brandbook-btn">
              <Wand2 className="size-3.5" /> Gerar Brandbook com IA
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg-muted">Nome da marca / canal</span>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg-muted">Nicho</span>
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg-muted">Produto principal</span>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg-muted">Público-alvo</span>
              <input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg-muted">Tom de voz</span>
              <input
                value={voiceTone}
                onChange={(e) => setVoiceTone(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black">AVATAR PRINCIPAL DA MARCA</h3>
              <p className="text-xs text-fg-muted">Escolha um rosto aprovado ou crie novos avatares para manter consistência.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/avatars" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold hover:border-accent/60">
                <UserPlus className="size-3.5 text-accent" /> Criar Novo Avatar
              </Link>
              <Link to="/avatars?panel=motion" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold hover:border-accent/60">
                <Sparkles className="size-3.5 text-accent" /> Testar no Motion
              </Link>
            </div>
          </div>
          <QuickAvatarSelect value={avatar} onChange={setAvatar} />
        </section>
      </div>

      {/* Cartão visual do Brandbook */}
      <aside className="rounded-2xl border border-border bg-surface p-4 space-y-4 h-fit">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black tracking-wider text-fg-muted">IDENTIDADE ATIVA</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
            <CheckCircle2 className="size-3" /> Aprovado
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3">
          <img src={avatar.previewUrl} alt="" className="size-12 rounded-xl object-cover object-top" />
          <div className="min-w-0">
            <div className="truncate font-black text-sm">{bb?.brandName || brandName}</div>
            <div className="truncate text-xs text-fg-muted">{bb?.voiceTone || voiceTone}</div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-bold text-fg-muted">Paleta da marca</div>
          <div className="flex gap-2">
            {(bb?.palette ?? ['#7c3aed', '#ec4899', '#10b981']).map((hex) => (
              <div key={hex} className="flex flex-1 items-center gap-1.5 rounded-xl border border-border bg-surface-2 p-2 text-[11px] font-mono">
                <span className="size-4 rounded-full border border-white/20" style={{ backgroundColor: hex }} />
                {hex}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-fg-muted">3 Pilares de Conteúdo</div>
          {(bb?.pillars ?? []).map((p) => (
            <div key={p} className="rounded-xl bg-surface-2 px-3 py-2 text-xs font-medium">{p}</div>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-fg-muted">Ganchos prontos para o Studio</div>
          {(bb?.sampleHooks ?? []).map((h) => (
            <div key={h} className="rounded-xl border border-accent/25 bg-accent-soft/40 px-3 py-2 text-xs">{h}</div>
          ))}
        </div>
      </aside>
    </div>
  );
}
