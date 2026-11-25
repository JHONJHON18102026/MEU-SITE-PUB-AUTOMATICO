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
import { applyVideoWatermark, applyWatermark, isOwnerUser } from '../watermark';
import { signedMediaUrl, VIDEO_BUCKET } from '../storage';
import { toImageInput } from '../imageInput';
import { buildAvatarReferenceGuidance, explainVideoGenerationFailure } from '../videoGenerationDiagnostics';
import {
  extractProductFromUrl,
  generateHooksWithGemini,
  generateSlidesWithGemini,
  generateUgcScripts,
  generateVeoSceneBuffer,
  extractVideoThumbnail,
  normalizeEightSecondVideo,
  trimVideoToDuration,
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

type DirectorQualityCheck = { label: string; status: 'passed' | 'warning' | 'failed'; detail: string };

function buildDirectorQuality(opts: {
  status: 'done' | 'failed';
  requestedDuration: number;
  readyScenes: number;
  totalScenes: number;
  referenceMode?: 'frames' | 'elements';
  referenceCount: number;
  hasThumbnail: boolean;
}): { overall: 'approved' | 'needs-review'; checks: DirectorQualityCheck[]; checkedAt: string } {
  const completed = opts.readyScenes === opts.totalScenes;
  return {
    overall: opts.status === 'done' && completed ? 'approved' : 'needs-review',
    checkedAt: new Date().toISOString(),
    checks: [
      { label: 'Renderização', status: completed ? 'passed' : 'failed', detail: completed ? `${opts.readyScenes}/${opts.totalScenes} cena(s) concluída(s).` : `${opts.readyScenes}/${opts.totalScenes} cena(s) concluída(s); revise as falhas.` },
      { label: 'Duração', status: completed ? 'passed' : 'warning', detail: `${opts.requestedDuration}s planejados e registrados para o projeto.` },
      { label: 'Referências', status: opts.referenceCount > 0 ? 'passed' : 'warning', detail: opts.referenceCount > 0 ? `${opts.referenceCount} referência(s) ${opts.referenceMode === 'elements' ? 'enviada(s) como elementos de consistência.' : 'registrada(s) no projeto.'}` : 'Nenhuma referência visual foi enviada; o Diretor criou um frame inicial quando necessário.' },
      { label: 'Capa', status: opts.hasThumbnail ? 'passed' : 'warning', detail: opts.hasThumbnail ? 'Capa extraída do vídeo final.' : 'Capa indisponível; revise a prévia.' },
    ],
  };
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
      req.motionVideoMediaId || req.motionVideoData
        ? ''
        : scene.text ? `Spoken / performance line: "${scene.text}"` : '',
      'Fluid human motion, anatomically consistent hands and face, natural smartphone lighting, no embedded text or watermarks.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (req.mode === 'avatar-video') {
    const hasPersonReference = Boolean(req.avatarImageData || req.avatarUrl);
    return [
      `Natural ${ratio} creator video scene ${idx + 1}.`,
      req.avatarPrompt || scene.action || scene.text,
      req.productImageData || req.productName ? `Present the product faithfully${req.productName ? `: ${req.productName}` : ''}. Preserve its visible design and do not invent product claims.` : '',
      hasPersonReference ? 'Preserve the person identity only from the INFLUENCIADOR reference.' : '',
      'Use believable human movement, coherent camera motion, natural lighting, and no generated captions, logos, or watermarks.',
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

async function processVideoProject(projectId: string, userId: string, generationId: string, req: CreateUgcVideoRequest, totalCost: number, settleRefund: (amount: number) => Promise<boolean>) {
  const admin = getAdmin();
  const unlimited = (await isUnlimitedUser(userId)) && req.engine !== 'omni-flash';
  const avatarCanvasLowerPriority = req.origin === 'avatar' && (req.mode === 'motion' || req.mode === 'avatar-video') && req.engine === 'veo-3.1-fast';
  const useLowerPriorityQueue = unlimited || avatarCanvasLowerPriority;
  const aspectForVeo: '9:16' | '16:9' = req.aspectRatio === '16:9' || req.aspectRatio === '4:3' ? '16:9' : '9:16';
  const legacyImage = toImageInput(req.avatarImageData) ?? toImageInput(req.productImageData);
  // Canvas videos sent as Element references still need an opening image:
  // Flow's lowerpriority queue is reliable as image-to-video, not text-to-video.
  const avatarCanvasVideo = req.origin === 'avatar' && (req.mode === 'motion' || req.mode === 'avatar-video') && !req.motionVideoData;
  const startFrame = toImageInput(req.startFrameImageData)
    ?? (req.referenceMode === 'frames' ? null : (avatarCanvasVideo || !req.referenceMode ? legacyImage : null));
  const endFrame = toImageInput(req.endFrameImageData);
  const elementImages = (req.referenceImages ?? []).map((raw) => toImageInput(raw)).filter((image): image is ImageInput => Boolean(image));
  const motionVideo = req.motionVideoData?.replace(/^data:video\/[a-z0-9.+-]+;base64,/, '');
  const costPerScene = Math.round(totalCost / req.scenes.length);

  const sceneOutputs: ProjectSceneDTO[] = req.scenes.map((s, index) => ({
    index,
    text: s.text,
    action: s.action,
    status: 'processing',
    duration_seconds: useLowerPriorityQueue ? 8 : s.durationSeconds ?? 8,
  }));

  const readyBuffers: Buffer[] = [];
  let failedCount = 0;
  let lastError: string | null = null;

  for (let i = 0; i < req.scenes.length; i++) {
    const s = req.scenes[i]!;
    try {
      const generated = await generateVeoSceneBuffer({
        prompt: [
          buildScenePrompt(req, s, i),
          motionVideo ? 'Use the uploaded motion reference video as the exact source for body movement, timing, gestures and camera rhythm. Transfer that motion to the selected avatar while preserving the avatar identity and wardrobe.' : '',
          req.mode === 'avatar-video'
            ? buildAvatarReferenceGuidance({
              hasAvatarReference: Boolean(req.avatarImageData || req.avatarUrl),
              hasProductReference: Boolean(req.productImageData),
              hasExplicitStartFrame: Boolean(req.startFrameImageData),
              elementNames: req.referenceImageNames,
            })
            : req.referenceMode === 'elements'
            ? [
              'Use the uploaded Element references as identity and appearance constraints. Render one coherent cinematic scene, never a collage, contact sheet, split screen, or visible reference board. Preserve the same face, hair, clothing, colors, product design, and distinctive details throughout the shot.',
              startFrame ? 'Use the selected opening image as a visual identity and appearance reference; preserve its person, clothing and product while creating a coherent moving scene.' : '',
            ].filter(Boolean).join(' ')
            : req.referenceMode === 'frames'
              ? 'Start exactly from the uploaded initial frame and, when supplied, finish exactly on the uploaded final frame. Preserve identity, wardrobe, environment, composition, and object details while creating a natural transition.'
              : '',
        ].filter(Boolean).join('\n'),
        engine: req.engine ?? 'veo-3.1-fast',
        aspectRatio: aspectForVeo,
        imageBytesBase64: motionVideo ? undefined : startFrame?.data,
        imageMimeType: motionVideo ? undefined : startFrame?.mimeType,
        endImageBytesBase64: endFrame?.data,
        endImageMimeType: endFrame?.mimeType,
        // In video editing the target avatar is an identity reference,
        // never a literal first frame replacing the source video's opening.
        referenceImages: req.mode === 'motion' && legacyImage ? [legacyImage, ...elementImages] : elementImages,
        sourceVideoBytesBase64: motionVideo,
        sourceVideoMediaId: req.motionVideoMediaId,
        sourceVideoAccountId: req.motionVideoAccountId,
        durationSeconds: useLowerPriorityQueue ? 8 : (s.durationSeconds ?? 8),
        // Omni Flash 1.2 é pago por créditos; o plano Ilimitado usa lowerpriority sem cobrança.
        // O bridge Rust reconhece explicitamente este perfil como a fila
        // lowerpriority do Veo 3.1 (sem cobrança no plano ilimitado).
        modelOverride: unlimited || avatarCanvasLowerPriority
          ? 'lowerpriority'
          : req.engine === 'omni-flash' ? 'omni-flash-1.2' : undefined,
      });
      const normalized = unlimited
        ? await normalizeEightSecondVideo(generated)
        : req.origin === 'avatar' && req.engine === 'omni-flash'
          ? await trimVideoToDuration(generated, s.durationSeconds ?? 8)
          : generated;
      const buf = await isOwnerUser(userId) ? await applyVideoWatermark(normalized) : normalized;
      const scenePath = `${userId}/${projectId}/scene-${i}.mp4`;
      const uploaded = await admin.storage.from(VIDEO_BUCKET).upload(scenePath, buf, { contentType: 'video/mp4', upsert: true });
      if (uploaded.error) throw new Error(`Falha ao salvar cena: ${uploaded.error.message}`);
      const sceneUrl = await signedMediaUrl(scenePath);
      sceneOutputs[i] = {
        ...sceneOutputs[i]!,
        status: 'done',
        video_url: sceneUrl,
        flow_media_id: generated.flowMediaId,
        flow_account_id: generated.flowAccountId,
      };
      readyBuffers.push(buf);
    } catch (err) {
      failedCount++;
      const rawError = err instanceof Error ? err.message : String(err);
      lastError = explainVideoGenerationFailure(rawError, req.engine ?? 'veo-3.1-fast');
      console.error('[video] Falha no motor de vídeo', { projectId, generationId, engine: req.engine ?? 'veo-3.1-fast', code: lastError.match(/\(([^)]+)\)/)?.[1] ?? null });
      sceneOutputs[i] = { ...sceneOutputs[i]!, status: 'failed', error: lastError };
    }
    await admin.from('video_projects').update({ scenes: sceneOutputs }).eq('id', projectId);
  }

  let finalVideoUrl: string | null = null;
  let finalStoragePath: string | null = null;
  let thumbnailUrl: string | null = null;
  if (readyBuffers.length) {
    const stitched = await stitchVideoBuffers(readyBuffers);
    finalStoragePath = `${userId}/${projectId}/final.mp4`;
    const up = await admin.storage.from(VIDEO_BUCKET).upload(finalStoragePath, stitched, { contentType: 'video/mp4', upsert: true });
    if (up.error) throw new Error(`Falha ao salvar vídeo final: ${up.error.message}`);
    finalVideoUrl = await signedMediaUrl(finalStoragePath);
    const thumbnailPath = `${userId}/${projectId}/thumbnail.jpg`;
    const thumbnail = await extractVideoThumbnail(readyBuffers[0]!);
    const thumbnailUpload = await admin.storage.from(VIDEO_BUCKET).upload(thumbnailPath, thumbnail, { contentType: 'image/jpeg', upsert: true });
    if (!thumbnailUpload.error) thumbnailUrl = await signedMediaUrl(thumbnailPath);
  }

  const refundAmount = failedCount * costPerScene;
  const refunded = refundAmount > 0 && await settleRefund(refundAmount) ? refundAmount : 0;

  const status = readyBuffers.length === req.scenes.length ? 'done' : 'failed';
  const now = new Date().toISOString();
  const projectRead = await admin.from('video_projects').select('params').eq('id', projectId).single();
  const currentParams = projectRead.data?.params && typeof projectRead.data.params === 'object' ? projectRead.data.params as Record<string, unknown> : {};
  const directorQuality = buildDirectorQuality({
    status,
    requestedDuration: useLowerPriorityQueue ? req.scenes.length * 8 : req.scenes.reduce((sum, scene) => sum + (scene.durationSeconds ?? 8), 0),
    readyScenes: readyBuffers.length,
    totalScenes: req.scenes.length,
    referenceMode: req.referenceMode,
    referenceCount: req.referenceMode === 'elements' ? elementImages.length : [startFrame, endFrame].filter(Boolean).length,
    hasThumbnail: Boolean(thumbnailUrl),
  });
  await admin
    .from('video_projects')
    .update({
      status,
      refunded,
      video_url: finalVideoUrl,
      ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
      storage_path: finalStoragePath,
      scenes: sceneOutputs,
      params: { ...currentParams, director_quality: directorQuality },
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
  items: { headline: string; body: string; prompt: string; images: ImageInput[]; imageDescriptions?: string[] }[];
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
          imageDescriptions: item.imageDescriptions,
          modelOverride: await isUnlimitedUser(opts.userId) ? 'lowerpriority' : undefined,
        });
        const branded = (await isOwnerUser(opts.userId)) ? await applyWatermark(res.buffer) : res.buffer;
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
  const imageDescriptions: string[] = [];
  const avatarImg = toImageInput(req.avatarImageData);
  const productImg = toImageInput(req.productImageData);
  if (productImg) {
    images.push(productImg);
    imageDescriptions.push('PRODUCT PHOTO: reproduce this exact product faithfully; do not alter its shape, colors, packaging, labels, or visible details.');
  }
  if (avatarImg) {
    images.push(avatarImg);
    imageDescriptions.push('PERSON REFERENCE: preserve this exact person when the selected template asks for a presenter; do not replace the person.');
  }

  const imageCount = req.imagePrompts?.length ?? req.count;
  const items = Array.from({ length: imageCount }, (_, idx) => {
    const isCover = idx === 0;
    const prompt = req.imagePrompts?.[idx];
    return {
      headline: req.imagePrompts ? (isCover ? 'Capa promocional' : 'Imagem limpa para vídeo') : req.headline,
      body: req.imagePrompts ? (isCover ? 'Capa promocional' : 'Referência limpa, sem texto') : `${req.badgeText ? `[${req.badgeText}] ` : ''}${req.productName} · ${req.ctaText}`,
      prompt: prompt
        ? [
            `Commercial product image, vertical ${req.aspectRatio}.`,
            prompt,
            'Use the attached product image as the exact product reference. Preserve its visible characteristics and packaging. Do not invent product claims, features, prices, discounts, brands, or logos. Use natural human anatomy, realistic materials, and professional lighting.',
            isCover ? 'Keep any requested Portuguese copy short and legible.' : 'This is a clean video reference image: no text, labels, titles, prices, logos, promotional graphics, or frame.',
          ].join('\n\n')
        : [
            `Commercial static advertising creative (${req.aspectRatio}), variation #${idx + 1}.`,
            `Template art direction: ${tpl.compositionPrompt}`,
            `Featured product: ${req.productName}.`,
            `Ad angle/headline concept: "${req.headline}".`,
            req.stylePrompt ? `Extra styling: ${req.stylePrompt}` : '',
            'Ultra sharp lighting, authentic commercial photography, no random garbled words.',
          ].filter(Boolean).join('\n'),
      images,
      imageDescriptions,
    };
  });

  const out = await runBatchImageProject({
    userId,
    mode: 'image-ad',
    title: req.title,
    engine: req.engine,
    aspectRatio: req.aspectRatio,
    items,
    params: { templateId: req.templateId, headline: req.headline, badgeText: req.badgeText, ctaText: req.ctaText, ...(req.imagePrompts ? { imagePrompts: req.imagePrompts } : {}) },
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
  if (req.replacesProjectId) {
    if (req.origin !== 'avatar') throw new ApiError('INVALID_INPUT', 'Só é possível substituir uma geração da aba Avatar.');
    const previous = await getAdmin().from('video_projects').select('id,status,origin,video_url').eq('id', req.replacesProjectId).eq('user_id', userId).maybeSingle();
    const isReplaceable = previous.data?.status === 'failed'
      || (previous.data?.status === 'done' && Boolean(previous.data.video_url));
    if (previous.error || !previous.data || previous.data.origin !== 'avatar' || !isReplaceable) {
      throw new ApiError('INVALID_INPUT', 'O vídeo original não está mais disponível para substituição.');
    }
  }
  // No Avatar, o Omni fica limitado a 10 s para que duração, crédito e vídeo final coincidam.
  if (req.origin === 'avatar' && req.engine === 'omni-flash') {
    req.scenes = req.scenes.map((scene) => ({ ...scene, durationSeconds: Math.min(10, scene.durationSeconds ?? 8) }));
  }
  // Valide antes de criar projeto ou debitar créditos; nunca gere sem uma imagem enviada.
  if (req.mode === 'motion' && !req.motionPresetId) {
    if (!req.motionVideoData) throw new ApiError('INVALID_INPUT', 'Envie o vídeo-base para transferir o movimento.');
    if (!req.avatarImageData) throw new ApiError('INVALID_INPUT', 'Selecione ou envie a foto do personagem que receberá o movimento.');
  }
  toImageInput(req.avatarImageData);
  toImageInput(req.productImageData);
  toImageInput(req.startFrameImageData);
  toImageInput(req.endFrameImageData);
  for (const image of req.referenceImages ?? []) toImageInput(image);
  if (req.origin === 'avatar' && (req.mode === 'avatar-video' || req.mode === 'motion')) {
    const visualRefs = [req.startFrameImageData, req.avatarImageData, req.productImageData, ...(req.referenceImages ?? [])]
      .filter((image): image is string => Boolean(image))
      .map((image) => image.replace(/^data:[^,]*,/, ''));
    const referenceCount = new Set(visualRefs).size;
    const maxReferences = req.engine === 'omni-flash' ? 6 : 3;
    if (referenceCount > maxReferences) {
      throw new ApiError('INVALID_INPUT', 'Este modelo aceita até ' + maxReferences + ' imagens de referência. Reduza os anexos antes de gerar.');
    }
  }
  if (req.motionVideoData) {
    const raw = req.motionVideoData.replace(/^data:video\/[a-z0-9.+-]+;base64,/, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw) || raw.length % 4 !== 0) {
      throw new ApiError('INVALID_INPUT', 'Vídeo de movimento inválido. Envie MP4, MOV ou WebM.');
    }
  }
  if (!req.referenceMode && req.avatarImageData && req.productImageData) {
    throw new ApiError('INVALID_INPUT', 'Neste modo de vídeo, envie apenas uma imagem de referência por vez.');
  }
  if (req.referenceMode === 'frames') {
    if (!req.startFrameImageData) throw new ApiError('INVALID_INPUT', 'Envie o frame inicial.');
    if (req.referenceImages?.length) throw new ApiError('INVALID_INPUT', 'O modo Frames não aceita imagens de Elementos.');
  }
  if (req.referenceMode === 'elements') {
    if (!(req.referenceImages?.length)) throw new ApiError('INVALID_INPUT', 'Envie pelo menos uma imagem em Elementos.');
    if (req.endFrameImageData) throw new ApiError('INVALID_INPUT', 'O modo Elementos aceita apenas um frame inicial opcional.');
  }
  const requestedCost = calculateUgcCost({ engine: req.engine, sceneCount: req.scenes.length, voiceType: req.voiceType, sceneDurations: req.scenes.map((scene) => scene.durationSeconds ?? 8) });
  const unlimited = await isUnlimitedUser(userId);
  const useUnlimited = unlimited && req.engine !== 'omni-flash';
  // A fila lowerpriority do Flow trabalha de forma confiável como image-to-video.
  // Quando o Diretor recebe apenas texto, criamos um frame inicial original a partir
  // do próprio briefing em vez de enviar t2v (que o Flow responde com 404).
  const hasVisualInput = Boolean(
    req.startFrameImageData
    || req.avatarImageData
    || req.productImageData
    || req.referenceImages?.length,
  );
  if (useUnlimited && !hasVisualInput) {
    const scene = req.scenes[0]!;
    const frame = await generateImage({
      engine: 'nano-banana-2',
      aspectRatio: req.aspectRatio,
      images: [],
      modelOverride: 'lowerpriority',
      prompt: [
        `Crie um frame inicial fotográfico vertical para um anúncio UGC realista chamado "${req.title}".`,
        `Produto/objetivo: ${req.productName || req.title}.`,
        `Cena: ${scene.action}.`,
        'Uma única composição, uma pessoa adulta, aparência natural, pele realista, luz coerente, sem colagem, sem texto, sem logotipos inventados e sem marca d’água.',
      ].join('\n'),
    });
    // Não confie no MIME declarado pelo bridge: o Flow pode entregar JPEG com
    // rótulo image/png. Sem o prefixo, toImageInput detecta o formato pelos bytes.
    req.startFrameImageData = frame.buffer.toString('base64');
    req.referenceMode = 'frames';
    req.referenceImageNames = ['Frame inicial criado pelo Agente Diretor'];
  }
  // O plano ilimitado usa o endpoint low-priority do Flow e não consome créditos.
  // Mantemos o motor escolhido pela UI para compatibilidade, mas salvamos o motor
  // efetivamente usado e o custo faturado nos metadados do projeto.
  const billedCost = useUnlimited ? 0 : requestedCost;
  const avatarCanvasLowerPriority = req.origin === 'avatar' && (req.mode === 'motion' || req.mode === 'avatar-video') && req.engine === 'veo-3.1-fast';
  const useLowerPriorityQueue = useUnlimited || avatarCanvasLowerPriority;
  const actualEngine = useLowerPriorityQueue && req.engine === 'veo-3.1-fast' ? 'veo-3.1-lowerpriority' : req.engine;
  const modelOverride = useLowerPriorityQueue ? 'lowerpriority' : req.engine === 'omni-flash' ? 'omni-flash-1.2' : null;
  const engineAccount = modelOverride === 'lowerpriority' ? 'conta_2' : modelOverride === 'omni-flash-1.2' ? 'conta_1' : null;
  const generationId = randomUUID();
  const projectId = randomUUID();
  const admin = getAdmin();

  const genIns = await admin
    .from('generations')
    .insert({ id: generationId, user_id: userId, kind: 'ugc_video', status: 'processing', cost: billedCost, params: { mode: req.mode, title: req.title, count: req.scenes.length, actual_engine: actualEngine, model_override: modelOverride, billing_cost: billedCost, engine_account: engineAccount } })
    .select()
    .single();
  if (genIns.error) throw new ApiError('INTERNAL', genIns.error.message);

  let balance: number;
  try {
    balance = await debitUserCredits({
      userId,
      amount: billedCost,
      reason: `ugc_${req.mode}`,
      refId: generationId,
      insufficientMessage: `Você precisa de ${requestedCost} créditos para criar ${req.scenes.length} cena(s) (${req.engine}).`,
      chargeUnlimited: req.engine === 'omni-flash',
    });
  } catch (err) {
    await admin.from('generations').update({ status: 'failed', error: 'Créditos insuficientes', completed_at: new Date().toISOString() }).eq('id', generationId);
    throw err;
  }

  const totalDuration = useLowerPriorityQueue ? req.scenes.length * 8 : req.scenes.reduce((sum, s) => sum + (s.durationSeconds ?? 8), 0);
  const initialScenes: ProjectSceneDTO[] = req.scenes.map((s, index) => ({
    index,
    text: s.text,
    action: s.action,
    status: 'processing',
    duration_seconds: useLowerPriorityQueue ? 8 : s.durationSeconds ?? 8,
  }));

  let initialThumbnail = req.avatarUrl || '/showcase/modelo-01.webp';
  const referenceAssets: Array<{ kind: string; name: string; path: string; url: string }> = [];
  let motionVideoAsset: { name: string; path: string; url: string } | null = null;
  if (req.mode === 'motion' && req.motionVideoData) {
    const raw = req.motionVideoData.replace(/^data:video\/[a-z0-9.+-]+;base64,/, '');
    const path = `${userId}/${projectId}/motion-reference-${(req.motionVideoName || 'movement').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80)}.mp4`;
    const upload = await admin.storage.from(VIDEO_BUCKET).upload(path, Buffer.from(raw, 'base64'), { contentType: 'video/mp4', upsert: true });
    if (!upload.error) {
      const url = await signedMediaUrl(path);
      if (url) motionVideoAsset = { name: req.motionVideoName || 'Vídeo de movimento', path, url };
    }
  }
  const referenceInputs = req.referenceMode === 'frames'
    ? [
        { raw: req.startFrameImageData, kind: 'frame-inicial' },
        { raw: req.endFrameImageData, kind: 'frame-final' },
      ]
    : [
        ...(req.origin === 'avatar' && req.avatarImageData ? [{ raw: req.avatarImageData, kind: 'avatar' }] : []),
        ...(req.referenceImages ?? []).map((raw) => ({ raw, kind: 'elemento' })),
      ];
  for (const [index, ref] of referenceInputs.entries()) {
    const image = toImageInput(ref.raw);
    if (!image) continue;
    const ext = image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const suppliedName = req.referenceImageNames?.[index]?.trim();
    const safeName = (suppliedName || `${ref.kind}-${index + 1}`).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80);
    const path = `${userId}/${projectId}/references/${index + 1}-${safeName}.${ext}`;
    const upload = await admin.storage.from(VIDEO_BUCKET).upload(path, Buffer.from(image.data, 'base64'), { contentType: image.mimeType, upsert: true });
    if (upload.error) continue;
    const url = await signedMediaUrl(path);
    if (!url) continue;
    referenceAssets.push({ kind: ref.kind, name: suppliedName || safeName, path, url });
    if (referenceAssets.length === 1) initialThumbnail = url;
  }
  if (!referenceAssets.length) {
    const legacyImage = toImageInput(req.avatarImageData) ?? toImageInput(req.productImageData);
    if (legacyImage) {
      const ext = legacyImage.mimeType === 'image/png' ? 'png' : legacyImage.mimeType === 'image/webp' ? 'webp' : 'jpg';
      const path = `${userId}/${projectId}/references/1-upload.${ext}`;
      const upload = await admin.storage.from(VIDEO_BUCKET).upload(path, Buffer.from(legacyImage.data, 'base64'), { contentType: legacyImage.mimeType, upsert: true });
      if (!upload.error) {
        const url = await signedMediaUrl(path);
        if (url) {
          referenceAssets.push({ kind: 'imagem', name: 'Imagem enviada', path, url });
          initialThumbnail = url;
        }
      }
    }
  }

  const projectRow = {
      id: projectId,
      user_id: userId,
      generation_id: generationId,
      mode: req.mode,
      origin: req.origin,
      media_type: req.mediaType,
      title: req.title,
      status: 'processing',
      engine: req.engine,
      aspect_ratio: req.aspectRatio,
      duration_seconds: totalDuration,
      scene_count: req.scenes.length,
      cost: billedCost,
      refunded: 0,
      thumbnail_url: initialThumbnail,
      scenes: initialScenes,
      params: {
        language: req.language,
        voiceType: req.voiceType,
        captions: req.captions,
        emotion: req.emotion,
        brollCount: req.brollCount,
        reference_mode: req.referenceMode ?? null,
        actual_engine: actualEngine,
        model_override: modelOverride,
        engine_account: engineAccount,
        billing_cost: billedCost,
        billing_mode: useUnlimited ? 'unlimited' : 'credits',
        reference_assets: referenceAssets.map(({ kind, name, path, url }) => ({ kind, name, path, url })),
        motion_video_asset: motionVideoAsset,
        ...(req.replacesProjectId ? { replaces_project_id: req.replacesProjectId } : {}),
      },
    };
  let projIns = await admin.from('video_projects').insert(projectRow).select().single();

  // Some deployed databases still have the older mode check from migration
  // 0005, which predates `avatar-video`. Preserve Avatar ownership and video
  // media type, and use the existing `studio` mode only as a compatibility
  // fallback until migration 0009 is applied.
  if (
    projIns.error?.code === '23514'
    && projIns.error.message.includes('video_projects_mode_check')
    && req.mode === 'avatar-video'
  ) {
    const params = projectRow.params as Record<string, unknown>;
    projIns = await admin.from('video_projects').insert({
      ...projectRow,
      mode: 'studio',
      params: { ...params, avatar_mode: 'avatar-video' },
    }).select().single();
  }

  if (projIns.error) {
    await admin.from('generations').update({ status: 'failed', error: projIns.error.message, completed_at: new Date().toISOString() }).eq('id', generationId);
    await refundUserCredits({ userId, amount: billedCost, refId: generationId, chargeUnlimited: req.engine === 'omni-flash' });
    throw new ApiError('INTERNAL', `Não consegui salvar o projeto: ${projIns.error.message}`);
  }

  // Dispara a geração cena por cena em segundo plano para o usuário poder acompanhar em Projetos.
  // O callback assíncrono começa no próximo ciclo do event loop; assim o POST
  // devolve o projeto imediatamente, sem ficar aguardando o Veo/Rust.
  setImmediate(() => {
    let refundAttempted = false;
    const settleRefund = async (amount: number) => {
      if (refundAttempted || amount <= 0) return false;
      refundAttempted = true;
      const balance = await refundUserCredits({ userId, amount, refId: generationId, chargeUnlimited: req.engine === 'omni-flash' });
      if (balance === null) console.error('[video] Estorno não confirmado', { projectId, generationId, amount });
      return balance !== null;
    };
    void processVideoProject(projectId, userId, generationId, req, billedCost, settleRefund).catch(async (err) => {
      const refunded = await settleRefund(billedCost).catch((refundError) => {
        console.error('[video] Falha ao estornar', { projectId, generationId, refundError });
        return false;
      });
      if (refunded) await admin.from('video_projects').update({ refunded: billedCost }).eq('id', projectId);
      const message = err instanceof Error ? err.message : String(err);
      await admin.from('video_projects').update({ status: 'failed', error: message, completed_at: new Date().toISOString() }).eq('id', projectId);
      await admin.from('generations').update({ status: 'failed', error: message, completed_at: new Date().toISOString() }).eq('id', generationId);
    });
  });

  return c.json({ project: projIns.data as VideoProjectDTO, balance });
});
