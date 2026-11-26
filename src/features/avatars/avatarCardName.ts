import { suggestAvatarName } from '@shared/avatarPrompt';
import type { AttributeSelection } from '@shared/attributes';
import type { AvatarDTO } from '@shared/contracts';

/** Keeps saved cards descriptive even when the API stored the old generic name. */
export function avatarCardName(avatar: AvatarDTO): string {
  const legacyEnglishNames: Record<string, string> = {
    'brazilian female violinist': 'Violinista brasileira',
    'brazilian lighthouse keeper': 'Faroleiro brasileiro',
  };
  const storedName = legacyEnglishNames[avatar.name.trim().toLocaleLowerCase('en-US')] ?? avatar.name;
  const customCharacter = avatar.prompt.match(
    /Design of the same primary character, not an additional subject:\s*([\s\S]*?)(?=\n(?:Character world and context:|Framing:|High-detail|Photorealistic|No text)|$)/i,
  )?.[1]?.trim();

  if (!customCharacter) return storedName;
  const derived = suggestAvatarName((avatar.attributes ?? {}) as AttributeSelection, 0, customCharacter);
  return derived || storedName;
}
