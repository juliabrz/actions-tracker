import { daysBetween, shiftDays, today } from "./dates"

/** How many intervals feed the estimate. A short window gives recency for free. */
export const WINDOW = 5

/** Share of the interval used as alert lead time when there is no override. */
export const ALERT_FRACTION = 0.15

export const CONFIDENCE_LEVELS = ["no_data", "guess", "weak", "fair", "good"] as const
export type Confidence = (typeof CONFIDENCE_LEVELS)[number]

export type Status = "no_forecast" | "on_track" | "due_soon" | "overdue"

export type OccurrenceInput = {
  date: string
  approximate: boolean
}

export type ActivitySettings = {
  guessedIntervalDays: number | null
  alertDaysBefore: number | null
  /** Enquanto não passar, a atividade não disputa o topo da lista. */
  snoozedUntil?: string | null
}

export type Forecast = {
  intervalDays: number | null
  source: "guess" | "history" | null
  confidence: Confidence
  /** Real intervals observed, not capped by the window. */
  intervalCount: number
  lastDate: string | null
  nextDate: string | null
  /** Negative means overdue. */
  daysRemaining: number | null
  alertThresholdDays: number | null
  status: Status
  /**
   * Adiada: silencia o tratamento de urgência sem mexer em nada do cálculo.
   * `status` e `daysRemaining` continuam dizendo a verdade sobre o prazo.
   */
  snoozed: boolean
  snoozedUntil: string | null
  /** Dias até o adiamento acabar. Só ordena; não é previsão. */
  daysUntilActive: number | null
  /**
   * Only with 2+ real intervals does an activity get alert colouring and climb
   * the urgency ordering. With a single interval the forecast shows, but grey
   * (spec §4.5).
   */
  highlight: boolean
}

/**
 * The alert lead time when the user set no override: a share of the interval,
 * never less than a day. Exported because the form shows the user what the
 * automatic value would be.
 */
export function automaticAlertDays(intervalDays: number | null): number | null {
  if (intervalDays == null) return null
  return Math.max(1, Math.round(intervalDays * ALERT_FRACTION))
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const raw =
    sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return Math.round(raw)
}

function downgrade(level: Confidence, floor: Confidence): Confidence {
  const index = CONFIDENCE_LEVELS.indexOf(level)
  const floorIndex = CONFIDENCE_LEVELS.indexOf(floor)
  return CONFIDENCE_LEVELS[Math.max(index - 1, floorIndex)]
}

function levelFor(intervalCount: number): Confidence {
  if (intervalCount >= 3) return "good"
  if (intervalCount === 2) return "fair"
  return "weak"
}

/**
 * Derives an activity's periodicity from its history.
 *
 * Pure function: takes the occurrences and the activity settings, returns
 * everything the UI needs. Nothing here is persisted — it is derived on read
 * (spec §6).
 */
export function estimate(
  occurrences: OccurrenceInput[],
  { guessedIntervalDays, alertDaysBefore, snoozedUntil = null }: ActivitySettings,
  todayStr: string = today(),
): Forecast {
  const history = [...occurrences].sort((a, b) => a.date.localeCompare(b.date))
  const lastDate = history.at(-1)?.date ?? null

  const intervals: number[] = []
  for (let i = 1; i < history.length; i++) {
    intervals.push(daysBetween(history[i - 1].date, history[i].date))
  }

  const window = intervals.slice(-WINDOW)

  let intervalDays: number | null = null
  let source: Forecast["source"] = null
  let confidence: Confidence = "no_data"

  if (window.length > 0) {
    // Once a real interval exists, the guess is discarded for good (spec §4.2).
    intervalDays = median(window)
    source = "history"
    confidence = levelFor(window.length)

    // Dates recalled from memory lower confidence, but never below "weak" —
    // there is real history, imprecise as it may be.
    const used = history.slice(-(window.length + 1))
    if (used.some((o) => o.approximate)) {
      confidence = downgrade(confidence, "weak")
    }
  } else if (guessedIntervalDays != null && guessedIntervalDays > 0) {
    intervalDays = guessedIntervalDays
    source = "guess"
    confidence = "guess"
  }

  let nextDate: string | null = null
  let alertThresholdDays: number | null = null

  // With no anchor (no occurrence at all) there is nothing to project, guess or
  // no guess.
  if (intervalDays != null && lastDate != null) {
    nextDate = shiftDays(lastDate, intervalDays)
    alertThresholdDays = alertDaysBefore ?? automaticAlertDays(intervalDays)
  }

  const daysRemaining = nextDate ? daysBetween(todayStr, nextDate) : null

  let status: Status = "no_forecast"
  if (daysRemaining != null && alertThresholdDays != null) {
    if (daysRemaining < 0) status = "overdue"
    else if (daysRemaining <= alertThresholdDays) status = "due_soon"
    else status = "on_track"
  }

  // O adiamento expira sozinho: nada precisa limpá-lo para a atividade voltar.
  const daysUntilActive = snoozedUntil ? daysBetween(todayStr, snoozedUntil) : null
  const snoozed = daysUntilActive != null && daysUntilActive >= 0

  return {
    intervalDays,
    source,
    confidence,
    intervalCount: intervals.length,
    lastDate,
    nextDate,
    daysRemaining,
    alertThresholdDays,
    status,
    snoozed,
    snoozedUntil: snoozed ? snoozedUntil : null,
    daysUntilActive: snoozed ? daysUntilActive : null,
    highlight: intervals.length >= 2,
  }
}

/** List ordering: overdue first, then whatever comes due soonest. */
const STATUS_WEIGHT: Record<Status, number> = {
  overdue: 0,
  due_soon: 1,
  on_track: 2,
  no_forecast: 3,
}

/**
 * Ordena só por urgência no tempo. Confiança não desempata: algo que vence hoje
 * fica acima de algo que vence em cinco dias, ainda que a estimativa seja
 * fraca — esconder o mais urgente por tecnicalidade estatística é o oposto do
 * que a lista existe para fazer. A incerteza aparece na cor, não na posição.
 */
export function compareUrgency(a: Forecast, b: Forecast): number {
  // Adiada sai do grupo urgente e passa a ordenar pelo fim do adiamento: o
  // prazo real continua vencido, mas não é o que você pediu para ver agora.
  const weightOf = (f: Forecast) =>
    f.snoozed ? STATUS_WEIGHT.on_track : STATUS_WEIGHT[f.status]
  const daysOf = (f: Forecast) =>
    f.snoozed
      ? (f.daysUntilActive ?? 0)
      : (f.daysRemaining ?? Number.POSITIVE_INFINITY)

  const weightA = weightOf(a)
  const weightB = weightOf(b)
  if (weightA !== weightB) return weightA - weightB
  return daysOf(a) - daysOf(b)
}
