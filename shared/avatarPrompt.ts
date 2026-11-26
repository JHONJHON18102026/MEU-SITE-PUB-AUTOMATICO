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

function descriptionOverridesDefault(group: AttributeGroupId, optionId: string, description: string): boolean {
  const text = description.toLocaleLowerCase('pt-BR');
  if (group === 'characterType' && optionId === 'realista') {
    return /cartoon|desenh[oa]|anima(d[oa]|ção)|anime|ilustraç|caricatur|fant[aá]stic|alien|extraterrestr|inseto|insect|bug|sapo|frog|antropom[oó]rf|anthropomorphic|criatura|creature|n[aã]o.human[oa]|non.human|gigantic|gigante|esquisit|weird|bizarre|grotesque|unusual/i.test(text);
  }
  if (group === 'gender' && optionId === 'feminino') {
    return /\bman\b|\bmale\b|masculin[oa]|homem|\bboy\b|menino/i.test(text);
  }
  if (group === 'gender' && optionId === 'masculino') {
    return /\bwoman\b|\bfemale\b|feminin[oa]|mulher|\bgirl\b|menina/i.test(text);
  }
  if (group === 'age' && optionId === 'jovem') {
    return /idos[oa]|velh[oa]|elderly|older adult|middle.?aged|mature|50\s*\+|60\s*\+|\b(3[5-9]|[4-9]\d)-year-old\b/i.test(text);
  }
  if (group === 'age' && optionId === 'adulto') {
    return /teen|adolescen|teenager|in their twenties|20s|jovem|18.?29/i.test(text);
  }
  if (group === 'age' && optionId === 'maduro') {
    return /teen|adolescen|teenager|in their twenties|20s|jovem|18.?29|early thirties/i.test(text);
  }
  return false;
}

