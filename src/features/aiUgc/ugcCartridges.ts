/**
 * Cartuchos de automação de 1 clique para o AI UGC Creator (padrão Console + Cartuchos).
 * Permitem que iniciantes preencham anúncios e roteiros em 1 clique — e também servem
 * como base limpa para o Modo Prévia Visual quando o .env ainda não tem chaves.
 */
import { splitSpeechIntoScenes, type UgcSceneDraft } from '@shared/ugcContracts';
import type { UgcTemplate } from '@shared/ugcCatalog';

export interface ExampleProduct {
  id: string;
  url: string;
  name: string;
  description: string;
  imageUrl: string;
  audience: string;
}

export const EXAMPLE_PRODUCT_LINKS: ExampleProduct[] = [
  {
    id: 'ex-serum',
    url: 'https://loja.futurodigital.demo/produto/serum-vitamina-c',
    name: 'Sérum Facial Vitamina C Pura',
    description: 'Uniformiza o tom da pele, reduz manchas em 14 dias e hidrata sem deixar oleoso.',
    imageUrl: '/showcase/modelo-01.webp',
    audience: 'Mulheres de 24 a 45 anos interessadas em skincare prático',
  },
  {
    id: 'ex-whey',
    url: 'https://loja.futurodigital.demo/produto/creatina-creapure',
    name: 'Creatina Ultra Pura 300g',
    description: 'Mais força no treino, recuperação muscular acelerada e zero sabor residual.',
    imageUrl: '/showcase/modelo-02.webp',
    audience: 'Pessoas que treinam musculação, corrida ou crossfit',
  },
  {
    id: 'ex-cafe',
    url: 'https://loja.futurodigital.demo/produto/cafeteira-portatil',
    name: 'Cafeteira Espresso Portátil USB',
    description: 'Prepara café cremoso em 90 segundos em casa, no escritório ou viajando.',
    imageUrl: '/showcase/modelo-06.webp',
    audience: 'Profissionais ocupados que amam café de qualidade',
  },
];

/** Monta 3 cenas equilibradas (Gancho + Demonstração + Chamada) com 1 clique no assistente ADS. */
export function buildAutoAdsDraft(template: UgcTemplate | null, productName: string) {
  const prod = productName.trim() || template?.title || 'seu produto';
  const baseScript =
    template?.defaultScript ||
    `Eu testei o ${prod} durante duas semanas e preciso ser sincero com vocês. A praticidade no dia a dia surpreendeu desde o primeiro uso. Se você quer esse resultado, clica no link aqui embaixo.`;
  const scenes: UgcSceneDraft[] = splitSpeechIntoScenes(baseScript, 8).map((s, idx) => ({
    ...s,
    action:
      idx === 0
        ? template?.defaultAction || `Segura ${prod} bem próximo da câmera com expressão surpresa e natural.`
        : idx === 1
          ? `Mostra ${prod} sendo usado na rotina real com luz natural clara.`
          : `Sorri confiante apontando para a descrição ou botão de compra com ${prod} em mãos.`,
  }));

  return {
    action: template?.defaultAction || `Apresenta ${prod} com naturalidade, demonstra os benefícios e faz chamada para ação.`,
    scenes: scenes.length ? scenes : [{ index: 0, text: baseScript, action: 'Apresenta o produto olhando para a câmera.', estimatedSeconds: 8 }],
  };
}

/** Gera 3 roteiros prontos offline para fallback ou Modo Prévia sem API key. */
export function buildLocalScripts(productName: string, tone: string, sceneCount = 2) {
  const p = productName.trim() || 'esse produto';
  const raw = [
    {
      id: 'local-1',
      title: `Direto ao ponto (${tone})`,
      script:
        `Se você ainda sofre tentando resolver isso sem ${p}, para tudo agora. Em poucos dias de uso já dá para sentir a diferença na rotina sem complicação. Clica embaixo para garantir o seu antes que acabe.`,
    },
    {
      id: 'local-2',
      title: 'História real (antes e depois)',
      script:
        `Eu sinceramente achava que ${p} era só mais uma promessa da internet, até decidir testar por conta própria. O resultado foi tão rápido que virou item fixo aqui em casa. Vale muito a pena testar.`,
    },
    {
      id: 'local-3',
      title: 'Curiosidade / Segredo',
      script:
        `Quase ninguém te conta o motivo de ${p} funcionar tão bem logo na primeira semana. O segredo está na combinação prática que economiza tempo e entrega resultado real. Salva esse vídeo e confere os detalhes.`,
    },
  ];
  return raw.map((r) => ({
    ...r,
    scenes: splitSpeechIntoScenes(r.script).slice(0, Math.max(1, sceneCount)),
  }));
}

/** Cartucho 1-clique para ganchos de Hook+Demo quando offline ou em Modo Prévia. */
export function buildLocalHooks(productName: string, niche = 'Geral', count = 5): string[] {
  const prod = productName.trim() || 'esse achado';
  const pool = [
    `Ninguém te contou esse segredo sobre ${prod} antes de testar`,
    `Eu quase comprei errado até descobrir ${prod} (${niche})`,
    `Parei de gastar dinheiro à toa depois de 7 dias com ${prod}`,
    `O erro nº 1 que faz todo mundo perder tempo sem ${prod}`,
    `Se você busca resultado real sem complicação, olha ${prod}`,
    `Testei ${prod} por 14 dias e o resultado na câmera fala sozinho`,
  ];
  return pool.slice(0, Math.max(1, Math.min(8, count)));
}

/** Cartucho 1-clique para slideshows educativos/comerciais em Reels e TikTok. */
export function buildLocalSlidesDraft(topic: string, tone: string, slideCount = 5) {
  const item = topic.trim() || 'Rotina Inteligente';
  const count = Math.max(3, Math.min(8, slideCount));
  const drafts = [
    { headline: `${count} motivos para testar ${item}`, body: `Estilo ${tone}: o que realmente muda na prática desde o primeiro uso.` },
    { headline: '1. Ganho imediato de tempo', body: `Sem etapas longas: ${item} encaixa em menos de 3 minutos do dia.` },
    { headline: '2. Economia visível no mês', body: 'Troca soluções caras por uma rotina simples e consistente.' },
    { headline: '3. O detalhe que faz diferença', body: 'Textura leve e resultado perceptível já nas primeiras semanas.' },
    { headline: '4. Como usar sem errar', body: 'Aplique na ordem certa logo pela manhã para potencializar o efeito.' },
    { headline: '5. Erro comum para evitar', body: 'Não pule a etapa de preparo antes — ela dobra a fixação.' },
    { headline: '6. Resultado real na rotina', body: 'Antes e depois consistente sem filtros nem exageros.' },
    { headline: `Pronto para testar ${item}?`, body: 'Salva esse post e clica no link da bio para conferir os detalhes.' },
  ];
  const middle = drafts.slice(1, Math.max(1, count - 1));
  const last = drafts[drafts.length - 1]!;
  return [drafts[0]!, ...middle, last].slice(0, count).map((s, idx) => ({
    ...s,
    visualPrompt: `Vertical 9:16 editorial UGC lifestyle background about ${item}, frame ${idx + 1}, soft sunlight`,
  }));
}
