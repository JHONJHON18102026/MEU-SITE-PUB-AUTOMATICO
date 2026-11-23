import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { applyVideoWatermark } from '../../server/watermark';

const execFileAsync = promisify(execFile);
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'fd-watermark-check-'));

try {
  const inputPath = path.join(tmp, 'source.mp4');
  const outputPath = path.join(tmp, 'branded.mp4');
  const sourceFrame = path.join(tmp, 'source.jpg');
  const brandedFrame = path.join(tmp, 'branded.jpg');

  await execFileAsync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'color=c=0x334455:s=360x640:d=1:r=24',
    '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', inputPath,
  ]);
  const branded = await applyVideoWatermark(await fs.readFile(inputPath));
  await fs.writeFile(outputPath, branded);

  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error', '-show_entries', 'stream=width,height:format=duration',
    '-of', 'json', outputPath,
  ]);
  const metadata = JSON.parse(stdout) as {
    streams?: Array<{ width?: number; height?: number }>;
    format?: { duration?: string };
  };
  assert.equal(metadata.streams?.[0]?.width, 360);
  assert.equal(metadata.streams?.[0]?.height, 640);
  assert.ok(Number(metadata.format?.duration) > 0.9);

  await Promise.all([
    execFileAsync('ffmpeg', ['-y', '-i', inputPath, '-frames:v', '1', sourceFrame]),
    execFileAsync('ffmpeg', ['-y', '-i', outputPath, '-frames:v', '1', brandedFrame]),
  ]);
  const [before, after] = await Promise.all([
    sharp(sourceFrame).raw().toBuffer({ resolveWithObject: true }),
    sharp(brandedFrame).raw().toBuffer({ resolveWithObject: true }),
  ]);
  let changedPixels = 0;
  for (let y = 0; y < 150; y++) {
    for (let x = 0; x < 150; x++) {
      const offset = (y * 360 + x) * before.info.channels;
      const difference = Math.abs(before.data[offset]! - after.data[offset]!)
        + Math.abs(before.data[offset + 1]! - after.data[offset + 1]!)
        + Math.abs(before.data[offset + 2]! - after.data[offset + 2]!);
      if (difference > 36) changedPixels++;
    }
  }
  assert.ok(changedPixels > 50, 'A logo deve alterar pixels na região superior esquerda.');
  console.log(`OK: MP4 ${metadata.streams?.[0]?.width}x${metadata.streams?.[0]?.height}, ${Number(metadata.format?.duration).toFixed(2)}s, marca visível (${changedPixels} pixels alterados).`);
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}
