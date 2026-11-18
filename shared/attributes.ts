/**
 * Catálogo de características do Influencer IA.
 *
 * Cada opção tem:
 *  - label:  o que o usuário vê (pt-BR)
 *  - prompt: o trecho em inglês enviado ao modelo de imagem (modelos de
 *            imagem seguem descrições em inglês com mais precisão)
 *  - swatch: cor de amostra (só nos grupos de cor)
 *
 * Grupos "multi" aceitam várias escolhas (ex.: acessórios); os demais, uma só.
 */

import { ATTRIBUTE_IMAGES } from './attributeImages';

export interface AttributeOption {
  id: string;
  label: string;
  prompt: string;
  swatch?: string;
  emoji?: string;
  /** Miniatura em /public (gerada por IA, sem pessoas reais). */
  image?: string;
}

export interface AttributeGroup {
  id: AttributeGroupId;
  label: string;
  multi: boolean;
  /** Ordem em que o grupo entra no prompt final. */
  promptOrder: number;
  options: AttributeOption[];
}

export type AttributeGroupId =
  | 'characterType' | 'gender' | 'body' | 'hair' | 'hairColor' | 'style'
  | 'ethnicity' | 'age' | 'skinTone' | 'height' | 'proportions' | 'headShape'
  | 'neck' | 'eyeShape' | 'eyeColor' | 'features' | 'beard' | 'marks' | 'accessories';

/** Seleção do usuário: grupo -> lista de ids escolhidos. */
export type AttributeSelection = Partial<Record<AttributeGroupId, string[]>>;

const o = (id: string, label: string, prompt: string, extra: Partial<AttributeOption> = {}): AttributeOption =>
  ({ id, label, prompt, ...extra });

