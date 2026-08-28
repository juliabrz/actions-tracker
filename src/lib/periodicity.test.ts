import { describe, expect, it } from "vitest"

import { shiftDays } from "./dates"
import {
  compareUrgency,
  estimate,
  type ActivitySettings,
  type OccurrenceInput,
} from "./periodicity"

const NO_SETTINGS: ActivitySettings = {
  guessedIntervalDays: null,
  alertDaysBefore: null,
  snoozedUntil: null,
}

/** Builds occurrences from a start date, stepping through the given intervals. */
function series(start: string, intervals: number[]): OccurrenceInput[] {
  const occurrences: OccurrenceInput[] = [{ date: start, approximate: false }]
  let current = start
  for (const days of intervals) {
    current = shiftDays(current, days)
    occurrences.push({ date: current, approximate: false })
  }
  return occurrences
}

describe("not enough data", () => {
  it("estimates nothing without occurrences or a guess", () => {
    const f = estimate([], NO_SETTINGS, "2025-06-01")
    expect(f.intervalDays).toBeNull()
    expect(f.source).toBeNull()
    expect(f.confidence).toBe("no_data")
    expect(f.status).toBe("no_forecast")
  })

  it("a guess with no occurrence has no anchor, so it projects no date", () => {
    const f = estimate([], { guessedIntervalDays: 30, alertDaysBefore: null }, "2025-06-01")
    expect(f.intervalDays).toBe(30)
    expect(f.confidence).toBe("guess")
    expect(f.nextDate).toBeNull()
    expect(f.status).toBe("no_forecast")
  })

  it("one occurrence plus a guess already projects the next date", () => {
    const f = estimate(
      [{ date: "2025-05-01", approximate: false }],
      { guessedIntervalDays: 30, alertDaysBefore: null },
      "2025-05-10",
    )
    expect(f.source).toBe("guess")
    expect(f.nextDate).toBe("2025-05-31")
    expect(f.daysRemaining).toBe(21)
    expect(f.status).toBe("on_track")
  })
})

describe("the guess is disposable", () => {
  it("a single real interval already replaces the guess", () => {
    const f = estimate(
      series("2025-01-01", [50]),
      { guessedIntervalDays: 30, alertDaysBefore: null },
      "2025-02-20",
    )
    expect(f.intervalDays).toBe(50)
    expect(f.source).toBe("history")
  })

  it("the guess never enters the median as if it were an observation", () => {
    // An absurd 1000-day guess must not pull a median of 30.
    const f = estimate(
      series("2025-01-01", [30, 30, 30]),
      { guessedIntervalDays: 1000, alertDaysBefore: null },
      "2025-03-15",
    )
    expect(f.intervalDays).toBe(30)
  })
})

describe("median", () => {
  it("ignores the outlier that would poison a mean", () => {
    // The four-month trip: the mean would be 48, the median is 30.
    const f = estimate(series("2025-01-01", [30, 30, 120, 30, 30]), NO_SETTINGS, "2025-08-01")
    expect(f.intervalDays).toBe(30)
  })

  it("averages the two middle values on an even count and rounds", () => {
    const f = estimate(series("2025-01-01", [30, 40]), NO_SETTINGS, "2025-03-15")
    expect(f.intervalDays).toBe(35)
  })

  it("uses only the last five intervals", () => {
    // The old 90s fall outside the window; five 10s remain.
    const f = estimate(
      series("2024-01-01", [90, 90, 90, 10, 10, 10, 10, 10]),
      NO_SETTINGS,
      "2025-01-01",
    )
    expect(f.intervalDays).toBe(10)
    expect(f.intervalCount).toBe(8)
  })

  it("sorts out-of-order occurrences before calculating", () => {
    const shuffled: OccurrenceInput[] = [
      { date: "2025-03-01", approximate: false },
      { date: "2025-01-01", approximate: false },
      { date: "2025-02-01", approximate: false },
    ]
    const f = estimate(shuffled, NO_SETTINGS, "2025-03-10")
    expect(f.lastDate).toBe("2025-03-01")
    expect(f.intervalDays).toBe(30) // median of [31, 28]
  })
})

