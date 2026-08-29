import { neon } from "@neondatabase/serverless"
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http"
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"

import * as schema from "./schema"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (see .env.example)")
}

/**
 * Two drivers, one API. Production is always Neon over HTTP; local development
 * can point DATABASE_URL at `pglite://<dir>` — Postgres compiled to WASM,
 * running in-process, no daemon and no signup.
 *
 * The split is not a convenience: `neon()` speaks Neon's HTTP protocol, not the
 * Postgres wire protocol, so *any* local database needs a different driver.
 *
 * `db` is typed as the common PgDatabase surface, which is all the app uses.
 * Nothing here relies on transactions — neon-http has none.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>

const isPglite = process.env.DATABASE_URL.startsWith("pglite://")

/**
 * Cached on globalThis because the dev server evaluates this module more than
 * once. Each PGlite instance keeps its own in-memory image of the database, so
 * a second instance would silently read stale data — a write from a route
 * handler would be invisible to the next page render.
 *
 * The cache holds the *promise*, not the resolved value. Caching the value left
 * a race: two evaluations running at once both saw an empty cache and both
 * built an instance over the same directory, and the loser aborted its WASM
 * runtime ("RuntimeError: Aborted()"). Storing the in-flight promise makes
 * concurrent callers share one instance.
 */
const globalForDb = globalThis as unknown as { __dbPromise?: Promise<Db> }

/**
 * Enfileira as consultas do PGlite, uma de cada vez.
 *
 * O PGlite é de conexão única e aborta o runtime WASM quando recebe consultas
 * concorrentes — e um único carregamento de página já produz várias: o Next
 * faz prefetch dos links da lista enquanto renderiza. Por isso o banco quebrava
 * no uso real do navegador e sobrevivia aos testes com curl, que são
 * sequenciais.
 *
 * A fila troca a corrida por espera. Custa latência sob carga, mas em um banco
 * local de desenvolvimento isso é irrelevante perto de perder os dados.
 *
 * ATENÇÃO: isto resolve a concorrência *dentro* de um processo, não entre
 * processos. O `next dev` renderiza rotas diferentes em workers diferentes, e
 * cada worker abre a sua própria instância sobre o mesmo diretório — é essa a
 * causa raiz da corrupção do banco local, e não há como contornar daqui. Um
 * Postgres de verdade (Neon em produção) elimina o problema.
 */
function enfileirar<T extends object>(client: T): T {
  let fila: Promise<unknown> = Promise.resolve()

  return new Proxy(client, {
    get(alvo, prop, receiver) {
      const valor = Reflect.get(alvo, prop, receiver)
      if (typeof valor !== "function") return valor
      if (prop !== "query" && prop !== "exec" && prop !== "transaction") {
        return valor.bind(alvo)
      }
      return (...args: unknown[]) => {
        const execucao = fila.then(() => valor.apply(alvo, args))
        // A fila ignora o erro para uma consulta que falha não travar as seguintes.
        fila = execucao.catch(() => {})
        return execucao
      }
    },
  })
}

/** `next build` roda com NODE_ENV=production mesmo localmente. */
const isBuild = process.env.NEXT_PHASE === "phase-production-build"

async function createPglite(): Promise<Db> {
  // Barra um servidor de produção *no ar*, não o build — recusar aqui impediria
  // buildar apontando para o banco de desenvolvimento.
  if (process.env.NODE_ENV === "production" && !isBuild) {
    throw new Error("pglite:// is a development-only DATABASE_URL")
  }
  const { PGlite } = await import("@electric-sql/pglite")
  const { drizzle } = await import("drizzle-orm/pglite")

  // Durante o build, banco em memória e descartável. `next build` roda em vários
  // workers, e cada um abriria o mesmo diretório: era isso que soltava
  // "RuntimeError: Aborted()" no meio do build e podia corromper o banco de
  // desenvolvimento. Nenhuma página é pré-renderizada com dados, então um banco
  // vazio serve.
  const dir = isBuild ? undefined : process.env.DATABASE_URL!.replace("pglite://", "")
  return drizzle(enfileirar(new PGlite(dir)), { schema }) as unknown as Db
}

function createNeon(): Db {
  return drizzleNeon(neon(process.env.DATABASE_URL!), { schema }) as unknown as Db
}

export const db: Db = await (globalForDb.__dbPromise ??= isPglite
  ? createPglite()
  : Promise.resolve(createNeon()))
