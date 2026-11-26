/**
 * App Hono: junta as rotas, confere o login e padroniza os erros.
 * Fica separado do index.ts para poder rodar igual na Vercel depois.
 */
import { Hono, type Context, type Next } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { ApiError } from './errors';
import { getUserIdFromToken } from './supabaseAdmin';
import { missingKeys } from './env';
import { enhanceCharacterPrompt, enhanceCharacterWorld, enhancePrompt, resolveModels } from './gemini';
import { rustEnabled } from './rustMotor';
import { checkRustMotor } from './rustMotorSupervisor';
import { avatarRoutes } from './routes/avatars';
import { aiUgcRoutes } from './routes/aiUgc';
import { projectRoutes } from './routes/projects';
import { studioRoutes } from './routes/studio';
import { viralRoutes } from './routes/viral';
import { directorRoutes } from './routes/director';
import { enhanceCharacterPromptSchema, enhanceCharacterWorldSchema, enhancePromptSchema, type ApiErrorBody } from '../shared/contracts';
import { describeAttributes, describeSelectedAttributesPt } from '../shared/avatarPrompt';
import type { AttributeSelection } from '../shared/attributes';

export type AppEnv = { Variables: { userId: string } };

export const app = new Hono<AppEnv>().basePath('/api');

// Até 4 imagens de referência em base64 cabem com folga em 40 MB.
app.use('*', bodyLimit({ maxSize: 40 * 1024 * 1024 }));

app.onError((err, c) => {
  const apiErr = err instanceof ApiError ? err : new ApiError('INTERNAL', 'Erro inesperado no servidor.');
  if (!(err instanceof ApiError)) console.error('[api] erro inesperado:', err);
  const body: ApiErrorBody = { error: { code: apiErr.code, message: apiErr.message } };
  return c.json(body, apiErr.status as 400);
});

// Público: diz o que falta configurar (sem revelar nenhum valor de chave).
app.get('/health', async (c) => {
  const missing = missingKeys();
  let models: { image: string; imagePro: string; text: string } | null = null;
  let modelError: string | null = null;
  const rust = rustEnabled();
  const rustStatus = rust ? await checkRustMotor() : null;
  if (!rust && !missing.includes('GEMINI_API_KEY')) {
    try {
      const m = await resolveModels();
      models = { image: m.image, imagePro: m.imagePro, text: m.text };
    } catch (err) {
      modelError = err instanceof Error ? err.message : String(err);
    }
  }
  return c.json({
    ok: rust ? Boolean(rustStatus?.available) : (missing.length === 0 && !modelError),
    engine: rust ? 'rust' : 'gemini',
    motorConnected: rust ? Boolean(rustStatus?.available) : null,
    motorError: rustStatus?.error ?? null,
    availableModels: rustStatus?.models ?? null,
    missing: rust ? missing.filter((key) => !key.includes('GEMINI_API_KEY')) : missing,
    models,
    modelError: rust ? null : modelError,
  });
});

// Daqui para baixo, só usuário logado.
const requireAuth = async (c: Context<AppEnv>, next: Next) => {
  c.set('userId', await getUserIdFromToken(c.req.header('Authorization')));
  await next();
};

app.use('/avatars/*', requireAuth);
app.use('/prompt/*', requireAuth);
app.use('/ai-ugc/*', requireAuth);
app.use('/projects/*', requireAuth);
app.use('/viral/*', requireAuth);
app.use('/studio/*', requireAuth);
app.use('/director/*', requireAuth);

app.route('/avatars', avatarRoutes);
app.route('/ai-ugc', aiUgcRoutes);
app.route('/projects', projectRoutes);
app.route('/viral', viralRoutes);
app.route('/studio', studioRoutes);
app.route('/director', directorRoutes);

app.post('/prompt/enhance', async (c) => {
  const parsed = enhancePromptSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Escreva a ideia primeiro (mínimo 3 letras).');
  const prompt = await enhancePrompt(parsed.data.prompt);
  return c.json({ prompt });
});

app.post('/prompt/enhance-character', async (c) => {
  const parsed = enhanceCharacterPromptSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Descreva o personagem primeiro (mínimo 3 letras).');
  const prompt = await enhanceCharacterPrompt({
    description: parsed.data.description,
    attributes: describeSelectedAttributesPt(parsed.data.attributes as AttributeSelection),
    characterWorld: parsed.data.characterWorld,
    hasBasePhoto: parsed.data.hasBasePhoto,
  });
  return c.json({ prompt });
});

app.post('/prompt/enhance-character-world', async (c) => {
  const parsed = enhanceCharacterWorldSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Descreva o personagem ou selecione características para montar o mundo.');
  const world = await enhanceCharacterWorld({
    description: parsed.data.description,
    attributes: describeAttributes(parsed.data.attributes as AttributeSelection),
    currentWorld: parsed.data.currentWorld,
    hasBasePhoto: parsed.data.hasBasePhoto,
  });
  return c.json({ world });
});
