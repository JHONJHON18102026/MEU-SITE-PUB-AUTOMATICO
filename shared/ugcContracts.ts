/**
 * Contratos compartilhados da Entrega 2: AI UGC Creator (ADS, Link, Personagem Falante) e Projetos.
 * Tudo que cliente e servidor validam (custos, quebra de cenas em 8s, pedido e DTOs) fica aqui.
 */
import { z } from 'zod';
import { ASPECT_RATIOS, type AspectRatio, type EngineId } from './contracts';

export type UgcMode = 'ads' | 'link' | 'talking' | 'hook' | 'slideshow' | 'motion' | 'image-ad' | 'remake' | 'studio';
export type VideoEngineId = 'veo-3.1-fast' | 'omni-flash';
export type VoiceOptionId = 'default' | 'preset' | 'clone' | 'custom';
export type HookPosition = 'top' | 'center' | 'bottom';

export const IMAGE_ENGINE_COST: Record<EngineId, number> = {
  'nano-banana-2': 2,
  'nano-banana-pro': 3,
};

export function calculateImageBatchCost(opts: { engine?: EngineId; count: number }): number {
  const unit = IMAGE_ENGINE_COST[opts.engine ?? 'nano-banana-2'] ?? 2;
  return unit * Math.max(1, Math.min(8, Math.round(opts.count)));
}

export const VIDEO_ENGINES = [
  { id: 'veo-3.1-fast' as const, label: 'Veo 3.1 Fast', description: 'Rápido e econômico por cena', creditsPerScene: 10 },
  { id: 'omni-flash' as const, label: 'Omni Flash', description: 'Expressão e movimento aprimorados', creditsPerScene: 15 },
];

export const VOICE_OPTIONS: { id: VoiceOptionId; label: string; desc: string; extraPerScene: number }[] = [
  { id: 'default', label: 'Voz do próprio gerador (padrão)', desc: 'Sai junto com o vídeo no idioma escolhido, sem custo extra.', extraPerScene: 0 },
  { id: 'preset', label: 'Vozes prontas', desc: 'Mesma voz profissional escolhida da lista em todas as cenas.', extraPerScene: 1 },
  { id: 'clone', label: 'Minha voz', desc: 'Envie áudio de 10 a 30s (só voz) para o avatar falar igual a você.', extraPerScene: 1 },
  { id: 'custom', label: 'Criar voz nova', desc: 'Descreva timbre, ritmo e idade e ouça uma prévia antes.', extraPerScene: 1 },
];

export const MAX_SCENES_PER_VIDEO = 8;
export const MAX_SCRIPT_CHARS = 3000;
export const PROJECT_RETENTION_DAYS = 14;

export interface UgcSceneDraft {
  index: number;
  text: string;
  action?: string;
  estimatedSeconds: number;
}

/** Calcula o custo total de um vídeo UGC pela soma de motor + voz extra por cena. */
export function calculateUgcCost(opts: {
  engine: VideoEngineId;
  sceneCount: number;
  voiceType?: VoiceOptionId;
}): number {
  const scenes = Math.max(1, Math.min(MAX_SCENES_PER_VIDEO, Math.round(opts.sceneCount)));
  const eng = VIDEO_ENGINES.find((e) => e.id === opts.engine) ?? VIDEO_ENGINES[0];
  const voice = VOICE_OPTIONS.find((v) => v.id === (opts.voiceType ?? 'default')) ?? VOICE_OPTIONS[0];
  return scenes * ((eng?.creditsPerScene ?? 10) + (voice?.extraPerScene ?? 0));
}

/**
 * Quebra uma fala corrida em cenas de ~maxSec segundos (padrão 8s),
 * respeitando fins de frase (. ! ?) para não cortar palavras no meio.
 */
