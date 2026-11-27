/**
 * Safe local-only migration helper.
 *
 * Default: print the ordered migration plan without connecting to a database.
 * Apply: npm run db:setup -- --apply-local (requires a localhost DB URL).
 * Production migrations must be reviewed and applied through the approved
 * Supabase workflow; this helper deliberately refuses remote database hosts.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const migrationsDir = path.resolve('supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
if (!files.length) {
  console.error('Nenhuma migration SQL foi encontrada em supabase/migrations.');
  process.exit(1);
}

const applyLocal = process.argv.includes('--apply-local');
if (!applyLocal) {
  console.log('Plano de migrations (somente leitura; nenhuma conexão foi aberta):');
  for (const file of files) console.log(`  • ${file}`);
  console.log('\nPara aplicar em banco local vazio: npm run db:setup -- --apply-local');
  console.log('Este script recusa hosts remotos e não deve ser usado para produção.');
  process.exit(0);
}

const connectionString = (process.env.SUPABASE_DB_URL ?? '').trim();
if (!connectionString) {
  console.error('SUPABASE_DB_URL não está configurada no .env. Defina a conexão do Supabase local, não a de produção.');
  process.exit(1);
}

let databaseUrl;
try {
  databaseUrl = new URL(connectionString);
} catch {
  console.error('SUPABASE_DB_URL não é uma URL válida.');
  process.exit(1);
}

const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
if (!localHosts.has(databaseUrl.hostname)) {
  console.error(`Bloqueado: db:setup só aplica migrations em localhost; host recebido: ${databaseUrl.hostname}`);
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: false });
let connected = false;
try {
  await client.connect();
  connected = true;

  const ledgerName = '_fd_local_migrations';
  const existingLedger = await client.query(
    "SELECT to_regclass('public._fd_local_migrations') AS table_name",
  );
  const hasLedger = Boolean(existingLedger.rows[0]?.table_name);
  if (!hasLedger) {
    const publicTables = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    if (publicTables.rowCount) {
      throw new Error(`Banco local já contém tabelas sem histórico deste script (${publicTables.rows.map((row) => row.table_name).join(', ')}). Nenhuma migration foi executada.`);
    }
    await client.query(`CREATE TABLE public.${ledgerName} (
      filename text PRIMARY KEY,
      sha256 text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
  }

  const applied = await client.query(`SELECT filename, sha256 FROM public.${ledgerName}`);
  const appliedByFile = new Map(applied.rows.map((row) => [row.filename, row.sha256]));
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const sha256 = createHash('sha256').update(sql).digest('hex');
    const previousHash = appliedByFile.get(file);
    if (previousHash) {
      if (previousHash !== sha256) throw new Error(`Migration já aplicada foi alterada: ${file}. Não reaplique nem edite migrations já registradas.`);
      console.log(`Já aplicada: ${file}`);
      continue;
    }

    console.log(`Aplicando localmente: ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO public.${ledgerName} (filename, sha256) VALUES ($1, $2)`,
        [file, sha256],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  console.log('Migrations locais concluídas. Nenhuma conexão remota foi permitida.');
} catch (error) {
  console.error(`db:setup interrompido: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (connected) await client.end();
}