const RAW_GROUPS: AttributeGroup[] = [
  {
    id: 'characterType', label: 'Tipo de personagem', multi: false, promptOrder: 0,
    options: [
      o('realista', 'Realista', 'a photorealistic human content creator', { emoji: '🧑' }),
      o('ousado', 'Ousado', 'a bold, striking human content creator with an edgy look', { emoji: '😎' }),
      o('extremo', 'Extremo', 'an extravagant, exaggerated stylized human character with vivid colors', { emoji: '🤪' }),
      o('inseto', 'Inseto', 'an anthropomorphic insect character with a human-like posture', { emoji: '🐞' }),
      o('sapo', 'Sapo', 'an anthropomorphic frog character with a human-like posture', { emoji: '🐸' }),
      o('gato', 'Gato', 'an anthropomorphic cat character with a human-like posture', { emoji: '🐱' }),
      o('cachorro', 'Cachorro', 'an anthropomorphic dog character with a human-like posture', { emoji: '🐶' }),
      o('roedor', 'Roedor', 'an anthropomorphic capybara character with a human-like posture', { emoji: '🐹' }),
      o('passaro', 'Pássaro', 'an anthropomorphic bird character with a human-like posture', { emoji: '🐦' }),
      o('monge', 'Monge', 'a serene buddhist monk', { emoji: '🧘' }),
      o('curandeira', 'Curandeira', 'a wise traditional herbal healer woman', { emoji: '🌿' }),
      o('indigena', 'Indígena', 'a Brazilian indigenous person with respectful traditional adornments', { emoji: '🪶' }),
      o('cacique', 'Cacique', 'a respected indigenous chief with a traditional feather headdress', { emoji: '🦅' }),
      o('socialite', 'Socialite', 'a glamorous high-society socialite', { emoji: '💎' }),
      o('cigana', 'Cigana', 'a romani fortune teller with colorful scarves', { emoji: '🔮' }),
      o('vaqueiro', 'Vaqueiro', 'a Brazilian cowboy (vaqueiro) with a leather hat', { emoji: '🤠' }),
      o('saude', 'Especialista em saúde', 'a trustworthy health specialist in a clean white coat', { emoji: '🩺' }),
      o('milionario', 'Milionário', 'a confident millionaire entrepreneur', { emoji: '💼' }),
      o('ciborgue', 'Ciborgue', 'a futuristic cyborg with subtle chrome implants', { emoji: '🤖' }),
      o('bebe-animado', 'Bebê animado', 'a cute 3D animated talking baby, Pixar-like render', { emoji: '👶' }),
      o('orgao-animado', 'Órgão animado', 'a cute 3D animated human organ character with a face, Pixar-like render', { emoji: '🫀' }),
      o('vovo', 'Vovó/Vovô', 'a warm, wise grandparent who shares natural remedies', { emoji: '👵' }),
      o('mao-desenhando', 'Mão desenhando', 'a whiteboard animation style with a hand drawing the character', { emoji: '✍️' }),
      o('cartoon', 'Desenho animado', 'a 2D cartoon character, clean flat illustration', { emoji: '🎨' }),
    ],
  },
  {
    id: 'gender', label: 'Gênero', multi: false, promptOrder: 1,
    options: [
      o('feminino', 'Feminino', 'woman'),
      o('masculino', 'Masculino', 'man'),
      o('nao-binario', 'Não-binário', 'androgynous non-binary person'),
      o('menina', 'Menina', 'young girl'),
      o('menino', 'Menino', 'young boy'),
    ],
  },
  {
    id: 'age', label: 'Idade', multi: false, promptOrder: 2,
    options: [
      o('jovem', 'Jovem (18–29)', 'in their twenties'),
      o('adulto', 'Adulto (30–49)', 'in their late thirties'),
      o('maduro', 'Maduro (50+)', 'in their late fifties, graceful aging'),
    ],
  },
  {
    id: 'ethnicity', label: 'Etnia', multi: false, promptOrder: 3,
    options: [
      o('latina', 'Latina', 'Latin American'),
      o('branca', 'Branca', 'Caucasian'),
      o('negra', 'Negra', 'Black'),
      o('asiatica', 'Asiática', 'East Asian'),
      o('indiana', 'Sul-asiática', 'South Asian'),
      o('arabe', 'Árabe', 'Middle Eastern'),
    ],
  },
  {
    id: 'skinTone', label: 'Cor da pele', multi: false, promptOrder: 4,
    options: [
      o('porcelana', 'Porcelana', 'porcelain fair skin', { swatch: '#F6E1D3' }),
      o('clara', 'Clara', 'light skin', { swatch: '#EBC8AE' }),
      o('media', 'Média', 'medium skin tone', { swatch: '#D4A27F' }),
      o('oliva', 'Oliva', 'olive skin tone', { swatch: '#B98A5E' }),
      o('morena', 'Morena', 'tan brown skin', { swatch: '#9A6A44' }),
      o('marrom', 'Marrom', 'deep brown skin', { swatch: '#6E4A2F' }),
      o('escura', 'Escura', 'dark skin', { swatch: '#4A3121' }),
      o('retinta', 'Retinta', 'very dark ebony skin', { swatch: '#2E1E15' }),
    ],
  },
  {
    id: 'body', label: 'Corpo', multi: false, promptOrder: 5,
    options: [
      o('magro', 'Magro', 'slim build'),
      o('atletico', 'Atlético', 'athletic toned build'),
      o('medio', 'Médio', 'average build'),
      o('curvilineo', 'Curvilíneo', 'curvy build'),
      o('musculoso', 'Musculoso', 'muscular build'),
      o('plus', 'Plus size', 'plus-size build'),
      o('robusto', 'Robusto', 'stocky sturdy build'),
    ],
  },
  {
    id: 'height', label: 'Altura', multi: false, promptOrder: 6,
    options: [
      o('baixa', 'Baixa', 'short stature'),
      o('media', 'Média', 'average height'),
      o('alta', 'Alta', 'tall stature'),
    ],
  },
  {
    id: 'proportions', label: 'Proporções', multi: false, promptOrder: 7,
    options: [
      o('realistas', 'Realistas', 'natural realistic proportions'),
      o('alongadas', 'Alongadas', 'elongated model-like proportions'),
      o('compactas', 'Compactas', 'compact proportions'),
      o('estilizadas', 'Estilizadas', 'slightly stylized proportions'),
      o('chibi', 'Cabeçudo (chibi)', 'chibi proportions with a big head'),
    ],
  },
  {
    id: 'headShape', label: 'Formato da cabeça', multi: false, promptOrder: 8,
    options: [
      o('oval', 'Oval', 'oval face'),
      o('redondo', 'Redondo', 'round face'),
      o('quadrado', 'Quadrado', 'square face with a strong jaw'),
      o('retangular', 'Retangular', 'long rectangular face'),
      o('coracao', 'Coração', 'heart-shaped face'),
      o('diamante', 'Diamante', 'diamond-shaped face with high cheekbones'),
      o('triangular', 'Triangular', 'triangular face with a wide jaw'),
      o('oblongo', 'Oblongo', 'oblong face'),
      o('pera', 'Pera', 'pear-shaped face'),
      o('anguloso', 'Anguloso', 'sharp angular face'),
    ],
  },
  {
    id: 'neck', label: 'Pescoço', multi: false, promptOrder: 9,
    options: [
      o('fino', 'Fino', 'slender neck'),
      o('medio', 'Médio', 'average neck'),
      o('longo', 'Longo', 'long elegant neck'),
      o('largo', 'Largo', 'thick strong neck'),
    ],
  },
  {
    id: 'eyeShape', label: 'Formato dos olhos', multi: false, promptOrder: 10,
    options: [
      o('amendoado', 'Amendoado', 'almond-shaped eyes'),
      o('redondos', 'Redondos', 'round eyes'),
      o('puxados', 'Puxados', 'monolid eyes'),
      o('caidos', 'Caídos', 'downturned eyes'),
      o('levantados', 'Levantados', 'upturned eyes'),
      o('encapuzados', 'Encapuzados', 'hooded eyes'),
      o('grandes', 'Grandes', 'large expressive eyes'),
      o('pequenos', 'Pequenos', 'small narrow eyes'),
      o('profundos', 'Profundos', 'deep-set eyes'),
      o('saltados', 'Saltados', 'prominent eyes'),
      o('felinos', 'Felinos', 'cat-eye shaped eyes'),
    ],
  },
  {
    id: 'eyeColor', label: 'Cor dos olhos', multi: false, promptOrder: 11,
    options: [
      o('castanho-escuro', 'Castanho-escuro', 'dark brown eyes', { swatch: '#3B2414' }),
      o('castanho', 'Castanho', 'brown eyes', { swatch: '#6B4423' }),
      o('mel', 'Mel', 'honey hazel eyes', { swatch: '#A67B3D' }),
      o('verde', 'Verde', 'green eyes', { swatch: '#4E7F52' }),
      o('azul', 'Azul', 'blue eyes', { swatch: '#4C7FC0' }),
      o('cinza', 'Cinza', 'grey eyes', { swatch: '#8A939B' }),
      o('ambar', 'Âmbar', 'amber eyes', { swatch: '#C6862B' }),
      o('heterocromia', 'Heterocromia', 'heterochromia, one blue and one brown eye', { swatch: '#7E6BB0' }),
    ],
  },
  {
    id: 'hair', label: 'Cabelo', multi: false, promptOrder: 12,
    options: [
      o('liso-longo', 'Liso longo', 'long straight hair'),
      o('liso-medio', 'Liso médio', 'shoulder-length straight hair'),
      o('liso-curto', 'Liso curto', 'short straight hair'),
      o('ondulado-longo', 'Ondulado longo', 'long wavy hair'),
      o('ondulado-medio', 'Ondulado médio', 'medium wavy hair'),
      o('cacheado-longo', 'Cacheado longo', 'long curly hair'),
      o('cacheado-curto', 'Cacheado curto', 'short curly hair'),
      o('crespo-black', 'Black power', 'voluminous afro hair'),
      o('crespo-curto', 'Crespo curto', 'short coily hair'),
      o('trancas-box', 'Tranças box', 'box braids'),
      o('trancas-nago', 'Nagô', 'cornrows'),
      o('dreads', 'Dreads', 'locs'),
      o('chanel', 'Chanel', 'sleek bob haircut'),
      o('pixie', 'Pixie', 'pixie cut'),
      o('franja', 'Com franja', 'hair with straight bangs'),
      o('rabo', 'Rabo de cavalo', 'high ponytail'),
      o('coque', 'Coque', 'neat bun'),
      o('coque-baguncado', 'Coque bagunçado', 'messy bun'),
      o('maria-chiquinha', 'Maria-chiquinha', 'pigtails'),
      o('raspado', 'Raspado', 'buzz cut'),
      o('degrade', 'Degradê', 'skin fade haircut'),
      o('topete', 'Topete', 'pompadour'),
      o('moicano', 'Moicano', 'mohawk'),
      o('mullet', 'Mullet', 'modern mullet'),
      o('careca', 'Careca', 'bald head'),
      o('lateral-raspada', 'Lateral raspada', 'undercut with long top'),
    ],
  },
  {
    id: 'hairColor', label: 'Cor do cabelo', multi: false, promptOrder: 13,
    options: [
      o('preto', 'Preto', 'jet black hair color', { swatch: '#141210' }),
      o('castanho-escuro', 'Castanho-escuro', 'dark brown hair color', { swatch: '#3A2618' }),
      o('castanho', 'Castanho', 'brown hair color', { swatch: '#6A4A30' }),
      o('castanho-claro', 'Castanho-claro', 'light brown hair color', { swatch: '#9A7350' }),
      o('loiro-mel', 'Loiro mel', 'honey blonde hair color', { swatch: '#C99B5B' }),
      o('loiro', 'Loiro', 'golden blonde hair color', { swatch: '#E2C27A' }),
      o('platinado', 'Platinado', 'platinum blonde hair color', { swatch: '#EDE6D6' }),
      o('ruivo', 'Ruivo', 'copper red hair color', { swatch: '#A9472A' }),
      o('grisalho', 'Grisalho', 'salt and pepper grey hair color', { swatch: '#9C9C9C' }),
      o('branco', 'Branco', 'white hair color', { swatch: '#F2F2F2' }),
      o('rosa', 'Rosa', 'pastel pink hair color', { swatch: '#F29CC4' }),
      o('azul', 'Azul', 'electric blue hair color', { swatch: '#2F6BFF' }),
      o('verde', 'Verde', 'neon green hair color', { swatch: '#3FD46B' }),
    ],
  },
  {
    id: 'style', label: 'Estilo', multi: false, promptOrder: 14,
    options: [
      o('casual', 'Casual', 'wearing casual everyday clothes'),
      o('esportivo', 'Esportivo', 'wearing athleisure sportswear'),
      o('elegante', 'Elegante', 'wearing an elegant tailored outfit'),
      o('executivo', 'Executivo', 'wearing a sharp business suit'),
      o('streetwear', 'Streetwear', 'wearing trendy streetwear'),
      o('boho', 'Boho', 'wearing a bohemian outfit'),
      o('minimalista', 'Minimalista', 'wearing a minimalist neutral outfit'),
      o('luxo', 'Luxo', 'wearing luxury designer fashion'),
    ],
  },
  {
    id: 'beard', label: 'Barba', multi: false, promptOrder: 15,
    options: [
      o('sem', 'Sem barba', 'clean-shaven'),
      o('rala', 'Por fazer', 'light stubble'),
      o('curta', 'Curta', 'short trimmed beard'),
      o('cheia', 'Cheia', 'full beard'),
      o('longa', 'Longa', 'long beard'),
      o('cavanhaque', 'Cavanhaque', 'goatee'),
      o('bigode', 'Bigode', 'mustache'),
      o('grisalha', 'Grisalha', 'grey beard'),
    ],
  },
  {
    id: 'features', label: 'Traços', multi: true, promptOrder: 16,
    options: [
      o('sardas', 'Sardas', 'freckles'),
      o('covinhas', 'Covinhas', 'dimples'),
      o('sorriso', 'Sorriso largo', 'wide warm smile'),
      o('dentes-separados', 'Dentes separados', 'small gap between front teeth'),
      o('labios-cheios', 'Lábios cheios', 'full lips'),
      o('labios-finos', 'Lábios finos', 'thin lips'),
      o('nariz-fino', 'Nariz fino', 'narrow nose'),
      o('nariz-largo', 'Nariz largo', 'wide nose'),
      o('nariz-aquilino', 'Nariz aquilino', 'aquiline nose'),
      o('macas-altas', 'Maçãs altas', 'high cheekbones'),
      o('queixo-marcado', 'Queixo marcado', 'defined chin'),
      o('mandibula', 'Mandíbula forte', 'strong jawline'),
      o('sobrancelhas-grossas', 'Sobrancelhas grossas', 'thick eyebrows'),
      o('sobrancelhas-finas', 'Sobrancelhas finas', 'thin arched eyebrows'),
      o('cilios', 'Cílios longos', 'long eyelashes'),
      o('rugas', 'Linhas de expressão', 'subtle expression lines'),
      o('pele-perfeita', 'Pele lisa', 'smooth even skin'),
      o('textura-real', 'Pele com textura', 'natural skin texture with pores'),
      o('olheiras', 'Olheiras', 'slight under-eye circles'),
      o('rosado', 'Bochechas rosadas', 'rosy cheeks'),
      o('bronzeado', 'Bronzeado', 'sun-kissed tan'),
      o('vitiligo', 'Vitiligo', 'vitiligo patches'),
      o('albinismo', 'Albinismo', 'albinism'),
      o('expressivo', 'Muito expressivo', 'very expressive face'),
      o('serio', 'Olhar sério', 'serious confident gaze'),
    ],
  },
  {
    id: 'marks', label: 'Marcas', multi: true, promptOrder: 17,
    options: [
      o('pinta', 'Pinta no rosto', 'beauty mark on the cheek'),
      o('cicatriz', 'Cicatriz', 'small scar on the eyebrow'),
      o('tatuagem-braco', 'Tatuagem no braço', 'tattoo sleeve on one arm'),
      o('tatuagem-pescoco', 'Tatuagem no pescoço', 'small neck tattoo'),
      o('tatuagem-mao', 'Tatuagem na mão', 'small hand tattoo'),
      o('tatuagem-rosto', 'Tatuagem facial', 'small minimal face tattoo'),
      o('piercing-nariz', 'Piercing no nariz', 'nose piercing'),
      o('piercing-septo', 'Piercing septo', 'septum piercing'),
      o('piercing-sobrancelha', 'Piercing sobrancelha', 'eyebrow piercing'),
      o('piercing-labio', 'Piercing no lábio', 'lip piercing'),
      o('alargador', 'Alargador', 'ear gauges'),
      o('pintura-indigena', 'Pintura tradicional', 'traditional body paint'),
      o('marca-nascenca', 'Marca de nascença', 'small birthmark'),
      o('sinal-testa', 'Bindi', 'bindi on the forehead'),
    ],
  },
  {
    id: 'accessories', label: 'Acessórios', multi: true, promptOrder: 18,
    options: [
      o('oculos-grau', 'Óculos de grau', 'wearing stylish prescription glasses'),
      o('oculos-sol', 'Óculos de sol', 'wearing sunglasses'),
      o('bone', 'Boné', 'wearing a baseball cap'),
      o('brincos', 'Brincos', 'wearing statement earrings'),
      o('colar', 'Colar', 'wearing a delicate necklace'),
      o('relogio', 'Relógio', 'wearing a luxury watch'),
    ],
  },
];

