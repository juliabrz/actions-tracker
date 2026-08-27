import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"

/** Fuso fixo do app. Ocorrências têm granularidade de dia (spec §6). */
export const FUSO = "America/Sao_Paulo"

const formatadorSP = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/**
 * "Hoje" em São Paulo, como YYYY-MM-DD.
 * Único ponto do app que converte um instante em data de calendário — por isso
 * é o único que precisa do fuso. Roda igual em Vercel (UTC) e no notebook.
 */
export function hoje(): string {
  return formatadorSP.format(new Date())
}

/**
 * Aritmética de datas YYYY-MM-DD, sem fuso nenhum.
 *
 * parseISO devolve meia-noite LOCAL e format lê em hora LOCAL, então o par
 * round-trips corretamente em qualquer fuso de servidor. Formatar aqui com o
 * formatador de São Paulo seria bug: deslocaria um dia quando o servidor roda
 * em UTC — ou seja, em produção.
 */
export function somarDias(data: string, dias: number): string {
  return format(addDays(parseISO(data), dias), "yyyy-MM-dd")
}

/** Dias de calendário entre duas datas YYYY-MM-DD (b − a). */
export function diasEntre(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a))
}

/** Valida formato e existência real do dia (rejeita 2025-02-30). */
export function ehDataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false
  const d = parseISO(data)
  return !Number.isNaN(d.getTime()) && format(d, "yyyy-MM-dd") === data
}
