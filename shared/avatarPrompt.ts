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
  hasCharacterStyleReference?: boolean;
  referenceCount: number;
}

const REALISTIC_QUALITY =
  'Retrato fotorrealista de criador de conteúdo, luz natural suave, foco nítido, materiais e textura de pele convincentes, estética autêntica de redes sociais.';
const IMAGE_CONSTRAINTS = 'Não incluir texto, legendas, logotipos nem marcas-d’água na imagem.';
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
    return /beb[eê]|crian[cç]a|infantil|child|baby|toddler|idos[oa]|velh[oa]|elderly|older adult|middle.?aged|mature|50\s*\+|60\s*\+|\b(3[5-9]|[4-9]\d)-year-old\b/i.test(text);
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
  // “Bebê animado” não pode herdar a faixa padrão de adulto jovem.
  if (result.characterType?.includes('bebe-animado') && result.age?.includes('jovem')) {
    delete result.age;
  }
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

/**
 * A seleção "Bebê animado" é uma restrição de tipo, não apenas uma referência.
 * Remove cláusulas de anatomia/idade adulta de descrições salvas anteriormente,
 * mantendo estilo, cores, roupa e outros detalhes que ainda servem ao bebê.
 */
function detailsForSelectedCharacterType(details: string, typeId?: string): string {
  const text = details.trim();
  if (typeId !== 'bebe-animado' || !text) return text;

  const adultMorphology = /\b(?:adult(?:o|a|os|as)?|adult[- ]?sized|young man|young woman|man|woman|male|female|homem|mulher|masculin[oa]|feminin[oa]|lean(?:ly)?|lanky|broad[- ]shoulder(?:ed|s)?|narrow waist|waist|torso|muscular|athletic build|long legs|adult proportions|in (?:his|her) \d{2}s|\d{2}[- ]year[- ]old)\b|\bom b(?:em)?\b|\bmulher adulta\b/i;
  const clauses = text
    .replace(/\s+[—–-]\s+/g, ', ')
    .split(/(?<=[.!?;])\s+|,\s*/)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const compatible = clauses.filter((clause) => !adultMorphology.test(clause));
  return compatible.join(', ').replace(/\s+/g, ' ').trim();
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

/** Descreve as opções selecionadas com os rótulos que o usuário vê na interface. */
export function describeSelectedAttributesPt(selection: AttributeSelection): string[] {
  const parts: string[] = [];
  const ordered = [...ATTRIBUTE_GROUPS].sort((a, b) => a.promptOrder - b.promptOrder);
  for (const group of ordered) {
    const labels = (selection[group.id as AttributeGroupId] ?? [])
      .map((id) => findOption(group.id, id)?.label)
      .filter((label): label is string => Boolean(label));
    if (labels.length) parts.push(`${group.label}: ${labels.join(', ')}`);
  }
  return parts;
}

/**
 * Combina as opções em um único personagem, para o modelo não interpretar
 * tipo, gênero e idade como sujeitos diferentes.
 */
function describeSingleCharacterProfile(selection: AttributeSelection): string | null {
  const typeId = selection.characterType?.[0];
  const type = typeId ? findOption('characterType', typeId)?.label : null;
  const traits = describeSelectedAttributesPt(selection)
    .filter((trait) => !trait.startsWith('Tipo de personagem:'));
  if (!type && traits.length === 0) return null;
  const subject = type ?? 'personagem';
  return `PERSONAGEM ÚNICO: o tipo selecionado é “${subject}”; represente-o como o único sujeito principal. Aplique a este mesmo personagem todas as opções selecionadas: ${traits.join('; ') || 'nenhuma característica adicional'}. As opções descrevem o mesmo personagem; não adicione uma pessoa, bebê, modelo, acompanhante, duplicata ou segundo personagem para representar qualquer uma delas.`;
}

export function buildAvatarPrompt(input: PromptInput): string {
  const framing = FRAMINGS.find((f) => f.id === input.framing)?.prompt ?? FRAMINGS[1].prompt;
  const lines: string[] = [];
  const selectedAttributes = input.extraDetails.trim() || input.attributes.characterType?.includes('bebe-animado')
    ? withoutConflictingDefaultAttributes(input.attributes, input.extraDetails)
    : input.attributes;
  const characterType = selectedAttributes.characterType?.[0];
  const characterDetails = detailsForSelectedCharacterType(input.extraDetails, characterType);
  const explicitStylizedDirection = /cartoon|desenh[oa]|anima(d[oa]|ção)|anime|ilustraç|caricatur|fant[aá]stic|alien|extraterrestr|exagerad|strange|weird|bizarre|grotesque|unusual|inusitad|esquisit|gigantic|gigante|reference sheet|folha de refer[eê]ncia|turnaround/i.test(characterDetails);
  const isStylized = (characterType && STYLIZED_CHARACTER_TYPES.has(characterType)) || explicitStylizedDirection;
  const quality = isStylized
    ? 'Renderização detalhada de personagem com exagero de caricatura, traços marcantes e intencionais, texturas fotorrealistas e fidelidade ao design solicitado.'
    : characterDetails
      ? 'Renderização detalhada e fotorrealista, fiel à aparência descrita, com luz natural suave, foco nítido, materiais convincentes e textura de pele realista.'
      : REALISTIC_QUALITY;

  if (characterDetails) {
    lines.push(
      'DIREÇÃO DE PERSONAGEM PERSONALIZADO: trate a descrição do usuário como um briefing visual e converta-a em um design coerente e específico. ' +
        'Combine-a com as opções selecionadas na lateral, que são obrigatórias para o mesmo personagem. Quando uma opção selecionada definir um tipo incompatível com um detalhe do texto, o tipo selecionado prevalece e o detalhe incompatível deve ser ignorado. ' +
        'Em personagens estranhos, fantásticos, não humanos ou caricaturais, preserve o traço distintivo pedido como uma assinatura visual inconfundível, com proporções humanas fotorrealistas e características cartunescas exageradas, além de renderização realista detalhada com exagero de caricatura. Exagere esse traço quando solicitado, mas respeite palavras de escala como pequeno ou sutil. ' +
        'Nunca transforme uma ideia incomum em uma influenciadora jovem genérica. Preserve os outros detalhes sem acrescentar elementos sem relação com o pedido. ' +
        'Mantenha anatomia, rosto, cores, proporções, roupas e materiais coerentes. Não invente biografia, poderes nem características visuais que o usuário não pediu.',
    );
  }

  if (characterType === 'bebe-animado') {
    lines.push('RESTRIÇÃO DE TIPO — BEBÊ ANIMADO: o único personagem principal deve ser claramente um bebê/criança pequena em estilo 3D animado, com cabeça proporcionalmente maior, rosto infantil, tronco curto e membros curtos. Nunca representar adulto, adolescente ou corpo adulto. Gênero, cores, roupa e acessórios selecionados são aplicados a esse mesmo bebê. A miniatura “Bebê animado” é referência visual obrigatória da categoria; não criar um bebê adicional nem um adulto junto.');
  }

  if (input.referenceCount > 0 || input.hasBasePhoto || input.hasProductImage) {
    lines.push(
      'PRIORIDADE DAS REFERÊNCIAS: siga a cena escrita e o design personalizado do personagem quanto a ação, pose, roupa, local, iluminação e câmera. ' +
        'Aplique as opções selecionadas como características obrigatórias do mesmo personagem, salvo contradição explícita do usuário. Use cada imagem anexada apenas para a identidade, produto ou detalhes que ela representa; não copie pose, roupa ou fundo quando o texto pedir mudanças.',
    );
  }

  if (input.hasBasePhoto) {
    lines.push(
      'Use a pessoa da PRIMEIRA imagem anexada como referência de identidade. Preserve por padrão os traços reconhecíveis, mas aplique no mesmo sujeito as transformações explicitamente selecionadas nos atributos ou pedidas na descrição personalizada. Mantenha reconhecíveis as características de identidade não conflitantes.',
    );
  }

  if (input.hasCharacterStyleReference) {
    const selectedType = selectedAttributes.characterType?.[0];
    const typeLabel = selectedType ? findOption('characterType', selectedType)?.label : 'selecionado';
    lines.push(`Referência visual de estilo: a miniatura da opção “${typeLabel}” será enviada ao motor separadamente como guia para a categoria, as proporções e os traços visuais do mesmo personagem. Não a use como outro sujeito nem copie sua pose ou cenário.`);
  }

  const profile = describeSingleCharacterProfile(selectedAttributes);
  if (profile) {
    // As opções se referem a um único personagem, nunca a sujeitos separados.
    lines.push(
      `PERFIL: ${profile} ` +
        'A cena escrita só pode acrescentar pessoas quando pedir explicitamente outros personagens.',
    );
  }

  if (!input.prompt.trim()) {
    lines.push(`Crie um retrato de ${profile ? 'um único personagem descrito no perfil acima' : input.extraDetails.trim() ? 'um único personagem personalizado descrito abaixo' : 'um único criador de conteúdo fotorrealista'}.`);
  } else {
    lines.push(`Cena: ${input.prompt.trim()}`);
    if (profile) lines.push(`Perfil do personagem principal: ${profile}`);
  }

  if (characterDetails) lines.push(`Design compatível do mesmo personagem principal, sem criar outro sujeito: ${characterDetails}`);
  if (input.characterWorld.trim()) lines.push(`Mundo e contexto do personagem: ${input.characterWorld.trim()}`);

  if (input.hasProductImage) {
    lines.push(
      'O personagem segura ou apresenta naturalmente o produto da imagem anexada. Reproduza fielmente a embalagem do produto (formato, cores e rótulo).',
    );
  }
  if (input.referenceCount > 0) {
    lines.push(
      input.hasBasePhoto
        ? `Use as ${input.referenceCount} imagem(ns) de referência adicional(is) para os objetos ou detalhes representados; preserve a identidade da foto base e siga o texto para pose, roupa, enquadramento e cenário.`
        : `Use a PRIMEIRA imagem de referência anexada como fonte principal do sujeito. Se mostrar uma pessoa, preserve a identidade reconhecível exata, formato do rosto, olhos, tom de pele, cabelo, idade e corpo; se mostrar um objeto, preserve seu design característico. Não substitua por pessoa ou objeto sem relação e não misture uma nova identidade. Preserve a identidade, mas siga o texto quando ele alterar roupa, pose, composição ou fundo. Use as ${Math.max(0, input.referenceCount - 1)} imagem(ns) restante(s) como restrições visuais secundárias.`,
    );
  }

  if (!/reference sheet|folha de refer[eê]ncia|turnaround/i.test(input.extraDetails)) {
    lines.push(`Enquadramento: ${framing}.`);
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

  // Prompts técnicos antigos em inglês podem começar com estilo/renderização;
  // o cartão deve destacar o personagem, não esse cabeçalho genérico.
  const portraitSubject = description.match(
    /\bportrait of (?:a|an|the) unique\s+(.+?)(?=\s+with\s+photorealistic|\s+with\s+exaggerated|\s+with\s+realistic|,\s*rendered|\s+captured|$)/i,
  )?.[1]?.trim();
  if (portraitSubject) description = portraitSubject.replace(/\b\d+-year-old\s+/i, '').trim();

  const localizedSubject: Record<string, string> = {
    'brazilian female violinist': 'Violinista brasileira',
    'brazilian lighthouse keeper': 'Faroleiro brasileiro',
  };
  description = localizedSubject[description.toLocaleLowerCase('en-US')] ?? description;

  // Older character prompts were stored in English. If a legacy title still
  // has unmistakable English terms, show the selected Portuguese type/traits
  // instead of leaking an English name into the avatar gallery.
  if (/\b(?:an|the|with|wearing|young|adult|man|woman|baby|animated|character|portrait|photorealistic|realistic|creator|insect|frog|cat|dog|bird|funny|caricatured|strange|beautiful|and|from|wears|wearing|eccentric|florist|artist|chef|professional|influencer|elderly|middle-aged)\b/i.test(description)) {
    return undefined;
  }

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