describe("confidence", () => {
  it("one interval is weak", () => {
    expect(estimate(series("2025-01-01", [30]), NO_SETTINGS, "2025-02-05").confidence).toBe(
      "weak",
    )
  })

  it("two intervals is fair", () => {
    expect(
      estimate(series("2025-01-01", [30, 30]), NO_SETTINGS, "2025-03-05").confidence,
    ).toBe("fair")
  })

  it("three or more is good", () => {
    expect(
      estimate(series("2025-01-01", [30, 30, 30]), NO_SETTINGS, "2025-04-05").confidence,
    ).toBe("good")
  })

  it("an approximate date inside the window drops one level", () => {
    const occurrences = series("2025-01-01", [30, 30, 30])
    occurrences[3].approximate = true
    expect(estimate(occurrences, NO_SETTINGS, "2025-04-05").confidence).toBe("fair")
  })

  it("never drops below weak while there is real history", () => {
    const occurrences = series("2025-01-01", [30])
    occurrences[0].approximate = true
    expect(estimate(occurrences, NO_SETTINGS, "2025-02-05").confidence).toBe("weak")
  })

  it("an approximate date outside the window changes nothing", () => {
    // 8 occurrences = 7 intervals; the window uses the last 6 occurrences.
    const occurrences = series("2025-01-01", [30, 30, 30, 30, 30, 30, 30])
    occurrences[0].approximate = true
    expect(estimate(occurrences, NO_SETTINGS, "2025-08-05").confidence).toBe("good")
  })
})

describe("status and alert threshold", () => {
  const settings = NO_SETTINGS

  it("on track while more than the threshold remains", () => {
    // Occurrences: 01-01, 01-31, 03-02 → interval 30 → next 2025-04-01.
    // Threshold = 15% of 30 = 5 days.
    const f = estimate(series("2025-01-01", [30, 30]), settings, "2025-03-01")
    expect(f.nextDate).toBe("2025-04-01")
    expect(f.alertThresholdDays).toBe(5)
    expect(f.daysRemaining).toBe(31)
    expect(f.status).toBe("on_track")
  })

  it("due soon inside the threshold", () => {
    const f = estimate(series("2025-01-01", [30, 30]), settings, "2025-03-29")
    expect(f.daysRemaining).toBe(3)
    expect(f.status).toBe("due_soon")
  })

  it("due soon on the due date itself", () => {
    const f = estimate(series("2025-01-01", [30, 30]), settings, "2025-04-01")
    expect(f.daysRemaining).toBe(0)
    expect(f.status).toBe("due_soon")
  })

  it("overdue past the due date", () => {
    const f = estimate(series("2025-01-01", [30, 30]), settings, "2025-04-15")
    expect(f.daysRemaining).toBe(-14)
    expect(f.status).toBe("overdue")
  })

  it("scales the threshold with the interval instead of fixing it", () => {
    const yearly = estimate(series("2023-01-01", [365, 365]), settings, "2025-01-01")
    expect(yearly.alertThresholdDays).toBe(55) // 15% of 365

    const fortnightly = estimate(series("2025-01-01", [15, 15]), settings, "2025-02-01")
    expect(fortnightly.alertThresholdDays).toBe(2) // 15% of 15
  })

  it("never lets the threshold reach zero", () => {
    const f = estimate(series("2025-01-01", [3, 3]), settings, "2025-01-08")
    expect(f.alertThresholdDays).toBe(1)
  })

  it("a manual override beats the percentage", () => {
    // 7 days left: with the default threshold of 5 it would be on track.
    const f = estimate(
      series("2025-01-01", [30, 30]),
      { ...settings, alertDaysBefore: 14 },
      "2025-03-25",
    )
    expect(f.daysRemaining).toBe(7)
    expect(f.alertThresholdDays).toBe(14)
    expect(f.status).toBe("due_soon")
  })
})

describe("highlight", () => {
  it("does not highlight on a single interval, even when overdue", () => {
    const f = estimate(series("2025-01-01", [30]), NO_SETTINGS, "2025-12-01")
    expect(f.status).toBe("overdue")
    expect(f.highlight).toBe(false)
  })

  it("highlights from two intervals on", () => {
    expect(
      estimate(series("2025-01-01", [30, 30]), NO_SETTINGS, "2025-03-05").highlight,
    ).toBe(true)
  })
})