function withoutConflictingDefaultAttributes(selection: AttributeSelection, description: string): AttributeSelection {
  const result: AttributeSelection = { ...selection };
  for (const [groupId, defaultIds] of Object.entries(DEFAULT_SELECTION)) {
    const id = groupId as AttributeGroupId;
    const selected = result[id];
    if (
      selected?.length === defaultIds?.length &&
      selected.every((value, index) => value === defaultIds[index]) &&
      selected.some((value) => descriptionOverridesDefault(id, value, description))
    ) {
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

/**
 * Turns independent UI selections into one grammatical subject. A flat list
 * such as “insect character; man; in their twenties” can be read as multiple
 * subjects by image models, so gender and age must modify the selected type.
 */
function describeSingleCharacterProfile(selection: AttributeSelection): string | null {
  const typeId = selection.characterType?.[0];
  const type = typeId ? findOption('characterType', typeId)?.prompt : null;
  const genderId = selection.gender?.[0];
  const genderOption = genderId ? findOption('gender', genderId) : null;
  const ageId = selection.age?.[0];
  const ageOption = ageId ? findOption('age', ageId) : null;

  const gender = genderId === 'masculino'
    ? 'masculine gender presentation'
    : genderId === 'feminino'
      ? 'feminine gender presentation'
      : genderId === 'menino'
        ? 'masculine childlike gender presentation'
        : genderId === 'menina'
          ? 'feminine childlike gender presentation'
          : genderOption?.prompt;
  const age = ageId === 'jovem'
    ? 'young adult age traits (18–29)'
    : ageId === 'adulto'
      ? 'adult age traits (30–49)'
      : ageId === 'maduro'
        ? 'mature adult age traits (50+)'
        : ageOption?.prompt;

  const otherTraits: string[] = [];
  for (const group of [...ATTRIBUTE_GROUPS].sort((a, b) => a.promptOrder - b.promptOrder)) {
    if (group.id === 'characterType' || group.id === 'gender' || group.id === 'age') continue;
    for (const id of selection[group.id] ?? []) {
      const prompt = findOption(group.id, id)?.prompt;
      if (prompt) otherTraits.push(prompt);
    }
  }

  const traits = [gender, age, ...otherTraits].filter(Boolean);
  if (!type && traits.length === 0) return null;
  const subject = type ?? 'one character';
  return `ONE SUBJECT ONLY: Depict ${subject} as a single individual. This same character has these selected traits: ${traits.join(', ') || 'none'}. Do not add a separate human, model, companion, duplicate, or second figure.`;
}

export function buildAvatarPrompt(input: PromptInput): string {
  const framing = FRAMINGS.find((f) => f.id === input.framing)?.prompt ?? FRAMINGS[1].prompt;
  const lines: string[] = [];
  const selectedAttributes = input.extraDetails.trim()
    ? withoutConflictingDefaultAttributes(input.attributes, input.extraDetails)
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

  const profile = describeSingleCharacterProfile(selectedAttributes);
  if (profile) {
    // The controls describe one influencer. Without this relationship, image
    // models can read “insect + man + young” as an insect and a separate man.
    lines.push(
      `SINGLE CHARACTER PROFILE: ${profile} ` +
        'The written scene may add people only when it explicitly asks for additional characters.',
    );
  }

  if (!input.prompt.trim()) {
    lines.push(`Create a portrait of ${profile ? 'the single character described in the profile above' : input.extraDetails.trim() ? 'the single custom character described below' : 'one photorealistic content creator'}.`);
  } else {
    lines.push(`Scene: ${input.prompt.trim()}`);
    if (profile) lines.push(`Primary character profile: ${profile}`);
  }

  if (input.extraDetails.trim()) lines.push(`Design of the same primary character, not an additional subject: ${input.extraDetails.trim()}`);
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

/** Cria um rótulo curto a partir da descrição visual do personagem. */
function describeCustomCharacter(details: string): string | undefined {
  let description = details
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(?:monte seu personagem|descri[cç][aã]o do personagem|personagem(?:\s+(?:personalizado|único))?|crie um personagem)\s*[:—–-]?\s*/i, '')
    .replace(/^(?:um|uma|o|a)\s+/i, '');

  // O cartão precisa identificar a criação sem transformar todo o briefing em título.
  description = description.split(/[.!?\n]/, 1)[0]?.trim() ?? '';
  if (!description) return undefined;

  // Prompts técnicos em inglês costumam começar com estilo/renderização; o
  // cartão deve destacar o personagem descrito, e não esse cabeçalho genérico.
  const portraitSubject = description.match(
    /\bportrait of (?:a|an|the) unique\s+(.+?)(?=\s+with\s+photorealistic|\s+with\s+exaggerated|\s+with\s+realistic|,\s*rendered|\s+captured|$)/i,
  )?.[1]?.trim();
  if (portraitSubject) description = portraitSubject.replace(/\b\d+-year-old\s+/i, '').trim();

  const localizedSubject: Record<string, string> = {
    'brazilian female violinist': 'Violinista brasileira',
    'brazilian lighthouse keeper': 'Faroleiro brasileiro',
  };
  description = localizedSubject[description.toLocaleLowerCase('en-US')] ?? description;

  const maxLength = 38;
  if (description.length > maxLength) {
    const shortened = description.slice(0, maxLength);
    const lastSpace = shortened.lastIndexOf(' ');
    description = `${shortened.slice(0, lastSpace > 18 ? lastSpace : maxLength).trim()}…`;
  }
  return description.charAt(0).toLocaleUpperCase('pt-BR') + description.slice(1);
}

/** Nome curto e simpático para o card do avatar. */
export function suggestAvatarName(selection: AttributeSelection, index: number, characterDescription = ''): string {
  const customDescription = describeCustomCharacter(characterDescription);
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
  const namedBase = customDescription ?? (identityLabel ? `${base} · ${identityLabel}` : base);
  return index > 0 ? `${namedBase} ${index + 1}` : namedBase;
}
