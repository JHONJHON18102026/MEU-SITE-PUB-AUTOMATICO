import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Package } from 'lucide-react';
import { toast } from 'sonner';
import { AttributePanel } from '@/features/avatars/AttributePanel';
import { PromptComposer } from '@/features/avatars/PromptComposer';
import { GeneratedMediaTabs } from '@/features/avatars/GeneratedMediaTabs';
import { Gallery, GalleryTabs } from '@/features/avatars/Gallery';
import { MAX_PENDING_VIDEO_REQUESTS, restoreDirectorCanvasHandoff, useAvatarStudio } from '@/features/avatars/avatarStore';
import { useGenerateAvatar } from '@/features/avatars/useGenerateAvatar';
import { useCreateUgcProject, useProjectsData } from '@/features/projects/previewProjectsStore';
import { prepareImageFromUrl } from '@/lib/image';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import type { VideoProjectDTO } from '@shared/ugcContracts';

export function AvatarsPage() {
  const { generate, busy, pendingRequests: pendingImageRequests } = useGenerateAvatar();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { createProject } = useCreateUgcProject();
  const setStudio = useAvatarStudio((s) => s.set);
  const productImage = useAvatarStudio((s) => s.productImage);
  const tab = useAvatarStudio((s) => s.tab);
  const { projects, loading: projectsLoading, deleteProject, loadMore: loadMoreProjects, hasMore: projectsHasMore } = useProjectsData('avatar');
  const pendingVideoRequests = projects.filter(
    (project) => project.status === 'processing' && project.mediaType !== 'motion',
  ).length;

  // Links da Home e do menu: /avatars?tab=mine, ?panel=motion, ?modelo=modelo-01, ?product=1
  useEffect(() => {
    const t = params.get('tab');
    const sub = params.get('sub');
    const panel = params.get('panel');
    const skill = params.get('skill');
    const handoff = params.get('handoff');
    const modelo = params.get('modelo');
    const patch: Parameters<typeof setStudio>[0] = {};
    if (params.get('media')) {
      patch.tab = 'explore';
      patch.panelTab = 'create';
    }
    if (t === 'mine' || t === 'explore') patch.tab = t;
    else if (t === 'history') patch.tab = 'explore';
    if (sub === 'modelos' || sub === 'comunidade') patch.exploreSub = sub;
    if (panel === 'motion' || panel === 'templates') patch.panelTab = 'templates';
    else if (panel === 'create') patch.panelTab = 'create';
    if (handoff === 'director') {
      const restored = restoreDirectorCanvasHandoff();
      if (restored) {
        setStudio(restored);
        toast.success('Produção do Agente Diretor carregada com prompt e anexos recuperáveis.');
        return;
      }
      patch.tab = 'explore';
      patch.panelTab = panel === 'templates' ? 'templates' : 'create';
      patch.composerMode = params.get('media') === 'video' ? 'video' : 'image';
      patch.useInfluencerPreset = false;
      toast.error('O repasse do Diretor expirou ou não tem anexos recuperáveis. Volte ao Diretor e abra o canvas novamente.');
    }
    if (skill === 'avatar') {
      patch.panelTab = 'create';
      patch.tab = 'explore';
      toast.success('Skill "Criação de influencer" pronta: defina os atributos ou envie uma referência.');
    }
    if (modelo) {
      const found = SHOWCASE_AVATARS.find((m) => m.id === modelo);
      if (found) {
        patch.baseAvatar = found;
        patch.basePhoto = null;
        patch.panelTab = 'create';
        toast.success(`Influencer "${found.name}" carregado.`);
      }
    }
    if (Object.keys(patch).length) setStudio(patch);
  }, [params, setStudio]);

  async function handleRecreateVideo(project: VideoProjectDTO) {
    if (pendingVideoRequests >= MAX_PENDING_VIDEO_REQUESTS) {
      toast.info('Já existem 4 vídeos em andamento. Aguarde um terminar antes de recriar.');
      return;
    }
    const scenes = project.scenes.filter((scene) => scene.text.trim());
    if (!scenes.length) { toast.error('Esta geração não tem prompt salvo para recriar.'); return; }
    const assetList = Array.isArray(project.params?.reference_assets) ? project.params.reference_assets as Array<{ url?: string; name?: string }> : [];
    const assets = assetList.filter((asset) => typeof asset.url === 'string' && asset.url.length > 0).slice(0, 6);
    let references: Awaited<ReturnType<typeof prepareImageFromUrl>>[] = [];
    try {
      references = await Promise.all(assets.map((asset, index) => prepareImageFromUrl(asset.url!, asset.name || 'referencia-' + (index + 1) + '.jpg')));
    } catch {
      toast.error('Não consegui recuperar as imagens desta geração. Elas podem ter expirado; anexe-as novamente no canvas.');
      return;
    }
    const storedMode = project.params?.avatar_mode === 'avatar-video' ? 'avatar-video' : project.mode;
    const result = await createProject({
      mode: storedMode === 'motion' || storedMode === 'slideshow' || storedMode === 'image-ad' ? 'avatar-video' : storedMode,
      origin: 'avatar', mediaType: 'video', title: project.title, replacesProjectId: project.id, engine: project.engine, aspectRatio: project.aspect_ratio,
      avatarPrompt: scenes[0]!.text.slice(0, 2000),
      referenceMode: references.length ? 'elements' : undefined,
      referenceImages: references.length ? references.map((image) => 'data:' + image.mimeType + ';base64,' + image.data) : undefined,
      referenceImageNames: references.length ? references.slice(0, 3).map((image) => image.name.slice(0, 120)) : undefined,
      scenes: scenes.map((scene) => ({ text: scene.text.slice(0, 600), action: scene.action?.slice(0, 400), durationSeconds: Math.max(4, Math.min(project.engine === 'omni-flash' ? 15 : 10, scene.duration_seconds || 10)) })),
    });
    if (result) {
      setStudio({ tab: 'explore', panelTab: 'create', composerMode: 'video', useInfluencerPreset: false, prompt: scenes[0]!.text, videoEngine: project.engine, aspectRatio: project.aspect_ratio });
      navigate('/avatars?media=videos');
    }
  }

  const wantsProduct = params.get('product') === '1' && !productImage;

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <AttributePanel onGenerate={() => void generate('attributes')} busy={busy} />

      <div className="premium-workspace order-1 min-w-0 flex-1 lg:order-2">
        {/* Faixa superior fixa do estúdio. */}
        <div className="sticky top-0 z-20 flex items-center gap-1.5 bg-bg/90 px-4 py-2 backdrop-blur">
          <GalleryTabs />
        </div>

        {/* Palco hero compacto: mantém créditos e o topo da galeria visíveis. */}
        {tab === 'explore' ? (
          <>
            <section className="relative flex min-h-[430px] overflow-hidden rounded-b-[2rem] border-b border-cyan-300/25 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,.24),transparent_42%),linear-gradient(180deg,rgba(17,26,47,.78),transparent)] shadow-[0_24px_70px_rgba(13,89,120,.2)] md:min-h-[640px] flex-col items-center justify-center px-4 pb-4 pt-5 text-center">
              <div className="pointer-events-none absolute left-1/2 top-10 size-72 -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
              <h2 className="text-[28px] font-black uppercase leading-[1.11] tracking-tight text-fg sm:text-[36px]">
                SEU INFLUENCER,
                <br />
                SEU HIT VIRAL
              </h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-fg-muted sm:text-[13px]">
                Monte o rosto, o corpo e o estilo que quiser — ou descreva a cena e crie imagem ou vídeo do seu influencer com o seu produto.
              </p>

              {wantsProduct && (
                <div className="mt-3 flex max-w-2xl items-center gap-2.5 rounded-xl border border-accent/40 bg-accent-soft px-3.5 py-2 text-xs">
                  <Package className="size-4 shrink-0 text-accent" />
                  Clique no slot <strong>PRODUTO</strong> à direita para enviar a foto do seu produto e clique em GERAR.
                </div>
              )}

              <div className="mt-6 w-full max-w-[1600px] 2xl:max-w-[1880px]">
                <PromptComposer onGenerate={() => void generate('prompt')} onVideo={() => setStudio({ panelTab: 'templates', composerMode: 'video' })} pendingImageRequests={pendingImageRequests} pendingVideoRequests={pendingVideoRequests} highlightProduct={wantsProduct} />
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-fg-subtle">
                  <Lock className="size-3" />
                  <span>Criação privada por padrão. Marque “Mostrar na Comunidade” no painel ao lado se quiser compartilhar.</span>
                </div>
              </div>

              <div className="mt-3">
                <GeneratedMediaTabs
                  projects={projects}
                  projectsLoading={projectsLoading}
                  projectsHasMore={projectsHasMore}
                  onLoadMoreProjects={() => void loadMoreProjects()}
                  onDeleteProject={deleteProject}
                  onRecreateProject={handleRecreateVideo}
                />
              </div>

            </section>
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
