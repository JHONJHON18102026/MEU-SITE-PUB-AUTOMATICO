import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateImageBatchCost, calculateUgcCost, splitSpeechIntoScenes } from '../../shared/ugcContracts';
import {
  HOOK_STYLES,
  IMAGE_AD_TEMPLATES,
  MINED_PROFILES,
  STUDIO_ACCOUNT_STAGES,
  STUDIO_CAPTION_STYLES,
  STUDIO_FORMATS,
  TUTORIAL_ARTICLES,
  UGC_TEMPLATES,
  VIRAL_FOLDER_FORMATS,
  VIRAL_MOTIONS,
  VIRAL_TRENDING_VIDEOS,
} from '../../shared/ugcCatalog';
import { assertSafePublicHttpUrl, pickVeoModel } from '../../server/veo';

describe('cálculo de custos e quebra de cenas (Entregas 2 & 3)', () => {
  it('calcula 10 créditos/cena no Veo 3.1 Fast e +1/cena com voz personalizada', () => {
    expect(calculateUgcCost({ engine: 'veo-3.1-fast', sceneCount: 3, voiceType: 'default' })).toBe(30);
    expect(calculateUgcCost({ engine: 'veo-3.1-fast', sceneCount: 3, voiceType: 'preset' })).toBe(33);
    expect(calculateUgcCost({ engine: 'omni-flash', sceneCount: 2, voiceType: 'clone' })).toBe(32);
  });

  it('calcula lote de imagens (Slideshows e Image Ads) em Nano Banana 2 (2) e Pro (3)', () => {
    expect(calculateImageBatchCost({ engine: 'nano-banana-2', count: 5 })).toBe(10);
    expect(calculateImageBatchCost({ engine: 'nano-banana-pro', count: 4 })).toBe(12);
  });

  it('divide roteiro longo em cenas de até ~8s respeitando pontuação', () => {
    const script =
      'Você ainda perde tempo procurando o creme certo todo dia de manhã? Esse sérum de vitamina C pura resolve isso em segundos. Uso há duas semanas e minha pele já ficou visivelmente mais uniforme e iluminada. Clica aqui embaixo para garantir o seu com desconto.';
    const scenes = splitSpeechIntoScenes(script, 8);
    expect(scenes.length).toBeGreaterThanOrEqual(2);
    expect(scenes.length).toBeLessThanOrEqual(4);
    for (const s of scenes) {
      expect(s.text.length).toBeGreaterThan(5);
      expect(s.estimatedSeconds).toBeLessThanOrEqual(10);
    }
  });
});

describe('descoberta Veo e proteção anti-SSRF', () => {
  it('escolhe modelos Veo disponíveis dinamicamente', () => {
    const models = ['gemini-3-flash', 'veo-2.0-generate-001', 'veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview'];
    expect(pickVeoModel(models, 'veo-3.1-fast')).toBe('veo-3.1-fast-generate-preview');
    expect(pickVeoModel(models, 'omni-flash')).toBe('veo-3.1-generate-preview');
    expect(pickVeoModel(['gemini-3-flash'])).toBeUndefined();
  });

  it('bloqueia IPs privados e protocolos não HTTP na leitura de links', () => {
    expect(() => assertSafePublicHttpUrl('http://127.0.0.1:8787')).toThrow();
    expect(() => assertSafePublicHttpUrl('http://192.168.1.1/admin')).toThrow();
    expect(() => assertSafePublicHttpUrl('http://localhost/segredo')).toThrow();
    expect(() => assertSafePublicHttpUrl('file:///c:/windows/win.ini')).toThrow();
    expect(assertSafePublicHttpUrl('https://loja.exemplo.com/produto').hostname).toBe('loja.exemplo.com');
  });
});

describe('catálogo local de modelos ADS, Motion, Image Ads e tutoriais', () => {
  const pubDir = path.resolve(import.meta.dirname, '../../public');

  it('todos os templates virais, motions, image ads e artigos apontam para arquivos válidos', () => {
    expect(UGC_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    for (const t of UGC_TEMPLATES) {
      expect(fs.existsSync(path.join(pubDir, t.thumbnail.replace(/^\//, ''))), t.thumbnail).toBe(true);
    }
    expect(HOOK_STYLES).toHaveLength(5);
    expect(VIRAL_MOTIONS.length).toBeGreaterThanOrEqual(5);
    for (const m of VIRAL_MOTIONS) {
      expect(m.analyzed).toBe(true);
      expect(fs.existsSync(path.join(pubDir, m.thumbnail.replace(/^\//, ''))), m.thumbnail).toBe(true);
    }
    expect(IMAGE_AD_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    for (const img of IMAGE_AD_TEMPLATES) {
      expect(fs.existsSync(path.join(pubDir, img.thumbnail.replace(/^\//, ''))), img.thumbnail).toBe(true);
    }
    expect(VIRAL_FOLDER_FORMATS.length).toBeGreaterThanOrEqual(4);
    expect(VIRAL_TRENDING_VIDEOS.length).toBeGreaterThanOrEqual(6);
    for (const v of VIRAL_TRENDING_VIDEOS) {
      expect(v.preAnalyzedManifest.scenes.length).toBeGreaterThanOrEqual(2);
      expect(fs.existsSync(path.join(pubDir, v.thumbnail.replace(/^\//, ''))), v.thumbnail).toBe(true);
    }
    expect(MINED_PROFILES.length).toBeGreaterThanOrEqual(4);
    for (const p of MINED_PROFILES) {
      expect(fs.existsSync(path.join(pubDir, p.avatarUrl.replace(/^\//, ''))), p.avatarUrl).toBe(true);
    }
    expect(STUDIO_CAPTION_STYLES).toHaveLength(12);
    expect(STUDIO_ACCOUNT_STAGES).toHaveLength(11);
    expect(STUDIO_FORMATS).toHaveLength(4);
    expect(TUTORIAL_ARTICLES.length).toBeGreaterThanOrEqual(14);
  });
});
