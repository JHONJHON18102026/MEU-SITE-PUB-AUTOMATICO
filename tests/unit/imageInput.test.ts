import { describe, expect, it } from 'vitest';
import { toImageInput } from '../../server/imageInput';

describe('imagem de referência', () => {
  it('aceita JPEG base64 começando com barra', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]).toString('base64');
    expect(jpeg.startsWith('/')).toBe(true);
    expect(toImageInput(jpeg)).toEqual({ mimeType: 'image/jpeg', data: jpeg });
  });
  it('identifica PNG e WebP por conteúdo', () => {
    const png = Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');
    const webp = Buffer.from('RIFF0000WEBP').toString('base64');
    expect(toImageInput(png)?.mimeType).toBe('image/png');
    expect(toImageInput(webp)?.mimeType).toBe('image/webp');
  });
  it('recusa caminho e conteúdo inválido', () => {
    expect(() => toImageInput('/showcase/modelo.webp')).toThrow();
    expect(() => toImageInput('YWJjZA==')).toThrow();
  });
});
