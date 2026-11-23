/**
 * Rotas de Projetos (/api/projects/*) — listagem, exclusão e refação de cena com falha.
 */
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { ApiError } from '../errors';
import { debitUserCredits, refundUserCredits } from '../credits';
import { getAdmin } from '../supabaseAdmin';
import { generateVeoSceneBuffer, stitchVideoBuffers } from '../veo';
import { calculateUgcCost, type ProjectSceneDTO, type VideoEngineId, type VideoProjectDTO } from '../../shared/ugcContracts';
import { hydrateProjectMedia, removeProjectMedia, signedMediaUrl, VIDEO_BUCKET } from '../storage';
import type { AppEnv } from '../app';

export const projectRoutes = new Hono<AppEnv>();

async function hydrateProjectReferences(project: VideoProjectDTO): Promise<VideoProjectDTO> {
  const params = project.params;
  const assets = params && Array.isArray(params.reference_assets) ? params.reference_assets : [];
  if (!assets.length) return project;
  const reference_assets = await Promise.all(
    assets.map(async (asset) => {
      if (!asset || typeof asset !== 'object') return asset;
      const item = asset as { path?: unknown; url?: unknown; kind?: unknown; name?: unknown };
      const path = typeof item.path === 'string' ? item.path : '';
      const url = path ? await signedMediaUrl(path).catch(() => null) : (typeof item.url === 'string' ? item.url : null);
      return { kind: item.kind, name: item.name, path, url: url ?? item.url ?? null };
    }),
  );
  return { ...project, params: { ...params, reference_assets } };
}

projectRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const page = Math.max(1, Number(c.req.query('page') ?? '1') || 1);
  const limit = Math.min(48, Math.max(1, Number(c.req.query('limit') ?? '24') || 24));
  const origin = c.req.query('origin') === 'avatar' ? 'avatar' : 'projects';
  const admin = getAdmin();
  const { data, error } = await admin
    .from('video_projects')
    .select('*')
    .eq('user_id', userId)
    .eq('origin', origin)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit);
  if (error) throw new ApiError('INTERNAL', error.message);
  const rows = (data ?? []) as VideoProjectDTO[];
  const hasMore = rows.length > limit;
  const projects = await Promise.all(
    rows.slice(0, limit).map(async (project) => {
      // Projetos pendentes/falhos não têm arquivos de saída assináveis; não consulte Storage.
      if (project.status === 'processing') return project;
      try {
        const hydrated = project.status === 'failed' ? project : await hydrateProjectMedia(project);
        return await hydrateProjectReferences(hydrated);
      } catch (err) {
        console.error('[api] não foi possível preparar a mídia do projeto:', project.id, err);
        return project;
      }
    }),
  );
  return c.json({ projects, page, limit, hasMore });
});

