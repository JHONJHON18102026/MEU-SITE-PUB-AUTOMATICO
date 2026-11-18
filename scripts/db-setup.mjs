/**
 * npm run db:setup — cria as tabelas no seu Supabase rodando o SQL da pasta
 * supabase/migrations. Precisa de SUPABASE_DB_URL no .env.
 * (Alternativa sem isso: colar o SQL no Supabase > SQL Editor.)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const url = (process.env.SUPABASE_DB_URL ?? '').trim();
if (!url) {
  console.error('\n❌ SUPABASE_DB_URL está vazio no .env.');
  console.error('   Opção 1: preencha (Supabase > Project Settings > Database > Connection string > URI).');
  console.error('   Opção 2: abra supabase/migrations/0001_init.sql, copie tudo e cole no Supabase > SQL Editor > Run.\n');
  process.exit(1);
}

const dir = path.resolve('supabase', 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const file of files) {
    process.stdout.write(`→ ${file} ... `);
    await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
    console.log('ok');
  }
  console.log('\n✅ Banco pronto.\n');
} catch (err) {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
} finally {
  await client.end();
}
