/**
 * Tudo que o front-end e o servidor precisam concordar fica aqui:
 * preços, opções de geração e o formato do pedido de geração.
 */
import { z } from 'zod';

export const BRAND = {
  name: 'FUTURO DIGITAL',
  product: 'FUTURO DIGITAL Studio',
  shortName: 'FD Studio',
} as const;

/** Preço em créditos. Mude aqui e front + servidor passam a usar o novo valor. */
export const PRICING = {
  avatarImage: 2, // por imagem
  promptEnhance: 0,
} as const;

export const ENGINES = [
  { id: 'nano-banana-2', label: 'Nano Banana 2', description: 'Rápido e realista', tier: 'standard' },
  { id: 'nano-banana-pro', label: 'Nano Banana Pro', description: 'Máxima fidelidade', tier: 'pro' },
] as const;
export type EngineId = (typeof ENGINES)[number]['id'];

export const FRAMINGS = [
  { id: 'rosto', label: 'Rosto', prompt: 'close-up portrait framing from the shoulders up' },
  { id: 'meio-corpo', label: 'Meio corpo', prompt: 'medium shot framing from the waist up' },
  { id: 'corpo-inteiro', label: 'Corpo inteiro', prompt: 'full body shot, head to toe visible' },
] as const;
export type FramingId = (typeof FRAMINGS)[number]['id'];

// Proporções aceitas pelos modelos de imagem da Gemini (ImageConfig.aspectRatio).
export const ASPECT_RATIOS = ['9:16', '3:4', '1:1', '4:3', '16:9'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const MAX_REFERENCE_IMAGES = 3;
export const MAX_IMAGES_PER_REQUEST = 4;
/** ~6 MB por imagem em base64. */
export const MAX_IMAGE_BASE64_CHARS = 8_000_000;

const imageInput = z.object({
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  data: z.string().min(16).max(MAX_IMAGE_BASE64_CHARS),
  name: z.string().max(160).optional(),
});
export type ImageInput = z.infer<typeof imageInput>;

export const generateAvatarSchema = z.object({
  /** attributes = painel de características; prompt = caixa de texto central. */
  mode: z.enum(['attributes', 'prompt']),
  attributes: z.record(z.string(), z.array(z.string()).max(30)).default({}),
  extraDetails: z.string().max(1800).default(''),
  characterWorld: z.string().max(1200).default(''),
  prompt: z.string().max(2000).default(''),
  /** Foto do usuário (painel esquerdo) ou avatar escolhido como base. */
  basePhoto: imageInput.nullable().default(null),
  /** URL de um avatar já gerado, usado como rosto base. */
  baseAvatarId: z.string().uuid().nullable().default(null),
  productImage: imageInput.nullable().default(null),
  referenceImages: z.array(imageInput).max(MAX_REFERENCE_IMAGES).default([]),
  engine: z.enum(['nano-banana-2', 'nano-banana-pro']).default('nano-banana-2'),
  framing: z.enum(['rosto', 'meio-corpo', 'corpo-inteiro']).default('meio-corpo'),
  aspectRatio: z.enum(ASPECT_RATIOS).default('9:16'),
  count: z.number().int().min(1).max(MAX_IMAGES_PER_REQUEST).default(1),
  makePublic: z.boolean().default(false),
});
export type GenerateAvatarRequest = z.input<typeof generateAvatarSchema>;
export type GenerateAvatarParsed = z.output<typeof generateAvatarSchema>;

export const enhancePromptSchema = z.object({
  prompt: z.string().min(3).max(2000),
});

export const enhanceCharacterPromptSchema = z.object({
  description: z.string().min(3).max(1800),
  attributes: z.record(z.string(), z.array(z.string()).max(30)).default({}),
  characterWorld: z.string().max(1200).default(''),
  hasBasePhoto: z.boolean().default(false),
});
export type EnhanceCharacterPromptRequest = z.input<typeof enhanceCharacterPromptSchema>;

export function avatarCost(count: number): number {
  return PRICING.avatarImage * Math.max(1, Math.min(MAX_IMAGES_PER_REQUEST, Math.floor(count)));
}

/** Formatos devolvidos pela API. */
export interface AvatarDTO {
  id: string;
  generation_id?: string | null;
  name: string;
  image_url: string;
  prompt: string;
  attributes: Record<string, string[]>;
  engine: string;
  framing: string;
  aspect_ratio: string;
  is_public: boolean;
  is_favorite: boolean;
  created_at: string;
  user_id: string;
}

export interface GenerationDTO {
  id: string;
  kind: string;
  status: 'processing' | 'done' | 'failed';
  cost: number;
  params: Record<string, unknown>;
  result_count: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface GenerateAvatarResponse {
  generation: GenerationDTO;
  avatars: AvatarDTO[];
  balance: number;
  /** Quando parte das imagens falha, as que deram certo voltam e o resto é estornado. */
  refunded: number;
}

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_INPUT'
  | 'INSUFFICIENT_CREDITS'
  | 'NOT_CONFIGURED'
  | 'GENERATION_FAILED'
  | 'SAFETY_BLOCKED'
  | 'RATE_LIMITED'
  | 'INTERNAL';
