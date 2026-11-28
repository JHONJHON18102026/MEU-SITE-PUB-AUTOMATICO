/**
 * POST /api/avatars/generate — o fluxo completo de uma geração.
 *
 *  1. valida o pedido (zod)            -> INVALID_INPUT se algo vier errado
 *  2. cria a geração "processing"
 *  3. DEBITA os créditos ANTES de chamar a IA (débito atômico no banco)
 *  4. gera as N imagens em paralelo
 *  5. aplica a marca d'água e salva no Storage
 *  6. grava os avatares e marca a geração "done"
 *  7. se alguma imagem falhar, ESTORNA só o valor das que falharam
 *
 * Analogia: é como um caixa de restaurante que cobra na entrada e devolve o
 * dinheiro dos pratos que a cozinha não conseguiu fazer. O cliente nunca paga
 * por algo que não recebeu, e a casa nunca entrega de graça.
 */
import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { getAdmin } from '../supabaseAdmin';
import { debitUserCredits, refundUserCredits } from '../credits';
import { ApiError } from '../errors';
import { generateImage } from '../gemini';
import { applyWatermark, isOwnerUser } from '../watermark';
import { buildAvatarPrompt, suggestAvatarName } from '../../shared/avatarPrompt';
import {
  avatarCost,
  generateAvatarSchema,
  PRICING,
  type AvatarDTO,
  type GenerateAvatarResponse,
  type GenerationDTO,
  type ImageInput,
} from '../../shared/contracts';
import { findOption, type AttributeSelection } from '../../shared/attributes';
import type { AppEnv } from '../app';
import { avatarTemplateInputSchema, type AvatarTemplateDTO } from '../../shared/avatarTemplateContracts';
import { invalidateSignedStorageUrl, signedStorageUrls } from '../storage';
import { avatarThumbnailPath, optimizeAvatarImage } from '../avatarImageOptimization';

export const avatarRoutes = new Hono<AppEnv>();

const BUCKET = 'avatars';

// Each result in a batch gets its own concrete art direction. A shared prompt
// alone makes the image engine repeat the same set and wardrobe across results.
const FRUIT_IMAGE_VARIATIONS = [
  { id: 'fruit-orchard-dawn', direction: 'um pomar ao amanhecer, com névoa leve; figurinos de trabalho rural em tecidos naturais, cada fruta com peças e cores próprias' },
  { id: 'fruit-night-market', direction: 'uma feira noturna iluminada por barracas; figurinos urbanos de passeio, com camadas e acessórios diferentes para cada fruta' },
  { id: 'fruit-restaurant-kitchen', direction: 'uma cozinha de restaurante antes do movimento; aventais e roupas de cozinha adaptados ao papel de cada fruta' },
  { id: 'fruit-rain-greenhouse', direction: 'uma estufa tropical depois da chuva; roupas práticas impermeáveis, com cortes e paletas distintos entre os personagens' },
  { id: 'fruit-old-station', direction: 'uma estação ferroviária antiga no fim da tarde; roupas de viagem elegantes, com casacos e acessórios diferentes' },
  { id: 'fruit-bakery-close', direction: 'uma confeitaria de bairro em horário de fechamento; figurinos ligados ao trabalho e à ocasião, sem repetir aventais idênticos' },
  { id: 'fruit-town-festival', direction: 'uma praça de cidade pequena durante uma festa local; roupas festivas coerentes com a personalidade de cada fruta' },
  { id: 'fruit-municipal-market', direction: 'um mercado municipal pela manhã; figurinos casuais inspirados no papel de cada personagem, com silhuetas claramente distintas' },
  { id: 'fruit-riverside-picnic', direction: 'um pomar à beira de um riacho no fim da tarde; roupas leves de passeio com paletas individuais' },
  { id: 'fruit-school-garden', direction: 'uma horta escolar durante uma atividade; roupas práticas diferentes, adequadas às funções dos personagens' },
  { id: 'fruit-coastal-fair', direction: 'uma feira de rua perto do litoral em dia ensolarado; roupas ventiladas e acessórios próprios de cada personagem' },
  { id: 'fruit-winter-greenhouse', direction: 'uma estufa aquecida numa manhã fria; casacos e cachecóis distintos, coerentes com cada papel' },
  { id: 'fruit-cafe-terrace', direction: 'o terraço de um café de bairro depois da chuva; figurinos de encontro casual com cores e cortes diferentes' },
  { id: 'fruit-harvest-barn', direction: 'um galpão de colheita no interior; roupas de trabalho com texturas naturais e peças próprias para cada personagem' },
  { id: 'fruit-flower-market', direction: 'um mercado de flores colorido no começo da manhã; roupas elegantes de passeio sem uniformizar os personagens' },
  { id: 'fruit-rooftop-garden', direction: 'uma horta comunitária no alto de um prédio ao pôr do sol; figurinos urbanos e práticos, individualizados' },
];

