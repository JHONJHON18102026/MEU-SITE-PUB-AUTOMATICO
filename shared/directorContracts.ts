import { z } from 'zod';

export const directorPresetIdSchema = z.enum([
  'custom', 'ugc-product', 'avatar', 'character', 'storyboard', 'viral',
  'tiktok-shop-influencer', 'tiktok-shop-hands', 'tiktok-shop-pov',
]);
export type DirectorPresetId = z.infer<typeof directorPresetIdSchema>;

export const directorPlanRequestSchema = z.object({
  presetId: directorPresetIdSchema.optional(),
  briefing: z.string().min(12).max(1200),
  objective: z.string().min(2).max(100),
  aspectRatio: z.enum(['9:16', '16:9', '1:1']),
  durationSeconds: z.number().int().min(8).max(15),
  references: z.array(z.object({ name: z.string().min(1).max(120), dataUrl: z.string().max(8_000_000) })).max(8).default([]),
});

export const directorSceneSchema = z.object({
  index: z.number().int().min(0).max(7),
  text: z.string().min(1).max(600),
  action: z.string().min(1).max(400),
  durationSeconds: z.number().int().min(4).max(15),
});

export const directorPlanSchema = z.object({
  title: z.string().min(2).max(120),
  objective: z.string().min(2).max(160),
  creativeDirection: z.string().min(8).max(600),
  audience: z.string().min(2).max(200),
  productAnalysis: z.string().min(8).max(1000).optional(),
  hook: z.string().min(2).max(200),
  callToAction: z.string().min(2).max(200),
  coverImagePrompt: z.string().min(12).max(1600).optional(),
  cleanImagePrompt: z.string().min(12).max(1600).optional(),
  flowVideoPrompt: z.string().min(12).max(2000).optional(),
  aspectRatio: z.enum(['9:16', '16:9', '1:1']),
  totalDurationSeconds: z.number().int().min(4).max(120),
  engineId: z.enum(['veo-3.1-fast', 'omni-flash']),
  engineLabel: z.string().min(2).max(100),
  estimatedCost: z.number().int().min(0),
  referenceMode: z.enum(['frames', 'elements']).optional(),
  scenes: z.array(directorSceneSchema).min(1).max(8),
  warnings: z.array(z.string().max(240)).max(6).default([]),
});

export type DirectorPlanRequest = z.input<typeof directorPlanRequestSchema>;
export type DirectorPlan = z.output<typeof directorPlanSchema>;
