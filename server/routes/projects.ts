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
projectRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const page = Math.max(1, Number(c.req.query('page') ?? '1') || 1);
  const limit = Math.min(48, Math.max(1, Number(c.req.query('limit') ?? '24') || 24));
  const admin = getAdmin();
  const { data, error } = await admin
    .from('video_projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit);
  if (error) throw new ApiError('INTERNAL', error.message);
  const rows = (data ?? []) as VideoProjectDTO[];
  const hasMore = rows.length > limit;
  const projects = await Promise.all(rows.slice(0, limit).map((project) => hydrateProjectMedia(project)));
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
  const sceneCost = calculateUgcCost({ engine, sceneCount: 1 });
  const refId = randomUUID();
  let balance = await debitUserCredits({
    userId,
    amount: sceneCost,
    reason: 'ugc_retry_scene',
    refId,
    insufficientMessage: `Você precisa de ${sceneCost} créditos para refazer essa cena.`,
  });

  try {
    const aspect: '9:16' | '16:9' = project.aspect_ratio === '16:9' || project.aspect_ratio === '4:3' ? '16:9' : '9:16';
    const buf = await generateVeoSceneBuffer({
      prompt: `Retry UGC ad scene: ${scene.action ?? ''} Dialogue: "${scene.text}"`,
      engine,
      aspectRatio: aspect,
      durationSeconds: scene.duration_seconds || 8,
    });
    const scenePath = `${userId}/${id}/scene-${scene.index}.mp4`;
    await admin.storage.from(VIDEO_BUCKET).upload(scenePath, buf, { contentType: 'video/mp4', upsert: true });
    const sceneUrl = await signedMediaUrl(scenePath);
    scenes[scene.index] = { ...scene, status: 'done', video_url: sceneUrl, error: null };

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
    const refunded = await refundUserCredits({ userId, amount: sceneCost, refId });
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
