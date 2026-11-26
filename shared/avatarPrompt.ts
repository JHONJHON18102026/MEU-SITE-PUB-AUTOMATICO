/**
 * Monta o texto que vai para o modelo de imagem.
 *
 * Por que um "construtor de prompt" separado?
 * Analogia: é a ficha técnica que o garçom leva para a cozinha. O cliente
 * marca opções no cardápio (botões); a ficha transforma isso em instruções
 * claras e sempre na mesma ordem, para o chef (a IA) errar menos.
 * Como é uma função pura (sem rede, sem banco), dá para testar 100%.
 */
import { ATTRIBUTE_GROUPS, DEFAULT_SELECTION, findOption, type AttributeGroupId, type AttributeSelection } from './attributes';
import { FRAMINGS, type FramingId } from './contracts';

export interface PromptInput {
  mode: 'attributes' | 'prompt';
  attributes: AttributeSelection;
  extraDetails: string;
  characterWorld: string;
  prompt: string;
  framing: FramingId;
  hasBasePhoto: boolean;
  hasProductImage: boolean;
  referenceCount: number;
}

const REALISTIC_QUALITY =
  'Photorealistic creator portrait, natural soft lighting, sharp focus, believable materials and skin texture, authentic social media creator aesthetic.';
const IMAGE_CONSTRAINTS = 'No text, no captions, no logos, no watermarks in the image.';
const STYLIZED_CHARACTER_TYPES = new Set([
  'extremo', 'inseto', 'sapo', 'gato', 'cachorro', 'roedor', 'passaro', 'bebe-animado', 'orgao-animado', 'mao-desenhando', 'cartoon',
]);

function withoutDefaultCharacterAttributes(selection: AttributeSelection): AttributeSelection {
  const result: AttributeSelection = { ...selection };
  for (const [groupId, defaultIds] of Object.entries(DEFAULT_SELECTION)) {
    const id = groupId as AttributeGroupId;
    const selected = result[id];
    if (selected?.length === defaultIds?.length && selected.every((value, index) => value === defaultIds[index])) {
      delete result[id];
    }
  }
  return result;
}

/** Converte a seleção de botões em frases descritivas, na ordem certa. */
export function describeAttributes(selection: AttributeSelection): string[] {
  const parts: string[] = [];
  const ordered = [...ATTRIBUTE_GROUPS].sort((a, b) => a.promptOrder - b.promptOrder);
  for (const group of ordered) {
    const ids = selection[group.id as AttributeGroupId] ?? [];
    const prompts = ids
      .map((id) => findOption(group.id, id)?.prompt)
      .filter((p): p is string => Boolean(p));
    if (prompts.length) parts.push(prompts.join(', '));
  }
  return parts;
}

