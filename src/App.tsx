import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import { AppShell } from '@/components/layout/AppShell';
import { BrandFullMark } from '@/components/ui/Brand';
import { LoginPage } from '@/pages/LoginPage';
import { AvatarsPage } from '@/pages/AvatarsPage';

const SetupPage = lazy(() => import('@/pages/SetupPage').then((m) => ({ default: m.SetupPage })));
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const AgentDirectorPage = lazy(() => import('@/pages/AgentDirectorPage').then((m) => ({ default: m.AgentDirectorPage })));
const AiUgcPage = lazy(() => import('@/pages/AiUgcPage').then((m) => ({ default: m.AiUgcPage })));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ImageAdsPage = lazy(() => import('@/pages/ImageAdsPage').then((m) => ({ default: m.ImageAdsPage })));
const ViralPage = lazy(() => import('@/pages/ViralPage').then((m) => ({ default: m.ViralPage })));
const StudioPage = lazy(() => import('@/pages/StudioPage').then((m) => ({ default: m.StudioPage })));
const ToolsGuidePage = lazy(() => import('@/pages/ToolsGuidePage').then((m) => ({ default: m.ToolsGuidePage })));

function FullScreenLoader() {
  return (
    <div className="grid h-full place-items-center" role="status" aria-label="Carregando">
      <div className="flex flex-col items-center gap-4">
        <BrandFullMark className="h-20 w-auto" />
        <div className="h-1 w-36 overflow-hidden rounded-full bg-surface-2">
          <div className="skeleton h-full w-full" />
        </div>
      </div>
    </div>
  );
}

/** Só deixa passar quem está logado; guarda para onde ia e volta depois do login. */
function RequireAuth({ children }: { children: ReactNode }) {
  const status = useSession((s) => s.status);
  const location = useLocation();
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'signed-out') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function App() {
  const init = useSession((s) => s.init);
  const theme = useUi((s) => s.theme);
  useEffect(() => init(), [init]);

  return (
    <BrowserRouter>
      <Toaster theme={theme} richColors position="bottom-right" closeButton />
      <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/" element={<ToolsGuidePage />} />
        <Route path="/login" element={isSupabaseConfigured ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/ferramentas" element={<ToolsGuidePage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<HomePage />} />
          <Route path="/agente-diretor" element={<AgentDirectorPage />} />
          <Route path="/avatars" element={<AvatarsPage />} />
          <Route path="/ai-ugc" element={<AiUgcPage />} />
          <Route path="/ai-ugc/:mode" element={<AiUgcPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/image-ads" element={<ImageAdsPage />} />
          <Route path="/viral" element={<ViralPage />} />
          <Route path="/viral/pasta/:folderId" element={<ViralPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/studio/:section" element={<StudioPage />} />
          <Route path="/studio/:section/:subId" element={<StudioPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
