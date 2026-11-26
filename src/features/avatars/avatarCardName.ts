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
    /(?:Design of the same primary character, not an additional subject:|Design do mesmo personagem principal, sem criar outro sujeito:)\s*([\s\S]*?)(?=\n(?:Character world and context:|Mundo e contexto do personagem:|Framing:|Enquadramento:|High-detail|Renderização|Photorealistic|Retrato fotorrealista|No text|Não incluir)|$)/i,
  )?.[1]?.trim();

  const attributes = (avatar.attributes ?? {}) as AttributeSelection;
  const derived = customCharacter ? suggestAvatarName(attributes, 0, customCharacter) : '';
  if (derived && derived !== 'Influencer IA') return derived;

  const looksEnglish = /\b(?:an|the|with|wearing|young|adult|man|woman|baby|animated|character|portrait|photorealistic|realistic|creator|insect|frog|cat|dog|bird|funny|caricatured|strange|beautiful|brazilian|violinist|lighthouse|keeper|and|from|wears|eccentric|florist|artist|chef|professional|influencer|elderly|middle-aged)\b/i.test(storedName);
  if (looksEnglish || !customCharacter) {
    return suggestAvatarName(attributes, 0) || legacyEnglishNames[avatar.name.trim().toLocaleLowerCase('en-US')] || 'Influencer IA';
  }
  return derived || storedName;
}
