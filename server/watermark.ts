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
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { getAdmin } from './supabaseAdmin';

const execFileAsync = promisify(execFile);

const here = path.dirname(fileURLToPath(import.meta.url));
const WATERMARK_PATH = path.join(here, 'assets', 'marca-dagua.png');

export const WATERMARK_LAYOUT = {
  widthRatio: 0.22,
  marginRatio: 0.03,
  opacity: 0.92,
} as const;

/** O plano interno `unlimited` é o indicador da conta DONO no banco atual. */
export async function isOwnerUser(userId: string): Promise<boolean> {
  const { data, error } = await getAdmin().from('profiles').select('plan').eq('id', userId).maybeSingle();
  if (error) throw new Error(`Falha ao identificar a conta proprietária: ${error.message}`);
  return data?.plan === 'unlimited';
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

/** Aplica a mesma logo em um MP4 antes de salvá-lo no storage. */
export async function applyVideoWatermark(video: Buffer): Promise<Buffer> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'fd-video-watermark-'));
  try {
    const inputPath = path.join(tmp, 'input.mp4');
    const outputPath = path.join(tmp, 'output.mp4');
    const markPath = path.join(tmp, 'watermark.png');
    await fs.writeFile(inputPath, video);

    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
      '-of', 'csv=s=x:p=0', inputPath,
    ]);
    const dimensions = stdout.trim().match(/^(\d+)x(\d+)$/);
    const width = Number(dimensions?.[1]);
    const height = Number(dimensions?.[2]);
    if (!dimensions || !Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) {
      throw new Error('Não foi possível identificar as dimensões do vídeo.');
    }

    const minDimension = Math.min(width, height);
    const markWidth = Math.max(96, Math.round(minDimension * WATERMARK_LAYOUT.widthRatio * (width < height ? 1.25 : 1)));
    const margin = Math.round(minDimension * WATERMARK_LAYOUT.marginRatio);
    const mark = await sharp(await loadWatermark())
      .resize({ width: markWidth })
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round(255 * WATERMARK_LAYOUT.opacity)]),
        raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in',
      }])
      .png()
      .toBuffer();
    await fs.writeFile(markPath, mark);

    await execFileAsync('ffmpeg', [
      '-y', '-i', inputPath, '-i', markPath,
      '-filter_complex', `[1:v]format=rgba[logo];[0:v][logo]overlay=${margin}:${margin}:format=auto,format=yuv420p[v]`,
      '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
      '-c:a', 'aac', '-movflags', '+faststart', outputPath,
    ]);
    return await fs.readFile(outputPath);
  } catch (error) {
    throw new Error(`Falha ao aplicar a marca d’água no vídeo: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}
