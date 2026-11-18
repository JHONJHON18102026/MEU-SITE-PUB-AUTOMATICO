/**
 * Cartuchos de automação 1-clique do Studio (Entrega 5):
 * Brandbook offline/preview, roteiros em lote e horários seguros espaçados.
 */
import type { StudioBrandbookDTO } from '@shared/ugcContracts';

export function buildLocalBrandbook(opts: {
  brandName: string;
  niche: string;
  productName: string;
  targetAudience?: string;
  voiceTone?: string;
}): StudioBrandbookDTO {
  const brand = opts.brandName.trim() || 'Minha Marca';
  const prod = opts.productName.trim() || 'Produto Principal';
  return {
    brandName: brand,
    niche: opts.niche.trim() || 'Skincare & Rotina',
    targetAudience: opts.targetAudience?.trim() || 'Público brasileiro de 22 a 45 anos buscando resultados práticos',
    voiceTone: opts.voiceTone?.trim() || 'Natural, próximo e confiante',
    palette: ['#7c3aed', '#ec4899', '#10b981'],
    pillars: [
      `Rotina real usando ${prod} no dia a dia`,
      `Comparativo antes e depois sem filtro`,
      `Respondendo dúvidas comuns de quem vai comprar`,
    ],
    sampleHooks: [
      `O erro #1 que quase todo mundo comete antes de usar ${prod}`,
      `14 dias testando ${prod} da ${brand} na vida real`,
      `Se você busca resultado sem perder tempo, olha esse ajuste`,
    ],
    defaultCta: `Clica no link oficial da ${brand} e aproveita a condição de hoje.`,
    heroVisualUrl: '/showcase/modelo-01.webp',
  };
}

export function buildStudioBatchDraft(opts: {
  formatTitle: string;
  productName: string;
  hookBase: string;
  cta: string;
  variationIndex: number;
}) {
  const angles = [
    `Olha a diferença real depois que coloquei ${opts.productName} na rotina.`,
    `Se você ainda sofre sem ${opts.productName}, testa esse truque simples hoje.`,
    `Quase ninguém conta isso sobre ${opts.productName}, mas mudou tudo aqui.`,
    `Em menos de 1 minuto por dia com ${opts.productName} você já vê resultado.`,
  ];
  const line1 = opts.variationIndex === 0 && opts.hookBase.trim() ? opts.hookBase.trim() : angles[opts.variationIndex % angles.length]!;
  return {
    title: `${opts.formatTitle} #${opts.variationIndex + 1} · ${opts.productName}`,
    scenes: [
      {
        text: line1,
        action: `${opts.formatTitle}: abertura dinâmica perto da câmera com luz natural.`,
        durationSeconds: 8,
      },
      {
        text: `${opts.cta} — garante ${opts.productName} enquanto ainda tem estoque.`,
        action: `Demonstração clara de ${opts.productName} em uso e sorriso confiante no encerramento.`,
        durationSeconds: 8,
      },
    ],
  };
}

/** Sugere um horário futuro respeitando intervalo seguro (padrão +4h). */
export function suggestSafeScheduleLocalInput(offsetHours = 4): string {
  const dt = new Date(Date.now() + offsetHours * 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:00`;
}