const CHARACTER_IMAGE_VARIATIONS = [
  { id: 'character-botanical-garden', direction: 'um jardim botânico depois da chuva; roupas adequadas ao papel, em materiais naturais e silhuetas próprias' },
  { id: 'character-old-bookstore', direction: 'uma livraria antiga perto do fechamento; figurinos de passeio com camadas, texturas e cores diferentes' },
  { id: 'character-creative-atelier', direction: 'um ateliê de criação com luz lateral; roupas de trabalho ou expressão artística, sem uniformizar os personagens' },
  { id: 'character-historic-station', direction: 'uma estação histórica no fim da tarde; figurinos de viagem coerentes com a personalidade e o papel' },
  { id: 'character-culture-fair', direction: 'uma pequena feira cultural ao ar livre; roupas casuais com detalhes individuais e paleta harmoniosa' },
  { id: 'character-home-kitchen', direction: 'uma cozinha acolhedora durante o preparo de uma receita; roupas adequadas à ação, com peças distintas' },
  { id: 'character-observatory', direction: 'um observatório no início da noite; figurinos funcionais com materiais e silhuetas próprios do personagem' },
  { id: 'character-artisan-workshop', direction: 'uma oficina artesanal iluminada pelo sol; roupas de trabalho coerentes com a atividade descrita' },
  { id: 'character-museum-gallery', direction: 'uma galeria de museu antes da abertura; roupas sociais adaptadas à personalidade e função' },
  { id: 'character-rooftop-evening', direction: 'um terraço urbano na hora azul; figurinos contemporâneos com cortes individuais' },
  { id: 'character-riverside', direction: 'um caminho à beira-rio no início da manhã; roupas de passeio apropriadas ao clima e diferentes entre personagens' },
  { id: 'character-flower-greenhouse', direction: 'uma estufa de flores coloridas; roupas leves e coerentes com a ocupação de cada personagem' },
  { id: 'character-antique-cafe', direction: 'um café antigo em uma tarde chuvosa; figurinos aconchegantes e distintos' },
  { id: 'character-night-library', direction: 'uma biblioteca moderna à noite; roupas discretas com materiais e silhuetas individualizadas' },
  { id: 'character-desert-workshop', direction: 'uma oficina no interior em tarde seca; roupas funcionais adequadas ao ambiente' },
  { id: 'character-seaside-promenade', direction: 'um calçadão à beira-mar no fim da tarde; roupas ventiladas e acessórios próprios de cada personagem' },
];

