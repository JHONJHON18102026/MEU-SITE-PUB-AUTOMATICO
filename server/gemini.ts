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
import { rustChatCompletion, rustEnabled, rustGenerateImage } from './rustMotor';
import { ApiError } from './errors';
import type { AspectRatio, EngineId, ImageInput } from '../shared/contracts';
import { directorPlanSchema, type DirectorPlan, type DirectorPlanRequest, type DirectorPresetId } from '../shared/directorContracts';
import { calculateUgcCost } from '../shared/ugcContracts';
import { DIRECTOR_SPEECH_RESERVE_SECONDS, directorDialogueWordLimit, fitDirectorDialogue } from '../src/lib/directorSpeech';
export { directorDialogueWordLimit, fitDirectorDialogue } from '../src/lib/directorSpeech';

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
  imageDescriptions?: string[];
  modelOverride?: string;
}): Promise<ImageResult> {
  if (rustEnabled()) {
    return rustGenerateImage({
      prompt: opts.prompt,
      aspectRatio: opts.aspectRatio,
      images: opts.images,
      imageDescriptions: opts.imageDescriptions,
      model: opts.modelOverride ?? 'google_flow',
      imageModel: opts.engine === 'nano-banana-pro' ? 'BELUGA' : 'GEM_PIX_2',
    });
  }
  const ai = getClient();
  const models = await resolveModels();
  const model = opts.engine === 'nano-banana-pro' ? models.imagePro : models.image;

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [...opts.images.flatMap((image, index) => [{ text: opts.imageDescriptions?.[index] ?? `Attached visual ${index + 1}.` }, toPart(image)]), { text: opts.prompt }] }],
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
const HUST_DIRECTOR_MODEL = 'gemini-3.8-flash';

const ENHANCE_INSTRUCTIONS =
  'Você é somente um editor de texto para prompts de imagem e vídeo. Não gere imagens, não use ferramentas, não retorne links, URLs, IDs de mídia, markdown ou metadados. ' +
  'Reescreva a ideia como uma cena de anúncio UGC visual e concisa, em português do Brasil. Preserve a pessoa, o produto e as instruções centrais fornecidas pelo usuário. ' +
  'Inclua ação, ambiente e luz sem inventar marcas. Responda em até 2 frases, sem introdução nem aspas.';

function requireEnhancedPrompt(value: string, maxLength = 2000, errorMessage = 'A IA devolveu um link em vez de um prompt. O texto original foi mantido; tente novamente.'): string {
  const prompt = value.trim();
  if (
    prompt.length < 12 || prompt.length > maxLength ||
    /https?:\/\/|googleusercontent\.com\/image_generation_content|\bdata:image\//i.test(prompt)
  ) {
    throw new ApiError('GENERATION_FAILED', errorMessage);
  }
  return prompt;
}

export async function enhancePrompt(idea: string): Promise<string> {
  if (rustEnabled()) {
    try {
      const out = await rustChatCompletion({
        prompt: idea,
        system: ENHANCE_INSTRUCTIONS,
        model: 'gemini-4-argon',
        temperature: 0.2,
        maxTokens: 180,
      });
      return requireEnhancedPrompt(out);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      if (/fetch failed|econnrefused|enotfound|aborted/i.test(message)) {
        throw new ApiError('GENERATION_FAILED', 'O motor oficial não está acessível. Abra o serviço Hust/Motor e tente novamente.');
      }
      throw new ApiError('GENERATION_FAILED', `Não consegui melhorar o prompt pelo motor conectado: ${message.slice(0, 180)}`);
    }
  }
  const ai = getClient();
  const { text: model } = await resolveModels();
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: idea }] }],
      config: { systemInstruction: ENHANCE_INSTRUCTIONS, temperature: 0.2, maxOutputTokens: 120 },
    });
    return requireEnhancedPrompt(response.text ?? '');
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw mapGeminiError(err);
  }
}

