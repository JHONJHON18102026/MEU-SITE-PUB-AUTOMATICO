/**
 * Rotas da Entrega 4 — Biblioteca VIRAL e Gerador de Manifest (/api/viral/*).
 * Guardar pastas/vídeos e gerar Manifest (estrutura quadro a quadro) é GRATUITO (0 créditos).
 */
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { ApiError } from '../errors';
import { getAdmin } from '../supabaseAdmin';
import { assertSafePublicHttpUrl, generateManifestWithGemini } from '../veo';
import {
  createFolderSchema,
  generateManifestSchema,
  importViralSchema,
  updateFolderSchema,
  type ViralFolderDTO,
  type ViralItemDTO,
} from '../../shared/ugcContracts';
import type { AppEnv } from '../app';

export const viralRoutes = new Hono<AppEnv>();

function detectPlatform(url?: string): string {
  if (!url) return 'Upload';
  if (/tiktok/i.test(url)) return 'TikTok';
  if (/instagram|ig\.me/i.test(url)) return 'Instagram Reels';
  if (/youtube|youtu\.be/i.test(url)) return 'YouTube Shorts';
  return 'Web';
}

viralRoutes.get('/folders', async (c) => {
  const userId = c.get('userId');
  const admin = getAdmin();
  let { data: folders, error } = await admin
    .from('viral_folders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new ApiError('INTERNAL', error.message);

  if (!folders?.length) {
    const def = await admin
      .from('viral_folders')
      .insert({ id: randomUUID(), user_id: userId, name: 'Aleatórios', formats: ['ADS', 'Hook+Demo', 'Remake Viral'] })
      .select()
      .single();
    if (!def.error && def.data) folders = [def.data];
  }

  const itemsRes = await admin
    .from('viral_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(120);
  if (itemsRes.error) throw new ApiError('INTERNAL', itemsRes.error.message);

  return c.json({
    folders: (folders ?? []) as ViralFolderDTO[],
    items: (itemsRes.data ?? []) as ViralItemDTO[],
  });
});

viralRoutes.post('/folders', async (c) => {
  const userId = c.get('userId');
  const parsed = createFolderSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Informe um nome válido para a pasta (mín. 2 letras).');
  const admin = getAdmin();
  const { data, error } = await admin
    .from('viral_folders')
    .insert({ id: randomUUID(), user_id: userId, name: parsed.data.name.trim(), formats: parsed.data.formats })
    .select()
    .single();
  if (error) throw new ApiError('INTERNAL', error.message);
  return c.json({ folder: data as ViralFolderDTO });
});

viralRoutes.patch('/folders/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError('INVALID_INPUT', 'Pasta inválida.');
  const parsed = updateFolderSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Dados da pasta inválidos.');
  const admin = getAdmin();
  const patch: Record<string, unknown> = {};
  if (parsed.data.name) patch.name = parsed.data.name.trim();
  if (parsed.data.formats) patch.formats = parsed.data.formats;
  const { data, error } = await admin
    .from('viral_folders')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error || !data) throw new ApiError('INVALID_INPUT', 'Pasta não encontrada.');
  return c.json({ folder: data as ViralFolderDTO });
});

viralRoutes.delete('/folders/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError('INVALID_INPUT', 'Pasta inválida.');
  const admin = getAdmin();
  const { error } = await admin.from('viral_folders').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new ApiError('INTERNAL', error.message);
  return c.json({ ok: true });
});

viralRoutes.post('/items', async (c) => {
  const userId = c.get('userId');
  const parsed = importViralSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Dados da referência inválidos.');
  const req = parsed.data;
  if (req.url?.trim()) assertSafePublicHttpUrl(req.url.trim());

  const admin = getAdmin();
  const { data, error } = await admin
    .from('viral_items')
    .insert({
      id: randomUUID(),
      user_id: userId,
      folder_id: req.folderId,
      title: (req.title?.trim() || req.url?.trim() || 'Referência Viral').slice(0, 150),
      source_url: req.url?.trim() || null,
      platform: req.platform || detectPlatform(req.url),
      thumbnail_url: req.thumbnailUrl || '/showcase/modelo-01.webp',
      niche: req.niche,
      viral_score: 90,
      duration_sec: req.durationSec,
    })
    .select()
    .single();
  if (error) throw new ApiError('INTERNAL', error.message);
  return c.json({ item: data as ViralItemDTO });
});

viralRoutes.delete('/items/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError('INVALID_INPUT', 'Item inválido.');
  const admin = getAdmin();
  const { error } = await admin.from('viral_items').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new ApiError('INTERNAL', error.message);
  return c.json({ ok: true });
});

viralRoutes.post('/manifest', async (c) => {
  const userId = c.get('userId');
  const parsed = generateManifestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Informe o título ou link do vídeo de referência.');
  const req = parsed.data;
  if (req.sourceUrl?.trim()) assertSafePublicHttpUrl(req.sourceUrl.trim());

  const manifest = await generateManifestWithGemini({
    sourceTitle: req.sourceTitle,
    sourceUrl: req.sourceUrl,
    niche: req.niche,
    durationSec: req.durationSec,
    targetProduct: req.targetProduct,
    language: req.language,
  });

  if (req.itemId && /^[0-9a-f-]{36}$/i.test(req.itemId)) {
    const admin = getAdmin();
    await admin.from('viral_items').update({ manifest }).eq('id', req.itemId).eq('user_id', userId);
  }
  return c.json({ manifest });
});
