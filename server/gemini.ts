/**
 * Integração com a Gemini API.
 *
 * 1) Descoberta de modelos: os nomes dos modelos mudam com o tempo
 *    (ex.: "Nano Banana 2" ganha versões novas). Em vez de deixar um nome fixo
 *    que um dia quebra, o servidor pergunta à Gemini quais modelos a SUA chave
 *    pode usar e escolhe o melhor por ordem de preferência. Se você definir
 *    GEMINI_IMAGE_MODEL no .env, esse nome tem prioridade.
 *
 * 2) Geração de imagem: envia texto + imagens de referência e recebe a imagem
 *    em base64 dentro de `candidates[0].content.parts[].inlineData`.
 */
import { GoogleGenAI, type Part } from '@google/genai';
import { env } from './env';
import { rustEnabled, rustGenerateImage } from './rustMotor';
import { ApiError } from './errors';
import type { AspectRatio, EngineId, ImageInput } from '../shared/contracts';

let client: GoogleGenAI | null = null;
export function getClient(): GoogleGenAI {
  if (!env.geminiApiKey) throw new ApiError('NOT_CONFIGURED', 'GEMINI_API_KEY não configurada no .env.');
  if (!client) client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

// ---------------------------------------------------------------- modelos
export interface ResolvedModels {
  image: string;
  imagePro: string;
  text: string;
  available: string[];
}

/** Ordem de preferência por "família". O primeiro que existir na chave vence. */
const IMAGE_PREFS = [/flash-image(?!.*lite)/, /nano-banana-2/, /flash-image/, /image/];
const IMAGE_PRO_PREFS = [/pro-image/, /nano-banana-pro/, /flash-image(?!.*lite)/, /image/];
const TEXT_PREFS = [/^gemini-[\d.]+-flash$/, /^gemini-[\d.]+-flash(?!.*(image|lite|tts|live|audio))/, /flash(?!.*(image|tts|live|audio))/, /pro(?!.*(image|tts))/];

let cached: { at: number; models: ResolvedModels } | null = null;
const CACHE_MS = 60 * 60 * 1000;

/** Prefere a versão mais nova quando há empate (ordena por número de versão). */
function versionScore(name: string): number {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/);
  const preview = /preview|exp/.test(name) ? -0.001 : 0;
  return (m ? Number(m[1]) : 0) + preview;
}

export function pickModel(available: string[], prefs: RegExp[]): string | undefined {
  for (const re of prefs) {
    const hits = available.filter((n) => re.test(n)).sort((a, b) => versionScore(b) - versionScore(a));
    if (hits.length) return hits[0];
  }
  return undefined;
}

export async function resolveModels(force = false): Promise<ResolvedModels> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached.models;

  const ai = getClient();
  const available: string[] = [];
  const pager = await ai.models.list({ config: { pageSize: 200 } });
  for await (const model of pager) {
    const actions = model.supportedActions ?? [];
    const name = (model.name ?? '').replace(/^models\//, '');
    if (name && (actions.length === 0 || actions.includes('generateContent'))) available.push(name);
  }

  const image = env.geminiImageModel || pickModel(available, IMAGE_PREFS);
  const imagePro = env.geminiImageProModel || pickModel(available, IMAGE_PRO_PREFS) || image;
  const text = env.geminiTextModel || pickModel(available, TEXT_PREFS);

  if (!image || !text) {
    throw new ApiError(
      'NOT_CONFIGURED',
      'Sua chave Gemini não tem modelo de imagem/texto liberado. Rode "npm run check" para ver a lista.',
    );
  }
  const models: ResolvedModels = { image, imagePro: imagePro ?? image, text, available };
  cached = { at: Date.now(), models };
  return models;
}

// ---------------------------------------------------------------- imagem
export interface ImageResult {
  buffer: Buffer;
  mimeType: string;
  model: string;
}

function toPart(img: ImageInput): Part {
  return { inlineData: { mimeType: img.mimeType, data: img.data } };
}

/** Traduz erros da Gemini para códigos que o app entende. */
export function mapGeminiError(err: unknown): ApiError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    return new ApiError('RATE_LIMITED', 'Limite da Gemini atingido. Aguarde um minuto e tente de novo.');
  }
  if (/API key not valid|PERMISSION_DENIED|401|403/i.test(msg)) {
    return new ApiError('NOT_CONFIGURED', 'A chave GEMINI_API_KEY foi recusada pelo Google. Confira o .env.');
  }
  if (/SAFETY|blocked|PROHIBITED/i.test(msg)) {
    return new ApiError('SAFETY_BLOCKED', 'O pedido foi bloqueado pelo filtro de segurança da IA. Ajuste a descrição.');
  }
  return new ApiError('GENERATION_FAILED', `A IA não conseguiu gerar a imagem: ${msg.slice(0, 240)}`);
}

export async function generateImage(opts: {
  prompt: string;
  engine: EngineId;
  aspectRatio: AspectRatio;
  /** Ordem importa: foto base primeiro, depois produto, depois referências. */
  images: ImageInput[];
  modelOverride?: string;
}): Promise<ImageResult> {
  if (rustEnabled()) {
    return rustGenerateImage({ prompt: opts.prompt, aspectRatio: opts.aspectRatio, model: opts.modelOverride ?? (opts.engine === 'nano-banana-pro' ? 'google_flow' : undefined) });
  }
  const ai = getClient();
  const models = await resolveModels();
  const model = opts.engine === 'nano-banana-pro' ? models.imagePro : models.image;

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [...opts.images.map(toPart), { text: opts.prompt }] }],
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: opts.aspectRatio },
      },
    });
  } catch (err) {
    throw mapGeminiError(err);
  }

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    const reason = candidate?.finishReason ?? response.promptFeedback?.blockReason ?? 'sem imagem na resposta';
    if (/SAFETY|PROHIBITED|BLOCK|IMAGE_SAFETY/i.test(String(reason))) {
      throw new ApiError('SAFETY_BLOCKED', 'A IA recusou essa imagem pelo filtro de segurança. Ajuste a descrição.');
    }
    throw new ApiError('GENERATION_FAILED', `A IA não devolveu imagem (${String(reason)}).`);
  }

  return {
    buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
    mimeType: imagePart.inlineData.mimeType ?? 'image/png',
    model,
  };
}

// ---------------------------------------------------------------- texto
const ENHANCE_INSTRUCTIONS =
  'Você é um diretor de arte de anúncios UGC. Reescreva a ideia do usuário como uma descrição de cena ' +
  'curta e visual (1 a 3 frases), em português do Brasil, com ambiente, luz, ação e enquadramento. ' +
  'Não invente marcas. Não use aspas. Responda só com a descrição.';

export async function enhancePrompt(idea: string): Promise<string> {
  const ai = getClient();
  const { text: model } = await resolveModels();
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: idea }] }],
      config: { systemInstruction: ENHANCE_INSTRUCTIONS, temperature: 0.8, maxOutputTokens: 300 },
    });
    const out = (response.text ?? '').trim();
    if (!out) throw new Error('resposta vazia');
    return out;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw mapGeminiError(err);
  }
}
