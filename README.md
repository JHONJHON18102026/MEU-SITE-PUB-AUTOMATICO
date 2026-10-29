# Site Base — React + Vite + TypeScript + Tailwind + Supabase

Estrutura limpa configurada para **deploy contínuo na Vercel** via **GitHub** e conexão segura com **Supabase**.

## Comandos Principais

```bash
npm run dev        # Inicia o servidor local de desenvolvimento
npm run lint       # Verifica tipos TypeScript
npm run test       # Executa os testes automatizados (Vitest)
npm run build      # Gera o pacote de produção em dist/
npm run validate   # Executa lint + testes + build completo antes de enviar ao GitHub
```

## Variáveis de Ambiente (Supabase)

1. Copie `.env.example` para `.env.local`:
   ```bash
   copy .env.example .env.local
   ```
2. Preencha no `.env.local` (e nas **Environment Variables** do projeto na Vercel):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (use apenas a chave pública `anon` ou `sb_publishable_...`, **nunca** `service_role` ou `sb_secret_...`).

## Fluxo Automático de Publicação

1. Alterações feitas localmente são validadas com `npm run validate`.
2. Commits enviados para branches secundárias ou Pull Requests geram **Preview Deployments** automáticos na Vercel.
3. Commits enviados/mesclados na branch `main` publicam automaticamente em **Produção** na Vercel.
