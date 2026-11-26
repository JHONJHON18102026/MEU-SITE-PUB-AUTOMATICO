import { describe, expect, it } from 'vitest';
import type { AvatarDTO } from '@shared/contracts';
import { AVATAR_IMAGE_DRAG_TYPE, getDraggedAvatar, hasSupportedImageDrop, setDraggedAvatar } from '@/features/avatars/imageDrag';

const avatar: AvatarDTO = {
  id: 'avatar-1',
  name: 'Personagem de teste',
  image_url: 'https://cdn.example.test/avatar.jpg',
  prompt: 'prompt',
  attributes: {},
  engine: 'nano-banana-2',
  framing: 'meio-corpo',
  aspect_ratio: '9:16',
  is_public: false,
  is_favorite: false,
  created_at: '2026-01-01T00:00:00.000Z',
  user_id: 'user-1',
};

describe('arrastar imagens geradas da galeria para o canvas', () => {
  it('transfere os dados da imagem pelo tipo da aplicação e pela URL', () => {
    const values = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'none',
      setData: (type: string, value: string) => values.set(type, value),
      getData: (type: string) => values.get(type) ?? '',
    } as unknown as DataTransfer;
    const event = { dataTransfer } as React.DragEvent<HTMLElement>;

    setDraggedAvatar(event, avatar);

    expect(dataTransfer.effectAllowed).toBe('copy');
    expect(values.get(AVATAR_IMAGE_DRAG_TYPE)).toContain('avatar-1');
    expect(values.get('text/uri-list')).toBe(avatar.image_url);
    expect(getDraggedAvatar(dataTransfer)).toEqual(avatar);
  });

  it('reconhece arquivos, imagens da aplicação e URLs externas como arrastáveis', () => {
    expect(hasSupportedImageDrop({ types: ['Files'] } as unknown as DataTransfer)).toBe(true);
    expect(hasSupportedImageDrop({ types: [AVATAR_IMAGE_DRAG_TYPE] } as unknown as DataTransfer)).toBe(true);
    expect(hasSupportedImageDrop({ types: ['text/uri-list'] } as unknown as DataTransfer)).toBe(true);
    expect(hasSupportedImageDrop({ types: ['text/plain'] } as unknown as DataTransfer)).toBe(false);
  });

  it('ignora dados de avatar inválidos', () => {
    const dataTransfer = { getData: () => '{"id":"avatar-1"}' } as unknown as DataTransfer;
    expect(getDraggedAvatar(dataTransfer)).toBeNull();
  });
});
