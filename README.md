# FUTURO DIGITAL Studio — Entrega 1

Plataforma própria de influencers e anúncios UGC com IA.
Entrega 1: **login, créditos, painel e Influencer IA com geração real de imagem** e marca d'água FUTURO DIGITAL.

## Ligar pela primeira vez (uma vez só)

1. **Chaves** — abra o arquivo `.env` e preencha:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` → Supabase › Project Settings › API
   - `GEMINI_API_KEY` → https://aistudio.google.com/apikey
2. **Banco** — copie todo o `supabase/migrations/0001_init.sql` e cole em Supabase › SQL Editor › **Run**
   (ou preencha `SUPABASE_DB_URL` no `.env` e rode `npm run db:setup`).
3. **Conferir** — `npm run check` (diz exatamente o que falta, sem mostrar suas chaves).
4. **Rodar** — `npm run dev` e abra http://localhost:5173

## Comandos

| Comando | O que faz |
| :--- | :--- |
| `npm run dev` | Site (5173) + servidor da API (8787) |
| `npm run check` | Confere chaves, tabelas, bucket e modelos Gemini liberados |
| `npm test` | Testes de unidade (prompt, preços, marca d'água, modelos) |
| `npm run test:e2e` | Robô no Chrome clicando em tudo (banco e IA simulados) |
| `npm run build` | Checa tipos e gera a versão de produção em `dist/` |

## Como está organizado

```
shared/      regras que o site e o servidor compartilham (características, preços, prompt)
server/      API Hono: login, débito de créditos, Gemini, marca d'água, Storage
src/         site React (telas, componentes, estado)
supabase/    estrutura do banco (tabelas, segurança RLS, funções de crédito)
tests/       testes de unidade e robô E2E (capturas em tests/e2e/screenshots)
public/brand logo e emblema FUTURO DIGITAL
```

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY` e `GEMINI_API_KEY` ficam **só no servidor**; o navegador nunca vê.
- O saldo só muda pelo servidor (funções `debit_credits`/`credit_credits`), com débito atômico e estorno automático.
- Cada usuário só enxerga os próprios avatares (RLS), mais os que alguém marcou como públicos.

## Trocar a marca d'água

Substitua `server/assets/marca-dagua.png` (PNG com fundo transparente). Posição e tamanho ficam em
`server/watermark.ts` (`WATERMARK_LAYOUT`).
