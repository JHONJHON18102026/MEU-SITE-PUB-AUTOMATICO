import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_GROUPS, ATTRIBUTE_GROUP_MAP, findOption, randomSelection, type AttributeGroupId } from '../../shared/attributes';
import { buildAvatarPrompt, describeAttributes, suggestAvatarName } from '../../shared/avatarPrompt';
import { avatarCost, generateAvatarSchema, MAX_IMAGES_PER_REQUEST, PRICING } from '../../shared/contracts';
import { SHOWCASE_AVATARS } from '../../src/features/avatars/showcaseExamples';

/** Gerador de números com semente: o "aleatório" sai sempre igual no teste. */
function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('catálogo de características', () => {
  it('tem os 19 grupos de opções mapeados', () => {
    expect(ATTRIBUTE_GROUPS).toHaveLength(19);
  });

  it('tem a quantidade de opções por grupo igual ao mapa', () => {
    const counts = Object.fromEntries(ATTRIBUTE_GROUPS.map((g) => [g.id, g.options.length]));
    expect(counts).toMatchObject({
      characterType: 24, gender: 5, body: 7, hair: 26, hairColor: 13, style: 8, ethnicity: 6, age: 3,
      skinTone: 8, height: 3, proportions: 5, headShape: 10, neck: 4, eyeShape: 11, eyeColor: 8,
      features: 25, beard: 8, marks: 14, accessories: 6,
    });
  });

  it('não tem ids repetidos dentro de um grupo e toda opção tem prompt', () => {
    for (const g of ATTRIBUTE_GROUPS) {
      const ids = g.options.map((o) => o.id);
      expect(new Set(ids).size, g.id).toBe(ids.length);
      for (const opt of g.options) expect(opt.prompt.length, `${g.id}.${opt.id}`).toBeGreaterThan(2);
    }
  });

  it('sorteio só escolhe opções válidas e 1 por grupo de escolha única', () => {
    for (let seed = 1; seed < 60; seed++) {
      const sel = randomSelection(seeded(seed));
      for (const [gid, ids] of Object.entries(sel)) {
        const group = ATTRIBUTE_GROUP_MAP[gid as keyof typeof ATTRIBUTE_GROUP_MAP];
        expect(group, gid).toBeDefined();
        if (!group.multi) expect(ids.length).toBeLessThanOrEqual(1);
        for (const id of ids) expect(group.options.some((o) => o.id === id)).toBe(true);
      }
    }
  });
});

describe('montagem do prompt', () => {
  const base = {
    mode: 'attributes' as const,
    attributes: { characterType: ['realista'], gender: ['feminino'], hairColor: ['ruivo'], accessories: ['oculos-grau', 'brincos'] },
    extraDetails: '',
    characterWorld: '',
    prompt: '',
    framing: 'meio-corpo' as const,
    hasBasePhoto: false,
    hasProductImage: false,
    referenceCount: 0,
  };

  it('segue a ordem fixa: tipo → gênero → ... → acessórios', () => {
    const parts = describeAttributes(base.attributes);
    expect(parts[0]).toContain('photorealistic human');
    expect(parts[1]).toBe('woman');
    expect(parts.at(-1)).toContain('glasses');
    expect(parts.at(-1)).toContain('earrings');
  });

  it('inclui enquadramento e proíbe texto/marca d’água gerados pela IA', () => {
    const p = buildAvatarPrompt(base);
    expect(p).toContain('medium shot');
    expect(p).toContain('No text');
    expect(p).toContain('no watermarks');
  });

  it('com foto base, manda manter o rosto da primeira imagem', () => {
    expect(buildAvatarPrompt({ ...base, hasBasePhoto: true })).toMatch(/FIRST attached image/);
  });

  it('com produto e referências, explica o papel de cada imagem', () => {
    const p = buildAvatarPrompt({ ...base, hasProductImage: true, referenceCount: 2 });
    expect(p).toContain('product');
    expect(p).toContain('Treat the FIRST attached reference image as the primary source');
    expect(p).toContain('Use the remaining 1 reference image(s) as secondary visual constraints');
    expect(p).toContain('Do not substitute an unrelated person/object');
  });

  it('modo prompt usa a cena escrita pelo usuário', () => {
    const p = buildAvatarPrompt({ ...base, mode: 'prompt', prompt: 'tomando suplemento na cozinha' });
    expect(p).toContain('Scene: tomando suplemento na cozinha');
  });

  it('não deixa os atributos padrão transformarem uma descrição fantástica em influencer genérico', () => {
    const p = buildAvatarPrompt({
      ...base,
      attributes: { characterType: ['realista'], gender: ['feminino'], age: ['jovem'] },
      extraDetails: 'Funny, caricatured elderly woman with photorealistic human proportions and exaggerated cartoonish features.',
    });
    expect(p).not.toContain('photorealistic human content creator');
    expect(p).not.toContain('woman; in their twenties');
    expect(p).toContain('high-detail realistic character render with caricature exaggeration');
    expect(p).toContain('Framing: medium shot');
  });

  it('nomeia o avatar pelo tipo de personagem', () => {
    expect(suggestAvatarName({ characterType: ['gato'] }, 0)).toBe('Gato');
    expect(suggestAvatarName({ characterType: ['realista'] }, 1)).toBe('Influencer IA 2');
  });
});