projectRoutes.post('/:id/retry-scene', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => null)) as { sceneIndex?: number } | null;
  if (!/^[0-9a-f-]{36}$/i.test(id) || typeof body?.sceneIndex !== 'number') {
    throw new ApiError('INVALID_INPUT', 'Informe o projeto e o número da cena.');
  }
  const admin = getAdmin();
  const { data: project, error } = await admin.from('video_projects').select('*').eq('id', id).maybeSingle();
  if (error) throw new ApiError('INTERNAL', error.message);
  if (!project || project.user_id !== userId) throw new ApiError('INVALID_INPUT', 'Projeto não encontrado.');

  const scenes = [...((project.scenes as ProjectSceneDTO[]) ?? [])];
  const scene = scenes[body.sceneIndex];
  if (!scene) throw new ApiError('INVALID_INPUT', 'Cena não encontrada.');

  const engine = (project.engine as VideoEngineId) || 'veo-3.1-fast';
  const projectParams = (project.params && typeof project.params === 'object') ? project.params as Record<string, unknown> : {};
  const modelOverride = projectParams.model_override === 'lowerpriority' ? 'lowerpriority' : projectParams.model_override === 'omni-flash-1.2' ? 'omni-flash-1.2' : undefined;
  const sceneDuration = scene.duration_seconds || 8;
  const sceneCost = modelOverride === 'lowerpriority' ? 0 : calculateUgcCost({ engine, sceneCount: 1, durationSeconds: sceneDuration });
  const refId = randomUUID();
  let balance = await debitUserCredits({
    userId,
    amount: sceneCost,
    reason: 'ugc_retry_scene',
    refId,
    insufficientMessage: `Você precisa de ${sceneCost} créditos para refazer essa cena.`,
    chargeUnlimited: modelOverride === 'omni-flash-1.2',
  });

  try {
    const aspect: '9:16' | '16:9' = project.aspect_ratio === '16:9' || project.aspect_ratio === '4:3' ? '16:9' : '9:16';
    const referenceAssets = Array.isArray(projectParams.reference_assets)
      ? projectParams.reference_assets as Array<{ kind?: unknown; path?: unknown }>
      : [];
    const startAsset = referenceAssets.find((asset) => asset?.kind === 'frame-inicial' && typeof asset.path === 'string');
    let startImageBase64: string | undefined;
    if (startAsset && typeof startAsset.path === 'string') {
      const downloaded = await admin.storage.from(VIDEO_BUCKET).download(startAsset.path);
      if (!downloaded.error && downloaded.data) {
        startImageBase64 = Buffer.from(await downloaded.data.arrayBuffer()).toString('base64');
      }
    }
    const motionAsset = projectParams.motion_video_asset as { path?: string } | undefined;
    let sourceVideoBytesBase64: string | undefined;
    const identityReferences: Array<{data: string; mimeType: string}> = [];
    if (project.mode === 'motion') {
      if (!motionAsset?.path) throw new ApiError('INVALID_INPUT', 'Este projeto não tem vídeo-base registrado para refazer o Motion.');
      const source = await admin.storage.from(VIDEO_BUCKET).download(motionAsset.path);
      if (source.error || !source.data) throw new ApiError('INVALID_INPUT', 'Não consegui recuperar o vídeo-base do Motion.');
      sourceVideoBytesBase64 = Buffer.from(await source.data.arrayBuffer()).toString('base64');
      for (const asset of referenceAssets) {
        if (typeof asset.path !== 'string') continue;
        const image = await admin.storage.from(VIDEO_BUCKET).download(asset.path);
        if (image.error || !image.data) throw new ApiError('INVALID_INPUT', 'Não consegui recuperar a foto do personagem.');
        identityReferences.push({ data: Buffer.from(await image.data.arrayBuffer()).toString('base64'), mimeType: image.data.type || 'image/jpeg' });
      }
      if (!identityReferences.length) throw new ApiError('INVALID_INPUT', 'A foto do personagem não foi registrada neste Motion.');
    }
    const buf = await generateVeoSceneBuffer({
      prompt: `Retry UGC ad scene: ${scene.action ?? ''} Dialogue: "${scene.text}"`,
      engine,
      aspectRatio: aspect,
      imageBytesBase64: startImageBase64,
      sourceVideoBytesBase64,
      referenceImages: identityReferences,
      durationSeconds: scene.duration_seconds || 8,
      modelOverride,
    });
    const scenePath = `${userId}/${id}/scene-${scene.index}.mp4`;
    await admin.storage.from(VIDEO_BUCKET).upload(scenePath, buf, { contentType: 'video/mp4', upsert: true });
    const sceneUrl = await signedMediaUrl(scenePath);
    scenes[scene.index] = {
      ...scene,
      status: 'done',
      video_url: sceneUrl,
      flow_media_id: buf.flowMediaId,
      flow_account_id: buf.flowAccountId,
      error: null,
    };

    const stitched = await stitchVideoBuffers([buf]);
    const finalPath = `${userId}/${id}/final.mp4`;
    await admin.storage.from(VIDEO_BUCKET).upload(finalPath, stitched, { contentType: 'video/mp4', upsert: true });
    const finalUrl = await signedMediaUrl(finalPath);

    const { data: updated } = await admin
      .from('video_projects')
      .update({ status: 'done', video_url: finalUrl, storage_path: finalPath, scenes, error: null, completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return c.json({ project: updated as VideoProjectDTO, balance });
  } catch (err) {
    const refunded = await refundUserCredits({ userId, amount: sceneCost, refId, chargeUnlimited: modelOverride === 'omni-flash-1.2' });
    if (refunded !== null) balance = refunded;
    throw err;
  }
});

projectRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError('INVALID_INPUT', 'Id inválido.');
  const admin = getAdmin();
  const { data, error } = await admin.from('video_projects').select('*').eq('id', id).maybeSingle();
  if (error) throw new ApiError('INTERNAL', error.message);
  if (!data || data.user_id !== userId) throw new ApiError('INVALID_INPUT', 'Projeto não encontrado.');
  await removeProjectMedia(data as VideoProjectDTO);
  const del = await admin.from('video_projects').delete().eq('id', id);
  if (del.error) throw new ApiError('INTERNAL', del.error.message);
  return c.json({ ok: true });
});
