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

  if (input.hasBasePhoto) {
    lines.push(
      'Use the person in the FIRST attached image as the identity reference: keep the same face, ' +
        'facial structure and recognizable features.',
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
      `Use the ${input.referenceCount} additional attached reference image(s) only for style, setting and outfit inspiration.`,
    );
  }

  lines.push(`Framing: ${framing}.`);
  lines.push(QUALITY_SUFFIX);
  return lines.join('\n');
}

/** Nome curto e simpático para o card do avatar. */
export function suggestAvatarName(selection: AttributeSelection, index: number): string {
  const type = selection.characterType?.[0];
  const typeLabel = type ? findOption('characterType', type)?.label : undefined;
  const base = typeLabel && typeLabel !== 'Realista' ? typeLabel : 'Influencer IA';
  return index > 0 ? `${base} ${index + 1}` : base;
}
