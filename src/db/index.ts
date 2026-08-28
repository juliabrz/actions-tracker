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
 */
const globalForDb = globalThis as unknown as { __db?: Db }

async function createPglite(): Promise<Db> {
  // Guards a *running* production server, not `next build`. The build runs with
  // NODE_ENV=production even locally, and refusing there would mean you cannot
  // build the app while pointing at the development database.
  const isBuild = process.env.NEXT_PHASE === "phase-production-build"
  if (process.env.NODE_ENV === "production" && !isBuild) {
    throw new Error("pglite:// is a development-only DATABASE_URL")
  }
  const { PGlite } = await import("@electric-sql/pglite")
  const { drizzle } = await import("drizzle-orm/pglite")
  const dir = process.env.DATABASE_URL!.replace("pglite://", "")
  return drizzle(new PGlite(dir), { schema }) as unknown as Db
}

function createNeon(): Db {
  return drizzleNeon(neon(process.env.DATABASE_URL!), { schema }) as unknown as Db
}

export const db: Db =
  globalForDb.__db ?? (globalForDb.__db = isPglite ? await createPglite() : createNeon())
