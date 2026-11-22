import { Hono } from 'hono';
import { ApiError } from '../errors';
import { createDirectorPlan } from '../gemini';
import { isUnlimitedUser } from '../credits';
import { directorPlanRequestSchema } from '../../shared/directorContracts';
import type { AppEnv } from '../app';

export const directorRoutes = new Hono<AppEnv>();

directorRoutes.post('/plan', async (c) => {
  const parsed = directorPlanRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Revise o briefing.');
  const unlimited = await isUnlimitedUser(c.get('userId'));
  const plan = await createDirectorPlan(parsed.data, { unlimited });
  return c.json({ plan });
});
