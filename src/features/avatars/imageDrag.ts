import type { AvatarDTO } from '@shared/contracts';

export const AVATAR_IMAGE_DRAG_TYPE = 'application/x-futuro-digital-avatar-image';

export function setDraggedAvatar(event: React.DragEvent<HTMLElement>, avatar: AvatarDTO) {
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData(AVATAR_IMAGE_DRAG_TYPE, JSON.stringify(avatar));
  event.dataTransfer.setData('text/uri-list', avatar.image_url);
}

export function getDraggedAvatar(dataTransfer: DataTransfer): AvatarDTO | null {
  const raw = dataTransfer.getData(AVATAR_IMAGE_DRAG_TYPE);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AvatarDTO>;
    if (typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.image_url !== 'string') return null;
    return value as AvatarDTO;
  } catch {
    return null;
  }
}

export function hasSupportedImageDrop(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).some((type) => type === 'Files' || type === AVATAR_IMAGE_DRAG_TYPE || type === 'text/uri-list');
}
