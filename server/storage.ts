import type { VideoProjectDTO, ProjectSceneDTO } from '../shared/ugcContracts';
import { getAdmin } from './supabaseAdmin';

export const VIDEO_BUCKET = 'videos';
const SIGNED_URL_TTL = 60 * 60;
const SIGNED_URL_REUSE_SECONDS = 50 * 60;

type SignedUrlCacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, SignedUrlCacheEntry>();
const signedUrlBatches = new Map<string, Promise<void>>();

function signedUrlKey(bucket: string, path: string) {
  return `${bucket}\\0${path}`;
}

function pruneSignedUrlCache(now: number) {
  for (const [key, entry] of signedUrlCache) {
    if (entry.expiresAt <= now) signedUrlCache.delete(key);
  }
  while (signedUrlCache.size > 2_000) {
    const oldestKey = signedUrlCache.keys().next().value;
    if (!oldestKey) break;
    signedUrlCache.delete(oldestKey);
  }
}

/** Reuses stable signed URLs within one Node process so gallery refreshes do not
 * generate a new CDN cache key for the same private Storage object. */
export async function signedStorageUrls(bucket: string, paths: string[], ttlSeconds = SIGNED_URL_TTL) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const now = Date.now();
  pruneSignedUrlCache(now);
  const urls = new Map<string, string>();
  const missing: string[] = [];
  for (const path of uniquePaths) {
    const entry = signedUrlCache.get(signedUrlKey(bucket, path));
    if (entry && entry.expiresAt > now) urls.set(path, entry.url);
    else missing.push(path);
  }

  if (missing.length) {
    // Coalesce simultaneous requests for the same gallery set into one Storage call.
    const batchKey = `${bucket}\\0${ttlSeconds}\\0${[...missing].sort().join('\\0')}`;
    let batch = signedUrlBatches.get(batchKey);
    if (!batch) {
      batch = (async () => {
        const { data, error } = await getAdmin().storage.from(bucket).createSignedUrls(missing, ttlSeconds);
        if (error) throw error;
        const expiresAt = Date.now() + SIGNED_URL_REUSE_SECONDS * 1000;
        for (const item of data ?? []) {
          if (item.path && item.signedUrl && !item.error) {
            signedUrlCache.set(signedUrlKey(bucket, item.path), { url: item.signedUrl, expiresAt });
          }
        }
        pruneSignedUrlCache(Date.now());
      })().finally(() => signedUrlBatches.delete(batchKey));
      signedUrlBatches.set(batchKey, batch);
    }
    await batch;
    for (const path of missing) {
      const entry = signedUrlCache.get(signedUrlKey(bucket, path));
      if (entry && entry.expiresAt > Date.now()) urls.set(path, entry.url);
    }
  }
  return urls;
}

export function invalidateSignedStorageUrl(bucket: string, path: string) {
  signedUrlCache.delete(signedUrlKey(bucket, path));
}

export async function ensurePrivateGeneratedBuckets() {
  const admin = getAdmin();
  for (const bucket of [VIDEO_BUCKET, 'avatars']) {
    const { error } = await admin.storage.updateBucket(bucket, { public: false });
    if (error) throw error;
  }
}

export async function signedMediaUrl(path: string | null | undefined) {
  if (!path) return null;
  const urls = await signedStorageUrls(VIDEO_BUCKET, [path], SIGNED_URL_TTL);
  const url = urls.get(path);
  if (!url) throw new Error('Não foi possível preparar o arquivo para visualização: URL ausente');
  return url;
}

/** Reidrata URLs privadas sem expor o caminho permanente do Storage. */
export async function hydrateProjectMedia(project: VideoProjectDTO): Promise<VideoProjectDTO> {
  const userPrefix = `${project.user_id}/${project.id}`;
  const isImageBatch = project.mode === 'image-ad' || project.mode === 'slideshow';
  const fallbackPath = isImageBatch && project.scenes?.length ? `${userPrefix}/item-0.png` : null;
  const finalUrl = await signedMediaUrl(project.storage_path ?? fallbackPath);
  const storedThumbnailPath = isImageBatch ? fallbackPath : `${userPrefix}/thumbnail.jpg`;
  const storedThumbnailUrl = await signedMediaUrl(storedThumbnailPath).catch(() => null);
  const referenceAssets = project.params && Array.isArray(project.params.reference_assets) ? project.params.reference_assets : [];
  const refreshedReferenceAssets = await Promise.all(referenceAssets.map(async (asset) => {
    if (!asset || typeof asset !== 'object') return asset;
    const reference = asset as Record<string, unknown>;
    if (typeof reference.path !== 'string') return reference;
    const url = await signedMediaUrl(reference.path).catch(() => null);
    if (url) return { ...reference, url };
    const { url: _expiredUrl, ...withoutExpiredUrl } = reference;
    return withoutExpiredUrl;
  }));
  const firstReference = referenceAssets.find((asset) => asset && typeof asset === 'object' && typeof (asset as { path?: unknown }).path === 'string') as { path: string } | undefined;
  const referenceThumbnailUrl = !storedThumbnailUrl && firstReference
    ? await signedMediaUrl(firstReference.path).catch(() => null)
    : null;
  const thumbnailUrl = storedThumbnailUrl ?? referenceThumbnailUrl ?? project.thumbnail_url;
  const scenes = await Promise.all((project.scenes ?? []).map(async (scene: ProjectSceneDTO) => {
    const ext = isImageBatch ? 'png' : 'mp4';
    const path = `${userPrefix}/${isImageBatch ? `item-${scene.index}.${ext}` : `scene-${scene.index}.${ext}`}`;
    const url = await signedMediaUrl(path).catch(() => null);
    return url ? { ...scene, video_url: url, image_url: isImageBatch ? url : scene.image_url } : scene;
  }));
  return {
    ...project,
    thumbnail_url: thumbnailUrl,
    video_url: finalUrl,
    scenes,
    ...(project.params ? { params: { ...project.params, reference_assets: refreshedReferenceAssets } } : {}),
  };
}

export async function removeProjectMedia(project: Pick<VideoProjectDTO, 'user_id' | 'id' | 'storage_path' | 'mode' | 'scenes' | 'params'>) {
  const paths = new Set<string>();
  if (project.storage_path) paths.add(project.storage_path);
  const ext = project.mode === 'image-ad' || project.mode === 'slideshow' ? 'png' : 'mp4';
  for (const scene of project.scenes ?? []) {
    paths.add(`${project.user_id}/${project.id}/${project.mode === 'image-ad' || project.mode === 'slideshow' ? `item-${scene.index}.${ext}` : `scene-${scene.index}.${ext}`}`);
  }
  const assets = project.params && Array.isArray(project.params.reference_assets) ? project.params.reference_assets : [];
  for (const asset of assets) {
    if (asset && typeof asset === 'object' && typeof (asset as { path?: unknown }).path === 'string') paths.add((asset as { path: string }).path);
  }
  if (paths.size) await getAdmin().storage.from(VIDEO_BUCKET).remove([...paths]);
}
