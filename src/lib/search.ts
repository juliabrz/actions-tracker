/**
 * Normaliza para comparação: sem acento, sem caixa, sem espaço sobrando.
 *
 * A filtragem acontece em memória, não no SQL, porque busca sem acento exigiria
 * a extensão `unaccent` — que existe na Neon mas não no PGlite, e a diferença
 * apareceria só em produção. Com dezenas de atividades a diferença de custo é
 * irrelevante, e o comportamento fica idêntico nos dois bancos.
 */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

/** Casa se todos os termos aparecerem no texto, em qualquer ordem. */
export function matches(text: string, query: string): boolean {
  const termos = normalize(query).split(/\s+/).filter(Boolean)
  if (termos.length === 0) return true
  const alvo = normalize(text)
  return termos.every((t) => alvo.includes(t))
}
