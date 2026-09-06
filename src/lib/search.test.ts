import { describe, expect, it } from "vitest"

import { matches, normalize } from "./search"

describe("normalize", () => {
  it("remove acento e caixa", () => {
    expect(normalize("Ração")).toBe("racao")
    expect(normalize("AR-CONDICIONADO")).toBe("ar-condicionado")
  })
})

describe("matches", () => {
  it("ignora acento nos dois lados", () => {
    expect(matches("Comprar ração do gato", "racao")).toBe(true)
    expect(matches("Comprar racao do gato", "ração")).toBe(true)
  })

  it("ignora caixa", () => {
    expect(matches("Cortar o cabelo", "CABELO")).toBe(true)
  })

  it("casa termos em qualquer ordem", () => {
    expect(matches("Limpar o filtro do ar-condicionado", "ar filtro")).toBe(true)
  })

  it("exige que todos os termos apareçam", () => {
    expect(matches("Cortar o cabelo", "cortar unha")).toBe(false)
  })

  it("busca vazia devolve tudo", () => {
    expect(matches("qualquer coisa", "")).toBe(true)
    expect(matches("qualquer coisa", "   ")).toBe(true)
  })

  it("casa pedaço de palavra", () => {
    expect(matches("Trocar a escova de dentes", "esco")).toBe(true)
  })
})
