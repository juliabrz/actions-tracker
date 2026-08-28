/**
 * Saneamento das entradas das Server Actions.
 *
 * Server Action é um endpoint HTTP: os tipos do TypeScript somem em tempo de
 * execução e a validação do formulário roda no cliente, que não é um controle.
 * Uma requisição forjada manda o que quiser, então o servidor precisa checar de
 * novo tudo que grava.
 */

export const MAX_NAME_LENGTH = 120

/** Dez anos. Acima disso é entrada absurda, não um ciclo real. */
export const MAX_DAYS = 3650

/** numeric(10,2) no schema: acima disso o Postgres recusa e vira erro 500. */
export const MAX_COST = 99_999_999.99

export function sanitizeName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const name = value.trim()
  if (!name || name.length > MAX_NAME_LENGTH) return null
  return name
}

/** Inteiro positivo dentro do limite, ou null — inclusive para lixo. */
export function sanitizeDays(value: unknown): number | null {
  if (value == null) return null
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null
  if (n < 1 || n > MAX_DAYS) return null
  return n
}

/** Devolve o valor no formato do banco, ou null. */
export function sanitizeCost(value: unknown): string | null {
  if (value == null || value === "") return null
  const raw = typeof value === "string" ? value.replace(",", ".") : value
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > MAX_COST) return null
  return n.toFixed(2)
}

export function sanitizeScope(value: unknown): "personal" | "shared" | null {
  return value === "personal" || value === "shared" ? value : null
}