function variationOffset(seed: string, length: number): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function buildAvatarVariationPrompts(prompt: string, count: number, seed: string, recentlyUsed: Set<string>) {
  const fruitPrompt = prompt.includes('AMBIENTE DE PERSONAGEM-FRUTA');
  const variations = fruitPrompt ? FRUIT_IMAGE_VARIATIONS : CHARACTER_IMAGE_VARIATIONS;
  const offset = variationOffset(seed, variations.length);
  const ordered = [...variations.slice(offset), ...variations.slice(0, offset)];
  const fresh = ordered.filter((variation) => !recentlyUsed.has(variation.id));
  const selected = [...fresh, ...ordered.filter((variation) => recentlyUsed.has(variation.id))].slice(0, count);
  return selected.map((variation, index) => ({
    variationId: variation.id,
    prompt: [
      prompt,
      `DIREÇÃO VISUAL EXCLUSIVA DESTA IMAGEM (${index + 1} de ${count}): crie uma composição nova usando ${variation.direction}. Preserve exatamente a identidade, espécie, rosto, cores naturais, papel, emoção, ação e relação entre os personagens definidos pelo usuário. Não reutilize cenário nem combinação de roupas de outra imagem deste mesmo pedido. Dê a cada personagem um figurino próprio, coerente com seu papel e diferente do figurino dos demais; roupas podem variar sem descaracterizar a identidade. A descrição explícita do usuário para local ou roupa sempre prevalece: varie apenas o que ficou em aberto. Não acrescente personagens.`,
    ].join('\n\n'),
  }));
}

avatarRoutes.get('/templates', async (c) => {
  const userId = c.get('userId');
  const { data, error } = await getAdmin()
    .from('avatar_templates')
    .select('id, name, mode, prompt, skill_ids, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(30);
  if (error) throw new ApiError('INTERNAL', `Não consegui carregar seus templates: ${error.message}`);
  const templates = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    mode: row.mode as AvatarTemplateDTO['mode'],
    prompt: row.prompt,
    skillIds: row.skill_ids ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as AvatarTemplateDTO[];
  return c.json({ templates });
});

avatarRoutes.post('/templates', async (c) => {
  const userId = c.get('userId');
  const parsed = avatarTemplateInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Confira os dados do template.');
  const admin = getAdmin();
  const { count, error: countError } = await admin
    .from('avatar_templates')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (countError) throw new ApiError('INTERNAL', `Não consegui conferir a biblioteca: ${countError.message}`);
  if ((count ?? 0) >= 30) throw new ApiError('INVALID_INPUT', 'Você já salvou 30 templates. Exclua um para salvar outro.');
  const { data, error } = await admin
    .from('avatar_templates')
    .insert({
      user_id: userId,
      name: parsed.data.name,
      mode: parsed.data.mode,
      prompt: parsed.data.prompt,
      skill_ids: parsed.data.skillIds,
    })
    .select('id, name, mode, prompt, skill_ids, created_at, updated_at')
    .single();
  if (error) throw new ApiError('INTERNAL', `Não consegui salvar o template: ${error.message}`);
  const template: AvatarTemplateDTO = {
    id: data.id,
    name: data.name,
    mode: data.mode as AvatarTemplateDTO['mode'],
    prompt: data.prompt,
    skillIds: data.skill_ids ?? [],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
  return c.json({ template }, 201);
});

avatarRoutes.delete('/templates/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError('INVALID_INPUT', 'Id de template inválido.');
  const { error, count } = await getAdmin()
    .from('avatar_templates')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new ApiError('INTERNAL', `Não consegui excluir o template: ${error.message}`);
  if (!count) throw new ApiError('INVALID_INPUT', 'Template não encontrado.');
  return c.json({ ok: true });
});
const SIGNED_IMAGE_TTL_SECONDS = 60 * 60;

/** Devolve URLs renovadas para a galeria; image_url no banco pode ter expirado. */
avatarRoutes.get('/gallery', async (c) => {
  const userId = c.get('userId');
  const scope = c.req.query('scope') === 'community' ? 'community' : 'mine';
  const admin = getAdmin();
  let query = admin
    .from('avatars')
    .select('id, user_id, generation_id, name, storage_path, thumbnail_path, prompt, attributes, engine, framing, aspect_ratio, is_public, is_favorite, created_at')
    .order('created_at', { ascending: false })
    .limit(scope === 'community' ? 60 : 120);
  query = scope === 'community' ? query.eq('is_public', true) : query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw new ApiError('INTERNAL', `Não consegui carregar a galeria: ${error.message}`);

  const rows = data ?? [];
  if (!rows.length) return c.json({ avatars: [] });

  // O endpoint de lote gera as URLs temporárias em uma chamada ao Storage,
  // em vez de fazer uma chamada por avatar (até 120 por carregamento).
  let signedByPath: Map<string, string>;
  try {
    signedByPath = await signedStorageUrls(BUCKET, rows.map((avatar) => avatar.storage_path), SIGNED_IMAGE_TTL_SECONDS);
  } catch (error) {
    throw new ApiError('INTERNAL', `Não consegui preparar as imagens da galeria: ${error instanceof Error ? error.message : String(error)}`);
  }
  const thumbnailPaths = rows.flatMap((avatar) => avatar.thumbnail_path ? [avatar.thumbnail_path] : []);
  let thumbnailByPath = new Map<string, string>();
  if (thumbnailPaths.length) {
    try {
      thumbnailByPath = await signedStorageUrls(BUCKET, thumbnailPaths, SIGNED_IMAGE_TTL_SECONDS);
    } catch (signError) {
      // A thumbnail is an optimization, so keep the original usable if signing fails.
      console.warn(`[avatars] Não foi possível assinar miniaturas: ${signError instanceof Error ? signError.message : String(signError)}`);
    }
  }
  const avatars = rows.map((avatar) => {
    const signedUrl = signedByPath.get(avatar.storage_path);
    if (!signedUrl) {
      console.error(`[avatars] URL temporária falhou para ${avatar.id}: URL ausente`);
      return null;
    }
    const { thumbnail_path: _thumbnailPath, ...publicAvatar } = avatar;
    const thumbnailUrl = avatar.thumbnail_path ? thumbnailByPath.get(avatar.thumbnail_path) : undefined;
    return { ...publicAvatar, image_url: signedUrl, ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}) };
  });
  return c.json({ avatars: avatars.filter((avatar): avatar is NonNullable<typeof avatar> => avatar !== null) });
});

