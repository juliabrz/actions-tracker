import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

import type { Confidence, Forecast } from "./periodicity"

// Display strings stay in Portuguese: the two people using this app are
// Brazilian. Only the code around them is in English.

export function formatDate(date: string): string {
  return format(parseISO(date), "d 'de' MMM", { locale: ptBR })
}

export function formatLongDate(date: string): string {
  return format(parseISO(date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function days(n: number): string {
  return n === 1 ? "1 dia" : `${n} dias`
}

export function describeInterval(intervalDays: number | null): string | null {
  if (intervalDays == null) return null
  if (intervalDays >= 365) {
    const years = Math.round(intervalDays / 365)
    return years === 1 ? "a cada ano" : `a cada ${years} anos`
  }
  if (intervalDays >= 60) return `a cada ${Math.round(intervalDays / 30)} meses`
  if (intervalDays >= 14) return `a cada ${Math.round(intervalDays / 7)} semanas`
  return `a cada ${days(intervalDays)}`
}

/**
 * The headline of each row: how long is left, in plain language.
 *
 * Carries the status on its own — the row shows no separate status label, since
 * "Atrasada · atrasada há 5 dias" and "Chegando · é hoje" both read as stutter.
 * Colour does the categorising; this sentence does the telling.
 */
export function describeDue(f: Forecast): string {
  // Adiada mostra quando volta, não o prazo vencido: você já viu o prazo e
  // pediu para não ver de novo agora. "Volta em" e não "adiada até" porque a
  // data é o dia do retorno, e "até" deixaria ambíguo se ela inclui esse dia.
  if (f.snoozed && f.snoozedUntil) {
    return f.daysUntilActive === 1
      ? "Volta amanhã"
      : `Volta em ${formatDate(f.snoozedUntil)}`
  }
  if (f.daysRemaining == null || f.nextDate == null) {
    return f.lastDate ? "Sem estimativa ainda" : "Nunca foi registrada"
  }
  if (f.daysRemaining < 0) return `Atrasada há ${days(-f.daysRemaining)}`
  if (f.daysRemaining === 0) return "É hoje"
  if (f.daysRemaining === 1) return "É amanhã"
  return `Em ${days(f.daysRemaining)} · ${formatDate(f.nextDate)}`
}

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  no_data: "sem dados",
  guess: "seu palpite",
  weak: "estimativa fraca",
  fair: "estimativa razoável",
  good: "estimativa boa",
}

export function describeConfidence(f: Forecast): string {
  const label = CONFIDENCE_LABEL[f.confidence]
  if (f.source === "guess" || f.intervalCount === 0) return label
  const cycles =
    f.intervalCount === 1 ? "1 ciclo medido" : `${f.intervalCount} ciclos medidos`
  return `${label} · ${cycles}`
}

export function formatCost(cost: string | null): string | null {
  if (cost == null) return null
  return Number(cost).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
