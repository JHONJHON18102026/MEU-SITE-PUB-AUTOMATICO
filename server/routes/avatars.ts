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

export const avatarRoutes = new Hono<AppEnv>();

const BUCKET = 'avatars';

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
    .select('id, user_id, generation_id, name, storage_path, prompt, attributes, engine, framing, aspect_ratio, is_public, is_favorite, created_at')
    .order('created_at', { ascending: false })
    .limit(scope === 'community' ? 60 : 120);
  query = scope === 'community' ? query.eq('is_public', true) : query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw new ApiError('INTERNAL', `Não consegui carregar a galeria: ${error.message}`);

  const rows = data ?? [];
  if (!rows.length) return c.json({ avatars: [] });

  // O endpoint de lote gera as URLs temporárias em uma chamada ao Storage,
  // em vez de fazer uma chamada por avatar (até 120 por carregamento).
  const signed = await admin.storage
    .from(BUCKET)
    .createSignedUrls([...new Set(rows.map((avatar) => avatar.storage_path))], SIGNED_IMAGE_TTL_SECONDS);
  if (signed.error) throw new ApiError('INTERNAL', `Não consegui preparar as imagens da galeria: ${signed.error.message}`);

  const signedByPath = new Map(signed.data.map((item) => [item.path, item]));
  const avatars = rows.map((avatar) => {
    const item = signedByPath.get(avatar.storage_path);
    if (item?.error || !item?.signedUrl) {
      console.error(`[avatars] URL temporária falhou para ${avatar.id}:`, item?.error ?? 'URL ausente');
      return null;
    }
    return { ...avatar, image_url: item.signedUrl };
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
  return { mimeType: 'image/png', data: buffer.toString('base64') };
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
      const raw = await generateImage({ prompt, engine: req.engine, aspectRatio: req.aspectRatio, images, imageDescriptions });
      const branded = (await isOwnerUser(userId)) ? await applyWatermark(raw.buffer) : raw.buffer;
      const avatarId = randomUUID();
      const storagePath = `${userId}/${avatarId}.png`;
      const up = await admin.storage.from(BUCKET).upload(storagePath, branded, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: false,
      });
      if (up.error) throw new ApiError('INTERNAL', `Falha ao salvar a imagem: ${up.error.message}`);
      // O bucket de avatares é privado; URL pública gera imagem quebrada no
      // navegador e impede que o Motion reutilize o avatar recém-criado.
      const signed = await admin.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);
      if (signed.error || !signed.data?.signedUrl) {
        throw new ApiError('INTERNAL', `Falha ao preparar a imagem para visualização: ${signed.error?.message ?? 'URL ausente'}`);
      }
      return {
        id: avatarId,
        user_id: userId,
        generation_id: generationId,
        name: suggestAvatarName(req.attributes as AttributeSelection, index, req.extraDetails),
        image_url: signed.data.signedUrl,
        storage_path: storagePath,
        // Persist the exact assembled prompt sent to the image engine so the
        // detail view exposes selected attributes, references, and constraints.
        prompt,
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
    const ins = await admin.from('avatars').insert(ok).select();
    if (ins.error) throw new ApiError('INTERNAL', `Falha ao gravar avatares: ${ins.error.message}`);
    saved = ins.data as AvatarDTO[];
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
  await admin.storage.from(BUCKET).remove([data.storage_path]);
  const del = await admin.from('avatars').delete().eq('id', id);
  if (del.error) throw new ApiError('INTERNAL', del.error.message);
  return c.json({ ok: true });
});
