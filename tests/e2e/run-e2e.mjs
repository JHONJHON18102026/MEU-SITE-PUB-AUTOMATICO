/**
 * Teste automático de ponta a ponta (E2E) — "o robô que clica em tudo".
 *
 * Como funciona:
 *  - Sobe o site (Vite) numa porta separada.
 *  - Abre o Chrome de verdade e faz o caminho de um usuário real.
 *  - O banco (Supabase) e a IA são SIMULADOS no nível da rede (page.route),
 *    para o teste rodar sem gastar créditos nem depender das suas chaves.
 *    A geração REAL é provada separadamente, com as suas chaves.
 *
 * Uso: npm run test:e2e
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const shotsDir = path.join(root, 'tests', 'e2e', 'screenshots');
fs.mkdirSync(shotsDir, { recursive: true });

const PORT = 5179;
const BASE = `http://127.0.0.1:${PORT}`;
const SB = 'https://fake-projeto.supabase.co';
const CHROME =
  process.env.CHROME_PATH ||
  ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(
    (p) => fs.existsSync(p),
  );

// ------------------------------------------------------------- resultado
const results = [];
let failed = 0;
function check(cond, name) {
  results.push({ ok: Boolean(cond), name });
  console.log(`${cond ? '  ✅' : '  ❌'} ${name}`);
  if (!cond) failed++;
}

// ------------------------------------------------------------- dados simulados
const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'teste@futurodigital.ai', user_metadata: { name: 'Jonathan Teste' } };
const state = {
  balance: 20,
  avatars: [],
  generations: [],
  projects: [],
  lastUgcBody: null,
  viralFolders: [{ id: 'f-aleatorios', user_id: USER.id, name: 'Aleatórios', formats: ['ADS', 'Hook+Demo', 'Remake Viral'], created_at: new Date().toISOString() }],
  viralItems: [],
  studioProjects: [
    {
      id: '00000000-0000-4000-8500-000000000001',
      user_id: USER.id,
      name: 'Marca Teste Studio',
      niche: 'Skincare & Rotina',
      product_name: 'Sérum Facial Vitamina C',
      is_active: true,
      brandbook: {
        brandName: 'Marca Teste Studio',
        niche: 'Skincare & Rotina',
        targetAudience: 'Público geral',
        voiceTone: 'Natural e confiante',
        palette: ['#6366f1', '#ec4899', '#10b981'],
        pillars: ['Rotina real', 'Antes e depois', 'Prova social'],
        sampleHooks: ['O segredo simples na minha rotina'],
        defaultCta: 'Clique no link',
        heroVisualUrl: '/showcase/modelo-01.webp',
      },
      auto_routine_enabled: false,
      daily_target: 2,
      created_at: new Date().toISOString(),
    },
  ],
  studioAccounts: [
    {
      id: '00000000-0000-4000-8600-000000000001',
      user_id: USER.id,
      project_id: '00000000-0000-4000-8500-000000000001',
      handle: '@futurodigital.demo',
      platform: 'TikTok',
      stage: 'Pronta',
      health_score: 96,
      tiktok_shop: true,
      auto_warmup: true,
      avatar_url: '/showcase/modelo-01.webp',
      published_28d: 12,
      created_at: new Date().toISOString(),
    },
  ],
  studioPosts: [],
  failNextWith: null,
  lastGenerateBody: null,
};

// Imagem de teste que imita uma geração (fundo + marca d'água real aplicada pelo servidor).
const { applyWatermark } = await import('../../server/watermark.ts').catch(() => ({ applyWatermark: null }));
const rawImg = await sharp({
  create: { width: 576, height: 1024, channels: 3, background: { r: 64, g: 40, b: 120 } },
})
  .composite([
    {
      input: Buffer.from(
        `<svg width="576" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563ff"/><stop offset=".5" stop-color="#7c3aed"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs><rect width="576" height="1024" fill="url(#g)" opacity=".55"/><circle cx="288" cy="420" r="150" fill="#f1c7a8"/><rect x="128" y="600" width="320" height="424" rx="140" fill="#1f1f2e"/></svg>`,
      ),
    },
  ])
  .png()
  .toBuffer();
const testImage = applyWatermark ? await applyWatermark(rawImg) : rawImg;

function makeAvatar(i, body, generationId) {
  const id = `00000000-0000-4000-8000-${String(Date.now() + i).padStart(12, '0').slice(-12)}`;
  return {
    id,
    user_id: USER.id,
    generation_id: generationId,
    name: i === 0 ? 'Influencer IA' : `Influencer IA ${i + 1}`,
    image_url: `${SB}/storage/v1/object/public/avatars/${USER.id}/${id}.png`,
    prompt: body.prompt || 'características',
    attributes: body.attributes,
    engine: 'gemini-3.1-flash-image',
    framing: body.framing,
    aspect_ratio: body.aspectRatio,
    is_public: body.makePublic,
    is_favorite: false,
    created_at: new Date().toISOString(),
  };
}

async function installMocks(page) {
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(`${SB}/auth/v1/**`, (route) => {
    const url = route.request().url();
    if (url.includes('/token')) {
      return json(route, 200, {
        access_token: 'fake-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'fake-refresh',
        user: { ...USER, aud: 'authenticated', role: 'authenticated' },
      });
    }
    if (url.includes('/logout')) return route.fulfill({ status: 204 });
    if (url.includes('/user')) return json(route, 200, { ...USER, aud: 'authenticated', role: 'authenticated' });
    return json(route, 200, {});
  });

  await page.route(`${SB}/rest/v1/**`, (route) => {
    const req = route.request();
    const url = req.url();
    const wantsObject = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    if (url.includes('/profiles')) {
      const profile = { id: USER.id, name: 'Jonathan Teste', plan: 'free', coins_balance: state.balance };
      return json(route, 200, wantsObject ? profile : [profile]);
    }
    if (url.includes('/avatars')) {
      const list = url.includes('is_public=eq.true') ? state.avatars.filter((a) => a.is_public) : state.avatars;
      return json(route, 200, list);
    }
    if (url.includes('/generations')) return json(route, 200, state.generations);
    return json(route, 200, []);
  });

  await page.route(`${SB}/storage/v1/object/public/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: testImage }),
  );

  await page.route(`${BASE}/api/prompt/enhance`, (route) =>
    json(route, 200, { prompt: 'Mulher sorrindo segurando o pote do suplemento numa cozinha clara, luz da manhã entrando pela janela, enquadramento meio corpo.' }),
  );

  // O painel consulta templates salvos ao abrir; mantenha esse endpoint isolado
  // junto com os demais mocks, sem deixar o Vite tentar alcançar a API real.
  await page.route(`${BASE}/api/avatars/templates`, (route) =>
    json(route, 200, { templates: [] }),
  );

  await page.route(`${BASE}/api/avatars/generate`, async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    state.lastGenerateBody = body;
    if (state.failNextWith) {
      const err = state.failNextWith;
      state.failNextWith = null;
      return json(route, err.status, { error: { code: err.code, message: err.message } });
    }
    await new Promise((r) => setTimeout(r, 900)); // deixa o "gerando" aparecer
    const cost = 2 * body.count;
    state.balance -= cost;
    const generationId = crypto.randomUUID();
    const safeParams = {
      ...body,
      basePhoto: body.basePhoto ? { name: body.basePhoto.name, mimeType: body.basePhoto.mimeType } : null,
      productImage: body.productImage ? { name: body.productImage.name, mimeType: body.productImage.mimeType } : null,
      referenceImages: (body.referenceImages ?? []).map((image, index) => ({ name: image.name ?? `Referência ${index + 1}`, mimeType: image.mimeType })),
    };
    const avatars = Array.from({ length: body.count }, (_, i) => makeAvatar(i, body, generationId));
    state.avatars = [...avatars, ...state.avatars];
    const generation = {
      id: generationId, kind: 'avatar_image', status: 'done', cost, params: safeParams,
      result_count: avatars.length, error: null, created_at: new Date().toISOString(), completed_at: new Date().toISOString(),
    };
    state.generations = [generation, ...state.generations];
    return json(route, 200, { generation, avatars, balance: state.balance, refunded: 0 });
  });

  await page.route(`${BASE}/api/avatars/gallery**`, (route) => {
    const scope = new URL(route.request().url()).searchParams.get('scope');
    const avatars = scope === 'community' ? state.avatars.filter((avatar) => avatar.is_public) : state.avatars;
    return json(route, 200, { avatars });
  });

  await page.route(`${BASE}/api/avatars/*`, (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    const id = route.request().url().split('/').pop();
    state.avatars = state.avatars.filter((a) => a.id !== id);
    return json(route, 200, { ok: true });
  });

  await page.route(`${BASE}/api/ai-ugc/generate-script`, (route) =>
    json(route, 200, {
      options: [
        {
          id: 's1',
          title: 'Roteiro IA Natural',
          script: 'Gente, testei esse sérum durante duas semanas e minha pele mudou demais.',
          scenes: [{ index: 0, text: 'Gente, testei esse sérum durante duas semanas e minha pele mudou demais.', estimatedSeconds: 6 }],
        },
      ],
    }),
  );

  await page.route(`${BASE}/api/ai-ugc/create`, async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    state.lastUgcBody = body;
    const perScene = body.engine === 'omni-flash' ? 30 : 10;
    const cost = (body.scenes?.length ?? 1) * perScene;
    state.balance = Math.max(0, state.balance - cost);
    const project = {
      id: `00000000-0000-4000-9000-${String(Date.now()).padStart(12, '0').slice(-12)}`,
      user_id: USER.id,
      mode: body.mode || 'talking',
      origin: body.origin || 'projects',
      mediaType: body.mediaType || 'video',
      title: body.title || 'Projeto Teste E2E',
      status: 'done',
      engine: body.engine || 'veo-3.1-fast',
      aspect_ratio: body.aspectRatio || '9:16',
      duration_seconds: (body.scenes?.length ?? 1) * 8,
      scene_count: body.scenes?.length ?? 1,
      cost,
      refunded: 0,
      thumbnail_url: body.avatarUrl || '/showcase/modelo-01.webp',
      video_url: '/showcase/demo-video.mp4',
      params: {
        voiceType: body.voiceType,
        captions: body.captions,
        reference_mode: body.referenceMode,
        actual_engine: body.engine === 'omni-flash' ? 'omni-flash-1.2' : body.engine,
        billing_mode: body.engine === 'veo-3.1-lowerpriority' ? 'unlimited' : 'credits',
        reference_assets: (body.referenceImageNames || []).map((name, index) => ({ kind: 'elemento', name, url: '/showcase/modelo-01.webp', path: `fixture/${index}.jpg` })),
      },
      scenes: (body.scenes || []).map((s, idx) => ({
        index: idx,
        text: s.text,
        action: s.action,
        status: 'done',
        duration_seconds: s.durationSeconds || 8,
      })),
      error: null,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 86400_000).toISOString(),
    };
    state.projects = [project, ...state.projects];
    return json(route, 200, { project, balance: state.balance });
  });

  await page.route(`${BASE}/api/ai-ugc/generate-hooks`, (route) =>
    json(route, 200, {
      hooks: [
        'Ninguém te contou esse segredo sobre o Sérum antes de comprar',
        'Parei de gastar dinheiro à toa depois de 7 dias com esse Sérum',
        'O erro #1 que impede sua pele de responder ao skincare',
      ],
    }),
  );

  await page.route(`${BASE}/api/ai-ugc/generate-slides`, (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const n = body.slideCount || 5;
    return json(route, 200, {
      slides: Array.from({ length: n }, (_, i) => ({
        headline: `Slide IA ${i + 1} · ${body.productName || 'Rotina'}`,
        body: `Ponto prático ${i + 1} estruturado para alta retenção.`,
        visualPrompt: `Vertical skincare studio slide ${i + 1}`,
      })),
    });
  });

  await page.route(`${BASE}/api/ai-ugc/create-slideshow`, (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const slides = body.slides || [];
    const cost = slides.length * 2;
    state.balance = Math.max(0, state.balance - cost);
    const project = {
      id: `00000000-0000-4000-9100-${String(Date.now()).padStart(12, '0').slice(-12)}`,
      user_id: USER.id,
      mode: 'slideshow',
      title: body.title || 'Slideshow Teste E2E',
      status: 'done',
      engine: body.engine || 'nano-banana-2',
      aspect_ratio: body.aspectRatio || '9:16',
      duration_seconds: slides.length * 3,
      scene_count: slides.length,
      cost,
      refunded: 0,
      thumbnail_url: '/showcase/modelo-01.webp',
      video_url: '/showcase/modelo-01.webp',
      scenes: slides.map((s, idx) => ({
        index: idx,
        headline: s.headline,
        text: s.body || s.headline,
        status: 'done',
        duration_seconds: 3,
        image_url: '/showcase/modelo-01.webp',
      })),
      error: null,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 86400_000).toISOString(),
    };
    state.projects = [project, ...state.projects];
    return json(route, 200, { project, balance: state.balance });
  });

  await page.route(`${BASE}/api/ai-ugc/create-image-ad`, (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const count = body.count || 1;
    const cost = count * 2;
    state.balance = Math.max(0, state.balance - cost);
    const project = {
      id: `00000000-0000-4000-9200-${String(Date.now()).padStart(12, '0').slice(-12)}`,
      user_id: USER.id,
      mode: 'image-ad',
      title: body.title || 'Image Ad Teste E2E',
      status: 'done',
      engine: body.engine || 'nano-banana-2',
      aspect_ratio: body.aspectRatio || '1:1',
      duration_seconds: 1,
      scene_count: count,
      cost,
      refunded: 0,
      thumbnail_url: '/showcase/modelo-06.webp',
      video_url: '/showcase/modelo-06.webp',
      scenes: Array.from({ length: count }, (_, idx) => ({
        index: idx,
        headline: body.headline || 'Oferta',
        text: `${body.productName} · ${body.ctaText || 'Comprar'}`,
        status: 'done',
        duration_seconds: 1,
        image_url: '/showcase/modelo-06.webp',
      })),
      error: null,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 86400_000).toISOString(),
    };
    state.projects = [project, ...state.projects];
    return json(route, 200, { project, balance: state.balance });
  });

  await page.route(`${BASE}/api/viral/folders`, (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const folder = { id: `00000000-0000-4000-8300-${String(Date.now()).padStart(12, '0').slice(-12)}`, user_id: USER.id, name: body.name, formats: body.formats || ['Remake Viral'], created_at: new Date().toISOString() };
      state.viralFolders.push(folder);
      return json(route, 200, { folder });
    }
    return json(route, 200, { folders: state.viralFolders, items: state.viralItems });
  });

  await page.route(`${BASE}/api/viral/folders/*`, (route) => {
    const id = route.request().url().split('/').pop();
    if (route.request().method() === 'PATCH') {
      const body = JSON.parse(route.request().postData() || '{}');
      state.viralFolders = state.viralFolders.map((f) => (f.id === id ? { ...f, ...body } : f));
      return json(route, 200, { folder: state.viralFolders.find((f) => f.id === id) });
    }
    state.viralFolders = state.viralFolders.filter((f) => f.id !== id);
    return json(route, 200, { ok: true });
  });

  await page.route(`${BASE}/api/viral/items`, (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const item = {
      id: `00000000-0000-4000-8400-${String(Date.now()).padStart(12, '0').slice(-12)}`,
      user_id: USER.id,
      folder_id: body.folderId,
      title: body.title || 'Referência Importada',
      source_url: body.url || null,
      platform: body.platform || 'TikTok Shop',
      thumbnail_url: body.thumbnailUrl || '/showcase/modelo-01.webp',
      niche: body.niche || 'Geral',
      viral_score: 92,
      duration_sec: body.durationSec || 15,
      manifest: null,
      created_at: new Date().toISOString(),
    };
    state.viralItems = [item, ...state.viralItems];
    return json(route, 200, { item });
  });

  await page.route(`${BASE}/api/viral/items/*`, (route) => {
    const id = route.request().url().split('/').pop();
    state.viralItems = state.viralItems.filter((i) => i.id !== id);
    return json(route, 200, { ok: true });
  });

  await page.route(`${BASE}/api/viral/manifest`, (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    return json(route, 200, {
      manifest: {
        sourceTitle: body.sourceTitle || 'Referência',
        durationSeconds: 16,
        style: 'Hook + Prova + Chamada',
        niche: body.niche || 'Skincare',
        scenes: [
          { index: 0, role: 'Hook', visualCues: 'Close direto olhando na câmera com o produto na mão.', spokenTemplate: `Olha por que ${body.targetProduct || 'esse produto'} virou febre.`, durationSeconds: 8 },
          { index: 1, role: 'Demonstração', visualCues: 'Aplicação clara em ambiente iluminado.', spokenTemplate: 'Resultado visível já nos primeiros dias.', durationSeconds: 8 },
        ],
      },
    });
  });

  await page.route(`${BASE}/api/studio/state`, (route) =>
    json(route, 200, { projects: state.studioProjects, accounts: state.studioAccounts, posts: state.studioPosts }),
  );

  await page.route(`${BASE}/api/studio/brandbook`, (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    return json(route, 200, {
      brandbook: {
        brandName: body.brandName || 'Marca IA',
        niche: body.niche || 'Skincare',
        targetAudience: body.targetAudience || 'Público geral',
        voiceTone: body.voiceTone || 'Autêntico',
        palette: ['#7c3aed', '#ec4899', '#10b981'],
        pillars: ['Rotina real sem filtro', 'Demonstração 15s', 'Depoimento humano'],
        sampleHooks: [`Ninguém te contou esse detalhe sobre ${body.productName || 'seu produto'}`],
        defaultCta: 'Garanta no link oficial',
        heroVisualUrl: '/showcase/modelo-01.webp',
      },
    });
  });

  const handleStudioProjects = (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const created = { id: `00000000-0000-4000-8500-${String(Date.now()).slice(-12)}`, user_id: USER.id, name: body.name, niche: body.niche, product_name: body.productName, is_active: true, brandbook: body.brandbook || {}, auto_routine_enabled: false, daily_target: 2, created_at: new Date().toISOString() };
      state.studioProjects.push(created);
      return json(route, 200, { project: created });
    }
    const id = route.request().url().split('/').pop();
    if (method === 'PATCH') {
      const patch = JSON.parse(route.request().postData() || '{}');
      state.studioProjects = state.studioProjects.map((p) => (p.id === id ? { ...p, ...patch } : p));
      return json(route, 200, { project: state.studioProjects.find((p) => p.id === id) });
    }
    return json(route, 200, { ok: true });
  };
  await page.route(`${BASE}/api/studio/projects`, handleStudioProjects);
  await page.route(`${BASE}/api/studio/projects/*`, handleStudioProjects);

  const handleStudioAccounts = (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const acc = { id: `00000000-0000-4000-8600-${String(Date.now()).slice(-12)}`, user_id: USER.id, project_id: body.projectId, handle: body.handle, platform: body.platform, stage: body.stage || 'Criada', health_score: 94, tiktok_shop: Boolean(body.tiktokShop), auto_warmup: true, avatar_url: body.avatarUrl || '/showcase/modelo-01.webp', published_28d: 0, created_at: new Date().toISOString() };
      state.studioAccounts.push(acc);
      return json(route, 200, { account: acc });
    }
    const id = route.request().url().split('/').pop();
    if (method === 'DELETE') {
      state.studioAccounts = state.studioAccounts.filter((a) => a.id !== id);
      return json(route, 200, { ok: true });
    }
    if (method === 'PATCH') {
      const patch = JSON.parse(route.request().postData() || '{}');
      state.studioAccounts = state.studioAccounts.map((a) => (a.id === id ? { ...a, ...patch } : a));
      return json(route, 200, { account: state.studioAccounts.find((a) => a.id === id) });
    }
    return json(route, 200, { account: state.studioAccounts[0] });
  };
  await page.route(`${BASE}/api/studio/accounts`, handleStudioAccounts);
  await page.route(`${BASE}/api/studio/accounts/*`, handleStudioAccounts);

  const handleStudioPosts = (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const post = { id: `00000000-0000-4000-8700-${String(Date.now()).slice(-12)}`, user_id: USER.id, ...body, status: 'scheduled', created_at: new Date().toISOString() };
      state.studioPosts.push(post);
      return json(route, 200, { post });
    }
    return json(route, 200, { ok: true });
  };
  await page.route(`${BASE}/api/studio/posts`, handleStudioPosts);
  await page.route(`${BASE}/api/studio/posts/*`, handleStudioPosts);

  await page.route(`${BASE}/api/projects**`, (route) => {
    const origin = new URL(route.request().url()).searchParams.get('origin') || 'projects';
    return json(route, 200, { projects: state.projects.filter((project) => (project.origin || 'projects') === origin) });
  });

  await page.route(`${BASE}/api/projects/*`, (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    const id = route.request().url().split('/').pop();
    state.projects = state.projects.filter((p) => p.id !== id);
    return json(route, 200, { ok: true });
  });
}

// ------------------------------------------------------------- servidor
function startVite() {
  const child = spawn(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: root,
    env: { ...process.env, VITE_SUPABASE_URL: SB, VITE_SUPABASE_ANON_KEY: 'fake-anon-key' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite não subiu em 30s')), 30000);
    child.stdout.on('data', (d) => {
      if (String(d).includes('Local')) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.stderr.on('data', (d) => process.stderr.write(d));
  });
}

// ------------------------------------------------------------- roteiro
async function run() {
  if (!CHROME) throw new Error('Chrome não encontrado. Defina CHROME_PATH.');
  const vite = await startVite();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const consoleErrors = [];

  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 940 }, locale: 'pt-BR' });
    const page = await context.newPage();
    page.on('pageerror', (e) => consoleErrors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource|wss:\/\/fake-projeto\.supabase\.co\/realtime/.test(m.text()) && consoleErrors.push(m.text()));
    await installMocks(page);

    console.log('\n1) Login');
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL('**/login');
    check(page.url().endsWith('/login'), 'Quem não está logado é mandado para a tela de login');
    check(await page.getByAltText('FUTURO DIGITAL').first().isVisible(), 'Logo FUTURO DIGITAL aparece na tela de login');
    await page.screenshot({ path: path.join(shotsDir, '01-login.png') });
    await page.getByPlaceholder('voce@email.com').fill(USER.email);
    await page.getByPlaceholder('Mínimo 6 caracteres').fill('senha-teste-123');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForURL('**/dashboard');
    check(true, 'Login leva para o painel (/dashboard)');

    console.log('\n2) Home');
    await page.getByTestId('home-greeting').waitFor();
    const greet = await page.getByTestId('home-greeting').textContent();
    check(/Jonathan/.test(greet), `Saudação usa o nome do usuário ("${greet}")`);
    await page.getByTestId('credits-balance').getByText('20').waitFor();
    check(true, 'Saldo de 20 créditos aparece no menu');
    const homeImgsOk = await page
      .waitForFunction(() => {
        const imgs = [...document.querySelectorAll('main img')];
        return imgs.length >= 8 && imgs.every((i) => i.complete && i.naturalWidth > 0);
      }, null, { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    check(homeImgsOk, 'Imagens da Home e modelos de inspiração carregam');
    await page.screenshot({ path: path.join(shotsDir, '02-home.png') });

    await page.getByRole('button', { name: /Mudar para tema claro/ }).click();
    check((await page.evaluate(() => document.documentElement.dataset.theme)) === 'light', 'Botão de tema troca para claro');
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(shotsDir, '03-home-tema-claro.png') });
    await page.getByRole('button', { name: /Mudar para tema escuro/ }).click();
    check((await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark', 'E volta para escuro');

    check(await page.getByRole('link', { name: /Explorar o Studio/ }).isVisible(), 'Home aponta para o Studio sem depender do antigo bloco de ferramentas populares');
    check((await page.getByText(/Ferramentas populares/).count()) === 0, 'Home não repete o bloco antigo de ferramentas populares');

    await page.getByRole('button', { name: 'Personalizar menu' }).click();
    const customDlg = page.getByRole('dialog', { name: 'Personalizar menu' });
    await customDlg.waitFor();
    const customChecks = await customDlg.locator('input[type="checkbox"]').count();
    check(customChecks === 6, `Modal Personalizar menu exibe ${customChecks} itens reais marcáveis`);
    await customDlg.getByRole('button', { name: 'Pronto' }).click();

    console.log('\n3) Influencer IA — painel de características');
    await page.goto(`${BASE}/avatars?panel=motion`);
    check(await page.getByText('Templates personalizados').isVisible(), 'Atalho legado ?panel=motion abre o novo painel de templates');
    check(await page.getByRole('tab', { name: 'Imagens geradas' }).isVisible() && await page.getByRole('tab', { name: 'Vídeos gerados' }).isVisible() && (await page.getByRole('tab', { name: /Motion Control/ }).count()) === 0, 'Compositor mostra Imagens e Vídeos gerados sem a aba removida Motion Control');
    await page.getByRole('tab', { name: 'Criar Influencer' }).click();
    const presetSwitch = page.getByRole('switch', { name: 'Aplicar opções da lateral ao canvas' });
    check((await presetSwitch.getAttribute('aria-checked')) === 'false', 'Painel esquerdo começa desativado para geração livre no canvas');
    await page.getByRole('tab', { name: 'Templates IA' }).click();
    check(await page.getByText('BIBLIOTECA DE TEMPLATES').isVisible(), 'Templates ficam na lateral, independentes da chave de influencer');
    check(await page.getByRole('button', { name: /Aplicar prompt no canvas/ }).isEnabled(), 'Template é aplicado sem gerar pela lateral');
    await page.getByRole('tab', { name: 'Criar Influencer' }).click();
    await page.getByTestId('prompt-composer').getByRole('tab', { name: 'Vídeo' }).click();
    check(await page.getByRole('tab', { name: 'Criar Influencer' }).getAttribute('aria-selected') === 'true', 'Selecionar Vídeo no canvas mantém a aba esquerda Criar Influencer');
    check(await page.getByRole('button', { name: 'Modelo de vídeo' }).isVisible() && (await page.getByRole('button', { name: 'Modelo de imagem' }).count()) === 0, 'Modo Vídeo mostra modelos de vídeo e oculta os de imagem');
    await page.getByTestId('prompt-composer').getByRole('tab', { name: 'Imagem' }).click();
    check(await page.getByRole('button', { name: 'Modelo de imagem' }).isVisible() && (await page.getByRole('button', { name: 'Modelo de vídeo' }).count()) === 0, 'Modo Imagem mostra modelos de imagem e oculta os de vídeo');
    await presetSwitch.click();
    check(await page.getByTestId('generate-from-panel').isEnabled(), 'Ligar a chave ativa a validação do influencer no rodapé à esquerda');
    for (const label of ['Vídeos gerados', 'Imagens geradas']) {
      const mediaTab = page.getByRole('tab', { name: new RegExp(label) });
      await mediaTab.click();
      check((await mediaTab.getAttribute('aria-selected')) === 'true', `A aba de resultados "${label}" alterna corretamente`);
    }
    await page.getByRole('button', { name: /^Tipo de personagem/ }).waitFor();
    const groupButtons = await page.locator('aside[aria-label="Criar influencer"] section > button[aria-expanded]').count();
    check(groupButtons === 19, `19 grupos de características disponíveis no painel (${groupButtons})`);
    const thumbsOk = await page
      .waitForFunction(() => {
        const imgs = [...document.querySelectorAll('[role="group"][aria-label="Tipo de personagem"] img')];
        return imgs.length === 24 && imgs.every((i) => i.complete && i.naturalWidth > 0);
      }, null, { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    check(thumbsOk, 'Todas as 24 fotos dos tipos de personagem carregam no painel');
    check((await page.locator('[data-testid="avatar-grid"]').count()) === 0, 'Biblioteca de presets não fica duplicada na página Avatar');
    check((await page.getByRole('tab', { name: /Avatares da Comunidade/ }).count()) === 0, 'Galeria de comunidade não ocupa o canvas Avatar');
    await page.screenshot({ path: path.join(shotsDir, '04-influencer-ia.png') });

    await page.getByRole('button', { name: /^Etnia/ }).click();
    const ethOk = await page
      .waitForFunction(() => {
        const imgs = [...document.querySelectorAll('[role="group"][aria-label="Etnia"] img')];
        return imgs.length === 6 && imgs.every((i) => i.complete && i.naturalWidth > 0);
      }, null, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    check(ethOk, 'Grupo Etnia carrega as 6 fotos reais no painel');

    await page.getByRole('button', { name: /^Cabelo/ }).click();
    const curly = page.getByRole('group', { name: 'Cabelo' }).getByRole('button', { name: 'Cacheado longo' });
    await curly.click();
    check((await curly.getAttribute('aria-pressed')) === 'true', 'Escolher "Cacheado longo" marca a opção');
    await page.getByRole('group', { name: 'Cabelo' }).getByRole('button', { name: 'Coque', exact: true }).click();
    check((await curly.getAttribute('aria-pressed')) === 'false', 'Grupo de escolha única troca a opção (desmarca a anterior)');

    await page.getByRole('button', { name: /^Acessórios/ }).click();
    const acc = page.getByRole('group', { name: 'Acessórios' });
    await acc.getByRole('button', { name: 'Óculos de grau' }).click();
    await acc.getByRole('button', { name: 'Relógio' }).click();
    check((await acc.locator('[aria-pressed="true"]').count()) === 2, 'Grupo de vários (Acessórios) aceita 2 escolhas ao mesmo tempo');

    const before = await page.evaluate(() => localStorage.getItem('fd-avatar-studio'));
    await page.getByRole('button', { name: 'Sortear características' }).click();
    const after = await page.evaluate(() => localStorage.getItem('fd-avatar-studio'));
    check(before !== after, 'Botão Aleatório sorteia novas características (e salva no navegador)');

    await page.getByRole('button', { name: /Monte seu Personagem/ }).click();
    const characterDialog = page.getByRole('dialog', { name: 'Monte seu Personagem' });
    const characterDescription = characterDialog.getByLabel('Descrição para montar seu personagem');
    await characterDescription.click();
    await characterDescription.pressSequentially('bz');
    check(
      (await characterDescription.inputValue()) === 'bz' && await characterDescription.evaluate((el) => document.activeElement === el),
      'Campo Monte seu Personagem mantém o foco durante a digitação caractere por caractere',
    );
    await characterDescription.fill('Uma personagem fantástica com cabelo azul volumoso e roupa dourada.');
    await characterDialog.getByLabel('Descrição do mundo do personagem').fill('Vive em uma cidade futurista iluminada por letreiros.');
    await page.getByRole('button', { name: 'Salvar' }).click();
    check(await page.getByText(/Uma personagem fantástica/).first().isVisible(), 'Prompt personalizado salva e aparece no painel');

    await page.getByTestId('base-photo-input').setInputFiles({ name: 'rosto.png', mimeType: 'image/png', buffer: rawImg });
    await page.getByText('Foto base enviada').waitFor();
    check(true, 'Envio de foto base mostra a prévia ("Foto base enviada")');
    check(await page.getByTestId('prompt-composer').getByRole('button', { name: 'Escolher influencer' }).isVisible(), 'Foto de referência fica fora do slot INFLUENCER até ser validada');
    check((await presetSwitch.getAttribute('aria-checked')) === 'true', 'Chave permanece ligada durante a personalização do influencer');
    await presetSwitch.click();
    check((await page.getByTestId('generate-from-panel').isDisabled()), 'Desligar a chave desativa a validação e as opções da esquerda');
    await presetSwitch.click();
    check((await presetSwitch.getAttribute('aria-checked')) === 'true', 'Chave liga as opções da lateral');
    await presetSwitch.click();
    check((await presetSwitch.getAttribute('aria-checked')) === 'false', 'Chave desliga as opções da lateral');

    console.log('\n4) Barra de prompt + geração');
    await page.getByRole('tab', { name: 'Imagem' }).click();
    await page.getByLabel('Descreva o que você quer criar').fill('tomando suplemento na cozinha');
    await page.getByRole('button', { name: 'Melhorar' }).click();
    await page.waitForFunction(() => document.querySelector('textarea[aria-label="Descreva o que você quer criar"]')?.value.includes('luz da manhã'));
    check(true, 'Botão Melhorar reescreve a descrição com IA');

    await page.getByTestId('reference-input').setInputFiles({ name: 'ref.png', mimeType: 'image/png', buffer: rawImg });
    await page.getByAltText('Referência 1').waitFor();
    check(true, 'Imagem de referência entra na barra');

    await page.getByTestId('product-input').setInputFiles({ name: 'produto.png', mimeType: 'image/png', buffer: rawImg });
    await page.getByAltText('PRODUTO').waitFor();
    check(true, 'Foto do produto entra no slot PRODUTO');

    await page.getByRole('button', { name: 'Proporção' }).click();
    await page.getByRole('option', { name: /1:1/ }).click();
    await page.getByRole('button', { name: 'Proporção' }).click();
    await page.getByRole('option', { name: /9:16/ }).click();
    check(await page.getByRole('button', { name: 'Proporção' }).textContent().then((t) => t.includes('9:16')), 'Seletor de proporção funciona');

    await page.getByRole('button', { name: 'Mais imagens' }).click();
    check((await page.getByTestId('image-count').textContent()) === '2/4', 'Contador de imagens vai para 2/4');
    check((await page.getByTestId('generate-from-prompt').textContent()).includes('4'), 'Botão GERAR mostra o custo certo (4 créditos)');

    await page.getByTestId('generate-from-prompt').click();
    await page.getByTestId('generate-from-prompt').getByText('GERANDO IMAGEM…', { exact: false }).waitFor();
    check(true, 'O compositor informa quando a imagem está sendo gerada');
    await page.screenshot({ path: path.join(shotsDir, '05-gerando.png') });
    await page.getByText(/imagem\(ns\) pronta\(s\)/).first().waitFor({ timeout: 10000 });
    await page.getByRole('button', { name: 'Abrir imagem Influencer IA' }).first().waitFor();
    check(true, 'A imagem gerada fica disponível na galeria de resultados');
    const body = state.lastGenerateBody;
    check(body.mode === 'prompt' && body.count === 2, 'Pedido enviado: modo prompt, 2 imagens');
    check(body.prompt === 'Mulher sorrindo segurando o pote do suplemento numa cozinha clara, luz da manhã entrando pela janela, enquadramento meio corpo.', 'Canvas envia o prompt escrito, mesmo com a chave desligada');
    check(!body.basePhoto?.data && Boolean(body.productImage?.data) && body.referenceImages.length === 1, 'Com a chave desligada, envia produto e referência sem aplicar a foto-base');
    check(body.referenceImages[0]?.name === 'ref.png', 'Canvas envia o nome e os dados da imagem de referência');
    check(Object.keys(body.attributes).length === 0 && body.characterWorld === '', 'Com a chave desligada, não envia atributos ou mundo do influencer');
    await page.getByRole('button', { name: 'Abrir imagem Influencer IA' }).first().click();
    const generatedImageDialog = page.getByRole('dialog', { name: 'Influencer IA' });
    await generatedImageDialog.getByRole('img', { name: 'Influencer IA' }).waitFor();
    await generatedImageDialog.getByTestId('used-generation-details').waitFor();
    await generatedImageDialog.getByText('produto.png').waitFor();
    await generatedImageDialog.getByText('ref.png').waitFor();
    check(true, 'Imagem gerada abre e o detalhe mostra prompt, produto e referências usados');
    await generatedImageDialog.getByRole('button', { name: 'Fechar' }).click();
    await page.getByTestId('credits-balance').getByText('16').waitFor();
    check(true, 'Saldo cai de 20 para 16 depois de gerar');
    await page.getByRole('tab', { name: /Meus Avatares/ }).click();
    const imgs = await page.getByTestId('avatar-grid').locator('img').count();
    check(imgs === 2, `As 2 imagens aparecem em "Meus avatares" (${imgs})`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(shotsDir, '06-resultado.png') });

    console.log('\n5) Detalhe do avatar');
    await page.getByTestId('avatar-grid').locator('button').first().click();
    const dialog = page.getByRole('dialog');
    for (const name of ['Usar este rosto como base', 'Recriar com estas características', 'Baixar imagem', 'Publicar na Comunidade', 'Apagar']) {
      check(await dialog.getByRole('button', { name }).isVisible(), `Detalhe tem o botão "${name}"`);
    }
    await page.screenshot({ path: path.join(shotsDir, '07-detalhe.png') });
    await dialog.getByRole('button', { name: 'Usar este rosto como base' }).click();
    await page.getByTestId('prompt-composer').getByAltText('INFLUENCER').waitFor();
    check(true, '"Usar este rosto como base" coloca o avatar no slot INFLUENCER');

    console.log('\n6) Histórico e erros');
    check((await page.getByRole('tab', { name: 'Histórico' }).count()) === 0, 'Histórico não fica duplicado na aba Avatar');
    await page.goto(`${BASE}/projects`);
    await page.getByRole('heading', { name: 'Meus Projetos' }).waitFor();
    await page.getByRole('tab', { name: /Histórico/ }).click();
    await page.getByTestId('history-list').waitFor();
    check((await page.getByTestId('history-list').locator('li').count()) === 1, 'Histórico em Projetos mostra a geração feita');

    state.failNextWith = { status: 402, code: 'INSUFFICIENT_CREDITS', message: 'Você precisa de 4 créditos para gerar 2 imagem(ns).' };
    await page.goto(`${BASE}/avatars`);
    await page.getByRole('tab', { name: 'Explorar' }).click();
    await page.getByTestId('generate-from-prompt').click();
    await page.getByText('Você precisa de 4 créditos').first().waitFor();
    check(true, 'Erro de créditos insuficientes aparece em português para o usuário');

    await page.getByRole('button', { name: /Notificações/ }).click();
    check(await page.getByText('Influencer pronto').isVisible(), 'Central de notificações registra a geração');
    await page.keyboard.press('Escape');

    console.log('\n7) Entrega 2 — AI UGC com páginas dedicadas e Projetos');
    await page.goto(`${BASE}/ai-ugc`);
    await page.getByRole('link', { name: 'ADS', exact: true }).click();
    await page.waitForURL('**/ai-ugc/ads');
    await page.getByRole('heading', { name: /CRIE VÍDEOS HIPER REALISTAS/ }).waitFor();
    await page.screenshot({ path: path.join(shotsDir, '09-ai-ugc-ads.png') });
    await page.getByTestId('ads-new-project').click();
    await page.getByRole('dialog', { name: /Criar Vídeo ADS/ }).waitFor();
    check(true, 'Aba ADS abre página dedicada /ai-ugc/ads e assistente de 8 etapas');
    await page.keyboard.press('Escape');

    await page.getByRole('link', { name: 'LINK', exact: true }).click();
    await page.waitForURL('**/ai-ugc/link');
    await page.getByTestId('link-fill-example').click();
    await page.getByRole('heading', { name: 'Informações do produto' }).waitFor();
    check(true, 'Modo Link permite testar produto de exemplo em 1 clique');

    await page.getByRole('link', { name: 'ANÚNCIO DE PERSONAGEM FALANTE', exact: true }).click();
    await page.waitForURL('**/ai-ugc/falante');
    await page.getByTestId('talking-generate-script').click();
    await page.getByText(/1 cena\(s\)/).waitFor();
    check(true, 'Personagem Falante gera roteiro e divide em cenas de ~8s');
    await page.screenshot({ path: path.join(shotsDir, '10-ai-ugc-falante.png') });
    const projectsGrid = page.locator('[data-guide-target="projects-grid"]');
    await page.getByTestId('talking-create-btn').click();
    await page.waitForURL('**/projects');
    await page.getByRole('heading', { name: 'Meus Projetos' }).waitFor();
    await projectsGrid.getByText(/Personagem Falante ·/).first().waitFor();
    check(await projectsGrid.getByText(/Personagem Falante ·/).first().isVisible(), 'Projeto criado aparece em Meus Projetos e debita saldo (16 -> 6)');
    await page.screenshot({ path: path.join(shotsDir, '11-projetos.png') });

    console.log('\n7B) Entrega 3 — Hook+Demo, Slideshows, Templates de Avatar e Image Ads');
    state.balance = 50;
    await page.goto(`${BASE}/ai-ugc/hook-demo`);
    await page.reload();
    await page.getByTestId('credits-balance').getByText('50').waitFor();
    await page.getByTestId('hook-generate-btn').click();
    await page.getByText(/Ninguém te contou esse segredo/).first().waitFor();
    await page.screenshot({ path: path.join(shotsDir, '13-hook-demo.png') });
    check(true, 'Hook+Demo gera ideias de gancho e atualiza a prévia 9:16');
    await page.getByTestId('hook-create-btn').click();
    await page.waitForURL('**/projects');
    await projectsGrid.getByText(/Hook \+ Demo ·/).first().waitFor();
    check(await projectsGrid.getByText(/Hook \+ Demo ·/).first().isVisible(), 'Projeto Hook+Demo criado e salvo em Projetos (50 -> 30)');

    await page.goto(`${BASE}/ai-ugc/slideshows`);
    await page.getByTestId('slideshow-generate-btn').click();
    await page.getByText(/Slide IA 1 ·/).first().waitFor();
    await page.screenshot({ path: path.join(shotsDir, '14-slideshows.png') });
    check(true, 'Slideshows gera roteiro de lâminas e player Reels interativo');
    await page.getByTestId('slideshow-create-btn').click();
    await page.waitForURL('**/projects');
    await page.getByRole('tab', { name: /Slideshows \(1\)/ }).click();
    await projectsGrid.getByText(/Slideshow ·/).first().waitFor();
    check(await projectsGrid.getByText(/Slideshow ·/).first().isVisible(), 'Slideshow gerado aparece no filtro Slideshows (30 -> 20)');

    state.balance = 40;
    await page.goto(`${BASE}/avatars`);
    await page.getByRole('tab', { name: 'Criar Influencer' }).click();
    const canvasSwitch = page.getByRole('switch', { name: 'Aplicar opções da lateral ao canvas' });
    if ((await canvasSwitch.getAttribute('aria-checked')) === 'true') await canvasSwitch.click();
    const removeCanvasAvatar = page.getByRole('button', { name: 'Remover influencer' });
    if (await removeCanvasAvatar.count()) await removeCanvasAvatar.click();
    await page.getByLabel('Descreva o que você quer criar').fill('Anime esta imagem de referência mantendo a pessoa e o look.');
    await page.getByTestId('reference-input').setInputFiles({ name: 'motion-canvas.png', mimeType: 'image/png', buffer: rawImg });
    await page.getByAltText('Referência 1').waitFor();
    await page.getByTestId('prompt-composer').getByRole('tab', { name: 'Vídeo' }).click();
    check(await page.getByRole('tab', { name: 'Criar Influencer' }).getAttribute('aria-selected') === 'true', 'Selecionar Vídeo mantém a coluna esquerda e o painel de presets inalterados');
    const videoModel = page.getByRole('button', { name: 'Modelo de vídeo' });
    await videoModel.click();
    await page.getByRole('option', { name: /Veo 3.1 · lower priority/ }).click();
    check((await page.getByRole('button', { name: 'Modelo de vídeo' }).textContent()).includes('Veo 3.1 · lower priority'), 'Modo Vídeo oferece e seleciona Veo 3.1 lower priority');
    const videoCta = page.getByTestId('generate-from-prompt');
    check((await videoCta.textContent()).trim() === 'GERAR', 'CTA de vídeo mostra apenas GERAR, sem preço');
    await page.screenshot({ path: path.join(shotsDir, '15-avatar-video-templates.png') });
    await videoCta.click();
    await page.waitForURL('**/avatars?media=videos');
    await page.getByText(/Avatar ·/).first().waitFor();
    const motionRequest = state.lastUgcBody;
    check(
      motionRequest?.origin === 'avatar' && motionRequest?.mode === 'avatar-video' && motionRequest?.mediaType === 'video' && motionRequest?.engine === 'veo-3.1-fast' &&
        motionRequest?.avatarPrompt?.includes('Anime esta imagem de referência') &&
        motionRequest?.referenceImages?.length === 1 && motionRequest?.referenceImageNames?.[0] === 'motion-canvas.png' &&
        !motionRequest?.avatarImageData,
      'Com a chave desligada, GERAR usa prompt e referências do canvas sem injetar o influencer lateral',
    );
    await page.getByRole('switch', { name: 'Aplicar opções da lateral ao canvas' }).click();
    const leftAvatarPhoto = await sharp({ create: { width: 360, height: 640, channels: 3, background: { r: 22, g: 126, b: 90 } } }).png().toBuffer();
    await page.getByTestId('base-photo-input').setInputFiles({ name: 'influencer-lateral.png', mimeType: 'image/png', buffer: leftAvatarPhoto });
    await page.getByText('Foto base enviada').waitFor();
    await page.getByRole('button', { name: 'Modelo de vídeo' }).click();
    await page.getByRole('option', { name: /Omni Flash 1.2/ }).click();
    const omniVideoRequest = page.waitForResponse((response) => response.url().includes('/api/ai-ugc/create') && response.request().method() === 'POST');
    await page.getByTestId('generate-from-prompt').click();
    await omniVideoRequest;
    await page.waitForURL('**/avatars?media=videos');
    const sidebarAvatarRequest = state.lastUgcBody;
    check(
      sidebarAvatarRequest?.engine === 'omni-flash' && sidebarAvatarRequest?.avatarImageData &&
        sidebarAvatarRequest?.avatarImageData !== sidebarAvatarRequest?.referenceImages?.[0],
      'Com a chave ligada, o canvas usa o influencer da lateral e permite selecionar Omni Flash 1.2',
    );
    check(
      state.projects.some((project) => project.mode === 'avatar-video' && project.origin === 'avatar' && project.mediaType === 'video') &&
        !state.projects.filter((project) => (project.origin || 'projects') === 'projects').some((project) => project.mode === 'avatar-video'),
      'Vídeos com templates ficam em Avatares e não são duplicados em Projetos',
    );

    const generatedVideo = state.projects.find((project) => project.origin === 'avatar' && project.video_url);
    const projectCardToDelete = page.getByTestId(`generated-video-card-${generatedVideo.id}`);
    const openGeneratedVideo = projectCardToDelete.getByRole('button', { name: `Abrir vídeo ${generatedVideo.title} em tela cheia` });
    await openGeneratedVideo.click();
    const generationDetails = page.getByTestId('video-generation-details');
    await generationDetails.waitFor();
    const shownVideoDetails = await generationDetails.innerText();
    check(
      shownVideoDetails.includes('Prompt e instruções') &&
        shownVideoDetails.includes(generatedVideo.scenes[0]?.text || '') && Boolean(generatedVideo.scenes[0]?.text) &&
        shownVideoDetails.includes(`${generatedVideo.cost} créditos`) &&
        shownVideoDetails.includes('Referências usadas'),
      'Abrir vídeo mostra prompt, custo e referências usados na geração',
    );
    await page.getByRole('button', { name: 'Fechar' }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await projectCardToDelete.getByRole('button', { name: `Excluir vídeo ${generatedVideo.title}` }).click();
    await projectCardToDelete.waitFor({ state: 'detached' });
    check(!state.projects.some((project) => project.id === generatedVideo.id), 'Lixeira do vídeo chama DELETE e remove o card após confirmação (mock isolado)');

    state.balance = 10;
    await page.goto(`${BASE}/image-ads`);
    await page.getByTestId('image-ad-autofill').click();
    await page.getByText('MAIS VENDIDO').first().waitFor();
    await page.screenshot({ path: path.join(shotsDir, '16-image-ads.png') });
    await page.getByTestId('image-ad-create-btn').click();
    await page.waitForURL('**/projects');
    await projectsGrid.getByText(/Image Ad ·/).first().waitFor();
    check(await projectsGrid.getByText(/Image Ad ·/).first().isVisible(), 'Image Ads gera criativo estático de produto e salva em Projetos (10 -> 8)');
    await page.getByTestId('credits-balance').getByText('8').waitFor();

    console.log('\n7C) Entrega 4 — Biblioteca VIRAL e Remake Viral');
    state.balance = 40;
    await page.goto(`${BASE}/viral`);
    await page.reload();
    await page.getByTestId('credits-balance').getByText('40').waitFor();
    await page.getByRole('tab', { name: 'Minhas pastas' }).click();
    await page.getByTestId('viral-folder-card-Aleatórios').click();
    await page.waitForURL('**/viral/pasta/f-aleatorios');
    await page.getByRole('button', { name: /Skincare TikTok Shop/ }).click();
    await page.getByTestId('viral-import-btn').click();
    await page.getByText(/Hook de Choque · Sérum Vitamina C/).first().waitFor();
    check((await page.getByTestId('credits-balance').textContent()).includes('40'), 'Importar vídeo por link em Minhas pastas não consome créditos');
    await page.screenshot({ path: path.join(shotsDir, '17-viral-pastas.png') });

    await page.getByRole('link', { name: /Voltar para Minhas pastas/ }).click();
    await page.waitForURL('**/viral');
    await page.getByRole('tab', { name: 'Perfis minerados' }).click();
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get('tab') === 'profiles');
    await page.getByText('Nota 97/100').waitFor();
    check((await page.getByText('Nota 97/100').count()) > 0, 'Perfis minerados exibem nota de projeção viral (0–100)');

    await page.getByRole('tab', { name: 'Novidades explodindo' }).click();
    await page.getByRole('button', { name: /Ver vídeos e clonar/ }).first().click();
    await page.getByRole('button', { name: 'Clonar só os vídeos', exact: true }).click();
    await page.waitForURL('**/ai-ugc/remake');
    await page.getByTestId('remake-manifest-btn').click();
    await page.waitForFunction(() => [...document.querySelectorAll('textarea')].some((t) => t.value.includes('Olha por que')));
    check((await page.getByTestId('credits-balance').textContent()).includes('40'), 'Gerar Manifest cena a cena é gratuito (0 créditos)');
    await page.screenshot({ path: path.join(shotsDir, '18-remake-viral.png') });
    await page.getByTestId('remake-create-btn').click();
    await page.waitForURL('**/projects');
    await projectsGrid.getByText(/Remake ·/).first().waitFor();
    check(await projectsGrid.getByText(/Remake ·/).first().isVisible(), 'Remake Viral gera projeto e debita saldo corretamente (40 -> 20)');
    await page.getByTestId('credits-balance').getByText('20').waitFor();

    console.log('\n7D) Entrega 5 — Studio (Brandbook IA, 4 Formatos, 12 Legendas e Contas)');
    await page.goto(`${BASE}/studio`);
    await page.getByRole('heading', { name: /FUTURO DIGITAL STUDIO/ }).waitFor();
    check(await page.getByText('Comece aqui: como você quer começar?').isVisible(), 'Studio exibe onboarding e visão geral antes das ferramentas internas');

    await page.getByRole('link', { name: 'Projetos', exact: true }).last().click();
    await page.waitForURL('**/studio/projetos');
    await page.getByRole('link', { name: /Marca Teste Studio/ }).click();
    await page.waitForURL('**/studio/marca');
    await page.getByTestId('studio-brandbook-btn').click();
    await page.getByText('Rotina real sem filtro').waitFor();
    check((await page.getByTestId('credits-balance').textContent()).includes('20'), 'Gerar Brandbook com IA no Studio é gratuito (0 créditos)');
    await page.screenshot({ path: path.join(shotsDir, '19-studio-brandbook.png') });

    await page.getByRole('tab', { name: 'Criar vídeos' }).click();
    await page.waitForURL('**/studio/criar');
    await page.getByTestId('studio-format-creator-viral').click();
    await page.waitForURL('**/studio/criar/creator-viral');
    await page.getByTestId('studio-produce-btn').click();
    await page.waitForURL('**/studio/montagem');
    await page.getByText('12 ESTILOS DE LEGENDA NA MONTAGEM FINAL').waitFor();
    check(true, 'Produção em massa (Creator Viral IA) abre página do formato, gera vídeo e leva para Montagem final (20 -> 0)');

    await page.getByTestId('caption-style-neon').click();
    check(await page.getByText('Estilo: Neon').isVisible(), 'Montagem final alterna ao vivo entre os 12 estilos de legenda');
    await page.screenshot({ path: path.join(shotsDir, '20-studio-montagem.png') });

    await page.getByRole('tab', { name: 'Contas e publicação' }).click();
    await page.waitForURL('**/studio/contas');
    await page.getByTestId('studio-account-handle').fill('@minhamarca.viral');
    await page.getByTestId('studio-add-account-btn').click();
    await page.getByText('@minhamarca.viral', { exact: true }).waitFor();
    check(await page.getByText('@minhamarca.viral', { exact: true }).isVisible(), 'Contas do Studio permitem adicionar conta no funil de 11 etapas');
    await page.screenshot({ path: path.join(shotsDir, '21-studio-contas.png') });

    console.log('\n8) Responsivo no celular e saída');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/avatars`);
    await page.getByRole('heading', { name: 'SEU INFLUENCER, SEU HIT VIRAL' }).waitFor();
    check(await page.getByRole('button', { name: 'Escolher influencer' }).isVisible(), 'Slot INFLUENCER fica visível no celular (390px)');
    check(await page.getByRole('button', { name: 'Escolher produto' }).isVisible(), 'Slot PRODUTO fica visível no celular (390px)');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('dialog', { name: 'Menu de navegação' }).waitFor();
    check(true, 'Botão hambúrguer no celular abre gaveta limpa sem cortar o menu');
    await page.getByRole('button', { name: 'Fechar menu' }).click();
    await page.screenshot({ path: path.join(shotsDir, '08-celular.png'), fullPage: false });
    check(true, 'Tela Influencer IA abre no celular (390px)');

    await page.goto(`${BASE}/dashboard`);
    await page.setViewportSize({ width: 1600, height: 940 });
    await page.getByRole('button', { name: 'Menu da conta' }).click();
    await page.getByRole('button', { name: 'Sair' }).click();
    await page.waitForURL('**/login');
    check(true, 'Sair leva de volta para o login');

    check(consoleErrors.length === 0, `Nenhum erro no console do navegador${consoleErrors.length ? ': ' + consoleErrors.join(' | ') : ''}`);
  } finally {
    await browser.close();
    vite.kill();
  }

  const report = { date: new Date().toISOString(), passed: results.filter((r) => r.ok).length, failed, results };
  fs.writeFileSync(path.join(shotsDir, 'resultado.json'), JSON.stringify(report, null, 2));
  console.log(`\nResultado: ${report.passed} aprovados, ${failed} reprovados. Capturas em tests/e2e/screenshots\n`);
  process.exit(failed ? 1 : 0);
}

run().catch((err) => {
  console.error('\n❌ O teste quebrou:', err.message);
  process.exit(1);
});