export function splitSpeechIntoScenes(script: string, maxSecPerScene = 8): UgcSceneDraft[] {
  const clean = script.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  // Média natural de fala em anúncios UGC PT-BR: ~2.3 palavras por segundo (~18 palavras em 8s).
  const maxWords = Math.max(8, Math.round(maxSecPerScene * 2.3));
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);

  const chunks: string[] = [];
  let bucket: string[] = [];
  let bucketWords = 0;

  const flush = () => {
    if (bucket.length) {
      chunks.push(bucket.join(' ').trim());
      bucket = [];
      bucketWords = 0;
    }
  };

  for (const s of sentences) {
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length > maxWords) {
      flush();
      for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(' '));
      }
      continue;
    }
    if (bucketWords + words.length > maxWords) flush();
    bucket.push(s);
    bucketWords += words.length;
  }
  flush();

  return chunks.slice(0, MAX_SCENES_PER_VIDEO).map((text, index) => {
    const wc = text.split(/\s+/).filter(Boolean).length;
    return {
      index,
      text,
      estimatedSeconds: Math.max(3, Math.min(10, Math.round(wc / 2.3))),
    };
  });
}

export interface ProjectSceneDTO {
  index: number;
  text: string;
  headline?: string;
  action?: string;
  status: 'processing' | 'done' | 'failed';
  duration_seconds: number;
  video_url?: string | null;
  image_url?: string | null;
  error?: string | null;
}

export interface VideoProjectDTO {
  id: string;
  user_id: string;
  mode: UgcMode;
  title: string;
  status: 'processing' | 'done' | 'failed';
  engine: VideoEngineId;
  aspect_ratio: AspectRatio;
  duration_seconds: number;
  scene_count: number;
  cost: number;
  refunded: number;
  thumbnail_url: string;
  video_url: string | null;
  is_preview?: boolean;
  scenes: ProjectSceneDTO[];
  error: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
}

// ---------------------------------------------------------------- schemas Zod
export const extractLinkSchema = z.object({
  url: z.string().url().max(600),
});

export const generateScriptSchema = z.object({
  mode: z.enum(['ads', 'link', 'talking']),
  productName: z.string().min(2).max(160),
  productDescription: z.string().max(1000).default(''),
  platform: z.string().max(40).default('TikTok'),
  tone: z.string().max(40).default('Natural UGC'),
  audience: z.string().max(200).default('Público geral'),
  language: z.string().max(40).default('pt-BR'),
  sceneCount: z.number().int().min(1).max(MAX_SCENES_PER_VIDEO).default(2),
});

export const createUgcVideoSchema = z.object({
  mode: z.enum(['ads', 'link', 'talking', 'hook', 'motion', 'remake', 'studio']),
  title: z.string().min(2).max(120),
  engine: z.enum(['veo-3.1-fast', 'omni-flash']).default('veo-3.1-fast'),
  aspectRatio: z.enum(ASPECT_RATIOS).default('9:16'),
  language: z.string().max(40).default('pt-BR'),
  templateId: z.string().max(80).optional(),
  emotion: z.string().max(40).optional(),
  voiceType: z.enum(['default', 'preset', 'clone', 'custom']).default('default'),
  voiceName: z.string().max(80).optional(),
  captions: z.boolean().default(true),
  musicMood: z.string().max(60).optional(),
  avatarUrl: z.string().max(1000).optional(),
  productName: z.string().max(160).optional(),
  productImageData: z.string().max(8_000_000).optional(),
  avatarImageData: z.string().max(8_000_000).optional(),
  brollCount: z.number().int().min(0).max(4).default(0),
  hookText: z.string().max(200).optional(),
  hookStyle: z.string().max(40).optional(),
  hookPosition: z.enum(['top', 'center', 'bottom']).optional(),
  motionPresetId: z.string().max(80).optional(),
  motionPrompt: z.string().max(500).optional(),
  resolution: z.enum(['720p', '1080p']).default('1080p'),
  keepClothing: z.boolean().default(true),
  scenes: z
    .array(
      z.object({
        text: z.string().min(1).max(600),
        action: z.string().max(400).optional(),
        durationSeconds: z.number().int().min(4).max(10).default(8),
      }),
    )
    .min(1)
    .max(MAX_SCENES_PER_VIDEO),
});

