/** Sobe o servidor da API localmente (npm run dev:api). */
import { serve } from '@hono/node-server';
import { app } from './app';
import { env, missingKeys } from './env';
import { ensurePrivateGeneratedBuckets } from './storage';

serve({ fetch: app.fetch, port: env.port, hostname: '127.0.0.1' }, (info) => {
  console.log(`[api] FUTURO DIGITAL Studio rodando em http://127.0.0.1:${info.port}/api`);
  const missing = missingKeys();
  if (missing.length) {
    console.warn(`[api] Atenção: faltam chaves no .env -> ${missing.join(', ')}`);
    console.warn('[api] A tela abre, mas gerar imagens só funciona depois de preencher o .env.');
  }
  void ensurePrivateGeneratedBuckets().catch((error) => {
    console.warn(`[api] Não foi possível aplicar buckets privados: ${error instanceof Error ? error.message : String(error)}`);
  });
});
