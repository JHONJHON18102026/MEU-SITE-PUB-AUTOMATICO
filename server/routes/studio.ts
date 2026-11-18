/**
 * Rotas da Entrega 5 — Studio (/api/studio/*):
 *  - Brandbook com IA (0 créditos), Projetos de marca, Contas e Agenda de publicações.
 */
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { ApiError } from '../errors';
import { getAdmin } from '../supabaseAdmin';
import { generateBrandbookWithGemini } from '../veo';
import {
  createStudioAccountSchema,
  createStudioPostSchema,
  createStudioProjectSchema,
  generateBrandbookSchema,
  type StudioAccountDTO,
  type StudioBrandProjectDTO,
  type StudioScheduledPostDTO,
} from '../../shared/ugcContracts';
import type { AppEnv } from '../app';

export const studioRoutes = new Hono<AppEnv>();

function isUuid(v: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(v);
}

studioRoutes.get('/state', async (c) => {
  const userId = c.get('userId');
  const admin = getAdmin();
  let { data: projects, error } = await admin
    .from('studio_projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new ApiError('INTERNAL', error.message);

  if (!projects?.length) {
    const def = await admin
      .from('studio_projects')
      .insert({
        id: randomUUID(),
        user_id: userId,
        name: 'Minha Marca Principal',
        niche: 'Skincare & Rotina',
        product_name: 'Sérum Vitamina C',
        is_active: true,
        brandbook: {
          brandName: 'Minha Marca Principal',
          niche: 'Skincare & Rotina',
          targetAudience: 'Pessoas de 22 a 45 anos buscando praticidade diária',
          voiceTone: 'Natural, próximo e confiante',
          palette: ['#6366f1', '#ec4899', '#10b981'],
          pillars: ['Antes e depois real', 'Uso em 30 segundos', 'Depoimento honesto'],
          sampleHooks: [
            'O ajuste simples de 2 minutos na minha rotina matinal',
            'Por que todo mundo trocou o passo tradicional por esse',
            'Testei sem filtro por 14 dias seguidos',
          ],
          defaultCta: 'Confira o link oficial abaixo',
          heroVisualUrl: '/showcase/modelo-01.webp',
        },
      })
      .select()
      .single();
    if (!def.error && def.data) projects = [def.data];
  }

  const [accRes, postRes] = await Promise.all([
    admin.from('studio_accounts').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    admin.from('studio_posts').select('*').eq('user_id', userId).order('scheduled_for', { ascending: true }),
  ]);

  return c.json({
    projects: (projects ?? []) as StudioBrandProjectDTO[],
    accounts: (accRes.data ?? []) as StudioAccountDTO[],
    posts: (postRes.data ?? []) as StudioScheduledPostDTO[],
  });
});

studioRoutes.post('/brandbook', async (c) => {
  const parsed = generateBrandbookSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Informe nome da marca, nicho e produto.');
  const brandbook = await generateBrandbookWithGemini(parsed.data);
  return c.json({ brandbook });
});

studioRoutes.post('/projects', async (c) => {
  const userId = c.get('userId');
  const parsed = createStudioProjectSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Informe nome e produto do projeto Studio.');
  const admin = getAdmin();
  const { data, error } = await admin
    .from('studio_projects')
    .insert({
      id: randomUUID(),
      user_id: userId,
      name: parsed.data.name.trim(),
      niche: parsed.data.niche.trim(),
      product_name: parsed.data.productName.trim(),
      is_active: true,
      brandbook: parsed.data.brandbook ?? {},
    })
    .select()
    .single();
  if (error) throw new ApiError('INTERNAL', error.message);
  return c.json({ project: data as StudioBrandProjectDTO });
});

studioRoutes.patch('/projects/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  if (!isUuid(id)) throw new ApiError('INVALID_INPUT', 'Id de projeto inválido.');
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw new ApiError('INVALID_INPUT', 'Payload vazio.');

  const patch: Record<string, unknown> = {};
  for (const key of ['name', 'niche', 'product_name', 'is_active', 'brandbook', 'auto_routine_enabled', 'daily_target']) {
    if (key in body) patch[key] = body[key];
  }
  const admin = getAdmin();
  const { data, error } = await admin
    .from('studio_projects')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error || !data) throw new ApiError('INVALID_INPUT', 'Projeto Studio não encontrado.');
  return c.json({ project: data as StudioBrandProjectDTO });
});