const CHARACTER_PROMPT_INSTRUCTIONS =
  'Você é a skill de criação de personagens visuais do FUTURO DIGITAL Studio. Transforme o briefing do usuário em um prompt de imagem claro, específico e pronto para um modelo de geração de imagens. ' +
  'Responda somente com o prompt final em português do Brasil, sem título, aspas, markdown, explicações, links ou instruções de vídeo. ' +
  'Combine a descrição livre com os atributos escolhidos: a descrição explícita pode substituir um atributo quando houver conflito; use os atributos para preencher detalhes não definidos. ' +
  'Se houver foto base, preserve por padrão a identidade reconhecível da pessoa e aplique mudanças explícitas solicitadas, mantendo os traços não mencionados. ' +
  'Escolha como assinatura visual o traço marcante mais forte que o usuário pediu; não invente deformações, acessórios, poderes, biografia ou características. ' +
  'Mantenha rosto, anatomia, proporções, cores, roupa, materiais e estilo coerentes. O mundo do personagem pode orientar detalhes visuais discretos de contexto, sem transformar o prompt em uma cena ou alterar o design pedido. ' +
  'Não repita controles técnicos de enquadramento, proporção ou qualidade, pois o aplicativo já os aplica. Entregue um prompt editável, direto e com no máximo 700 caracteres.';

export async function enhanceCharacterPrompt(input: {
  description: string;
  attributes: string[];
  characterWorld: string;
  hasBasePhoto: boolean;
}): Promise<string> {
  const context = [
    `DESCRIÇÃO DO USUÁRIO: ${input.description.trim()}`,
    input.attributes.length ? `ATRIBUTOS SELECIONADOS: ${input.attributes.join('; ')}` : '',
    input.characterWorld.trim() ? `MUNDO DO PERSONAGEM (contexto secundário): ${input.characterWorld.trim()}` : '',
    `FOTO BASE ENVIADA: ${input.hasBasePhoto ? 'sim; preservar identidade por padrão, salvo transformação explícita' : 'não'}`,
  ].filter(Boolean).join('\n');

  if (rustEnabled()) {
    try {
      const out = await rustChatCompletion({
        prompt: context,
        system: CHARACTER_PROMPT_INSTRUCTIONS,
        model: 'gemini-4-argon',
        temperature: 0.25,
        maxTokens: 300,
      });
      return requireEnhancedPrompt(out, 800, 'A IA não devolveu um prompt de personagem válido. O texto original foi mantido; tente novamente.');
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      if (/fetch failed|econnrefused|enotfound|aborted/i.test(message)) {
        throw new ApiError('GENERATION_FAILED', 'O motor oficial não está acessível. Abra o serviço Hust/Motor e tente novamente.');
      }
      throw new ApiError('GENERATION_FAILED', `Não consegui montar o prompt do personagem: ${message.slice(0, 180)}`);
    }
  }

  const ai = getClient();
  const { text: model } = await resolveModels();
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: context }] }],
      config: { systemInstruction: CHARACTER_PROMPT_INSTRUCTIONS, temperature: 0.25, maxOutputTokens: 300 },
    });
    return requireEnhancedPrompt(response.text ?? '', 800, 'A IA não devolveu um prompt de personagem válido. O texto original foi mantido; tente novamente.');
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw mapGeminiError(err);
  }
}

const DIRECTOR_PRESET_RULES: Record<DirectorPresetId, string> = {
  custom: 'Conduza a ideia do briefing com criatividade, sem ignorar referências, controles ou fatos não comprovados.',
  'ugc-product': 'UGC natural. Demonstre o produto com clareza, use fatos comprovados e finalize com CTA curta.',
  avatar: 'Crie personagem adulto coerente e reaproveitável; respeite as referências recebidas.',
  character: 'Mantenha a mesma identidade, rosto, cabelo, roupa e proporções. Não substitua nem misture identidades.',
  storyboard: 'Respeite o frame inicial fornecido e mantenha composição e continuidade. Não invente um frame que não foi enviado.',
  viral: 'Abra com gancho claro, demonstre a ideia e finalize com CTA. Preserve produto e referências; sem alegações sem suporte.',
  'tiktok-shop-influencer': 'MODO 1 — INFLUENCIADORA. A influenciadora adulta fala diretamente à câmera. Se houver foto de pessoa, mantenha exatamente essa identidade em toda a cena. Preserve o produto. Benefício só se comprovado. Não invente modo de uso, textura, eficácia, preço, desconto ou urgência.',
  'tiktok-shop-hands': 'MODO 2 — MÃOS. Mostre somente mãos e produto, sem rosto, influenciadora ou apresentadora. Use narração feminina brasileira. Não invente uso, textura, eficácia, preço, desconto ou urgência. Benefícios só se comprovados.',
  'tiktok-shop-pov': 'MODO 3 — POV. Perspectiva em primeira pessoa, sem rosto, influenciadora ou apresentadora. Narração feminina em primeira pessoa, sem fingir experiência de uso nem afirmar resultados não comprovados. Preserve o produto e cite só fatos visíveis.',
};

