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
import { getClient, mapGeminiError, pickModel, resolveModels } from './gemini';
import { env } from './env';
import { ApiError } from './errors';
import { splitSpeechIntoScenes, type StudioBrandbookDTO, type VideoEngineId, type ViralManifestDTO } from '../shared/ugcContracts';

const execFileAsync = promisify(execFile);

const VEO_FAST_PREFS = [/veo-3\.1.*fast/, /veo-3\.0.*fast/, /veo.*fast/, /veo-3/, /veo/];
const VEO_PRO_PREFS = [/veo-3\.1(?!.*fast)/, /veo-3\.0(?!.*fast)/, /veo-3/, /veo/];

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
export async function generateVeoSceneBuffer(opts: {
  prompt: string;
  engine: VideoEngineId;
  aspectRatio: '9:16' | '16:9';
  imageBytesBase64?: string;
  imageMimeType?: string;
  durationSeconds?: number;
}): Promise<Buffer> {
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

/** Concatena múltiplas cenas MP4 via FFmpeg local; se 1 cena ou sem FFmpeg, retorna a primeira cena. */
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
  } catch {
    return buffers[0]!;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}
