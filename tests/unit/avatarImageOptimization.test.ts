import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { avatarThumbnailPath, optimizeAvatarImage } from '../../server/avatarImageOptimization';

describe('otimização de imagem de avatar', () => {
  it('preserva a imagem original e cria uma miniatura WebP pequena', async () => {
    const source = await sharp({
      create: { width: 1200, height: 1600, channels: 3, background: '#6542a8' },
    }).png().toBuffer();

    const result = await optimizeAvatarImage(source);
    const fullMetadata = await sharp(result.full).metadata();
    const thumbnailMetadata = await sharp(result.thumbnail).metadata();

    expect(fullMetadata.format).toBe('png');
    expect(fullMetadata.width).toBe(1200);
    expect(fullMetadata.height).toBe(1600);
    expect(thumbnailMetadata.format).toBe('webp');
    expect(thumbnailMetadata.width).toBeLessThanOrEqual(480);
    expect(thumbnailMetadata.height).toBeLessThanOrEqual(640);
    expect(result.thumbnail.byteLength).toBeLessThan(result.full.byteLength);
  });

  it('deriva o caminho da miniatura sem extensão ambígua', () => {
    expect(avatarThumbnailPath('owner/avatar.png')).toBe('owner/avatar.thumb.webp');
    expect(avatarThumbnailPath('owner/avatar.webp')).toBe('owner/avatar.thumb.webp');
  });
});
