import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { applyWatermark } from '../../server/watermark';
import { directorDialogueWordLimit, fitDirectorDialogue, pickModel } from '../../server/gemini';

describe("marca d'água FUTURO DIGITAL", () => {
  it('mantém o tamanho da imagem e altera o canto superior esquerdo (onde fica a logo)', async () => {
    const width = 768;
    const height = 1344;
    const plain = await sharp({ create: { width, height, channels: 3, background: { r: 20, g: 20, b: 30 } } }).png().toBuffer();
    const branded = await applyWatermark(plain);
    const meta = await sharp(branded).metadata();
    expect(meta.width).toBe(width);
    expect(meta.height).toBe(height);

    // stats() do sharp mede a imagem de entrada; por isso recorta primeiro e mede o recorte.
    const stats = async (buf: Buffer, left: number, top: number) =>
      sharp(await sharp(buf).extract({ left, top, width: 120, height: 120 }).toBuffer()).stats();
    const corner = await stats(branded, 40, 60);
    const bottomRight = await stats(branded, width - 140, height - 140);
    // A logo colore o canto; o canto oposto continua igual ao fundo.
    expect(corner.channels[0]!.max).toBeGreaterThan(120);
    expect(bottomRight.channels[0]!.max).toBeLessThan(30);
  });
});

describe('descoberta de modelos Gemini', () => {
  const available = [
    'gemini-2.5-flash',
    'gemini-3-flash',
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-lite-image',
    'gemini-3-pro-image',
    'gemini-3-pro',
    'text-embedding-004',
  ];

  it('escolhe o "Nano Banana 2" (flash-image, não a versão lite)', () => {
    expect(pickModel(available, [/flash-image(?!.*lite)/, /image/])).toBe('gemini-3.1-flash-image');
  });

  it('escolhe o modelo Pro de imagem', () => {
    expect(pickModel(available, [/pro-image/])).toBe('gemini-3-pro-image');
  });

  it('para texto, prefere o flash mais novo', () => {
    expect(pickModel(available, [/^gemini-[\d.]+-flash$/])).toBe('gemini-3-flash');
  });

  it('devolve undefined quando nada combina', () => {
    expect(pickModel(['text-embedding-004'], [/image/])).toBeUndefined();
  });
});

describe('duração segura da fala do Agente Diretor', () => {
  it('reserva 1,5 segundo sem fala no fim do vídeo', () => {
    expect(directorDialogueWordLimit(8)).toBe(11);
    expect(directorDialogueWordLimit(10)).toBe(15);
    expect(directorDialogueWordLimit(15)).toBe(24);
  });

  it('preserva frases completas quando o roteiro passa do limite', () => {
    expect(fitDirectorDialogue('Gancho curto. Apresentação do produto. Clique no carrinho e garanta o seu!', 7))
      .toBe('Gancho curto. Apresentação do produto.');
  });

  it('nunca corta uma palavra ao aplicar o limite', () => {
    expect(fitDirectorDialogue('Uma fala comprida que não cabe no vídeo', 5))
      .toBe('Uma fala comprida que não.');
  });
});