const TIKTOK_VIDEO_LOCKS: Partial<Record<DirectorPresetId, string>> = {
  'tiktok-shop-influencer': 'REGRA INEGOCIÁVEL DO MODO 1: mantenha a identidade exata da pessoa de referência, se enviada, durante toda a cena. A influenciadora fala à câmera. Preserve o produto; não invente modo de uso, textura, eficácia, benefício, preço ou desconto.',
  'tiktok-shop-hands': 'REGRA INEGOCIÁVEL DO MODO 2: mostre exclusivamente mãos humanas e produto. Nenhum rosto, influenciadora ou apresentadora. Use narração feminina brasileira e fatos comprovados; não invente modo de uso, textura, eficácia, benefício, preço ou desconto.',
  'tiktok-shop-pov': 'REGRA INEGOCIÁVEL DO MODO 3: use apenas POV em primeira pessoa, sem rosto, influenciadora ou apresentadora. Narração feminina em primeira pessoa sem fingir experiência. Preserve o produto; não invente uso, textura, eficácia, benefício, preço ou desconto.',
};

const TIKTOK_ASSET_LOCKS: Partial<Record<DirectorPresetId, { cover: string; clean: string }>> = {
  'tiktok-shop-influencer': {
    cover: 'MODO 1 obrigatório: mantenha a identidade exata da pessoa de referência, se enviada. Preserve embalagem e produto. Use somente fatos comprovados; sem textura, eficácia, preço ou alegações inventadas.',
    clean: 'MODO 1 obrigatório: mantenha a identidade exata da pessoa de referência, se enviada. Preserve o produto e sua embalagem. Imagem limpa, sem texto, grafismo, moldura ou alegação inventada.',
  },
  'tiktok-shop-hands': {
    cover: 'MODO 2 obrigatório: mostre somente mãos e produto, sem rosto ou apresentadora. Preserve embalagem e use apenas fatos comprovados.',
    clean: 'MODO 2 obrigatório: mostre somente mãos e produto, sem rosto ou apresentadora. Imagem limpa, sem texto, grafismo, moldura ou alegação inventada.',
  },
  'tiktok-shop-pov': {
    cover: 'MODO 3 obrigatório: use perspectiva POV sem rostos, influenciadora ou apresentadora. Preserve embalagem e use apenas fatos comprovados.',
    clean: 'MODO 3 obrigatório: use perspectiva POV sem rostos, influenciadora ou apresentadora. Imagem limpa, sem texto, grafismo, moldura ou alegação inventada.',
  },
};

function appendMandatoryPromptRule(prompt: string | undefined, rule: string, limit: number): string {
  const suffix = rule.trim();
  const creative = (prompt ?? '').trim();
  const available = Math.max(0, limit - suffix.length - 2);
  return creative.slice(0, available) + (creative ? '\n\n' : '') + suffix;
}

function prependMandatoryPromptRule(prompt: string | undefined, rule: string, limit: number): string {
  const prefix = rule.trim();
  const creative = (prompt ?? '').trim();
  const available = Math.max(0, limit - prefix.length - 2);
  return prefix + (creative ? '\n\n' + creative.slice(0, available) : '');
}

const DIRECTOR_VIDEO_CONTINUITY_LOCK = 'CONTINUIDADE VISUAL OBRIGATÓRIA: anatomia humana correta e estável quadro a quadro. Nunca gerar terceira mão, mãos/dedos/membros extras, duplicados ou deformados, mãos desconectadas, objetos que surgem/desaparecem, flicker, morphing involuntário ou outros artefatos. Quando mãos forem necessárias, mostrar no máximo duas, com cinco dedos cada, ligadas corretamente aos braços. Usar gestos simples, lentos e contínuos, uma ação por vez; preservar identidade, roupa e produto sem duplicar ou deformar.';

