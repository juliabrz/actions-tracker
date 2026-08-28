import { describe, expect, it } from "vitest"

import { isUniqueViolation } from "./db-errors"

/** The shape Drizzle actually throws: the driver error one level down. */
function drizzleWrapped(code: string) {
  const driverError = Object.assign(new Error("duplicate key value"), { code })
  return Object.assign(new Error("Failed query: insert into ..."), {
    cause: driverError,
  })
}

describe("isUniqueViolation", () => {
  it("finds the code nested in cause, as Drizzle throws it", () => {
    expect(isUniqueViolation(drizzleWrapped("23505"))).toBe(true)
  })

  it("finds the code on the error itself", () => {
    expect(isUniqueViolation(Object.assign(new Error("x"), { code: "23505" }))).toBe(true)
  })

  it("ignores other Postgres codes", () => {
    expect(isUniqueViolation(drizzleWrapped("23503"))).toBe(false)
  })

  it("handles errors without any code", () => {
    expect(isUniqueViolation(new Error("boom"))).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation("string")).toBe(false)
  })

  it("does not loop forever on a circular cause chain", () => {
    const a: { cause?: unknown } = {}
    const b = { cause: a }
    a.cause = b
    expect(isUniqueViolation(a)).toBe(false)
  })
})