export const generateHooksSchema = z.object({
  productName: z.string().min(2).max(160),
  productDescription: z.string().max(600).default(''),
  niche: z.string().max(80).default('Geral'),
  count: z.number().int().min(1).max(8).default(5),
  language: z.string().max(40).default('pt-BR'),
});

export const generateSlidesSchema = z.object({
  productName: z.string().min(2).max(160),
  context: z.string().max(600).default(''),
  tone: z.string().max(60).default('Informativo'),
  slideCount: z.number().int().min(3).max(8).default(5),
  language: z.string().max(40).default('pt-BR'),
});

export const createSlideshowSchema = z.object({
  title: z.string().min(2).max(120),
  engine: z.enum(['nano-banana-2', 'nano-banana-pro']).default('nano-banana-2'),
  aspectRatio: z.enum(ASPECT_RATIOS).default('9:16'),
  tone: z.string().max(60).default('Informativo'),
  captionStyle: z.string().max(40).default('viral-yellow'),
  captionPosition: z.enum(['top', 'center', 'bottom']).default('center'),
  slides: z
    .array(
      z.object({
        headline: z.string().min(2).max(140),
        body: z.string().max(320).default(''),
        visualPrompt: z.string().max(400).optional(),
      }),
    )
    .min(3)
    .max(8),
});

export const createImageAdSchema = z.object({
  title: z.string().min(2).max(120),
  templateId: z.string().max(60).default('oferta-relampago'),
  productName: z.string().min(2).max(160),
  headline: z.string().min(2).max(140),
  badgeText: z.string().max(40).default(''),
  ctaText: z.string().max(50).default('Garanta o seu'),
  stylePrompt: z.string().max(500).default(''),
  engine: z.enum(['nano-banana-2', 'nano-banana-pro']).default('nano-banana-2'),
  aspectRatio: z.enum(ASPECT_RATIOS).default('1:1'),
  count: z.number().int().min(1).max(4).default(1),
  productImageData: z.string().max(8_000_000).optional(),
  avatarImageData: z.string().max(8_000_000).optional(),
  avatarUrl: z.string().max(1000).optional(),
});

export interface ViralManifestScene {
  index: number;
  role: 'Hook' | 'Demonstração' | 'Prova Social' | 'Chamada';
  visualCues: string;
  spokenTemplate: string;
  durationSeconds: number;
}

export interface ViralManifestDTO {
  sourceTitle: string;
  sourceUrl?: string;
  durationSeconds: number;
  style: string;
  niche: string;
  scenes: ViralManifestScene[];
}

export interface ViralFolderDTO {
  id: string;
  user_id: string;
  name: string;
  formats: string[];
  created_at: string;
}

export interface ViralItemDTO {
  id: string;
  user_id: string;
  folder_id: string;
  title: string;
  source_url?: string | null;
  platform: string;
  thumbnail_url: string;
  niche: string;
  viral_score: number;
  duration_sec: number;
  manifest?: ViralManifestDTO | null;
  created_at: string;
}

export const createFolderSchema = z.object({
  name: z.string().min(2).max(60),
  formats: z.array(z.string().max(40)).max(6).default(['Remake Viral']),
});

export const updateFolderSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  formats: z.array(z.string().max(40)).max(6).optional(),
});

export const importViralSchema = z.object({
  folderId: z.string().min(1).max(80),
  title: z.string().max(160).optional(),
  url: z.string().max(600).optional(),
  platform: z.string().max(40).default('TikTok'),
  niche: z.string().max(60).default('Geral'),
  durationSec: z.number().int().min(3).max(180).default(15),
  thumbnailUrl: z.string().max(400).optional(),
});

