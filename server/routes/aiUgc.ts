/**
 * Rotas das Entregas 2 & 3 — AI UGC Creator, Motion Control, Slideshows e Image Ads (/api/ai-ugc/*).
 *  - POST /extract-link    (grátis) lê metadados/foto do link do produto e organiza em PT-BR
 *  - POST /generate-script (grátis) cria 3 variações de roteiro por plataforma/tom/público
 *  - POST /generate-hooks  (grátis) cria ganchos curtos para Hook + Demo
 *  - POST /generate-slides (grátis) estrutura roteiro visual de carrossel/slideshow
 *  - POST /create          cria vídeo (ADS, Link, Falante, Hook+Demo, Motion Control)
 *  - POST /create-slideshow e POST /create-image-ad geram artes/lâminas em lote com estorno proporcional
 */
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { ApiError } from '../errors';
import { debitUserCredits, refundUserCredits, isUnlimitedUser } from '../credits';
import { generateImage } from '../gemini';
import { getAdmin } from '../supabaseAdmin';
import { applyWatermark } from '../watermark';
import { signedMediaUrl, VIDEO_BUCKET } from '../storage';
import {
  extractProductFromUrl,
  generateHooksWithGemini,
  generateSlidesWithGemini,
  generateUgcScripts,
  generateVeoSceneBuffer,
  stitchVideoBuffers,
} from '../veo';
import {
  calculateImageBatchCost,
  calculateUgcCost,
  createImageAdSchema,
  createSlideshowSchema,
  createUgcVideoSchema,
  extractLinkSchema,
  generateHooksSchema,
  generateScriptSchema,
  generateSlidesSchema,
  IMAGE_ENGINE_COST,
  type CreateUgcVideoRequest,
  type ProjectSceneDTO,
  type VideoProjectDTO,
} from '../../shared/ugcContracts';
import { IMAGE_AD_TEMPLATES } from '../../shared/ugcCatalog';
import type { AspectRatio, EngineId, ImageInput } from '../../shared/contracts';
import type { AppEnv } from '../app';

export const aiUgcRoutes = new Hono<AppEnv>();

function toImageInput(raw?: string): ImageInput | null {
  if (!raw?.trim()) return null;
  const match = raw.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (match && match[1] && match[2]) {
    return { mimeType: match[1] as ImageInput['mimeType'], data: match[2] };
  }
  if (raw.startsWith('/')) return null;
  return { mimeType: 'image/jpeg', data: raw };
}

