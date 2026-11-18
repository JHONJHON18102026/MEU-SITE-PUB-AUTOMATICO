/**
 * Prepara imagens do usuário antes de enviar para a IA.
 *
 * Fotos de celular têm 4–12 MB. Mandar isso cru deixa tudo lento e pode
 * estourar limites. Aqui a gente redimensiona no próprio navegador
 * (lado maior = 1536 px) e converte para JPEG 90%: fica ~300 KB e a IA
 * enxerga exatamente o mesmo rosto/produto.
 */
import type { ImageInput } from '@shared/contracts';

export const MAX_SIDE = 1536;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

export interface PreparedImage extends ImageInput {
  previewUrl: string;
  name: string;
}

async function bitmapToPrepared(blob: Blob, name: string): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  return {
    mimeType: 'image/jpeg',
    data: dataUrl.slice(dataUrl.indexOf(',') + 1),
    previewUrl: dataUrl,
    name,
  };
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error('Formato não suportado. Use PNG, JPG ou WEBP.');
  }
  return bitmapToPrepared(file, file.name);
}

/** Converte um modelo pronto (/showcase/...) para envio à IA como foto base. */
export async function prepareImageFromUrl(url: string, name = 'modelo.jpg'): Promise<PreparedImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Não consegui carregar essa imagem.');
  return bitmapToPrepared(await res.blob(), name);
}

/** Baixa uma imagem remota com o nome certo (botão "Baixar"). */
export async function downloadImage(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}
