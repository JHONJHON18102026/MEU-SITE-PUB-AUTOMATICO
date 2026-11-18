import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Gift, Lock, Package } from 'lucide-react';
import { toast } from 'sonner';
import { AttributePanel } from '@/features/avatars/AttributePanel';
import { PromptComposer } from '@/features/avatars/PromptComposer';
import { ExploreSubTabs, Gallery, GalleryTabs } from '@/features/avatars/Gallery';
import { useAvatarStudio } from '@/features/avatars/avatarStore';
import { useGenerateAvatar } from '@/features/avatars/useGenerateAvatar';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import { useSession } from '@/store/session';

export function AvatarsPage() {
  const { generate, busy } = useGenerateAvatar();
  const [params] = useSearchParams();
  const setStudio = useAvatarStudio((s) => s.set);
  const productImage = useAvatarStudio((s) => s.productImage);
  const tab = useAvatarStudio((s) => s.tab);
  const panelTab = useAvatarStudio((s) => s.panelTab);
  const coins = useSession((s) => s.profile?.coins_balance ?? 0);

  // Links da Home e do menu: /avatars?tab=mine, ?panel=motion, ?modelo=modelo-01, ?product=1
  useEffect(() => {
    const t = params.get('tab');
    const sub = params.get('sub');
    const panel = params.get('panel');
    const modelo = params.get('modelo');
    const patch: Parameters<typeof setStudio>[0] = {};
    if (t === 'mine' || t === 'history' || t === 'explore') patch.tab = t;
    if (sub === 'modelos' || sub === 'comunidade') patch.exploreSub = sub;
    if (panel === 'motion' || panel === 'create') patch.panelTab = panel;
    if (modelo) {
      const found = SHOWCASE_AVATARS.find((m) => m.id === modelo);
      if (found) {
        patch.baseAvatar = found;
        patch.basePhoto = null;
        patch.panelTab = 'create';
        toast.success(`Rosto "${found.name}" carregado no slot AVATAR.`);
      }
    }
    if (Object.keys(patch).length) setStudio(patch);
  }, [params, setStudio]);

  const wantsProduct = params.get('product') === '1' && !productImage;

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <AttributePanel onGenerate={() => void generate('attributes')} busy={busy} forceMotion={(params.get('panel') === 'motion' || new URLSearchParams(window.location.search).get('panel') === 'motion') && panelTab !== 'create'} />

      <div className="premium-workspace order-1 min-w-0 flex-1 lg:order-2">
        {/* Faixa superior fixa estilo Influai */}
        <div className="sticky top-0 z-20 flex items-center gap-1.5 bg-bg/90 px-4 py-2 backdrop-blur">
          <GalleryTabs />
        </div>

        {/* Palco hero compacto estilo Influai: cabe na primeira dobra deixando a faixa de créditos e o topo da galeria 5 colunas visíveis */}
        {tab === 'explore' ? (
          <>
            <section className="relative flex min-h-[430px] overflow-hidden rounded-b-[2rem] border-b border-cyan-300/25 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,.24),transparent_42%),linear-gradient(180deg,rgba(17,26,47,.78),transparent)] shadow-[0_24px_70px_rgba(13,89,120,.2)] md:min-h-[640px] flex-col items-center justify-center px-4 pb-4 pt-5 text-center">
              <div className="pointer-events-none absolute left-1/2 top-10 size-72 -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="mb-3 flex h-24 items-end justify-center sm:h-[150px]">
                {SHOWCASE_AVATARS.slice(0, 5).map((m, idx) => {
                  const transforms = [
                    '-rotate-12 translate-y-2',
                    '-rotate-6 translate-y-0.5',
                    'z-10 -translate-y-1',
                    'rotate-6 translate-y-0.5',
                    'rotate-12 translate-y-2',
                  ];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setStudio({ baseAvatar: m, basePhoto: null });
                        toast.success(`Rosto "${m.name}" carregado no slot AVATAR.`);
                      }}
                      title={`Usar ${m.name} como base`}
                      className={`-mx-2 aspect-[3/4] h-22 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/15 transition-transform duration-300 hover:z-20 hover:-translate-y-2 sm:h-[150px] ${transforms[idx] ?? ''}`}
                    >
                      <img src={m.image_url} alt="" className="h-full w-full object-cover object-top" />
                    </button>
                  );
                })}
              </div>

              <h2 className="text-[28px] font-black uppercase leading-[1.11] tracking-tight text-fg sm:text-[36px]">
                SEU INFLUENCER,
                <br />
                SEU HIT VIRAL
              </h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-fg-muted sm:text-[13px]">
                Monte o rosto, o corpo e o estilo que quiser — ou descreva a cena e crie imagem ou vídeo do seu avatar com o seu produto.
              </p>

              {wantsProduct && (
                <div className="mt-3 flex max-w-2xl items-center gap-2.5 rounded-xl border border-accent/40 bg-accent-soft px-3.5 py-2 text-xs">
                  <Package className="size-4 shrink-0 text-accent" />
                  Clique no slot <strong>PRODUTO</strong> à direita para enviar a foto do seu produto e clique em GERAR.
                </div>
              )}

              <div className="mt-6 w-full max-w-[1024px]">
                <PromptComposer onGenerate={() => void generate('prompt')} busy={busy} highlightProduct={wantsProduct} />
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-fg-subtle">
                  <Lock className="size-3" />
                  <span>Criação privada por padrão. Marque “Mostrar na Comunidade” no painel ao lado se quiser compartilhar.</span>
                </div>
              </div>

              <div className="mt-3">
                <ExploreSubTabs />
              </div>
            </section>

            {/* Faixa intermediária entre o Hero e a Galeria 5 colunas */}
            <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-accent/30 bg-accent-soft/50 px-3.5 py-2.5 dark:border-[#36284f] dark:bg-[#181522]">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Gift className="size-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-fg">
                    Estúdio liberado: {coins} créditos disponíveis para criar
                  </div>
                  <div className="text-[11px] text-fg-muted">
                    Gere avatares consistentes aqui e anime o seu personagem com voz e produto no AI UGC.
                  </div>
                </div>
              </div>
              <Link
                to="/ai-ugc"
                className="inline-flex h-8 shrink-0 items-center rounded-lg bg-brand px-3 text-[11px] font-bold text-white shadow-sm transition hover:brightness-110"
              >
                Abrir AI UGC
              </Link>
            </div>

            <div className="px-4 pb-16 pt-1">
              <Gallery hideTabs hideExploreSwitch />
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1">
            <Gallery hideTabs hideExploreSwitch />
          </div>
        )}
      </div>
    </div>
  );
}
