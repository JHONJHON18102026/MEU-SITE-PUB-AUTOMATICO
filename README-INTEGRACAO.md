# FUTURO DIGITAL Studio — pacote de integração

Este pacote contém o código-fonte completo do frontend, servidor local, módulos internos, dados de prévia, testes e configuração de build.

## Requisitos

- Node.js 20+
- npm
- Chaves do Supabase e Gemini para ativar as integrações reais

## Instalação

```bash
npm install
copy .env.example .env
```

Preencha no `.env`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

## Desenvolvimento

```bash
npm run dev
```

Frontend e servidor local ficam disponíveis em `http://localhost:5173`.

## Validação

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Estrutura

- `src/`: aplicação React, páginas, componentes e ferramentas.
- `server/`: API Hono e integrações de geração.
- `shared/`: tipos e contratos compartilhados.
- `public/`: logos, imagens e assets visuais.
- `supabase/`: migrações e configuração de banco.
- `tests/`: testes unitários e E2E.

O pacote não inclui `node_modules`, `dist`, screenshots de teste nem qualquer arquivo `.env` com segredo.