async function downloadAvatarAsInput(userId: string, avatarId: string): Promise<ImageInput> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('avatars')
    .select('storage_path, user_id, is_public')
    .eq('id', avatarId)
    .single();
  if (error || !data) throw new ApiError('INVALID_INPUT', 'Avatar base não encontrado.');
  if (data.user_id !== userId && !data.is_public) throw new ApiError('INVALID_INPUT', 'Você não tem acesso a esse avatar.');
  const file = await admin.storage.from(BUCKET).download(data.storage_path);
  if (file.error || !file.data) throw new ApiError('INTERNAL', 'Não consegui baixar o avatar base.');
  const buffer = Buffer.from(await file.data.arrayBuffer());
  return { mimeType: data.storage_path.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/png', data: buffer.toString('base64') };
}

avatarRoutes.post('/generate', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const parsed = generateAvatarSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('INVALID_INPUT', `Pedido inválido: ${parsed.error.issues[0]?.message ?? 'confira os campos'}`);
  }
  const req = parsed.data;
  const hasAttributes = Object.values(req.attributes).some((v) => v.length > 0);
  if (req.mode === 'prompt' && !req.prompt.trim() && !hasAttributes && !req.basePhoto && !req.baseAvatarId && !req.productImage) {
    throw new ApiError('INVALID_INPUT', 'Descreva o que você quer criar ou escolha características.');
  }

  const admin = getAdmin();
  const cost = avatarCost(req.count);
  const generationId = randomUUID();

  // Rosto base: foto enviada OU avatar já existente.
  const basePhoto = req.basePhoto ?? (req.baseAvatarId ? await downloadAvatarAsInput(userId, req.baseAvatarId) : null);

  const prompt = buildAvatarPrompt({
    mode: req.mode,
    attributes: req.attributes as AttributeSelection,
    extraDetails: req.extraDetails,
    characterWorld: req.characterWorld,
    prompt: req.prompt,
    framing: req.framing,
    hasBasePhoto: Boolean(basePhoto),
    hasProductImage: Boolean(req.productImage),
    hasCharacterStyleReference: Boolean(req.characterStyleReference),
    referenceCount: req.referenceImages.length,
  });

  const { data: previousGenerations, error: historyError } = await admin
    .from('generations')
    .select('params')
    .eq('user_id', userId)
    .eq('kind', 'avatar_image')
    .eq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(12);
  if (historyError) throw new ApiError('INTERNAL', `Não consegui conferir as variações anteriores: ${historyError.message}`);
  const recentlyUsedVariations = new Set((previousGenerations ?? []).flatMap((generation) => {
    const variations = (generation.params as { imageVariations?: unknown } | null)?.imageVariations;
    return Array.isArray(variations) ? variations.filter((value): value is string => typeof value === 'string') : [];
  }));
  const imageVariations = buildAvatarVariationPrompts(prompt, req.count, generationId, recentlyUsedVariations);

  const params = {
    mode: req.mode,
    attributes: req.attributes,
    prompt: req.prompt,
    extraDetails: req.extraDetails,
    characterWorld: req.characterWorld,
    engine: req.engine,
    framing: req.framing,
    aspectRatio: req.aspectRatio,
    count: req.count,
    imageVariations: imageVariations.map((variation) => variation.variationId),
    hasBasePhoto: Boolean(basePhoto),
    hasProduct: Boolean(req.productImage),
    hasCharacterStyleReference: Boolean(req.characterStyleReference),
    referenceCount: req.referenceImages.length,
    basePhoto: req.basePhoto ? { name: req.basePhoto.name ?? 'Foto base', mimeType: req.basePhoto.mimeType } : null,
    baseAvatarId: req.baseAvatarId,
    productImage: req.productImage ? { name: req.productImage.name ?? 'Produto', mimeType: req.productImage.mimeType } : null,
    characterStyleReference: req.characterStyleReference ? { name: req.characterStyleReference.name ?? 'Referência de estilo do personagem', mimeType: req.characterStyleReference.mimeType } : null,
    referenceImages: req.referenceImages.map((image, index) => ({ name: image.name ?? `Referência ${index + 1}`, mimeType: image.mimeType })),
    makePublic: req.makePublic,
  };

  const genInsert = await admin
    .from('generations')
    .insert({ id: generationId, user_id: userId, kind: 'avatar_image', status: 'processing', cost, params })
    .select()
    .single();
  if (genInsert.error) throw new ApiError('INTERNAL', `Falha ao registrar a geração: ${genInsert.error.message}`);

  // ---- débito atômico (falha aqui = nada foi gerado, nada foi cobrado)
  let balance: number;
  try {
    balance = await debitUserCredits({ userId, amount: cost, reason: 'avatar_image', refId: generationId, insufficientMessage: `Você precisa de ${cost} créditos para gerar ${req.count} imagem(ns).`, chargeUnlimited: true });
  } catch (err) {
    await admin
      .from('generations')
      .update({ status: 'failed', error: 'Créditos insuficientes', completed_at: new Date().toISOString() })
      .eq('id', generationId);
    throw err;
  }

  // ---- gera em paralelo; cada imagem é independente
  const images: ImageInput[] = [];
  const imageDescriptions: string[] = [];
  if (basePhoto) {
    images.push(basePhoto);
    imageDescriptions.push('FOTO BASE DE IDENTIDADE: preserve os traços reconhecíveis desta pessoa, mas aplique no mesmo sujeito todas as opções explícitas do usuário. Se o tipo selecionado pedir bebê animado, criatura ou caricatura, essa transformação tem prioridade sobre a idade, anatomia humana adulta e estilo da foto. Não acrescente a transformação como segundo personagem.');
  }
  req.referenceImages.forEach((image, index) => {
    images.push(image);
    imageDescriptions.push(`REFERÊNCIA VISUAL DO USUÁRIO ${index + 1}: use a imagem como fonte de características para formar um híbrido com o briefing de “Monte seu Personagem”. Transfira para o mesmo personagem traços visíveis e compatíveis (como paleta, cabelo, silhueta, adornos, roupa, textura ou materiais), sem copiar automaticamente a identidade exata da pessoa e sem substituir o conceito escrito. Em conflito direto, o briefing escrito prevalece; aproveite os demais traços compatíveis da referência. Não crie um segundo sujeito.`);
  });
  if (req.characterStyleReference) {
    const typeId = req.attributes.characterType?.[0];
    const typeLabel = typeId ? findOption('characterType', typeId)?.label : undefined;
    images.push(req.characterStyleReference);
    imageDescriptions.push(`REFERÊNCIA VISUAL DO TIPO DE PERSONAGEM${typeLabel ? ` “${typeLabel}”` : ''}: esta miniatura é uma referência visual complementar obrigatória. Transfira para o personagem principal pelo menos dois traços visíveis e compatíveis com “Monte seu Personagem”, como adorno, silhueta, paleta, textura ou material. O briefing escrito define a identidade principal e tem prioridade em qualquer conflito; não substitua o personagem pelo sujeito da miniatura. Não copie a pose ou o fundo nem crie um segundo personagem. ${basePhoto ? 'Mantenha a identidade da foto base e combine nela os traços compatíveis da miniatura.' : 'Crie um único personagem híbrido com a descrição e os traços compatíveis da miniatura.'}`);
  }
  if (req.productImage) {
    images.push(req.productImage);
    imageDescriptions.push('FOTO DO PRODUTO: reproduza fielmente a embalagem e as características visíveis; não a use como referência de identidade do personagem.');
  }

  const results = await Promise.allSettled(
    Array.from({ length: req.count }, async (_, index) => {
      const imagePrompt = imageVariations[index]!.prompt;
      const raw = await generateImage({ prompt: imagePrompt, engine: req.engine, aspectRatio: req.aspectRatio, images, imageDescriptions });
      const branded = (await isOwnerUser(userId)) ? await applyWatermark(raw.buffer) : raw.buffer;
      const avatarId = randomUUID();
      const storagePath = `${userId}/${avatarId}.png`;
      const thumbnailPath = avatarThumbnailPath(storagePath);
      const optimized = await optimizeAvatarImage(branded);
      const up = await admin.storage.from(BUCKET).upload(storagePath, optimized.full, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: false,
      });
      if (up.error) throw new ApiError('INTERNAL', `Falha ao salvar a imagem: ${up.error.message}`);
      const thumbnailUpload = await admin.storage.from(BUCKET).upload(thumbnailPath, optimized.thumbnail, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      });
      if (thumbnailUpload.error) {
        // A full image is the product; a failed optional thumbnail must not fail
        // a paid generation or hide a successfully generated image.
        console.warn(`[avatars] Miniatura não salva para ${avatarId}: ${thumbnailUpload.error.message}`);
      }
      // O bucket de avatares é privado; URL pública gera imagem quebrada no
      // navegador e impede que o Motion reutilize o avatar recém-criado.
      const signed = await signedStorageUrls(BUCKET, [storagePath, ...(thumbnailUpload.error ? [] : [thumbnailPath])], SIGNED_IMAGE_TTL_SECONDS);
      const signedUrl = signed.get(storagePath);
      if (!signedUrl) throw new ApiError('INTERNAL', 'Falha ao preparar a imagem para visualização: URL ausente');
      return {
        id: avatarId,
        user_id: userId,
        generation_id: generationId,
        name: suggestAvatarName(req.attributes as AttributeSelection, index, req.extraDetails),
        image_url: signedUrl,
        ...(signed.get(thumbnailPath) ? { thumbnail_url: signed.get(thumbnailPath)! } : {}),
        ...(thumbnailUpload.error ? {} : { thumbnail_path: thumbnailPath }),
        storage_path: storagePath,
        // Persist the exact assembled prompt sent to the image engine so the
        // detail view exposes selected attributes, references, and constraints.
        prompt: imagePrompt,
        attributes: req.attributes,
        engine: raw.model,
        framing: req.framing,
        aspect_ratio: req.aspectRatio,
        is_public: req.makePublic,
      };
    }),
  );

  const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const failures = results.flatMap((r) => (r.status === 'rejected' ? [r.reason as unknown] : []));

  let saved: AvatarDTO[] = [];
  if (ok.length) {
    const insertRows = ok.map(({ thumbnail_url: _thumbnailUrl, ...row }) => row);
    const ins = await admin.from('avatars').insert(insertRows).select();
    if (ins.error) throw new ApiError('INTERNAL', `Falha ao gravar avatares: ${ins.error.message}`);
    const thumbnailsById = new Map<string, string | undefined>();
    for (const avatar of ok) thumbnailsById.set(avatar.id, avatar.thumbnail_url);
    saved = (ins.data as AvatarDTO[]).map((avatar) => ({
      ...avatar,
      ...(thumbnailsById.get(avatar.id) ? { thumbnail_url: thumbnailsById.get(avatar.id)! } : {}),
    }));
  }

  // ---- estorno proporcional ao que falhou
  const refunded = failures.length * PRICING.avatarImage;
  if (refunded > 0) {
    const refundedBalance = await refundUserCredits({ userId, amount: refunded, refId: generationId, chargeUnlimited: true });
    if (refundedBalance !== null) balance = refundedBalance;
  }

  const firstError = failures[0];
  const status = ok.length ? 'done' : 'failed';
  const errorMsg = firstError ? (firstError instanceof Error ? firstError.message : String(firstError)) : null;
  const upd = await admin
    .from('generations')
    .update({ status, result_count: ok.length, error: errorMsg, completed_at: new Date().toISOString() })
    .eq('id', generationId)
    .select()
    .single();

  // Nada deu certo: devolve o erro real (já estornado) para o usuário entender.
  if (!ok.length) {
    if (firstError instanceof ApiError) throw firstError;
    throw new ApiError('GENERATION_FAILED', errorMsg ?? 'A geração falhou. Seus créditos foram devolvidos.');
  }

  const response: GenerateAvatarResponse = {
    generation: upd.data as GenerationDTO,
    avatars: saved,
    balance,
    refunded,
  };
  return c.json(response);
});