const DIRECTOR_INSTRUCTIONS = `Você é o Agente Diretor do FUTURO DIGITAL, especializado em anúncios UGC e vídeos de produto.
Crie um plano executável, realista e conciso em português do Brasil. Responda SOMENTE JSON válido, sem markdown.
O presetId é obrigatório e independente do texto editável: conduza a ideia do usuário da melhor forma dentro desse preset, sem substituir, enfraquecer ou contradizer suas regras. Obedeça à seção PRESET OBRIGATÓRIO enviada pelo sistema.
O JSON deve conter: title, objective, creativeDirection, audience, hook, callToAction, aspectRatio, totalDurationSeconds,
engineId, engineLabel, estimatedCost, referenceMode, scenes e warnings. Cada cena contém index, text, action e durationSeconds.
Não invente marcas, funcionalidades, benefícios, preços, descontos ou urgência. Analise referências visuais reais quando fornecidas; diferencie fatos visíveis de suposições e inclua incerteza em warnings.
Use uma cena para vídeos de 8, 10 ou 15 segundos. Para duração acima de 8 segundos, prefira omni-flash.
engineId aceita apenas veo-3.1-fast ou omni-flash. referenceMode deve ser elements quando houver múltiplas referências.
Quando presetId for um modo TikTok Shop, inclua também productAnalysis, coverImagePrompt, cleanImagePrompt e flowVideoPrompt.
productAnalysis deve citar somente características visíveis e não afirmar benefícios sem suporte nas referências ou no briefing.
Antes de finalizar, confira cada afirmação sobre o produto contra a foto e o briefing. Se nenhum benefício estiver explicitamente comprovado, não invente benefícios nem sensações de uso (por exemplo, textura leve, aplicação prática, hidratação ou resultado na pele); descreva uma característica visível ou o texto legível no rótulo. A fala da cena, a capa e o prompt do vídeo seguem a mesma regra.
coverImagePrompt e cleanImagePrompt devem ser prompts independentes: a capa pode ter uma chamada comercial curta e CTA adequada; a imagem limpa não pode conter texto, preço, logo promocional, grafismo ou moldura. Nunca misture as duas.
flowVideoPrompt descreve somente direção visual, câmera, iluminação e continuidade. Formato e duração são definidos nos controles da tela: não repita proporção ou segundos dentro do prompt. A ação visual fica em scenes[0].action e a fala final fica somente em scenes[0].text; não copie a fala para flowVideoPrompt.
Todo vídeo deve receber instrução explícita de continuidade visual: anatomia correta em todos os quadros, sem terceira mão, mãos/dedos/membros extras, duplicados ou deformados, sem membros desconectados, flicker, morphing involuntário ou artefatos. Quando mãos forem necessárias, no máximo duas, com cinco dedos cada e ligadas aos braços. Prefira gestos simples e contínuos, uma ação por vez, preserve identidade, roupa e produto. Essa regra é obrigatória em qualquer preset e deve aparecer no começo do flowVideoPrompt final, não apenas como orientação implícita.
Em scenes[0].text escreva uma fala curta que termine antes do vídeo acabar: reserve os últimos 1,5 segundos sem fala para evitar cortes. Use o limite máximo informado no pedido, calculado a 1,8 palavras por segundo apenas durante o tempo útil. Prefira uma frase curta e natural; estruture em gancho e apresentação, inclua benefício somente se comprovado e use CTA apenas se couber sem acelerar ou cortar a fala. Em scenes[0].action descreva uma única demonstração visual simples e a câmera. Não prometa que o vídeo falará mais texto do que cabe na duração.
Modo 1: a influenciadora adulta morena fala para a câmera; se uma pessoa for anexada, preserve aquela identidade em vez de substituí-la.
Modo 2: mostre somente mãos e produto, sem rosto; a fala é narração feminina brasileira.
Modo 3: use POV sem rostos ou personagens; narração feminina em primeira pessoa.
Em todos os modos, a cena mantém uma só identidade e produto consistente; não invente informação comercial.`;

