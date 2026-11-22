import { describe, expect, it } from 'vitest';
import { createUgcVideoSchema } from '../../shared/ugcContracts';

const image = '/9j/4AAQSkZJRgABAQAAAQABAAD';
const base = {
  mode: 'ads' as const,
  title: 'Teste de referências',
  engine: 'veo-3.1-fast' as const,
  scenes: [{ text: 'Cena de teste', durationSeconds: 8 }],
};

describe('modos de referência de vídeo', () => {
  it('aceita frame inicial e frame final juntos', () => {
    const parsed = createUgcVideoSchema.safeParse({
      ...base,
      referenceMode: 'frames',
      startFrameImageData: image,
      endFrameImageData: image,
    });
    expect(parsed.success).toBe(true);
  });

  it('aceita até seis imagens no modo Elementos para Omni Flash', () => {
    const parsed = createUgcVideoSchema.safeParse({
      ...base,
      engine: 'omni-flash',
      referenceMode: 'elements',
      referenceImages: [image, image, image, image, image, image],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejeita Elementos vazio e mais de seis referências', () => {
    expect(createUgcVideoSchema.safeParse({ ...base, referenceMode: 'elements', referenceImages: [] }).success).toBe(false);
    expect(createUgcVideoSchema.safeParse({ ...base, engine: 'omni-flash', referenceMode: 'elements', referenceImages: [image, image, image, image, image, image, image] }).success).toBe(false);
  });

  it('aceita abertura com Elementos, mas rejeita frame final', () => {
    const parsed = createUgcVideoSchema.safeParse({
      ...base,
      referenceMode: 'elements',
      startFrameImageData: image,
      referenceImages: [image],
    });
    expect(parsed.success).toBe(true);
    expect(createUgcVideoSchema.safeParse({
      ...base,
      referenceMode: 'elements',
      startFrameImageData: image,
      endFrameImageData: image,
      referenceImages: [image],
    }).success).toBe(false);
  });
});
