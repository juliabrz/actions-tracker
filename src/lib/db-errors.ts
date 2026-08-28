/** Postgres unique_violation. */
const UNIQUE_VIOLATION = "23505"

/** Guard against a cause chain that loops back on itself. */
const MAX_DEPTH = 8

/**
 * Walks the `cause` chain looking for a Postgres error code.
 *
 * Drizzle wraps driver errors in a `DrizzleQueryError` that carries no `code`
 * of its own — the real Postgres error sits one level down in `cause`. Checking
 * only the top-level error silently never matches, which turned an expected
 * "already logged today" into an unhandled 500.
 */
export function hasPostgresCode(error: unknown, code: string): boolean {
  let current = error
  for (let depth = 0; current != null && depth < MAX_DEPTH; depth++) {
    if (typeof current === "object" && "code" in current) {
      if ((current as { code?: unknown }).code === code) return true
    }
    current = (current as { cause?: unknown }).cause
  }
  return false
}

export function isUniqueViolation(error: unknown): boolean {
  return hasPostgresCode(error, UNIQUE_VIOLATION)
}