export async function createDirectorPlan(input: DirectorPlanRequest, context: { unlimited: boolean }): Promise<DirectorPlan> {
  const references = input.references ?? [];
  const referenceNames = references.map((ref) => ref.name);
  // O preset viaja como campo de contrato; prefixos antigos são fallback de compatibilidade.
  const legacyPreset: DirectorPresetId = input.briefing.startsWith('WORKFLOW TIKTOK SHOP — MODO 1')
    ? 'tiktok-shop-influencer'
    : input.briefing.startsWith('WORKFLOW TIKTOK SHOP — MODO 2')
      ? 'tiktok-shop-hands'
      : input.briefing.startsWith('WORKFLOW TIKTOK SHOP — MODO 3')
        ? 'tiktok-shop-pov'
        : input.briefing.startsWith('WORKFLOW TIKTOK SHOP')
          ? 'tiktok-shop-influencer'
          : 'custom';
  const presetId: DirectorPresetId = input.presetId ?? legacyPreset;
  const isTikTokShopWorkflow = presetId.startsWith('tiktok-shop-');
  const presetRules = DIRECTOR_PRESET_RULES[presetId];
  const mandatoryModeLock = TIKTOK_VIDEO_LOCKS[presetId];
  const mandatoryVideoLock = [DIRECTOR_VIDEO_CONTINUITY_LOCK, mandatoryModeLock].filter(Boolean).join('\n');
  const directorSystemInstruction = [
    DIRECTOR_INSTRUCTIONS,
    'PRESET OBRIGATÓRIO (' + presetId + '):',
    presetRules,
    'Conduza e melhore a ideia sem sair destas regras. Se um detalhe do briefing entrar em conflito, preserve o preset e registre a limitação em warnings.',
  ].join('\n\n');
  const multimodalReferences: ImageInput[] = references.map((reference) => {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/i.exec(reference.dataUrl);
    if (!match) throw new ApiError('INVALID_INPUT', `A referência “${reference.name}” não é uma imagem PNG, JPG ou WEBP válida.`);
    return { mimeType: match[1]!.toLowerCase() as ImageInput['mimeType'], data: match[2]! };
  });
  const selectedEngine = input.durationSeconds > 8 ? 'omni-flash' : 'veo-3.1-fast';
  const baseCost = context.unlimited && selectedEngine === 'veo-3.1-fast'
    ? 0
    : calculateUgcCost({ engine: selectedEngine, sceneCount: 1, durationSeconds: input.durationSeconds, sceneDurations: [input.durationSeconds] });
  const request = {
    workflow: isTikTokShopWorkflow ? 'tiktok-shop' : 'video-plan',
    presetId,
    mandatoryPresetRules: presetRules,
    briefing: input.briefing,
    objective: input.objective,
    aspectRatio: input.aspectRatio,
    durationSeconds: input.durationSeconds,
    referenceNames,
    maximumDialogueWords: directorDialogueWordLimit(input.durationSeconds),
    speechEndReserveSeconds: DIRECTOR_SPEECH_RESERVE_SECONDS,
    dialogueRequirements: `A fala em scenes[0].text deve ter no máximo ${directorDialogueWordLimit(input.durationSeconds)} palavras. Conclua a última palavra até ${Math.max(0, input.durationSeconds - DIRECTOR_SPEECH_RESERVE_SECONDS)} segundos; deixe os últimos ${DIRECTOR_SPEECH_RESERVE_SECONDS} segundos sem fala. Use pt-BR natural, sem acelerar. Omita a CTA se ela não couber. Não repita a fala em flowVideoPrompt.`,
    requiredEngineId: selectedEngine,
    requiredEngineLabel: selectedEngine === 'omni-flash' ? 'Omni Flash 1.2' : (context.unlimited ? 'Veo 3.1 lowerpriority' : 'Veo 3.1 Fast'),
    requiredEstimatedCost: baseCost,
  };
  try {
    let output: string;
    if (rustEnabled()) {
      output = await rustChatCompletion({ prompt: JSON.stringify(request), system: directorSystemInstruction, model: HUST_DIRECTOR_MODEL, images: multimodalReferences });
    } else {
      const ai = getClient();
      const { text: model } = await resolveModels();
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [...multimodalReferences.flatMap((image, index) => [{ text: `REFERÊNCIA VISUAL ${index + 1} — ${referenceNames[index] ?? 'imagem enviada'}. Analise a imagem como referência real.` }, toPart(image)]), { text: JSON.stringify(request) }] }],
        config: { systemInstruction: directorSystemInstruction, temperature: 0.25, maxOutputTokens: isTikTokShopWorkflow ? 3000 : 1800, responseMimeType: 'application/json' },
      });
      output = response.text ?? '';
    }
    const cleaned = output.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error('o modelo não retornou JSON válido');
    const modelPlan = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
    // Engine, custo, duração e modo de referência são regras do produto, não decisões do modelo.
    // Normalizamos antes da validação para que valores como null/"none" não invalidem um plano útil.
    const assetLocks = TIKTOK_ASSET_LOCKS[presetId];
    const normalizedPlan = {
      ...modelPlan,
      // Hust can return a useful warning longer than the UI contract allows.
      // Keep the plan usable while preserving the warning within the public limit.
      warnings: Array.isArray(modelPlan.warnings)
        ? modelPlan.warnings.slice(0, 6).map((warning) => String(warning).slice(0, 240))
        : [],
      aspectRatio: input.aspectRatio,
      totalDurationSeconds: input.durationSeconds,
      engineId: selectedEngine,
      engineLabel: request.requiredEngineLabel,
      estimatedCost: baseCost,
      ...(typeof modelPlan.title === 'string' ? { title: modelPlan.title.slice(0, 120) } : {}),
      ...(typeof modelPlan.objective === 'string' ? { objective: modelPlan.objective.slice(0, 160) } : {}),
      ...(typeof modelPlan.creativeDirection === 'string' ? { creativeDirection: modelPlan.creativeDirection.slice(0, 600) } : {}),
      ...(typeof modelPlan.audience === 'string' ? { audience: modelPlan.audience.slice(0, 200) } : {}),
      ...(typeof modelPlan.productAnalysis === 'string' ? { productAnalysis: modelPlan.productAnalysis.slice(0, 1000) } : {}),
      ...(typeof modelPlan.hook === 'string' ? { hook: modelPlan.hook.slice(0, 200) } : {}),
      ...(typeof modelPlan.callToAction === 'string' ? { callToAction: modelPlan.callToAction.slice(0, 200) } : {}),
      ...(typeof modelPlan.coverImagePrompt === 'string'
        ? { coverImagePrompt: modelPlan.coverImagePrompt.slice(0, Math.max(0, 1600 - (assetLocks?.cover.length ?? 0) - 2)) }
        : {}),
      ...(typeof modelPlan.cleanImagePrompt === 'string'
        ? { cleanImagePrompt: modelPlan.cleanImagePrompt.slice(0, Math.max(0, 1600 - (assetLocks?.clean.length ?? 0) - 2)) }
        : {}),
      ...(typeof modelPlan.flowVideoPrompt === 'string'
        ? { flowVideoPrompt: modelPlan.flowVideoPrompt.slice(0, Math.max(0, 2000 - mandatoryVideoLock.length - 2)) }
        : {}),
      ...(Array.isArray(modelPlan.scenes)
        ? {
            scenes: modelPlan.scenes.slice(0, 8).map((scene, index) => {
              const item = scene && typeof scene === 'object' ? scene as Record<string, unknown> : {};
              const actionLimit = 400;
              const generatedAction = typeof item.action === 'string' ? item.action.trim() : '';
              const cleanAction = mandatoryModeLock && generatedAction.includes(mandatoryModeLock)
                ? generatedAction.replace(mandatoryModeLock, '').trim()
                : generatedAction;
              return {
                ...item,
                index,
                ...(typeof item.text === 'string' ? { text: item.text.slice(0, 600) } : {}),
                ...(typeof item.action === 'string' ? { action: cleanAction.slice(0, actionLimit) } : {}),
                durationSeconds: input.durationSeconds,
              };
            }),
          }
        : {}),
      ...(references.length ? { referenceMode: 'elements' as const } : { referenceMode: undefined }),
    };
    const parsed = directorPlanSchema.safeParse(normalizedPlan);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'plano fora do contrato');
    if (isTikTokShopWorkflow && (!parsed.data.productAnalysis || !parsed.data.coverImagePrompt || !parsed.data.cleanImagePrompt || !parsed.data.flowVideoPrompt)) {
      throw new Error('o plano TikTok Shop não trouxe análise e os três prompts necessários');
    }
    const scenes = parsed.data.scenes.slice(0, 1).map((scene, index) => ({ ...scene, index, durationSeconds: input.durationSeconds }));
    let flowVideoPrompt = parsed.data.flowVideoPrompt;
    let coverImagePrompt = parsed.data.coverImagePrompt;
    let cleanImagePrompt = parsed.data.cleanImagePrompt;
    if (assetLocks) {
      coverImagePrompt = appendMandatoryPromptRule(coverImagePrompt, assetLocks.cover, 1600);
      cleanImagePrompt = appendMandatoryPromptRule(cleanImagePrompt, assetLocks.clean, 1600);
    }
    if (mandatoryVideoLock) {
      const availablePromptLength = Math.max(0, 2000 - mandatoryVideoLock.length - 2);
      const sceneFallback = scenes.map((scene) => `Ação: ${scene.action}\nFala: ${scene.text}`).join('\n\n');
      const creativePrompt = (flowVideoPrompt ?? sceneFallback).trim().slice(0, availablePromptLength);
      flowVideoPrompt = prependMandatoryPromptRule(creativePrompt, mandatoryVideoLock, 2000);
    }
    const productAnalysis = parsed.data.productAnalysis ?? '';
    let safeHook = parsed.data.hook;
    let safeCallToAction = parsed.data.callToAction;
    const unsupportedUseAllowed = /\b(?:aplique|aplicar|aplica|massageie|massagear|massageia|espalhe|espalhar|espalha|passe|passar|usa|usar)\b/i.test(input.briefing + ' ' + productAnalysis);
    const sceneDraft = scenes[0];
    const draftContent = `${sceneDraft?.text ?? ''} ${sceneDraft?.action ?? ''} ${flowVideoPrompt ?? ''} ${coverImagePrompt ?? ''} ${cleanImagePrompt ?? ''}`;
    const hasUnverifiedApplication = isTikTokShopWorkflow && !unsupportedUseAllowed && Boolean(sceneDraft) &&
      /\b(?:aplic\w*|massage\w*|espalh\w*|pass\w*)\b.{0,120}\b(?:sérum|serum|creme|produto|gota|mão|pele)\b|\b(?:sérum|serum|creme|produto|gota)\b.{0,120}\b(?:aplic\w*|massage\w*|espalh\w*|pass\w*)\b/i.test(draftContent);
    const unverifiedMarketingClaims = isTikTokShopWorkflow &&
      /\b(?:cansad[oa] de testar|não sofra|não sofra mais|ingredientes incríveis|resultado garantido|milagroso|perfeito para|sérum perfeito|cura|curar|elimina|eliminar|acaba com|acabar com|hidratação profunda|textura leve|pele mais hidratada)\b/i.test(`${parsed.data.hook} ${parsed.data.callToAction} ${draftContent}`);
    const needsConservativeRewrite = isTikTokShopWorkflow && scenes.length &&
      (hasUnverifiedApplication || unverifiedMarketingClaims);
    let safeSpeech = '';
    if (needsConservativeRewrite) {
      const labelParts = [...productAnalysis.matchAll(/[“'\"]([^“'\"]{2,80})[”'\"]/g)]
        .map((match) => match[1]!.trim())
        .slice(0, 2);
      const itemName = labelParts[0];
      const brand = labelParts[1] ? `, da ${labelParts[1]}` : '';
      safeHook = itemName ? `Olha este produto: ${itemName}${brand}.` : 'Olha este produto de perto.';
      safeCallToAction = 'Clique no carrinho e garanta o seu!';
      safeSpeech = fitDirectorDialogue(`${safeHook} Repare nos detalhes visíveis na imagem. ${safeCallToAction}`, directorDialogueWordLimit(input.durationSeconds));
      scenes[0] = { ...scenes[0]!, text: safeSpeech };
      const safeAction = presetId === 'tiktok-shop-hands'
        ? 'Somente mãos humanas demonstram o produto exatamente no estado e na configuração mostrados pela referência. Um giro lento e contínuo revela os detalhes visíveis; câmera próxima faz uma aproximação suave. Não abrir, aplicar, derramar, alterar nem acrescentar partes ao produto.'
        : presetId === 'tiktok-shop-pov'
          ? 'Perspectiva POV: somente mãos demonstram o produto exatamente no estado e na configuração mostrados pela referência. Um giro lento e contínuo revela os detalhes visíveis; câmera próxima faz uma aproximação suave. Não abrir, aplicar, derramar, alterar nem acrescentar partes ao produto.'
          : 'A mesma pessoa da referência demonstra o produto exatamente no estado e na configuração mostrados pela imagem. Um giro lento e contínuo revela os detalhes visíveis; câmera próxima faz uma aproximação suave. Não alterar nem acrescentar partes ao produto.';
      if (mandatoryVideoLock) {
        scenes[0] = { ...scenes[0]!, action: safeAction.slice(0, 400) };
        flowVideoPrompt = prependMandatoryPromptRule(safeAction, mandatoryVideoLock, 2000);
      } else {
        scenes[0] = { ...scenes[0]!, action: safeAction.slice(0, 400) };
        flowVideoPrompt = safeAction.slice(0, 2000);
      }
      const assetSubject = presetId === 'tiktok-shop-hands'
        ? 'Somente mãos humanas e o produto aparecem; nenhum rosto ou apresentadora.'
        : presetId === 'tiktok-shop-pov'
          ? 'Perspectiva POV com mãos e produto; nenhum rosto ou apresentadora.'
          : 'A mesma pessoa da referência aparece com identidade preservada ao lado do produto.';
      if (assetLocks) {
        coverImagePrompt = appendMandatoryPromptRule(
          `Foto publicitária realista para TikTok Shop. ${assetSubject} Use o produto e a embalagem exatamente como na referência, com rótulo legível, iluminação profissional e composição vertical. Inclua apenas a chamada neutra “Conheça o produto”, sem alegações de eficácia, preço ou desconto.`,
          assetLocks.cover,
          1600,
        );
        cleanImagePrompt = appendMandatoryPromptRule(
          `Fotografia limpa e realista do produto de referência, preservando fielmente embalagem, cor, formato e rótulo. ${assetSubject} Fundo simples e iluminação profissional. Sem texto, preço, grafismo, moldura ou alegações.`,
          assetLocks.clean,
          1600,
        );
      }
    }
    if (scenes[0]) {
      scenes[0] = {
        ...scenes[0],
        text: fitDirectorDialogue(scenes[0].text, directorDialogueWordLimit(input.durationSeconds)),
      };
    }
    const planText = [
      scenes.map((scene) => scene.action + ' ' + scene.text).join(' '),
      flowVideoPrompt, coverImagePrompt, cleanImagePrompt,
    ].filter(Boolean).join(' ');
    const conflictsWithNoFaceMode = (presetId === 'tiktok-shop-hands' || presetId === 'tiktok-shop-pov') &&
      /\b(?:a influenciadora|a apresentadora|a mulher)\s+(?:aparece|fala|sorri|olha|demonstra|segura|mostra)\b/i.test(planText);
    const inventsUnsupportedUse = isTikTokShopWorkflow && !unsupportedUseAllowed &&
      /\b(?:aplic\w*|massage\w*|espalh\w*|pass\w*)\b.{0,120}\b(?:sérum|serum|creme|produto|gota|mão|pele)\b|\b(?:sérum|serum|creme|produto|gota)\b.{0,120}\b(?:aplic\w*|massage\w*|espalh\w*|pass\w*)\b|\b(?:demonstrando|mostrando)\s+(?:a textura|a hidratação|o resultado)\b|\b(?:textura leve|hidratação profunda|resultado visível|pele mais hidratada)\b/i.test(planText);
    if (conflictsWithNoFaceMode || inventsUnsupportedUse) {
      throw new ApiError('GENERATION_FAILED', 'O plano contrariou uma regra obrigatória do preset e foi bloqueado antes de abrir o canvas. Gere o plano novamente; nenhuma mídia foi gerada.');
    }

    return {
      ...parsed.data,
      ...(flowVideoPrompt ? { flowVideoPrompt } : {}),
      ...(coverImagePrompt ? { coverImagePrompt } : {}),
      ...(cleanImagePrompt ? { cleanImagePrompt } : {}),
      ...(needsConservativeRewrite ? { hook: safeHook, callToAction: safeCallToAction } : {}),
      scenes,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new ApiError('GENERATION_FAILED', `O Agente Diretor não conseguiu montar o plano: ${message.slice(0, 240)}`);
  }
}