studioRoutes.delete('/projects/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  if (!isUuid(id)) throw new ApiError('INVALID_INPUT', 'Id inválido.');
  const admin = getAdmin();
  const { error } = await admin.from('studio_projects').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new ApiError('INTERNAL', error.message);
  return c.json({ ok: true });
});

studioRoutes.post('/accounts', async (c) => {
  const userId = c.get('userId');
  const parsed = createStudioAccountSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Dados inválidos para conta.');
  const admin = getAdmin();
  const { data, error } = await admin
    .from('studio_accounts')
    .insert({
      id: randomUUID(),
      user_id: userId,
      project_id: parsed.data.projectId,
      handle: parsed.data.handle.trim(),
      platform: parsed.data.platform,
      stage: parsed.data.stage,
      tiktok_shop: parsed.data.tiktokShop,
      auto_warmup: parsed.data.autoWarmup,
      avatar_url: parsed.data.avatarUrl,
    })
    .select()
    .single();
  if (error) throw new ApiError('INTERNAL', error.message);
  return c.json({ account: data as StudioAccountDTO });
});

studioRoutes.patch('/accounts/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  if (!isUuid(id)) throw new ApiError('INVALID_INPUT', 'Conta inválida.');
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw new ApiError('INVALID_INPUT', 'Payload vazio.');
  const patch: Record<string, unknown> = {};
  for (const key of ['stage', 'tiktok_shop', 'auto_warmup', 'health_score', 'avatar_url']) {
    if (key in body) patch[key] = body[key];
  }
  const admin = getAdmin();
  const { data, error } = await admin
    .from('studio_accounts')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error || !data) throw new ApiError('INVALID_INPUT', 'Conta não encontrada.');
  return c.json({ account: data as StudioAccountDTO });
});

studioRoutes.delete('/accounts/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  if (!isUuid(id)) throw new ApiError('INVALID_INPUT', 'Conta inválida.');
  const admin = getAdmin();
  const { error } = await admin.from('studio_accounts').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new ApiError('INTERNAL', error.message);
  return c.json({ ok: true });
});

studioRoutes.post('/posts', async (c) => {
  const userId = c.get('userId');
  const parsed = createStudioPostSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Preencha conta, título e horário do agendamento.');
  const admin = getAdmin();
  const { data, error } = await admin
    .from('studio_posts')
    .insert({
      id: randomUUID(),
      user_id: userId,
      project_id: parsed.data.projectId,
      account_id: parsed.data.accountId,
      video_project_id: parsed.data.videoProjectId || null,
      title: parsed.data.title.trim(),
      caption_style: parsed.data.captionStyle,
      trim_footer: parsed.data.trimFooter,
      normalize_voice: parsed.data.normalizeVoice,
      scheduled_for: parsed.data.scheduledFor,
      status: 'scheduled',
      thumbnail_url: parsed.data.thumbnailUrl,
    })
    .select()
    .single();
  if (error) throw new ApiError('INTERNAL', error.message);
  return c.json({ post: data as StudioScheduledPostDTO });
});

studioRoutes.delete('/posts/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  if (!isUuid(id)) throw new ApiError('INVALID_INPUT', 'Agendamento inválido.');
  const admin = getAdmin();
  const { error } = await admin.from('studio_posts').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new ApiError('INTERNAL', error.message);
  return c.json({ ok: true });
});