describe('preços e validação do pedido', () => {
  it('cobra 2 créditos por imagem e limita a 4', () => {
    expect(avatarCost(1)).toBe(PRICING.avatarImage);
    expect(avatarCost(3)).toBe(PRICING.avatarImage * 3);
    expect(avatarCost(99)).toBe(PRICING.avatarImage * MAX_IMAGES_PER_REQUEST);
  });

  it('recusa mais de 4 imagens, mais de 3 referências e proporção inexistente', () => {
    expect(generateAvatarSchema.safeParse({ mode: 'attributes', count: 5 }).success).toBe(false);
    const img = { mimeType: 'image/jpeg', data: 'x'.repeat(32) };
    expect(generateAvatarSchema.safeParse({ mode: 'prompt', referenceImages: [img, img, img, img] }).success).toBe(false);
    expect(generateAvatarSchema.safeParse({ mode: 'attributes', aspectRatio: '4:5' }).success).toBe(false);
  });

  it('aplica valores padrão seguros', () => {
    const r = generateAvatarSchema.parse({ mode: 'attributes' });
    expect(r).toMatchObject({ count: 1, aspectRatio: '9:16', engine: 'nano-banana-2', makePublic: false });
  });
});

describe('miniaturas e modelos do Pinterest', () => {
  const pubDir = path.resolve(import.meta.dirname, '../../public');

  it('preenche todos os 9 grupos visuais com imagens existentes em public/', () => {
    const visualGroups: AttributeGroupId[] = ['characterType', 'gender', 'age', 'ethnicity', 'body', 'hair', 'style', 'beard', 'accessories'];
    let count = 0;
    for (const gid of visualGroups) {
      const group = ATTRIBUTE_GROUP_MAP[gid];
      for (const opt of group.options) {
        expect(opt.image, `${gid}.${opt.id}`).toBeTruthy();
        expect(fs.existsSync(path.join(pubDir, opt.image!.replace(/^\//, ''))), opt.image).toBe(true);
        count++;
      }
    }
    expect(count).toBe(93);
  });

  it('modelos prontos de showcase apontam para imagens existentes e atributos válidos', () => {
    expect(SHOWCASE_AVATARS).toHaveLength(9);
    for (const m of SHOWCASE_AVATARS) {
      expect(fs.existsSync(path.join(pubDir, m.image_url.replace(/^\//, ''))), m.image_url).toBe(true);
      for (const [gid, ids] of Object.entries(m.attributes)) {
        for (const id of ids ?? []) {
          expect(findOption(gid as AttributeGroupId, id), `${m.id} -> ${gid}.${id}`).toBeDefined();
        }
      }
    }
    expect(fs.existsSync(path.join(pubDir, 'showcase/hero-influencer.webp'))).toBe(true);
    expect(fs.existsSync(path.join(pubDir, 'showcase/hero-ugc.webp'))).toBe(true);
  });
});