/** DELETE /api/avatars/:id — apaga o registro E o arquivo da imagem. */
avatarRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError('INVALID_INPUT', 'Id inválido.');
  const admin = getAdmin();
  const { data, error } = await admin.from('avatars').select('storage_path, user_id').eq('id', id).maybeSingle();
  if (error) throw new ApiError('INTERNAL', error.message);
  if (!data || data.user_id !== userId) throw new ApiError('INVALID_INPUT', 'Avatar não encontrado.');
  const thumbnailPath = avatarThumbnailPath(data.storage_path);
  const thumbnailName = thumbnailPath.slice(userId.length + 1);
  const { data: ownerFiles, error: listError } = await admin.storage.from(BUCKET).list(userId, { search: thumbnailName, limit: 10 });
  if (listError) throw new ApiError('INTERNAL', `Não consegui verificar a miniatura antes da exclusão: ${listError.message}`);
  const pathsToRemove = [data.storage_path];
  if ((ownerFiles ?? []).some((file) => file.name === thumbnailName)) pathsToRemove.push(thumbnailPath);
  const { error: removeError } = await admin.storage.from(BUCKET).remove(pathsToRemove);
  if (removeError) throw new ApiError('INTERNAL', `Não consegui remover a imagem do armazenamento: ${removeError.message}`);
  invalidateSignedStorageUrl(BUCKET, data.storage_path);
  if (pathsToRemove.includes(thumbnailPath)) invalidateSignedStorageUrl(BUCKET, thumbnailPath);
  const del = await admin.from('avatars').delete().eq('id', id);
  if (del.error) throw new ApiError('INTERNAL', del.error.message);
  return c.json({ ok: true });
});
