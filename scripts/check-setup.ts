/**
 * npm run check — confere se tudo está pronto para gerar de verdade:
 * chaves no .env, conexão com o Supabase, tabelas criadas e modelos Gemini.
 * Nunca imprime o valor das chaves.
 */
import { createClient } from '@supabase/supabase-js';
import { env, missingKeys } from '../server/env';
import { resolveModels } from '../server/gemini';

const ok = (m: string) => console.log(`  ✅ ${m}`);
const bad = (m: string) => console.log(`  ❌ ${m}`);

async function main() {
  console.log('\nFUTURO DIGITAL Studio — verificação de configuração\n');
  let failures = 0;

  const missing = missingKeys();
  if (missing.length) {
    bad(`Faltam no .env: ${missing.join(', ')}`);
    failures++;
  } else ok('Todas as chaves obrigatórias estão preenchidas no .env');

  if (env.supabaseUrl && env.supabaseServiceKey) {
    const admin = createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } });
    for (const table of ['profiles', 'credit_ledger', 'generations', 'avatars', 'video_projects', 'viral_folders', 'viral_items', 'studio_projects', 'studio_accounts', 'studio_posts']) {
      const { error } = await admin.from(table).select('*', { head: true, count: 'exact' });
      if (error) {
        bad(`Tabela "${table}" não encontrada (${error.message}). Rode os SQLs de supabase/migrations/`);
        failures++;
      } else ok(`Tabela "${table}" existe`);
    }
    for (const b of ['avatars', 'videos']) {
      const bucket = await admin.storage.getBucket(b);
      if (bucket.error) {
        bad(`Bucket "${b}" não encontrado (${bucket.error.message})`);
        failures++;
      } else ok(`Bucket "${b}" existe`);
    }
  }

  if (env.geminiApiKey) {
    try {
      const models = await resolveModels(true);
      ok(`Gemini respondeu. Modelos liberados na sua chave: ${models.available.length}`);
      ok(`Imagem (Nano Banana 2): ${models.image}`);
      ok(`Imagem Pro: ${models.imagePro}`);
      ok(`Texto (botão Melhorar): ${models.text}`);
    } catch (err) {
      bad(`Gemini: ${err instanceof Error ? err.message : String(err)}`);
      failures++;
    }
  }

  console.log(failures ? `\n${failures} item(ns) para resolver.\n` : '\nTudo pronto para gerar de verdade! 🚀\n');
  process.exit(failures ? 1 : 0);
}

main();
