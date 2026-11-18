/**
 * Cartuchos da Entrega 4 (Biblioteca VIRAL + Remake Viral):
 * detectam plataforma pela URL e geram Manifest estruturado instantaneamente no Modo Prévia.
 */
import type { ViralManifestDTO, ViralManifestScene } from '@shared/ugcContracts';
import { VIRAL_TRENDING_VIDEOS } from '@shared/ugcCatalog';

export const EXAMPLE_VIRAL_LINKS = [
  {
    label: 'Skincare TikTok Shop (15s)',
    url: 'https://www.tiktok.com/@camila.ugc/video/serum-rotina-demo',
    title: 'Hook de Choque · Sérum Vitamina C',
    niche: 'Skincare',
    durationSec: 15,
    thumbnailUrl: '/showcase/modelo-01.webp',
  },
  {
    label: 'Suplemento Reels (30s)',
    url: 'https://www.instagram.com/reel/lucas-fitlab-treino/',
    title: '3 Sinais no Pós-Treino (Reels)',
    niche: 'Fitness',
    durationSec: 24,
    thumbnailUrl: '/showcase/modelo-02.webp',
  },
  {
    label: 'Unboxing Escritório Shorts',
    url: 'https://youtube.com/shorts/rafael-tech-unboxing',
    title: 'Unboxing Honesto · Setup Produtivo',
    niche: 'Tech',
    durationSec: 16,
    thumbnailUrl: '/showcase/modelo-04.webp',
  },
];

export function detectPlatformFromUrl(url?: string): string {
  if (!url) return 'Upload';
  if (/tiktok/i.test(url)) return 'TikTok Shop';
  if (/instagram|ig\.me/i.test(url)) return 'Instagram Reels';
  if (/youtube|youtu\.be/i.test(url)) return 'YouTube Shorts';
  return 'Web';
}

export function buildLocalManifest(opts: {
  sourceTitle: string;
  sourceUrl?: string;
  niche?: string;
  durationSec?: number;
  targetProduct?: string;
}): ViralManifestDTO {
  const prod = opts.targetProduct?.trim() || 'seu produto';
  const presetMatch = VIRAL_TRENDING_VIDEOS.find((v) =>
    opts.sourceTitle.toLowerCase().includes(v.niche.toLowerCase()),
  );
  const baseScenes: ViralManifestScene[] = presetMatch
    ? presetMatch.preAnalyzedManifest.scenes.map((sc, idx) => ({
        ...sc,
        index: idx,
        spokenTemplate: sc.spokenTemplate.replace(/\bisso\b/gi, prod),
      }))
    : [
        {
          index: 0,
          role: 'Hook',
          visualCues: 'Close natural nos primeiros 2 segundos olhando na lente segurando o produto na diagonal.',
          spokenTemplate: `Para de gastar à toa antes de ver como ${prod} resolve isso em poucos dias.`,
          durationSeconds: 8,
        },
        {
          index: 1,
          role: 'Demonstração',
          visualCues: 'Mostra o uso real em iluminação clara com corte seco para o detalhe de perto.',
          spokenTemplate: `Na prática é simples: aplica direto na rotina e o resultado já aparece na primeira semana.`,
          durationSeconds: 8,
        },
        {
          index: 2,
          role: 'Chamada',
          visualCues: 'Sorriso confiante apontando para baixo no final do take.',
          spokenTemplate: `Clica no link aqui embaixo e garante ${prod} ainda hoje com condição especial.`,
          durationSeconds: 8,
        },
      ];

  const singleTake = (opts.durationSec ?? 16) <= 10;
  const scenes = singleTake ? baseScenes.slice(0, 1) : baseScenes;
  return {
    sourceTitle: opts.sourceTitle,
    sourceUrl: opts.sourceUrl,
    durationSeconds: scenes.length * 8,
    style: presetMatch?.style || 'Hook + Demonstração Direta',
    niche: opts.niche || presetMatch?.niche || 'Geral',
    scenes,
  };
}
