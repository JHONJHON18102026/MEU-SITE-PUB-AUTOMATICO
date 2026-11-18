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
import { ApiError } from '../errors';
import { generateImage } from '../gemini';
import { applyWatermark } from '../watermark';
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
import type { AttributeSelection } from '../../shared/attributes';
import type { AppEnv } from '../app';

export const avatarRoutes = new Hono<AppEnv>();

const BUCKET = 'avatars';

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
    referenceCount: req.referenceImages.length,
  };

  const genInsert = await admin
    .from('generations')
    .insert({ id: generationId, user_id: userId, kind: 'avatar_image', status: 'processing', cost, params })
    .select()
    .single();
  if (genInsert.error) throw new ApiError('INTERNAL', `Falha ao registrar a geração: ${genInsert.error.message}`);

  // ---- débito atômico (falha aqui = nada foi gerado, nada foi cobrado)
  const debit = await admin.rpc('debit_credits', {
    p_user: userId,
    p_amount: cost,
    p_reason: 'avatar_image',
    p_ref: generationId,
  });
  if (debit.error) {
    await admin
      .from('generations')
      .update({ status: 'failed', error: 'Créditos insuficientes', completed_at: new Date().toISOString() })
      .eq('id', generationId);
    if (/INSUFFICIENT_CREDITS/.test(debit.error.message)) {
      throw new ApiError('INSUFFICIENT_CREDITS', `Você precisa de ${cost} créditos para gerar ${req.count} imagem(ns).`);
    }
    throw new ApiError('INTERNAL', `Falha ao debitar créditos: ${debit.error.message}`);
  }
  let balance = Number(debit.data);

  // ---- gera em paralelo; cada imagem é independente
  const images: ImageInput[] = [
    ...(basePhoto ? [basePhoto] : []),
    ...(req.productImage ? [req.productImage] : []),
    ...req.referenceImages,
  ];

  const results = await Promise.allSettled(
    Array.from({ length: req.count }, async (_, index) => {
      const raw = await generateImage({ prompt, engine: req.engine, aspectRatio: req.aspectRatio, images });
      const branded = await applyWatermark(raw.buffer);
      const avatarId = randomUUID();
      const storagePath = `${userId}/${avatarId}.png`;
      const up = await admin.storage.from(BUCKET).upload(storagePath, branded, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: false,
      });
      if (up.error) throw new ApiError('INTERNAL', `Falha ao salvar a imagem: ${up.error.message}`);
      const publicUrl = admin.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
      return {
        id: avatarId,
        user_id: userId,
        generation_id: generationId,
        name: suggestAvatarName(req.attributes as AttributeSelection, index),
        image_url: publicUrl,
        storage_path: storagePath,
        prompt: req.mode === 'prompt' ? req.prompt : prompt,
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
    const credit = await admin.rpc('credit_credits', {
      p_user: userId,
      p_amount: refunded,
      p_reason: 'refund',
      p_ref: generationId,
    });
    if (!credit.error) balance = Number(credit.data);
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
