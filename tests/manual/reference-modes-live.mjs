import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);
dotenv.config({ path: 'C:/site/.env' });

const apiBase = 'http://127.0.0.1:8787/api';
const outputDir = 'C:/Users/Jonathan/Desktop/FUTURO-DIGITAL-COMPLETO/test-artifacts/reference-modes';
const blueSheetPath = 'C:/Users/Jonathan/Downloads/919c7507-d1b5-41a5-ac29-5533dc2430de.png';
const sindelPath = 'C:/Users/Jonathan/Downloads/PROJETO SILDEL/SINDEL_REF_03_IMG1_Base_Civil.png';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !anonKey || !serviceKey) throw new Error('Variáveis Supabase ausentes em C:/site/.env');

const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function dataUrl(filePath) {
  const bytes = await readFile(filePath);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

async function getAccessToken() {
  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('id,plan')
    .eq('plan', 'unlimited')
    .limit(1);
  if (profileError || !profiles?.[0]) throw new Error(`Perfil ilimitado não encontrado: ${profileError?.message ?? ''}`);
  const userId = profiles[0].id;
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  const email = userData.user?.email;
  if (userError || !email) throw new Error(`Usuário de teste inválido: ${userError?.message ?? ''}`);
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = linkData.properties?.hashed_token;
  if (linkError || !tokenHash) throw new Error(`Não foi possível gerar sessão de teste: ${linkError?.message ?? ''}`);
  const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: sessionData, error: sessionError } = await auth.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new Error(`Não foi possível autenticar o teste: ${sessionError?.message ?? ''}`);
  return { accessToken, userId };
}

async function submit(accessToken, payload) {
  const response = await fetch(`${apiBase}/ai-ugc/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`POST ${response.status}: ${JSON.stringify(body)}`);
  console.log(`[ENVIADO] ${payload.title} | projeto ${body.project.id}`);
  return body.project.id;
}

async function waitForProject(projectId, title) {
  const deadline = Date.now() + 15 * 60_000;
  let last = '';
  while (Date.now() < deadline) {
    const { data, error } = await admin.from('video_projects').select('*').eq('id', projectId).single();
    if (error) throw new Error(error.message);
    const scene = Array.isArray(data.scenes) ? data.scenes[0] : null;
    const current = `${data.status}/${scene?.status ?? 'sem-cena'}`;
    if (current !== last) {
      console.log(`[STATUS] ${title}: ${current}${scene?.error ? ` | ${scene.error}` : ''}`);
      last = current;
    }
    if (data.status === 'done') return data;
    if (data.status === 'failed') throw new Error(`${title} falhou: ${data.error ?? scene?.error ?? 'erro sem detalhe'}`);
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error(`${title} excedeu 15 minutos.`);
}

async function saveAndInspect(project, slug) {
  const storagePath = project.storage_path;
  if (!storagePath) throw new Error(`${slug}: storage_path ausente`);
  const { data, error } = await admin.storage.from('videos').download(storagePath);
  if (error || !data) throw new Error(`${slug}: falha no download: ${error?.message ?? ''}`);
  const videoPath = path.join(outputDir, `${slug}.mp4`);
  await writeFile(videoPath, Buffer.from(await data.arrayBuffer()));
  const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', videoPath]);
  const duration = Number(stdout.trim());
  for (const [name, timestamp] of [['start', '0.15'], ['middle', '4'], ['end', '7.75']]) {
    await execFileAsync('ffmpeg', ['-y', '-ss', timestamp, '-i', videoPath, '-frames:v', '1', path.join(outputDir, `${slug}-${name}.png`)]);
  }
  console.log(`[CONCLUÍDO] ${slug}: ${duration.toFixed(3)}s | ${videoPath}`);
  return { videoPath, duration };
}

await mkdir(outputDir, { recursive: true });
const [{ accessToken }, blueSheet, sindel] = await Promise.all([
  getAccessToken(),
  dataUrl(blueSheetPath),
  dataUrl(sindelPath),
]);

const base = {
  mode: 'ads',
  engine: 'veo-3.1-fast',
  aspectRatio: '9:16',
  language: 'pt-BR',
  voiceType: 'default',
  captions: false,
  resolution: '720p',
  keepClothing: true,
};

const requestedTest = process.argv[2] ?? 'all';

if (requestedTest !== 'frames') {
  const elementsTitle = `TESTE AO VIVO · Elementos R2V · ${new Date().toLocaleTimeString('pt-BR')}`;
  const elementsId = await submit(accessToken, {
    ...base,
    title: elementsTitle,
    productName: 'Guerreira azul consistente',
    referenceMode: 'elements',
    referenceImages: [blueSheet],
    scenes: [{
      durationSeconds: 8,
      text: 'A mesma guerreira permanece consistente durante toda a cena.',
      action: 'Uma única jovem guerreira adulta da ficha de referência caminha lentamente em direção à câmera em um palácio cinematográfico. Preserve exatamente o mesmo rosto jovem, sardas, cabelo castanho, tiara azul, traje azul e dourado e proporções. Corpo inteiro, movimento natural. Nunca mostre grade, colagem, ficha, múltiplas pessoas ou painel de referência.',
    }],
  });
  const elementsProject = await waitForProject(elementsId, elementsTitle);
  await saveAndInspect(elementsProject, 'elements-r2v');
}

const framesTitle = `TESTE AO VIVO · Frames I2V · ${new Date().toLocaleTimeString('pt-BR')}`;
const framesId = await submit(accessToken, {
  ...base,
  title: framesTitle,
  productName: 'Sindel — frame inicial e final',
  referenceMode: 'frames',
  startFrameImageData: sindel,
  endFrameImageData: sindel,
  scenes: [{
    durationSeconds: 8,
    text: 'A personagem atravessa a passarela e retorna à composição de referência.',
    action: 'A mulher adulta de longos cabelos prateados e vestido de veludo roxo caminha elegantemente pela passarela. A câmera faz um arco cinematográfico suave e termina exatamente no enquadramento fornecido. Preserve rosto, idade aparente, cabelo, vestido, arquitetura, cores e identidade.',
  }],
});
const framesProject = await waitForProject(framesId, framesTitle);
await saveAndInspect(framesProject, 'frames-i2v');

console.log('[RESULTADO] Os dois modos concluíram no motor Flow e os artefatos foram extraídos.');