function buildScenePrompt(req: CreateUgcVideoRequest, scene: { text: string; action?: string }, idx: number): string {
  const ratio = req.aspectRatio === '16:9' ? '16:9 horizontal commercial' : '9:16 vertical UGC smartphone';
  if (req.mode === 'motion') {
    const outfitLine = req.keepClothing
      ? 'Keep exact clothing, hair and identity from the reference avatar image.'
      : 'Adapt outfit naturally to fit the target movement energy while preserving exact face identity.';
    return [
      `Realistic ${ratio} AI motion transfer video (${req.resolution ?? '1080p'}).`,
      req.motionPrompt ? `Target body & camera movement: ${req.motionPrompt}` : `Action: ${scene.action || scene.text}`,
      outfitLine,
      scene.text ? `Spoken / performance line: "${scene.text}"` : '',
      'Fluid human motion, anatomically consistent hands and face, natural smartphone lighting, no embedded text or watermarks.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (req.mode === 'hook' && idx === 0) {
    return [
      `Realistic ${ratio} viral opening hook scene (first seconds to stop scrolling).`,
      req.hookText ? `Opening spoken hook (${req.language ?? 'pt-BR'}): "${req.hookText}"` : `Spoken line: "${scene.text}"`,
      req.productName ? `Context product: ${req.productName}.` : '',
      scene.action ? `Action on camera: ${scene.action}` : 'Expressive eye contact and natural reaction toward smartphone lens.',
      'Leave clear framing headroom at ' + (req.hookPosition ?? 'top') + ' for crisp caption readability, no baked text.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (req.mode === 'remake') {
    return [
      `Authentic ${ratio} UGC Ad Remake recreating proven viral pacing — scene ${idx + 1}.`,
      req.productName ? `Customer product/brand featured cleanly: ${req.productName}.` : '',
      scene.action ? `Visual framing & pacing cues: ${scene.action}` : 'Natural smartphone framing matching viral hook-to-proof transition.',
      `Adapted spoken dialogue (${req.language ?? 'pt-BR'}): "${scene.text}"`,
      'Preserve authentic Brazilian creator realism, crisp product focus, zero watermarks or text artifacts.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `Realistic ${ratio} UGC video ad scene ${idx + 1}.`,
    req.productName ? `Product featured: ${req.productName}.` : '',
    scene.action ? `Action on camera: ${scene.action}` : 'Speaker naturally looking into camera with authentic lighting.',
    req.emotion ? `Speaker facial emotion/energy: ${req.emotion}.` : '',
    `Spoken dialogue (${req.language ?? 'pt-BR'}): "${scene.text}"`,
    req.musicMood && req.musicMood !== 'Sem música' ? `Subtle mood: ${req.musicMood}.` : '',
    'Natural lighting, realistic skin texture, crisp audio/lip alignment, no embedded watermarks.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function processVideoProject(projectId: string, userId: string, generationId: string, req: CreateUgcVideoRequest, totalCost: number) {
  const admin = getAdmin();
  const unlimited = await isUnlimitedUser(userId);
  const aspectForVeo: '9:16' | '16:9' = req.aspectRatio === '16:9' || req.aspectRatio === '4:3' ? '16:9' : '9:16';
  const imgInput = toImageInput(req.avatarImageData) ?? toImageInput(req.productImageData);
  const costPerScene = Math.round(totalCost / req.scenes.length);

  const sceneOutputs: ProjectSceneDTO[] = req.scenes.map((s, index) => ({
    index,
    text: s.text,
    action: s.action,
    status: 'processing',
    duration_seconds: s.durationSeconds ?? 8,
  }));

  const readyBuffers: Buffer[] = [];
  let failedCount = 0;
  let lastError: string | null = null;

  for (let i = 0; i < req.scenes.length; i++) {
    const s = req.scenes[i]!;
    try {
      const buf = await generateVeoSceneBuffer({
        prompt: buildScenePrompt(req, s, i),
        engine: req.engine ?? 'veo-3.1-fast',
        aspectRatio: aspectForVeo,
        imageBytesBase64: imgInput?.data,
        imageMimeType: imgInput?.mimeType,
        durationSeconds: unlimited ? 8 : (s.durationSeconds ?? 8),
        // Omni Flash 1.2 é pago por créditos; o plano Ilimitado usa lowerpriority sem cobrança.
        modelOverride: unlimited ? 'lowerpriority' : (req.engine === 'omni-flash' ? 'omni-flash-1.2' : undefined),
      });
      const scenePath = `${userId}/${projectId}/scene-${i}.mp4`;
      await admin.storage.from(VIDEO_BUCKET).upload(scenePath, buf, { contentType: 'video/mp4', upsert: true });
      const sceneUrl = await signedMediaUrl(scenePath);
      sceneOutputs[i] = { ...sceneOutputs[i]!, status: 'done', video_url: sceneUrl };
      readyBuffers.push(buf);
    } catch (err) {
      failedCount++;
      lastError = err instanceof Error ? err.message : String(err);
      sceneOutputs[i] = { ...sceneOutputs[i]!, status: 'failed', error: lastError };
    }
    await admin.from('video_projects').update({ scenes: sceneOutputs }).eq('id', projectId);
  }

  let finalVideoUrl: string | null = null;
  let finalStoragePath: string | null = null;
  if (readyBuffers.length) {
    const stitched = await stitchVideoBuffers(readyBuffers);
    finalStoragePath = `${userId}/${projectId}/final.mp4`;
    const up = await admin.storage.from(VIDEO_BUCKET).upload(finalStoragePath, stitched, { contentType: 'video/mp4', upsert: true });
    if (!up.error) finalVideoUrl = await signedMediaUrl(finalStoragePath);
  }

  const refunded = failedCount * costPerScene;
  if (refunded > 0) await refundUserCredits({ userId, amount: refunded, refId: generationId });

  const status = readyBuffers.length ? 'done' : 'failed';
  const now = new Date().toISOString();
  await admin
    .from('video_projects')
    .update({
      status,
      refunded,
      video_url: finalVideoUrl,
      storage_path: finalStoragePath,
      scenes: sceneOutputs,
      error: readyBuffers.length ? lastError : (lastError ?? 'Todas as cenas falharam. Créditos devolvidos.'),
      completed_at: now,
    })
    .eq('id', projectId);

  await admin
    .from('generations')
    .update({ status, result_count: readyBuffers.length, error: lastError, completed_at: now })
    .eq('id', generationId);
}

aiUgcRoutes.post('/extract-link', async (c) => {
  const parsed = extractLinkSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Cole uma URL válida começando com https://');
  const product = await extractProductFromUrl(parsed.data.url);
  return c.json(product);
});

aiUgcRoutes.post('/generate-script', async (c) => {
  const parsed = generateScriptSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Informe pelo menos o nome do produto.');
  const options = await generateUgcScripts(parsed.data);
  return c.json({ options });
});

aiUgcRoutes.post('/generate-hooks', async (c) => {
  const parsed = generateHooksSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Informe o nome do produto ou tema para gerar ganchos.');
  const hooks = await generateHooksWithGemini(parsed.data);
  return c.json({ hooks });
});

aiUgcRoutes.post('/generate-slides', async (c) => {
  const parsed = generateSlidesSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Informe o tema ou produto do slideshow.');
  const slides = await generateSlidesWithGemini(parsed.data);
  return c.json({ slides });
});

/** Pipeline compartilhado entre Slideshows e Image Ads: debita atômico, gera N imagens com marca d'água e estorna falhas. */
async function runBatchImageProject(opts: {
  userId: string;
  mode: 'slideshow' | 'image-ad';
  title: string;
  engine: EngineId;
  aspectRatio: AspectRatio;
  items: { headline: string; body: string; prompt: string; images: ImageInput[] }[];
  params: Record<string, unknown>;
  fallbackThumb?: string;
}): Promise<{ project: VideoProjectDTO; balance: number }> {
  const admin = getAdmin();
  const unitCost = IMAGE_ENGINE_COST[opts.engine] ?? 2;
  const cost = calculateImageBatchCost({ engine: opts.engine, count: opts.items.length });
  const generationId = randomUUID();
  const projectId = randomUUID();

  const genIns = await admin
    .from('generations')
    .insert({ id: generationId, user_id: opts.userId, kind: `ugc_${opts.mode}`, status: 'processing', cost, params: { title: opts.title, count: opts.items.length } })
    .select()
    .single();
  if (genIns.error) throw new ApiError('INTERNAL', genIns.error.message);

  let balance = await debitUserCredits({
    userId: opts.userId,
    amount: cost,
    reason: `ugc_${opts.mode}`,
    refId: generationId,
    insufficientMessage: `Você precisa de ${cost} créditos para gerar ${opts.items.length} imagem(ns).`,
  });

  const sceneOutputs: ProjectSceneDTO[] = [];
  let failedCount = 0;
  let lastError: string | null = null;
  let firstUrl: string | null = null;

  await Promise.all(
    opts.items.map(async (item, index) => {
      try {
        const res = await generateImage({
          prompt: item.prompt,
          engine: opts.engine,
          aspectRatio: opts.aspectRatio,
          images: item.images,
          modelOverride: await isUnlimitedUser(opts.userId) ? 'lowerpriority' : undefined,
        });
        const branded = await applyWatermark(res.buffer);
        const path = `${opts.userId}/${projectId}/item-${index}.png`;
        await admin.storage.from(VIDEO_BUCKET).upload(path, branded, { contentType: 'image/png', upsert: true });
        const publicUrl = await signedMediaUrl(path);
        if (!firstUrl) firstUrl = publicUrl;
        sceneOutputs[index] = {
          index,
          headline: item.headline,
          text: item.body || item.headline,
          status: 'done',
          duration_seconds: 3,
          image_url: publicUrl,
        };
      } catch (err) {
        failedCount++;
        lastError = err instanceof ApiError ? err.message : String(err);
        sceneOutputs[index] = {
          index,
          headline: item.headline,
          text: item.body || item.headline,
          status: 'failed',
          duration_seconds: 3,
          error: lastError,
        };
      }
    }),
  );

  const refunded = failedCount * unitCost;
  if (refunded > 0) {
    const newBal = await refundUserCredits({ userId: opts.userId, amount: refunded, refId: generationId });
    if (newBal !== null) balance = newBal;
  }

  const readyCount = opts.items.length - failedCount;
  const status = readyCount > 0 ? 'done' : 'failed';
  const now = new Date().toISOString();

  await admin
    .from('generations')
    .update({ status, result_count: readyCount, error: lastError, completed_at: now })
    .eq('id', generationId);

  const projIns = await admin
    .from('video_projects')
    .insert({
      id: projectId,
      user_id: opts.userId,
      generation_id: generationId,
      mode: opts.mode,
      title: opts.title,
      status,
      engine: opts.engine,
      aspect_ratio: opts.aspectRatio,
      duration_seconds: opts.items.length * 3,
      scene_count: opts.items.length,
      cost,
      refunded,
      thumbnail_url: firstUrl || opts.fallbackThumb || '/showcase/modelo-01.webp',
      video_url: firstUrl,
      storage_path: firstUrl ? `${opts.userId}/${projectId}/item-0.png` : null,
      scenes: sceneOutputs,
      params: opts.params,
      error: readyCount ? lastError : (lastError ?? 'Falha ao gerar imagens. Créditos devolvidos.'),
      completed_at: now,
    })
    .select()
    .single();
  if (projIns.error) throw new ApiError('INTERNAL', projIns.error.message);

  if (readyCount === 0) {
    throw new ApiError('GENERATION_FAILED', lastError ?? 'Nenhuma imagem pôde ser gerada. Seus créditos voltaram ao saldo.');
  }

  return { project: projIns.data as VideoProjectDTO, balance };
}

aiUgcRoutes.post('/create-slideshow', async (c) => {
  const userId = c.get('userId');
  const parsed = createSlideshowSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError('INVALID_INPUT', `Slideshow inválido: ${parsed.error.issues[0]?.message ?? 'revise os slides'}`);
  }
  const req = parsed.data;
  const out = await runBatchImageProject({
    userId,
    mode: 'slideshow',
    title: req.title,
    engine: req.engine,
    aspectRatio: req.aspectRatio,
    items: req.slides.map((s, idx) => ({
      headline: s.headline,
      body: s.body,
      prompt:
        `${s.visualPrompt || s.headline}. Editorial social media carousel background photo (${req.aspectRatio}), clean natural lighting, slide ${idx + 1} of ${req.slides.length}. No embedded text overlays.`,
      images: [],
    })),
    params: { tone: req.tone, captionStyle: req.captionStyle, captionPosition: req.captionPosition },
  });
  return c.json(out);
});

aiUgcRoutes.post('/create-image-ad', async (c) => {
  const userId = c.get('userId');
  const parsed = createImageAdSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError('INVALID_INPUT', `Anúncio inválido: ${parsed.error.issues[0]?.message ?? 'revise os campos'}`);
  }
  const req = parsed.data;
  const tpl = IMAGE_AD_TEMPLATES.find((t) => t.id === req.templateId) ?? IMAGE_AD_TEMPLATES[0]!;
  const images: ImageInput[] = [];
  const avatarImg = toImageInput(req.avatarImageData);
  const productImg = toImageInput(req.productImageData);
  if (avatarImg) images.push(avatarImg);
  if (productImg) images.push(productImg);

  const items = Array.from({ length: req.count }, (_, idx) => ({
    headline: req.headline,
    body: `${req.badgeText ? `[${req.badgeText}] ` : ''}${req.productName} · ${req.ctaText}`,
    prompt: [
      `Commercial static advertising creative (${req.aspectRatio}), variation #${idx + 1}.`,
      `Template art direction: ${tpl.compositionPrompt}`,
      `Featured product: ${req.productName}.`,
      `Ad angle/headline concept: "${req.headline}".`,
      req.stylePrompt ? `Extra styling: ${req.stylePrompt}` : '',
      'Ultra sharp lighting, authentic commercial photography, no random garbled words.',
    ]
      .filter(Boolean)
      .join('\n'),
    images,
  }));

  const out = await runBatchImageProject({
    userId,
    mode: 'image-ad',
    title: req.title,
    engine: req.engine,
    aspectRatio: req.aspectRatio,
    items,
    params: { templateId: req.templateId, headline: req.headline, badgeText: req.badgeText, ctaText: req.ctaText },
    fallbackThumb: req.avatarUrl || tpl.thumbnail,
  });
  return c.json(out);
});

aiUgcRoutes.post('/create', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const parsed = createUgcVideoSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('INVALID_INPUT', `Dados inválidos: ${parsed.error.issues[0]?.message ?? 'revise o projeto'}`);
  }
  const req = parsed.data;
  const cost = calculateUgcCost({ engine: req.engine, sceneCount: req.scenes.length, voiceType: req.voiceType });
  const generationId = randomUUID();
  const projectId = randomUUID();
  const admin = getAdmin();

  const genIns = await admin
    .from('generations')
    .insert({ id: generationId, user_id: userId, kind: 'ugc_video', status: 'processing', cost, params: { mode: req.mode, title: req.title, count: req.scenes.length } })
    .select()
    .single();
  if (genIns.error) throw new ApiError('INTERNAL', genIns.error.message);

  let balance: number;
  try {
    balance = await debitUserCredits({
      userId,
      amount: cost,
      reason: `ugc_${req.mode}`,
      refId: generationId,
      insufficientMessage: `Você precisa de ${cost} créditos para criar ${req.scenes.length} cena(s) (${req.engine}).`,
    });
  } catch (err) {
    await admin.from('generations').update({ status: 'failed', error: 'Créditos insuficientes', completed_at: new Date().toISOString() }).eq('id', generationId);
    throw err;
  }

  const totalDuration = req.scenes.reduce((sum, s) => sum + (s.durationSeconds ?? 8), 0);
  const initialScenes: ProjectSceneDTO[] = req.scenes.map((s, index) => ({
    index,
    text: s.text,
    action: s.action,
    status: 'processing',
    duration_seconds: s.durationSeconds ?? 8,
  }));

  const projIns = await admin
    .from('video_projects')
    .insert({
      id: projectId,
      user_id: userId,
      generation_id: generationId,
      mode: req.mode,
      title: req.title,
      status: 'processing',
      engine: req.engine,
      aspect_ratio: req.aspectRatio,
      duration_seconds: totalDuration,
      scene_count: req.scenes.length,
      cost,
      refunded: 0,
      thumbnail_url: req.avatarUrl || '/showcase/modelo-01.webp',
      scenes: initialScenes,
      params: { language: req.language, voiceType: req.voiceType, captions: req.captions, emotion: req.emotion, brollCount: req.brollCount },
    })
    .select()
    .single();

  if (projIns.error) {
    await refundUserCredits({ userId, amount: cost, refId: generationId });
    throw new ApiError('INTERNAL', `Não consegui salvar o projeto: ${projIns.error.message}`);
  }

  // Dispara a geração cena por cena em segundo plano para o usuário poder acompanhar em Projetos.
  // O callback assíncrono começa no próximo ciclo do event loop; assim o POST
  // devolve o projeto imediatamente, sem ficar aguardando o Veo/Rust.
  setImmediate(() => {
    void processVideoProject(projectId, userId, generationId, req, cost).catch(async (err) => {
      const message = err instanceof Error ? err.message : String(err);
      await admin.from('video_projects').update({ status: 'failed', error: message, completed_at: new Date().toISOString() }).eq('id', projectId);
      await admin.from('generations').update({ status: 'failed', error: message, completed_at: new Date().toISOString() }).eq('id', generationId);
    });
  });

  return c.json({ project: projIns.data as VideoProjectDTO, balance });
});
