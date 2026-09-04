# Activity Tracker

App para acompanhar coisas que se faz de tempos em tempos — cortar o cabelo, comprar ração, lavar as cortinas.

A inversão é o ponto: você não configura "a cada 30 dias". Você só registra o que fez, e **o intervalo emerge dos dados** — mediana dos últimos cinco ciclos, com o nível de confiança sempre visível.

Uso pessoal, duas contas, acesso por allowlist.

## Stack

Next.js 16 (App Router) · TypeScript · Drizzle · Postgres (Neon) · Auth.js v5 com Google · Tailwind 4 · shadcn/ui

## Rodando localmente

O banco de desenvolvimento é [PGlite](https://pglite.dev) — Postgres em WASM, dentro do processo. Não precisa instalar nem subir nada.

```bash
npm install
cp .env.example .env.local     # DATABASE_URL já vem apontando para o PGlite
npm run db:seed                # cria o banco e popula com 12 atividades de teste
npm run dev
```

Depois abra **`/dev-login`** e escolha entre as duas contas do seed. Essa rota existe para exercitar a interface sem Google configurado, e é travada duas vezes: só fora de produção **e** com `DEV_LOGIN=true`.

> **PGlite é de processo único.** O `next dev` renderiza rotas diferentes em processos diferentes, então o banco local corrompe de vez em quando. Quando quebrar: pare o servidor e rode `npm run db:seed`, que apaga tudo e recria. Não acontece em produção, onde o Postgres é de verdade.

## Comandos

| | |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run db:seed` | recria o banco local com dados de teste |
| `npm run db:generate` | gera migration a partir do schema |
| `npm run db:migrate` | aplica as migrations |
| `npm test` | testes (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Variáveis de ambiente

Ver `.env.example`. Em produção, **`DEV_LOGIN` não deve existir** — a trava do `NODE_ENV` já barra a rota sozinha, mas duas travas é melhor que uma.

## Documentação

[`docs/spec.md`](docs/spec.md) é a fonte da verdade: domínio, regras de cálculo, decisões tomadas **e as descartadas com o motivo**. Código que discordar dela está errado — ou o documento precisa ser atualizado antes.

## Licença

[MIT](LICENSE).
