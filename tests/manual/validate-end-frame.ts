import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { joinBidirectionalReferenceClips } from '../../server/veo';

const execFileAsync = promisify(execFile);
const root = 'C:/Users/Jonathan/Desktop/FUTURO-DIGITAL-COMPLETO/test-artifacts/reference-modes';
const input = await readFile(`${root}/elements-r2v.mp4`);
const output = await joinBidirectionalReferenceClips(input, input, '9:16');
const outputPath = `${root}/end-frame-fallback-check.mp4`;
await writeFile(outputPath, output);
const timestamps = ['7.00', '7.50', '7.70', '7.85', '7.96'];
const frames: string[] = [];
for (const timestamp of timestamps) {
  const frame = `${root}/end-frame-fallback-check-${timestamp}.png`;
  await execFileAsync('ffmpeg', ['-y', '-ss', timestamp, '-i', outputPath, '-frames:v', '1', frame]);
  frames.push(frame);
}
const differences: number[] = [];
for (let index = 1; index < frames.length; index++) {
  const previous = await sharp(frames[index - 1]).removeAlpha().raw().toBuffer();
  const current = await sharp(frames[index]).removeAlpha().raw().toBuffer();
  let sum = 0;
  for (let byte = 0; byte < current.length; byte++) sum += Math.abs(current[byte]! - previous[byte]!);
  differences.push(Number((sum / current.length).toFixed(3)));
}
const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', outputPath]);
console.log(JSON.stringify({ outputPath, duration: Number(stdout.trim()), bytes: output.length, frameDifferences: differences }));
