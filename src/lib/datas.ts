import { addDays, differenceInCalendarDays, parseISO } from "date-fns"

/** Fuso fixo do app. Ocorrências têm granularidade de dia (decisão Q24). */
export const FUSO = "America/Sao_Paulo"

const formatador = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** "Hoje" em São Paulo, como YYYY-MM-DD — independente do fuso do servidor. */
export function hoje(): string {
  return formatador.format(new Date())
}

/** Dias de calendário entre duas datas YYYY-MM-DD (b - a). */
export function diasEntre(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a))
}

export function somarDias(data: string, dias: number): string {
  return formatador.format(addDays(parseISO(data), dias))
}

export function ehDataValida(data: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(parseISO(data).getTime())
}
