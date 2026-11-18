import type { VideoProjectDTO, ProjectSceneDTO } from '../shared/ugcContracts';
import { getAdmin } from './supabaseAdmin';

export const VIDEO_BUCKET = 'videos';
const SIGNED_URL_TTL = 60 * 60;

export async function signedMediaUrl(path: string | null | undefined) {
  if (!path) return null;
  const { data, error } = await getAdmin().storage.from(VIDEO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) throw new Error(`Não foi possível preparar o arquivo para visualização: ${error?.message ?? 'URL ausente'}`);
  return data.signedUrl;
}

/** Reidrata URLs privadas sem expor o caminho permanente do Storage. */
export async function hydrateProjectMedia(project: VideoProjectDTO): Promise<VideoProjectDTO> {
  const userPrefix = `${project.user_id}/${project.id}`;
  const isImageBatch = project.mode === 'image-ad' || project.mode === 'slideshow';
  const fallbackPath = isImageBatch && project.scenes?.length ? `${userPrefix}/item-0.png` : null;
  const finalUrl = await signedMediaUrl(project.storage_path ?? fallbackPath);
  const scenes = await Promise.all((project.scenes ?? []).map(async (scene: ProjectSceneDTO) => {
    const ext = isImageBatch ? 'png' : 'mp4';
    const path = `${userPrefix}/${isImageBatch ? `item-${scene.index}.${ext}` : `scene-${scene.index}.${ext}`}`;
    const url = await signedMediaUrl(path).catch(() => null);
    return url ? { ...scene, video_url: url, image_url: isImageBatch ? url : scene.image_url } : scene;
  }));
  return { ...project, video_url: finalUrl, scenes };
}

export async function removeProjectMedia(project: Pick<VideoProjectDTO, 'user_id' | 'id' | 'storage_path' | 'mode' | 'scenes'>) {
  const paths = new Set<string>();
  if (project.storage_path) paths.add(project.storage_path);
  const ext = project.mode === 'image-ad' || project.mode === 'slideshow' ? 'png' : 'mp4';
  for (const scene of project.scenes ?? []) {
    paths.add(`${project.user_id}/${project.id}/${project.mode === 'image-ad' || project.mode === 'slideshow' ? `item-${scene.index}.${ext}` : `scene-${scene.index}.${ext}`}`);
  }
  if (paths.size) await getAdmin().storage.from(VIDEO_BUCKET).remove([...paths]);
}
