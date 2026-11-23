/**
 * Motor de vídeo e roteiro UGC (Gemini + Veo + FFmpeg).
 *
 * Contém apenas funções puras e comandos atômicos de geração:
 *  - Descoberta dinâmica de modelos Veo na chave do usuário
 *  - Extração segura (anti-SSRF) de nome/descrição/foto a partir de URL de produto
 *  - Geração de roteiros em JSON estruturado
 *  - Render de cena no Veo (`ai.models.generateVideos`) + concatenação multi-cena via FFmpeg
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { getClient, mapGeminiError, pickModel, resolveModels } from './gemini';
import { env } from './env';
import { rustChatCompletion, rustEnabled, withRustEngineQueue } from './rustMotor';
import { readFile } from 'node:fs/promises';
import { ApiError } from './errors';
import { splitSpeechIntoScenes, type StudioBrandbookDTO, type VideoEngineId, type ViralManifestDTO } from '../shared/ugcContracts';

const execFileAsync = promisify(execFile);

const VEO_FAST_PREFS = [/veo-3\.1.*fast/, /veo-3\.0.*fast/, /veo.*fast/, /veo-3/, /veo/];
const VEO_PRO_PREFS = [/veo-3\.1(?!.*fast)/, /veo-3\.0(?!.*fast)/, /veo-3/, /veo/];

export async function finishOnReferenceFrame(
  video: Buffer,
  frameBase64: string,
  aspectRatio: '9:16' | '16:9',
  durationSeconds: number,
): Promise<Buffer> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'fd-end-frame-'));
  const { width, height } = aspectRatio === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
  const duration = Math.max(4, Math.min(10, durationSeconds));
  const transition = 0.3;
  // Mantém o vídeo em movimento até o fim. A fusão ocupa apenas os últimos
  // quadros e termina no último frame de uma linha do tempo a 30 fps.
  const offset = Math.max(0, duration - transition - (1 / 30));
  try {
    const input = path.join(tmp, 'input.mp4');
    const endFrame = path.join(tmp, 'end.jpg');
    const output = path.join(tmp, 'output.mp4');
    await fs.writeFile(input, video);
    await fs.writeFile(
      endFrame,
      await sharp(Buffer.from(frameBase64, 'base64'))
        .rotate()
        .resize({ width, height, fit: 'cover', position: 'centre' })
        .jpeg({ quality: 94 })
        .toBuffer(),
    );
    const filter = [
      `[0:v]fps=30,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS[v0]`,
      `[1:v]fps=30,scale=${width}:${height},format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS[v1]`,
      `[v0][v1]xfade=transition=fade:duration=${transition}:offset=${offset},format=yuv420p[v]`,
    ].join(';');
    await execFileAsync('ffmpeg', [
      '-y', '-i', input, '-loop', '1', '-t', String(duration), '-i', endFrame,
      '-filter_complex', filter,
      '-map', '[v]', '-map', '0:a?', '-t', String(duration),
      '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', '-movflags', '+faststart', output,
    ]);
    return await fs.readFile(output);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function joinBidirectionalReferenceClips(
  startClip: Buffer,
  endClip: Buffer,
  aspectRatio: '9:16' | '16:9',
): Promise<Buffer> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'fd-bidirectional-'));
  const { width, height } = aspectRatio === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
  try {
    const startPath = path.join(tmp, 'start.mp4');
    const endPath = path.join(tmp, 'end.mp4');
    const output = path.join(tmp, 'output.mp4');
    await Promise.all([fs.writeFile(startPath, startClip), fs.writeFile(endPath, endClip)]);
    const normalize = `fps=30,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,settb=AVTB`;
    const filter = [
      `[0:v]${normalize},trim=duration=6,setpts=(PTS-STARTPTS)*0.7[v0]`,
      `[1:v]${normalize},trim=duration=6,reverse,setpts=(PTS-STARTPTS)*0.7[v1]`,
      '[v0][v1]xfade=transition=fade:duration=0.4:offset=3.8,format=yuv420p[v]',
    ].join(';');
    await execFileAsync('ffmpeg', [
      '-y', '-i', startPath, '-i', endPath,
      '-filter_complex', filter,
      '-map', '[v]', '-an', '-t', '8',
      '-c:v', 'libx264', '-preset', 'fast', '-movflags', '+faststart', output,
    ]);
    return await fs.readFile(output);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function pickVeoModel(available: string[], engine: VideoEngineId = 'veo-3.1-fast'): string | undefined {
  return pickModel(available, engine === 'omni-flash' ? VEO_PRO_PREFS : VEO_FAST_PREFS);
}

export async function resolveVeoModel(engine: VideoEngineId = 'veo-3.1-fast'): Promise<string> {
  const ai = getClient();
  const available: string[] = [];
  const pager = await ai.models.list({ config: { pageSize: 200 } });
  for await (const model of pager) {
    const name = (model.name ?? '').replace(/^models\//, '');
    if (name && /veo/i.test(name)) available.push(name);
  }
  const picked = pickVeoModel(available, engine);
  if (!picked) {
    throw new ApiError(
      'NOT_CONFIGURED',
      'Sua chave Gemini não liberou modelos Veo de geração de vídeo. Confira as permissões no Google AI Studio.',
    );
  }
  return picked;
}

// ---------------------------------------------------------------- anti-SSRF
const PRIVATE_HOST_RE = /^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1|\[::1\]|.+\.local$|.+\.internal$)/i;

export function assertSafePublicHttpUrl(rawUrl: string): URL {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new ApiError('INVALID_INPUT', 'Link inválido. Informe uma URL completa começando com https://');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new ApiError('INVALID_INPUT', 'Apenas links http:// ou https:// são permitidos.');
  }
  if (!u.hostname || PRIVATE_HOST_RE.test(u.hostname)) {
    throw new ApiError('INVALID_INPUT', 'Esse endereço interno não pode ser acessado pelo servidor.');
  }
  return u;
}

function readMeta(html: string, key: string): string {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, 'i');
  return (html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? '').trim();
}

export interface ExtractedProduct {
  name: string;
  description: string;
  imageUrl: string | null;
  highlights: string[];
}

export async function extractProductFromUrl(rawUrl: string): Promise<ExtractedProduct> {
  const safeUrl = assertSafePublicHttpUrl(rawUrl);
  let html = '';
  try {
    const res = await fetch(safeUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FuturoDigitalBot/1.0)', Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = (await res.text()).slice(0, 350_000);
  } catch {
    throw new ApiError(
      'INVALID_INPUT',
      'Essa loja bloqueou a leitura automática do link. Clique em "Criar do zero" e preencha nome e foto do produto manualmente.',
    );
  }

  const ogTitle = readMeta(html, 'og:title') || (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '').trim();
  const ogDesc = readMeta(html, 'og:description') || readMeta(html, 'description');
  const ogImage = readMeta(html, 'og:image') || readMeta(html, 'twitter:image') || null;
  const plainText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 4000);

  if (!env.geminiApiKey) {
    return {
      name: ogTitle.slice(0, 120) || safeUrl.hostname,
      description: ogDesc.slice(0, 600),
      imageUrl: ogImage,
      highlights: [],
    };
  }

  const ai = getClient();
  const { text: model } = await resolveModels();
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Extraia deste HTML os dados do produto para um anúncio UGC em português do Brasil.\nTítulo: ${ogTitle}\nDescrição meta: ${ogDesc}\nTrecho da página: ${plainText}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        systemInstruction:
          'Responda estritamente em JSON com: {"name": string (máx 90 chars), "description": string (benefícios claros em até 400 chars), "highlights": string[] (até 3 benefícios curtos)}. Sem markdown.',
        temperature: 0.3,
      },
    });
    const parsed = JSON.parse(response.text || '{}') as Partial<ExtractedProduct>;
    return {
      name: (parsed.name || ogTitle || safeUrl.hostname).slice(0, 140),
      description: (parsed.description || ogDesc || '').slice(0, 800),
      imageUrl: ogImage,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 3) : [],
    };
  } catch {
    return {
      name: ogTitle.slice(0, 120) || safeUrl.hostname,
      description: ogDesc.slice(0, 600),
      imageUrl: ogImage,
      highlights: [],
    };
  }
}

// ---------------------------------------------------------------- roteiros, hooks e slides (JSON estruturado Gemini)
async function generateJsonWithGemini<T>(promptText: string, systemInstruction: string, temperature = 0.7): Promise<T> {
  if (rustEnabled()) {
    const raw = await rustChatCompletion({ prompt: promptText, system: systemInstruction });
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try { return JSON.parse(cleaned) as T; } catch { throw new ApiError('GENERATION_FAILED', 'O motor Rust devolveu um JSON inválido.'); }
  }
  const ai = getClient();
  const { text: model } = await resolveModels();
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        responseMimeType: 'application/json',
        systemInstruction,
        temperature,
      },
    });
    return JSON.parse(response.text || '{}') as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw mapGeminiError(err);
  }
}

export interface GeneratedScriptOption {
  id: string;
  title: string;
  script: string;
  scenes: { index: number; text: string; estimatedSeconds: number }[];
}

export async function generateUgcScripts(opts: {
  productName: string;
  productDescription: string;
  platform: string;
  tone: string;
  audience: string;
  language: string;
  sceneCount: number;
}): Promise<GeneratedScriptOption[]> {
  const parsed = await generateJsonWithGemini<{ options?: { title: string; script: string }[] }>(
    `Crie 3 opções curtas de roteiro falado para vídeo UGC de ${opts.sceneCount} cena(s) (~${opts.sceneCount * 8}s total).\n` +
      `Produto: ${opts.productName}\nDetalhes: ${opts.productDescription || 'Produto prático para o dia a dia'}\n` +
      `Plataforma: ${opts.platform}\nTom: ${opts.tone}\nPúblico: ${opts.audience}\nIdioma: ${opts.language}`,
    'Responda estritamente JSON {"options":[{"title":string,"script":string}]}. Escreva falas naturais, diretas e humanas (sem colchetes ou rubricas), prontas para o ator ler na câmera.',
    0.85,
  );
  const options = parsed.options ?? [];
  if (!options.length) throw new ApiError('GENERATION_FAILED', 'A IA devolveu roteiro vazio. Tente novamente.');
  return options.slice(0, 3).map((opt, idx) => ({
    id: `opt-${idx + 1}`,
    title: opt.title || `Roteiro ${idx + 1}`,
    script: opt.script,
    scenes: splitSpeechIntoScenes(opt.script),
  }));
}

export async function generateHooksWithGemini(opts: {
  productName: string;
  productDescription: string;
  niche: string;
  count: number;
  language: string;
}): Promise<string[]> {
  const parsed = await generateJsonWithGemini<{ hooks?: string[] }>(
    `Crie ${opts.count} ganchos curtos (máx 110 caracteres cada) para abrir vídeos curtos de TikTok/Reels.\n` +
      `Produto: ${opts.productName}\nDescrição: ${opts.productDescription || 'Produto prático para rotina'}\n` +
      `Nicho: ${opts.niche}\nIdioma: ${opts.language}`,
    'Responda estritamente JSON {"hooks": string[]}. Escreva ganchos diretos de curiosidade/benefício em linguagem natural, sem hashtags nem emojis em excesso.',
    0.9,
  );
  const hooks = (parsed.hooks ?? []).map((h) => h.trim()).filter(Boolean).slice(0, opts.count);
  if (!hooks.length) throw new ApiError('GENERATION_FAILED', 'A IA não conseguiu sugerir ganchos. Tente novamente.');
  return hooks;
}

export interface GeneratedSlideDraft {
  headline: string;
  body: string;
  visualPrompt: string;
}

export async function generateSlidesWithGemini(opts: {
  productName: string;
  context: string;
  tone: string;
  slideCount: number;
  language: string;
}): Promise<GeneratedSlideDraft[]> {
  const parsed = await generateJsonWithGemini<{ slides?: Partial<GeneratedSlideDraft>[] }>(
    `Crie um carrossel/slideshow de exatamente ${opts.slideCount} slides verticais.\n` +
      `Assunto/Produto: ${opts.productName}\nContexto extra: ${opts.context || 'Dica prática para o dia a dia'}\n` +
      `Estilo/Tom: ${opts.tone}\nIdioma: ${opts.language}`,
    'Responda estritamente JSON {"slides":[{"headline":string (até 65 chars),"body":string (até 140 chars),"visualPrompt":string (descrição visual fotorrealista em inglês sem texto embutido na imagem)}]}. Slide 1 = gancho forte, slides do meio = valor/lista, último slide = chamada para ação.',
    0.8,
  );
  const slides = (parsed.slides ?? []).slice(0, opts.slideCount).map((s, idx) => ({
    headline: (s.headline || `Ponto #${idx + 1}`).trim(),
    body: (s.body || '').trim(),
    visualPrompt: (s.visualPrompt || `Clean editorial vertical photography representing ${opts.productName}, slide ${idx + 1}, natural light`).trim(),
  }));
  if (!slides.length) throw new ApiError('GENERATION_FAILED', 'A IA devolveu slides vazios. Tente novamente.');
  return slides;
}

export async function generateManifestWithGemini(opts: {
  sourceTitle: string;
  sourceUrl?: string;
  niche: string;
  durationSec: number;
  targetProduct?: string;
  language: string;
}): Promise<ViralManifestDTO> {
  const targetScenes = opts.durationSec <= 10 ? 1 : opts.durationSec >= 25 ? 3 : 2;
  const parsed = await generateJsonWithGemini<Partial<ViralManifestDTO>>(
    `Analise o formato desse vídeo de referência e quebre em ${targetScenes} cena(s) (~8s cada) para clonagem/remake autêntico:\n` +
      `Referência: ${opts.sourceTitle}\n` +
      (opts.sourceUrl ? `URL de origem: ${opts.sourceUrl}\n` : '') +
      `Nicho: ${opts.niche}\n` +
      (opts.targetProduct ? `Produto do cliente para adaptar o texto: ${opts.targetProduct}\n` : '') +
      `Idioma das falas: ${opts.language}`,
    'Responda estritamente JSON {"style":string,"niche":string,"scenes":[{"role":"Hook"|"Demonstração"|"Prova Social"|"Chamada","visualCues":string,"spokenTemplate":string,"durationSeconds":number}]}. Em visualCues descreva o enquadramento e ação da câmera; em spokenTemplate escreva fala natural em português pronta para gravar.',
    0.7,
  );
  const rawScenes = parsed.scenes ?? [];
  if (!rawScenes.length) throw new ApiError('GENERATION_FAILED', 'Não consegui estruturar o Manifest dessa referência.');
  const scenes = rawScenes.slice(0, 4).map((sc, index) => ({
    index,
    role: (['Hook', 'Demonstração', 'Prova Social', 'Chamada'].includes(String(sc.role)) ? sc.role : index === 0 ? 'Hook' : 'Demonstração') as ViralManifestDTO['scenes'][number]['role'],
    visualCues: (sc.visualCues || 'Plano médio próximo da câmera com iluminação natural e gesto espontâneo.').trim(),
    spokenTemplate: (sc.spokenTemplate || `Olha esse resultado real com ${opts.targetProduct || 'esse produto'} no dia a dia.`).trim(),
    durationSeconds: 8,
  }));
  return {
    sourceTitle: opts.sourceTitle,
    sourceUrl: opts.sourceUrl,
    durationSeconds: scenes.length * 8,
    style: (parsed.style || 'Remake UGC Estruturado').trim(),
    niche: (parsed.niche || opts.niche).trim(),
    scenes,
  };
}

export async function generateBrandbookWithGemini(opts: {
  brandName: string;
  niche: string;
  productName: string;
  targetAudience: string;
  voiceTone: string;
}): Promise<StudioBrandbookDTO> {
  const parsed = await generateJsonWithGemini<Partial<StudioBrandbookDTO>>(
    `Crie um Brandbook enxuto e prático para produção diária de vídeos UGC:\n` +
      `Marca: ${opts.brandName}\nNicho: ${opts.niche}\nProduto foco: ${opts.productName}\n` +
      `Público: ${opts.targetAudience}\nTom desejado: ${opts.voiceTone}`,
    'Responda estritamente JSON {"voiceTone":string,"palette":[string,string,string] (códigos hex),"pillars":[string,string,string],"sampleHooks":[string,string,string],"defaultCta":string}.',
    0.75,
  );
  return {
    brandName: opts.brandName,
    niche: opts.niche,
    targetAudience: opts.targetAudience,
    voiceTone: (parsed.voiceTone || opts.voiceTone).trim(),
    palette: Array.isArray(parsed.palette) && parsed.palette.length >= 3
      ? [String(parsed.palette[0]), String(parsed.palette[1]), String(parsed.palette[2])]
      : ['#6366f1', '#ec4899', '#10b981'],
    pillars: (parsed.pillars ?? ['Rotina real em casa', 'Benefício visual rápido', 'Prova e depoimento autêntico']).slice(0, 3),
    sampleHooks: (parsed.sampleHooks ?? [
      `Ninguém te contou esse detalhe sobre ${opts.productName}`,
      `7 dias testando ${opts.productName} sem filtro`,
      `O motivo real de ${opts.brandName} estar esgotando toda semana`,
    ]).slice(0, 3),
    defaultCta: (parsed.defaultCta || 'Clica no link da bio para conferir os detalhes').trim(),
    heroVisualUrl: '/showcase/modelo-01.webp',
  };
}

// ---------------------------------------------------------------- Veo vídeo + FFmpeg
export function resolveFlowVideoMode(input: { hasSourceVideo: boolean; hasStartFrame: boolean; hasElements: boolean }): 'edit' | 'i2v' | 'r2v' | 't2v' {
  if (input.hasSourceVideo) return 'edit';
  // A supplied start frame is the primary visual instruction for I2V.
  if (input.hasStartFrame) return 'i2v';
  if (input.hasElements) return 'r2v';
  return 't2v';
}

type GenerateVeoSceneBufferOptions = {
  prompt: string;
  engine: VideoEngineId;
  aspectRatio: '9:16' | '16:9';
  imageBytesBase64?: string;
  imageMimeType?: string;
  endImageBytesBase64?: string;
  endImageMimeType?: string;
  sourceVideoBytesBase64?: string;
  sourceVideoMediaId?: string;
  sourceVideoAccountId?: string;
  referenceImages?: Array<{ data: string; mimeType: string }>;
  durationSeconds?: number;
  modelOverride?: string;
};

type GeneratedVeoSceneBuffer = Buffer & { flowMediaId?: string; flowAccountId?: string };

export function generateVeoSceneBuffer(opts: GenerateVeoSceneBufferOptions): Promise<GeneratedVeoSceneBuffer> {
  if (!rustEnabled()) return generateVeoSceneBufferInternal(opts);
  return withRustEngineQueue(() => generateVeoSceneBufferInternal(opts), 'vídeo');
}

async function generateVeoSceneBufferInternal(opts: GenerateVeoSceneBufferOptions): Promise<GeneratedVeoSceneBuffer> {
  if (rustEnabled()) {
    const hasSourceVideo = Boolean(opts.sourceVideoMediaId || opts.sourceVideoBytesBase64);
    const effectiveReferences = [...(opts.referenceImages ?? [])];
    if (!hasSourceVideo && opts.imageBytesBase64 && effectiveReferences.length) {
      const startData = opts.imageBytesBase64.replace(/^data:[^,]*,/, '');
      if (!effectiveReferences.some((image) => image.data.replace(/^data:[^,]*,/, '') === startData)) {
        effectiveReferences.unshift({ data: startData, mimeType: opts.imageMimeType ?? 'image/jpeg' });
      }
    }
    const hasElements = Boolean(effectiveReferences.length);
    const hasStartFrame = Boolean(opts.imageBytesBase64 && !hasElements);
    const localEndFrameFallback = Boolean(opts.endImageBytesBase64 && (opts.modelOverride === 'veo' || opts.modelOverride === 'lowerpriority'));
    const bridgeModel = opts.modelOverride === 'omni-flash-1.2'
      ? 'omni-flash'
      // "lowerpriority" é o nome do perfil interno do site. O bridge Flow
      // espera "veo" para resolver o model_key lite_low_priority correto.
      : opts.modelOverride === 'lowerpriority'
        ? 'veo'
        : (opts.modelOverride ?? env.rustVideoModel);
    const base: Record<string, unknown> = {
      model: bridgeModel,
      prompt: opts.prompt,
      mode: resolveFlowVideoMode({ hasSourceVideo, hasStartFrame, hasElements }),
      seconds: localEndFrameFallback ? 6 : (opts.durationSeconds ?? 8),
      aspect_ratio: opts.aspectRatio,
    };
    // The unlimited lower-priority route must use the authenticated Flow
    // account. Account 3 can remain listed while its bearer is unavailable;
    // pin this path to the known-good account 2 instead of letting the bridge
    // round-robin into a 404/NOT_FOUND account.
    if (opts.modelOverride === 'lowerpriority') base.account_id = 'conta_2';
    if (opts.modelOverride === 'omni-flash-1.2') base.account_id = 'conta_1';
    if (opts.sourceVideoMediaId) {
      base.prev_media_id = opts.sourceVideoMediaId;
      if (opts.sourceVideoAccountId) base.account_id = opts.sourceVideoAccountId;
    }
    const needsImages = hasElements || hasStartFrame || Boolean(opts.endImageBytesBase64) || hasSourceVideo;
    const referenceDir = needsImages ? await fs.mkdtemp(path.join(os.tmpdir(), 'fd-reference-')) : null;
    try {
      if (referenceDir && opts.imageBytesBase64 && !hasElements) {
        const referencePath = path.join(referenceDir, 'start.jpg');
        const frameSize = opts.aspectRatio === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
        const frame = await sharp(Buffer.from(opts.imageBytesBase64, 'base64'))
          .rotate()
          .resize({ ...frameSize, fit: 'cover', position: 'centre' })
          .jpeg({ quality: 94 })
          .toBuffer();
        await fs.writeFile(referencePath, frame);
        base.start_image = referencePath;
      }
      if (referenceDir && opts.endImageBytesBase64 && !localEndFrameFallback) {
        const referencePath = path.join(referenceDir, 'end.jpg');
        const frameSize = opts.aspectRatio === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
        const frame = await sharp(Buffer.from(opts.endImageBytesBase64, 'base64'))
          .rotate()
          .resize({ ...frameSize, fit: 'cover', position: 'centre' })
          .jpeg({ quality: 94 })
          .toBuffer();
        await fs.writeFile(referencePath, frame);
        base.end_image = referencePath;
      }
      if (referenceDir && effectiveReferences.length) {
        const paths: string[] = [];
        for (const [index, image] of effectiveReferences.entries()) {
          const ext = image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg';
          const referencePath = path.join(referenceDir, `element-${index + 1}.${ext}`);
          await fs.writeFile(referencePath, Buffer.from(image.data, 'base64'));
          paths.push(referencePath);
        }
        base.reference_images = paths;
      }
      if (referenceDir && opts.sourceVideoBytesBase64 && !opts.sourceVideoMediaId) {
        const sourcePath = path.join(referenceDir, 'motion-source.mp4');
        await fs.writeFile(sourcePath, Buffer.from(opts.sourceVideoBytesBase64, 'base64'));
        base.source_video = sourcePath;
      }
    const res = await fetch(`${env.rustMotorUrl}/v1/videos/generations`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(base),
      signal: AbortSignal.timeout(10 * 60_000),
    });
    const body = await res.json().catch(() => null) as any;
    if (!res.ok) throw new ApiError('GENERATION_FAILED', body?.error?.message || `Motor Rust respondeu HTTP ${res.status}.`);
    const savedPath = body?.saved_path;
    if (!savedPath) throw new ApiError('GENERATION_FAILED', 'Motor Rust não devolveu o caminho do vídeo.');
    try {
      const generated = await readFile(savedPath) as Buffer & { flowMediaId?: string; flowAccountId?: string };
      generated.flowMediaId = typeof body?.media_id === 'string' ? body.media_id : undefined;
      generated.flowAccountId = typeof body?.account_id === 'string' ? body.account_id : undefined;
      if (localEndFrameFallback && opts.endImageBytesBase64) {
        const endGenerated = await generateVeoSceneBufferInternal({
          prompt: `${opts.prompt}\nGenerate one continuous shot departing naturally from this exact final composition. Preserve the same identity, wardrobe, environment and visual details. No cuts, no still frame and no collage.`,
          engine: opts.engine,
          aspectRatio: opts.aspectRatio,
          imageBytesBase64: opts.endImageBytesBase64,
          imageMimeType: opts.endImageMimeType,
          durationSeconds: 6,
          modelOverride: opts.modelOverride ?? 'lowerpriority',
        });
        return await joinBidirectionalReferenceClips(generated, endGenerated, opts.aspectRatio);
      }
      return generated;
    } catch {
      throw new ApiError('GENERATION_FAILED', `O vídeo foi gerado, mas não pôde ser lido no servidor: ${savedPath}`);
    }
    } finally {
      if (referenceDir) await fs.rm(referenceDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
  if (opts.endImageBytesBase64 || opts.referenceImages?.length) {
    throw new ApiError('GENERATION_FAILED', 'Frames inicial/final e Elementos exigem o motor Flow local ativo.');
  }
  const ai = getClient();
  const model = await resolveVeoModel(opts.engine);

  let operation;
  try {
    operation = await ai.models.generateVideos({
      model,
      source: {
        prompt: opts.prompt,
        ...(opts.imageBytesBase64
          ? { image: { imageBytes: opts.imageBytesBase64, mimeType: opts.imageMimeType ?? 'image/jpeg' } }
          : {}),
      },
      config: {
        numberOfVideos: 1,
        aspectRatio: opts.aspectRatio,
        durationSeconds: opts.durationSeconds ?? 8,
      },
    });
  } catch (err) {
    throw mapGeminiError(err);
  }

  // Polling até conclusão (máx ~3 min)
  const startedAt = Date.now();
  while (!operation.done) {
    if (Date.now() - startedAt > 180_000) {
      throw new ApiError('GENERATION_FAILED', 'Tempo limite na geração da cena no Veo.');
    }
    await new Promise((r) => setTimeout(r, 8000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    throw new ApiError('GENERATION_FAILED', String(operation.error.message ?? 'Falha ao gerar cena no Veo.'));
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (video?.videoBytes) return Buffer.from(video.videoBytes, 'base64');
  if (video?.uri) {
    const res = await fetch(video.uri, {
      headers: env.geminiApiKey ? { 'x-goog-api-key': env.geminiApiKey } : {},
    });
    if (!res.ok) throw new ApiError('GENERATION_FAILED', `Erro ao baixar vídeo do Veo (${res.status}).`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new ApiError('GENERATION_FAILED', 'O Veo concluiu sem retornar bytes de vídeo.');
}

/** Completa até oito segundos quando o gerador entrega poucos quadros a menos. */
export async function normalizeEightSecondVideo(buffer: Buffer): Promise<Buffer> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'fd-duration-'));
  try {
    const input = path.join(tmp, 'input.mp4');
    const output = path.join(tmp, 'output.mp4');
    await fs.writeFile(input, buffer);
    const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', input]);
    const duration = Number(stdout.trim());
    if (!Number.isFinite(duration) || duration < 7.5 || duration > 8.5) throw new Error(`Duração inesperada: ${stdout.trim()}s`);
    if (duration >= 8) return buffer;
    await execFileAsync('ffmpeg', ['-y', '-i', input, '-vf', 'tpad=stop_mode=clone:stop_duration=0.5', '-af', 'apad', '-t', '8', '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', '-movflags', '+faststart', output]);
    return await fs.readFile(output);
  } catch (error) {
    throw new Error(`Não foi possível ajustar a duração do vídeo: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Enforceia o limite de duração do Omni no canvas Avatar mesmo quando o provedor excede o pedido. */
export async function trimVideoToDuration(buffer: Buffer, maxSeconds: number): Promise<Buffer> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'fd-trim-'));
  try {
    const input = path.join(tmp, 'input.mp4');
    const output = path.join(tmp, 'output.mp4');
    await fs.writeFile(input, buffer);
    const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', input]);
    const duration = Number(stdout.trim());
    if (!Number.isFinite(duration) || duration <= maxSeconds + 0.1) return buffer;
    await execFileAsync('ffmpeg', [
      '-y', '-i', input, '-t', String(maxSeconds),
      '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', '-movflags', '+faststart', output,
    ]);
    return await fs.readFile(output);
  } catch (error) {
    throw new Error(`Não foi possível limitar o vídeo a ${maxSeconds}s: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}
/** Extrai uma capa real do começo do vídeo concluído. */
export async function extractVideoThumbnail(buffer: Buffer): Promise<Buffer> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'fd-thumbnail-'));
  try {
    const input = path.join(tmp, 'input.mp4');
    const output = path.join(tmp, 'thumbnail.jpg');
    await fs.writeFile(input, buffer);
    await execFileAsync('ffmpeg', ['-y', '-ss', '0.15', '-i', input, '-frames:v', '1', '-q:v', '2', output]);
    return await fs.readFile(output);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Concatena as cenas; falhas não podem ser apresentadas como vídeo completo. */
export async function stitchVideoBuffers(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 1) return buffers[0]!;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'fd-ugc-'));
  try {
    const filePaths: string[] = [];
    for (let i = 0; i < buffers.length; i++) {
      const p = path.join(tmp, `scene-${i}.mp4`);
      await fs.writeFile(p, buffers[i]!);
      filePaths.push(p);
    }
    const listFile = path.join(tmp, 'list.txt');
    await fs.writeFile(listFile, filePaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
    const outFile = path.join(tmp, 'final.mp4');
    await execFileAsync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outFile]);
    return await fs.readFile(outFile);
  } catch (error) {
    throw new Error(`Não foi possível juntar as cenas: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}
