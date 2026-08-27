import { describe, expect, it } from "vitest"

import { daysBetween, isValidDate, shiftDays, today } from "./dates"

describe("shiftDays", () => {
  it("adds days within the same month", () => {
    expect(shiftDays("2025-03-10", 5)).toBe("2025-03-15")
  })

  it("rolls over the month", () => {
    expect(shiftDays("2025-01-28", 5)).toBe("2025-02-02")
  })

  it("rolls over the year", () => {
    expect(shiftDays("2025-12-30", 3)).toBe("2026-01-02")
  })

  it("honours leap years", () => {
    expect(shiftDays("2024-02-28", 1)).toBe("2024-02-29")
    expect(shiftDays("2025-02-28", 1)).toBe("2025-03-01")
  })

  it("accepts negative days", () => {
    expect(shiftDays("2025-03-01", -1)).toBe("2025-02-28")
  })

  it("does not shift the day (time zone bug regression)", () => {
    // The bug formatted an already-local date in America/Sao_Paulo, which
    // subtracted a day whenever the server ran in UTC.
    expect(shiftDays("2025-06-15", 0)).toBe("2025-06-15")
    expect(shiftDays("2025-01-01", 0)).toBe("2025-01-01")
  })
})

describe("daysBetween", () => {
  it("counts calendar days", () => {
    expect(daysBetween("2025-03-01", "2025-03-31")).toBe(30)
  })

  it("is negative when b precedes a", () => {
    expect(daysBetween("2025-03-31", "2025-03-01")).toBe(-30)
  })

  it("crosses daylight saving without losing a day", () => {
    expect(daysBetween("2025-10-01", "2025-11-01")).toBe(31)
  })

  it("is the inverse of shiftDays", () => {
    const base = "2025-07-04"
    for (const n of [1, 7, 30, 90, 365]) {
      expect(daysBetween(base, shiftDays(base, n))).toBe(n)
    }
  })
})

describe("isValidDate", () => {
  it("accepts a real date", () => {
    expect(isValidDate("2025-02-28")).toBe(true)
  })

  it("rejects a day that does not exist", () => {
    expect(isValidDate("2025-02-30")).toBe(false)
  })

  it("rejects malformed input", () => {
    expect(isValidDate("28/02/2025")).toBe(false)
    expect(isValidDate("2025-2-8")).toBe(false)
    expect(isValidDate("")).toBe(false)
  })
})

describe("today", () => {
  it("returns YYYY-MM-DD", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
