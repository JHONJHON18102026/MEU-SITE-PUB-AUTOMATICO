/** Sobe o servidor da API localmente (npm run dev:api). */
import { serve } from '@hono/node-server';
import { app } from './app';
import { env, missingKeys } from './env';
import { ensurePrivateGeneratedBuckets } from './storage';
import { ensureRustMotorRunning } from './rustMotorSupervisor';

serve({ fetch: app.fetch, port: env.port, hostname: '0.0.0.0' }, (info) => {
  console.log(`[api] FUTURO DIGITAL Studio rodando em http://0.0.0.0:${info.port}/api`);
  const missing = missingKeys();
  if (missing.length) {
    console.warn(`[api] Atenção: faltam chaves no .env -> ${missing.join(', ')}`);
    console.warn('[api] A tela abre, mas gerar imagens só funciona depois de preencher o .env.');
  }
  void ensurePrivateGeneratedBuckets().catch((error) => {
    console.warn(`[api] Não foi possível aplicar buckets privados: ${error instanceof Error ? error.message : String(error)}`);
  });
  void ensureRustMotorRunning().catch((error) => {
    console.warn('[hust] Não foi possível verificar a ponte local: ' + (error instanceof Error ? error.message : String(error)));
  });
});
