import { ApiError } from './errors';
import type { ImageInput } from '../shared/contracts';

/** Decodifica somente imagens reais; JPEG em base64 pode começar com /9j/. */
export function toImageInput(raw?: string): ImageInput | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  const data = match ? match[2]! : value;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length % 4 !== 0) {
    throw new ApiError('INVALID_INPUT', 'Imagem de referência inválida. Envie um arquivo JPG, PNG ou WebP.');
  }
  const bytes = Buffer.from(data, 'base64');
  const mimeType = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? 'image/jpeg'
    : bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
    : bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp'
    : null;
  if (!mimeType || (match && match[1] !== mimeType)) throw new ApiError('INVALID_INPUT', 'Imagem de referência inválida. Envie um arquivo JPG, PNG ou WebP.');
  return { mimeType, data };
}
