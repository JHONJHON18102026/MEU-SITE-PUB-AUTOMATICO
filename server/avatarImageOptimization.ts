import sharp from 'sharp';

/** Full-resolution delivery image plus a small WebP for gallery cards. */
export async function optimizeAvatarImage(input: Buffer) {
  const image = sharp(input, { limitInputPixels: 100_000_000 }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error('Imagem gerada sem dimensões válidas.');

  const full = input;
  const thumbnail = await image.clone()
    .resize({ width: 480, height: 640, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 76, effort: 4, smartSubsample: true })
    .toBuffer();

  return { full, thumbnail };
}

export function avatarThumbnailPath(storagePath: string) {
  const extensionIndex = storagePath.lastIndexOf('.');
  return extensionIndex > storagePath.lastIndexOf('/')
    ? `${storagePath.slice(0, extensionIndex)}.thumb.webp`
    : `${storagePath}.thumb.webp`;
}