describe("urgency ordering", () => {
  it("overdue before due soon, due soon before on track", () => {
    const overdue = estimate(series("2025-01-01", [30, 30]), NO_SETTINGS, "2025-05-01")
    const dueSoon = estimate(series("2025-01-01", [30, 30]), NO_SETTINGS, "2025-03-29")
    const onTrack = estimate(series("2025-01-01", [30, 30]), NO_SETTINGS, "2025-03-01")

    const sorted = [onTrack, overdue, dueSoon].sort(compareUrgency)
    expect(sorted.map((f) => f.status)).toEqual(["overdue", "due_soon", "on_track"])
  })

  it("breaks ties by whatever comes due first", () => {
    const sooner = estimate(series("2025-01-01", [30, 30]), NO_SETTINGS, "2025-02-25")
    const later = estimate(series("2025-01-01", [90, 90]), NO_SETTINGS, "2025-02-25")
    expect([later, sooner].sort(compareUrgency)[0]).toBe(sooner)
  })

  it("ranks due today above due in five days, even on a weak estimate", () => {
    // Um único ciclo medido: estimativa fraca, mas vence hoje.
    // Ocorrências 01-01 e 01-31 → intervalo 30 → próxima em 2025-03-02.
    const dueTodayWeak = estimate(series("2025-01-01", [30]), NO_SETTINGS, "2025-03-02")
    // Três ciclos medidos: estimativa boa, mas ainda faltam dias.
    const dueLaterStrong = estimate(
      series("2025-01-01", [30, 30, 30]),
      NO_SETTINGS,
      "2025-04-26",
    )
    expect(dueTodayWeak.daysRemaining).toBe(0)
    expect(dueTodayWeak.confidence).toBe("weak")
    expect(dueLaterStrong.daysRemaining).toBe(5)
    expect(dueLaterStrong.confidence).toBe("good")

    expect([dueLaterStrong, dueTodayWeak].sort(compareUrgency)[0]).toBe(dueTodayWeak)
  })

  it("confiança não desempata: só a urgência no tempo ordena", () => {
    const overdueWeak = estimate(series("2025-01-01", [30]), NO_SETTINGS, "2025-12-01")
    const onTrackStrong = estimate(
      series("2025-01-01", [30, 30]),
      NO_SETTINGS,
      "2025-03-05",
    )
    expect(overdueWeak.highlight).toBe(false)
    expect([onTrackStrong, overdueWeak].sort(compareUrgency)[0]).toBe(overdueWeak)
  })

  it("no forecast sinks to the bottom", () => {
    const noForecast = estimate([], NO_SETTINGS, "2025-06-01")
    const onTrack = estimate(series("2025-01-01", [30, 30]), NO_SETTINGS, "2025-02-10")
    expect([noForecast, onTrack].sort(compareUrgency)[0]).toBe(onTrack)
  })
})

describe("adiamento", () => {
  // Ocorrências 01-01, 01-31, 03-02 → intervalo 30 → próxima 2025-04-01.
  const vencida = (todayStr: string, snoozedUntil: string | null = null) =>
    estimate(series("2025-01-01", [30, 30]), { ...NO_SETTINGS, snoozedUntil }, todayStr)

  it("não altera o cálculo: intervalo, prazo e confiança seguem iguais", () => {
    const semAdiar = vencida("2025-04-10")
    const adiada = vencida("2025-04-10", "2025-04-15")

    expect(adiada.intervalDays).toBe(semAdiar.intervalDays)
    expect(adiada.nextDate).toBe(semAdiar.nextDate)
    expect(adiada.daysRemaining).toBe(semAdiar.daysRemaining)
    expect(adiada.confidence).toBe(semAdiar.confidence)
    // O status continua dizendo a verdade sobre o prazo.
    expect(adiada.status).toBe("overdue")
    expect(adiada.snoozed).toBe(true)
  })

  it("sai do grupo urgente: perde para uma que está só chegando", () => {
    const adiada = vencida("2025-04-10", "2025-04-15")
    const chegando = estimate(series("2025-01-01", [30, 30]), NO_SETTINGS, "2025-03-29")
    expect(adiada.status).toBe("overdue")
    expect(chegando.status).toBe("due_soon")
    expect([adiada, chegando].sort(compareUrgency)[0]).toBe(chegando)
  })

  it("entre as não-urgentes, ordena pelo momento em que volta a importar", () => {
    // Volta em 5 dias; a outra só vence em 31. A adiada pede atenção antes.
    const adiada = vencida("2025-04-10", "2025-04-15")
    const emDia = estimate(series("2025-01-01", [30, 30]), NO_SETTINGS, "2025-03-01")
    expect(emDia.daysRemaining).toBe(31)
    expect([emDia, adiada].sort(compareUrgency)[0]).toBe(adiada)
  })

  it("expira sozinha no dia seguinte ao fim do adiamento", () => {
    expect(vencida("2025-04-15", "2025-04-15").snoozed).toBe(true)
    expect(vencida("2025-04-16", "2025-04-15").snoozed).toBe(false)
  })

  it("adiamento no passado não silencia nada", () => {
    const f = vencida("2025-04-10", "2025-04-05")
    expect(f.snoozed).toBe(false)
    expect(f.snoozedUntil).toBeNull()
  })

  it("entre duas adiadas, volta primeiro a que termina antes", () => {
    const curta = vencida("2025-04-10", "2025-04-12")
    const longa = vencida("2025-04-10", "2025-04-30")
    expect([longa, curta].sort(compareUrgency)[0]).toBe(curta)
  })
})
