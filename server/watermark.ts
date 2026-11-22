/**
 * Marca d'água FUTURO DIGITAL.
 *
 * Aplica a logo no canto superior esquerdo de cada imagem gerada, do mesmo
 * jeito que no vídeo da Kitana: largura de ~22% da imagem, margem de ~3%.
 * Usa a biblioteca "sharp" (processamento de imagem em C, muito rápido).
 */
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const here = path.dirname(fileURLToPath(import.meta.url));
const WATERMARK_PATH = path.join(here, 'assets', 'marca-dagua.png');

export const WATERMARK_LAYOUT = {
  widthRatio: 0.22,
  marginRatio: 0.03,
  opacity: 0.92,
} as const;

/** A marca é exclusiva da conta proprietária; assinantes nunca recebem overlay. */
export function isOwnerUser(userId: string): boolean {
  const ownerId = process.env.OWNER_USER_ID?.trim();
  return Boolean(ownerId && ownerId === userId);
}

let watermarkCache: Buffer | null = null;
async function loadWatermark(): Promise<Buffer> {
  if (!watermarkCache) watermarkCache = await sharp(WATERMARK_PATH).ensureAlpha().png().toBuffer();
  return watermarkCache;
}

/** Recebe a imagem crua da IA e devolve PNG com a marca d'água aplicada. */
export async function applyWatermark(image: Buffer): Promise<Buffer> {
  const base = sharp(image);
  const meta = await base.metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  const markWidth = Math.max(96, Math.round(Math.min(width, height) * WATERMARK_LAYOUT.widthRatio * (width < height ? 1.25 : 1)));
  const margin = Math.round(Math.min(width, height) * WATERMARK_LAYOUT.marginRatio);

  // Redimensiona a logo e reduz levemente a opacidade: o modo 'dest-in'
  // multiplica o canal alfa da logo pelo alfa do pixel (0.92).
  const mark = await sharp(await loadWatermark())
    .resize({ width: markWidth })
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(255 * WATERMARK_LAYOUT.opacity)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  return base
    .composite([{ input: mark, top: margin, left: margin }])
    .png({ compressionLevel: 8 })
    .toBuffer();
}

/** Aplica a marca ao vídeo somente quando o chamador já confirmou que é o Dono. */
export async function applyVideoWatermark(video: Buffer): Promise<Buffer> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'futuro-watermark-'));
  const input = path.join(dir, 'input.mp4');
  const logo = path.join(dir, 'logo.png');
  const output = path.join(dir, 'output.mp4');
  try {
    await fs.writeFile(input, video);
    await fs.copyFile(WATERMARK_PATH, logo);
    await execFileAsync('ffmpeg', [
      '-y', '-i', input, '-i', logo,
      '-filter_complex', '[1:v]scale=iw*0.22:-1[wm];[0:v][wm]overlay=W*0.03:H*0.03:format=auto',
      '-map', '0:v:0', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
      '-c:a', 'aac', '-movflags', '+faststart', output,
    ], { windowsHide: true });
    return await fs.readFile(output);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
