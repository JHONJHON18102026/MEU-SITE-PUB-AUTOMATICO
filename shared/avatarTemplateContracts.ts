import { z } from 'zod';

export const AVATAR_TEMPLATE_SKILLS = ['identity', 'product', 'ugc', 'cinematic', 'hook'] as const;
export const avatarTemplateModeSchema = z.enum(['image', 'video']);
export const avatarTemplateInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  mode: avatarTemplateModeSchema,
  prompt: z.string().trim().min(1).max(1200),
  skillIds: z.array(z.enum(AVATAR_TEMPLATE_SKILLS)).max(AVATAR_TEMPLATE_SKILLS.length),
});

export type AvatarTemplateMode = z.infer<typeof avatarTemplateModeSchema>;
export type AvatarTemplateSkillId = (typeof AVATAR_TEMPLATE_SKILLS)[number];
export type AvatarTemplateInput = z.infer<typeof avatarTemplateInputSchema>;
export interface AvatarTemplateDTO extends AvatarTemplateInput {
  id: string;
  created_at: string;
  updated_at: string;
}