/** Liga cada opção à sua miniatura (se existir em shared/attributeImages.ts). */
export const ATTRIBUTE_GROUPS: AttributeGroup[] = RAW_GROUPS.map((g) => ({
  ...g,
  options: g.options.map((opt) => ({ ...opt, image: opt.image ?? ATTRIBUTE_IMAGES[`${g.id}-${opt.id}`] })),
}));

export const ATTRIBUTE_GROUP_MAP: Record<AttributeGroupId, AttributeGroup> = Object.fromEntries(
  ATTRIBUTE_GROUPS.map((g) => [g.id, g]),
) as Record<AttributeGroupId, AttributeGroup>;

/** Seleção inicial agradável (personagem realista feminino jovem latino). */
export const DEFAULT_SELECTION: AttributeSelection = {
  characterType: ['realista'],
  gender: ['feminino'],
  age: ['jovem'],
};

export function findOption(groupId: AttributeGroupId, optionId: string): AttributeOption | undefined {
  return ATTRIBUTE_GROUP_MAP[groupId]?.options.find((opt) => opt.id === optionId);
}

/**
 * Sorteia uma combinação coerente. Recebe o gerador de números para que os
 * testes possam usar uma semente fixa (resultado reproduzível).
 */
export function randomSelection(rand: () => number = Math.random): AttributeSelection {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] as T;
  const humanTypes = ['realista', 'ousado', 'socialite', 'milionario', 'saude', 'vaqueiro', 'monge', 'curandeira'];
  const sel: AttributeSelection = {};

  sel.characterType = [rand() < 0.85 ? pick(humanTypes) : pick(ATTRIBUTE_GROUP_MAP.characterType.options).id];
  const gender = rand() < 0.5 ? 'feminino' : 'masculino';
  sel.gender = [gender];

  const singleGroups: AttributeGroupId[] = [
    'age', 'ethnicity', 'skinTone', 'body', 'height', 'headShape', 'eyeShape', 'eyeColor', 'hair', 'hairColor', 'style',
  ];
  for (const gid of singleGroups) {
    sel[gid] = [pick(ATTRIBUTE_GROUP_MAP[gid].options).id];
  }
  if (gender === 'masculino') sel.beard = [pick(ATTRIBUTE_GROUP_MAP.beard.options).id];

  const features = ATTRIBUTE_GROUP_MAP.features.options;
  sel.features = [pick(features).id];
  if (rand() < 0.5) sel.accessories = [pick(ATTRIBUTE_GROUP_MAP.accessories.options).id];
  return sel;
}
