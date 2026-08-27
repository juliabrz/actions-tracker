import { describe, expect, it } from "vitest"

import { diasEntre, ehDataValida, hoje, somarDias } from "./datas"

describe("somarDias", () => {
  it("soma dentro do mesmo mês", () => {
    expect(somarDias("2025-03-10", 5)).toBe("2025-03-15")
  })

  it("vira o mês", () => {
    expect(somarDias("2025-01-28", 5)).toBe("2025-02-02")
  })

  it("vira o ano", () => {
    expect(somarDias("2025-12-30", 3)).toBe("2026-01-02")
  })

  it("respeita ano bissexto", () => {
    expect(somarDias("2024-02-28", 1)).toBe("2024-02-29")
    expect(somarDias("2025-02-28", 1)).toBe("2025-03-01")
  })

  it("aceita dias negativos", () => {
    expect(somarDias("2025-03-01", -1)).toBe("2025-02-28")
  })

  it("não desloca o dia (regressão do bug de fuso)", () => {
    // O bug formatava em America/Sao_Paulo uma data que já era local, o que
    // subtraía um dia quando o servidor rodava em UTC.
    expect(somarDias("2025-06-15", 0)).toBe("2025-06-15")
    expect(somarDias("2025-01-01", 0)).toBe("2025-01-01")
  })
})

describe("diasEntre", () => {
  it("conta dias de calendário", () => {
    expect(diasEntre("2025-03-01", "2025-03-31")).toBe(30)
  })

  it("é negativo quando b vem antes de a", () => {
    expect(diasEntre("2025-03-31", "2025-03-01")).toBe(-30)
  })

  it("atravessa horário de verão sem perder dia", () => {
    expect(diasEntre("2025-10-01", "2025-11-01")).toBe(31)
  })

  it("é inverso de somarDias", () => {
    const base = "2025-07-04"
    for (const n of [1, 7, 30, 90, 365]) {
      expect(diasEntre(base, somarDias(base, n))).toBe(n)
    }
  })
})

describe("ehDataValida", () => {
  it("aceita data real", () => {
    expect(ehDataValida("2025-02-28")).toBe(true)
  })

  it("rejeita dia inexistente", () => {
    expect(ehDataValida("2025-02-30")).toBe(false)
  })

  it("rejeita formato errado", () => {
    expect(ehDataValida("28/02/2025")).toBe(false)
    expect(ehDataValida("2025-2-8")).toBe(false)
    expect(ehDataValida("")).toBe(false)
  })
})

describe("hoje", () => {
  it("devolve YYYY-MM-DD", () => {
    expect(hoje()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
