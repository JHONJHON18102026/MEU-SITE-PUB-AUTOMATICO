/**
 * Monta o texto que vai para o modelo de imagem.
 *
 * Por que um "construtor de prompt" separado?
 * Analogia: é a ficha técnica que o garçom leva para a cozinha. O cliente
 * marca opções no cardápio (botões); a ficha transforma isso em instruções
 * claras e sempre na mesma ordem, para o chef (a IA) errar menos.
 * Como é uma função pura (sem rede, sem banco), dá para testar 100%.
 */
import { ATTRIBUTE_GROUPS, findOption, type AttributeGroupId, type AttributeSelection } from './attributes';
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

const QUALITY_SUFFIX =
  'Ultra-realistic UGC smartphone photo look, natural soft lighting, sharp focus on the face, ' +
  'true-to-life skin texture, authentic social media creator aesthetic. ' +
  'No text, no captions, no logos, no watermarks in the image.';

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

  if (input.referenceCount > 0 || input.hasBasePhoto || input.hasProductImage) {
    lines.push(
      'SCENE PRIORITY: Follow the user-written scene for requested actions, pose, clothing, location, framing, lighting, and camera. ' +
        'Use attached images only for the identity or product they represent. Do not copy their pose, clothing, or background when the written scene changes them.',
    );
  }

  if (input.hasBasePhoto) {
    lines.push(
      'Use the person in the FIRST attached image as the identity reference: keep the same face, ' +
        'facial structure and recognizable features, while following the written scene for everything else.',
    );
  }

  const attrs = describeAttributes(input.attributes);
  if (!input.prompt.trim()) {
    lines.push(`Create a portrait of ${attrs.length ? attrs.join('; ') : 'a photorealistic content creator'}.`);
  } else {
    lines.push(`Scene: ${input.prompt.trim()}`);
    if (attrs.length) lines.push(`Character: ${attrs.join('; ')}.`);
  }

  if (input.extraDetails.trim()) lines.push(`Extra details: ${input.extraDetails.trim()}`);
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

  lines.push(`Framing: ${framing}.`);  lines.push(QUALITY_SUFFIX);
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