export const generateManifestSchema = z.object({
  itemId: z.string().max(80).optional(),
  sourceTitle: z.string().min(2).max(160),
  sourceUrl: z.string().max(600).optional(),
  niche: z.string().max(80).default('Geral'),
  durationSec: z.number().int().min(5).max(90).default(15),
  targetProduct: z.string().max(160).optional(),
  language: z.string().max(40).default('pt-BR'),
});

export type CreateUgcVideoRequest = z.input<typeof createUgcVideoSchema>;
export type GenerateHooksRequest = z.input<typeof generateHooksSchema>;
export type GenerateSlidesRequest = z.input<typeof generateSlidesSchema>;
export type CreateSlideshowRequest = z.input<typeof createSlideshowSchema>;
export type CreateImageAdRequest = z.input<typeof createImageAdSchema>;
export interface StudioBrandbookDTO {
  projectMetadata?: { client: string; description: string };
  brandName: string;
  niche: string;
  targetAudience: string;
  voiceTone: string;
  palette: [string, string, string];
  pillars: string[];
  sampleHooks: string[];
  defaultCta: string;
  heroVisualUrl: string;
}

export interface StudioBrandProjectDTO {
  id: string;
  user_id: string;
  name: string;
  niche: string;
  product_name: string;
  is_active: boolean;
  brandbook: StudioBrandbookDTO;
  auto_routine_enabled: boolean;
  daily_target: number;
  created_at: string;
}

export interface StudioAccountDTO {
  id: string;
  user_id: string;
  project_id: string;
  handle: string;
  platform: 'TikTok' | 'Instagram Reels' | 'YouTube Shorts';
  stage: string;
  health_score: number;
  tiktok_shop: boolean;
  auto_warmup: boolean;
  avatar_url: string;
  published_28d: number;
  created_at: string;
}

export interface StudioScheduledPostDTO {
  id: string;
  user_id: string;
  project_id: string;
  account_id: string;
  video_project_id?: string | null;
  title: string;
  caption_style: string;
  trim_footer: boolean;
  normalize_voice: boolean;
  scheduled_for: string;
  status: 'scheduled' | 'ready' | 'published';
  thumbnail_url: string;
  created_at: string;
}

export const generateBrandbookSchema = z.object({
  brandName: z.string().min(2).max(80),
  niche: z.string().min(2).max(80),
  productName: z.string().min(2).max(160),
  targetAudience: z.string().max(240).default('Público brasileiro interessado em resultados práticos'),
  voiceTone: z.string().max(80).default('Direto, próximo e confiante'),
});

export const createStudioProjectSchema = z.object({
  name: z.string().min(2).max(80),
  niche: z.string().min(2).max(80).default('Skincare'),
  productName: z.string().max(160).default(''),
  brandbook: z.any().optional(),
});

export const createStudioAccountSchema = z.object({
  projectId: z.string().min(1).max(80),
  handle: z.string().min(2).max(60),
  platform: z.enum(['TikTok', 'Instagram Reels', 'YouTube Shorts']).default('TikTok'),
  stage: z.string().max(60).default('Criada'),
  tiktokShop: z.boolean().default(false),
  autoWarmup: z.boolean().default(true),
  avatarUrl: z.string().max(500).default('/showcase/modelo-01.webp'),
});

export const createStudioPostSchema = z.object({
  projectId: z.string().min(1).max(80),
  accountId: z.string().min(1).max(80),
  videoProjectId: z.string().max(80).optional(),
  title: z.string().min(2).max(140),
  captionStyle: z.string().max(40).default('karaoke'),
  trimFooter: z.boolean().default(false),
  normalizeVoice: z.boolean().default(true),
  scheduledFor: z.string().min(4).max(60),
  thumbnailUrl: z.string().max(500).default('/showcase/modelo-01.webp'),
});

export type GenerateManifestRequest = z.input<typeof generateManifestSchema>;
export type GenerateBrandbookRequest = z.input<typeof generateBrandbookSchema>;
