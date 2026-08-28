import { describe, expect, it } from "vitest"

import {
  MAX_DAYS,
  MAX_NAME_LENGTH,
  sanitizeCost,
  sanitizeDays,
  sanitizeName,
  sanitizeScope,
} from "./validation"

describe("sanitizeName", () => {
  it("apara espaços", () => {
    expect(sanitizeName("  Cortar o cabelo  ")).toBe("Cortar o cabelo")
  })

  it("recusa vazio e não-string", () => {
    expect(sanitizeName("   ")).toBeNull()
    expect(sanitizeName(null)).toBeNull()
    expect(sanitizeName(42)).toBeNull()
  })

  it("recusa nome longo demais", () => {
    expect(sanitizeName("a".repeat(MAX_NAME_LENGTH))).not.toBeNull()
    expect(sanitizeName("a".repeat(MAX_NAME_LENGTH + 1))).toBeNull()
  })
})

describe("sanitizeDays", () => {
  it("aceita inteiro positivo dentro do limite", () => {
    expect(sanitizeDays(30)).toBe(30)
    expect(sanitizeDays("45")).toBe(45)
    expect(sanitizeDays(MAX_DAYS)).toBe(MAX_DAYS)
  })

  it("recusa zero, negativo e acima do limite", () => {
    expect(sanitizeDays(0)).toBeNull()
    expect(sanitizeDays(-5)).toBeNull()
    expect(sanitizeDays(MAX_DAYS + 1)).toBeNull()
  })

  it("recusa fracionário, infinito e lixo", () => {
    expect(sanitizeDays(1.5)).toBeNull()
    expect(sanitizeDays(Infinity)).toBeNull()
    expect(sanitizeDays("abc")).toBeNull()
    expect(sanitizeDays({})).toBeNull()
  })

  it("trata ausência como sem valor", () => {
    expect(sanitizeDays(null)).toBeNull()
    expect(sanitizeDays(undefined)).toBeNull()
  })
})

describe("sanitizeCost", () => {
  it("aceita vírgula e ponto", () => {
    expect(sanitizeCost("89,90")).toBe("89.90")
    expect(sanitizeCost("89.9")).toBe("89.90")
  })

  it("recusa negativo e acima do que a coluna comporta", () => {
    expect(sanitizeCost("-1")).toBeNull()
    expect(sanitizeCost("100000000")).toBeNull()
  })

  it("recusa lixo, aceita vazio como ausência", () => {
    expect(sanitizeCost("abc")).toBeNull()
    expect(sanitizeCost("")).toBeNull()
    expect(sanitizeCost(null)).toBeNull()
  })
})

describe("sanitizeScope", () => {
  it("aceita só os dois valores do enum", () => {
    expect(sanitizeScope("personal")).toBe("personal")
    expect(sanitizeScope("shared")).toBe("shared")
    expect(sanitizeScope("admin")).toBeNull()
    expect(sanitizeScope(null)).toBeNull()
  })
})