export function buildAvatarPrompt(input: PromptInput): string {
  const framing = FRAMINGS.find((f) => f.id === input.framing)?.prompt ?? FRAMINGS[1].prompt;
  const lines: string[] = [];
  const selectedAttributes = input.extraDetails.trim()
    ? withoutDefaultCharacterAttributes(input.attributes)
    : input.attributes;
  const characterType = selectedAttributes.characterType?.[0];
  const explicitStylizedDirection = /cartoon|desenh[oa]|anima(d[oa]|ção)|anime|ilustraç|caricatur|fant[aá]stic|alien|extraterrestr|exagerad|exaggerat|strange|weird|bizarre|grotesque|unusual|inusitad|esquisit|gigantic|gigante|reference sheet|folha de refer[eê]ncia|turnaround/i.test(input.extraDetails);
  const isStylized = (characterType && STYLIZED_CHARACTER_TYPES.has(characterType)) || explicitStylizedDirection;
  const quality = isStylized
    ? 'High-detail realistic character render with caricature exaggeration, vivid and intentional signature features, photorealistic textures, and faithful adherence to the requested design.'
    : input.extraDetails.trim()
      ? 'High-detail realistic character render faithful to the described appearance, with natural soft lighting, sharp focus, believable materials, and realistic skin texture.'
      : REALISTIC_QUALITY;

  if (input.extraDetails.trim()) {
    lines.push(
      'PERSONALIZED CHARACTER CREATION SKILL: Treat the user’s character description as a visual design brief. ' +
        'Translate it into a coherent, specific image design. Combine it with selected attribute controls; those controls remain constraints unless the user explicitly overrides one in the description. ' +
        'For strange, fantastical, non-human, or caricatured designs, preserve the requested distinctive trait as an unmistakable signature using “photorealistic human proportions with exaggerated cartoonish features” and “high-detail realistic character render with caricature exaggeration”. Make that trait intentionally bold when requested, but preserve explicit size words such as small or subtle. ' +
        'Never normalize a strange design into a generic young influencer or content creator. Preserve all other requested details without unrelated additions. ' +
        'Keep anatomy, face, colors, proportions, clothing and materials internally consistent. Do not invent biography, powers, benefits or visual traits the user did not request.',
    );
  }

  if (input.referenceCount > 0 || input.hasBasePhoto || input.hasProductImage) {
    lines.push(
      'USER DIRECTION PRIORITY: Follow the written scene and personalized character design for requested actions, pose, clothing, location, lighting, and camera. ' +
        'Use selected attributes as constraints unless the user explicitly overrides them. Use attached images only for the identity, product, or details they represent; do not copy their pose, clothing, or background when the user changes them.',
    );
  }

  if (input.hasBasePhoto) {
    lines.push(
      'Use the person in the FIRST attached image as the identity reference. By default preserve their recognizable face and facial structure; apply any explicit transformation requested in the personalized character description, and keep unmentioned identity traits recognizable.',
    );
  }

  const attrs = describeAttributes(selectedAttributes);
  if (!input.prompt.trim()) {
    lines.push(`Create a portrait of ${attrs.length ? attrs.join('; ') : input.extraDetails.trim() ? 'the custom character described below' : 'a photorealistic content creator'}.`);
  } else {
    lines.push(`Scene: ${input.prompt.trim()}`);
    if (attrs.length) lines.push(`Character: ${attrs.join('; ')}.`);
  }

  if (input.extraDetails.trim()) lines.push(`Personalized character design: ${input.extraDetails.trim()}`);
  if (input.characterWorld.trim()) lines.push(`Character world and context: ${input.characterWorld.trim()}`);

  if (input.hasProductImage) {
    lines.push(
      'The character is naturally holding or showing the product from the attached product image. ' +
        'Reproduce the product packaging faithfully (shape, colors, label).',
    );
  }
  if (input.referenceCount > 0) {
    lines.push(
      input.hasBasePhoto
        ? `Use the ${input.referenceCount} additional reference image(s) for the objects or details they depict; keep the base photo identity and follow the written scene for pose, clothing, framing, and setting.`
        : `Treat the FIRST attached reference image as the primary source for the subject. If it contains a person, preserve that exact person's recognizable identity, face shape, eyes, skin tone, hair, age, and body; if it contains an object, preserve that exact object's defining design. Do not substitute an unrelated person/object or blend in a new identity. Preserve identity, but follow the written prompt whenever it changes clothing, pose, composition, or background. Use the remaining ${Math.max(0, input.referenceCount - 1)} reference image(s) as secondary visual constraints.`,
    );
  }

  if (!/reference sheet|folha de refer[eê]ncia|turnaround/i.test(input.extraDetails)) {
    lines.push(`Framing: ${framing}.`);
  }
  lines.push(quality, IMAGE_CONSTRAINTS);
  return lines.join('\n');
}

/** Nome curto e simpático para o card do avatar. */
export function suggestAvatarName(selection: AttributeSelection, index: number): string {
  const type = selection.characterType?.[0];
  const typeLabel = type ? findOption('characterType', type)?.label : undefined;
  const base = typeLabel && typeLabel !== 'Realista' ? typeLabel : 'Influencer IA';
  // Cards criados com a ficha não podem parecer presets genéricos.
  // Acrescentamos um traço escolhido pelo usuário ao nome, mantendo o nome
  // histórico "Influencer IA" quando só o tipo padrão foi selecionado.
  const identity = selection.ethnicity?.[0] ?? selection.hair?.[0] ?? selection.eyeColor?.[0];
  const identityLabel = identity
    ? findOption('ethnicity', identity)?.label ?? findOption('hair', identity)?.label ?? findOption('eyeColor', identity)?.label
    : undefined;
  const namedBase = identityLabel ? `${base} · ${identityLabel}` : base;
  return index > 0 ? `${namedBase} ${index + 1}` : namedBase;
}
