import { describe, expect, it } from "vitest"

import { somarDias } from "./datas"
import {
  compararUrgencia,
  estimar,
  type OcorrenciaCalculo,
  type ParametrosAcao,
} from "./periodicidade"

const SEM_PARAMS: ParametrosAcao = {
  intervaloChuteDias: null,
  alertaDiasAntes: null,
}

/** Gera ocorrências a partir de uma data, avançando pelos intervalos dados. */
function serie(inicio: string, intervalos: number[]): OcorrenciaCalculo[] {
  const ocorrencias: OcorrenciaCalculo[] = [{ data: inicio, aproximada: false }]
  let atual = inicio
  for (const dias of intervalos) {
    atual = somarDias(atual, dias)
    ocorrencias.push({ data: atual, aproximada: false })
  }
  return ocorrencias
}

describe("sem dados suficientes", () => {
  it("sem ocorrências e sem chute não estima nada", () => {
    const e = estimar([], SEM_PARAMS, "2025-06-01")
    expect(e.intervaloDias).toBeNull()
    expect(e.origem).toBeNull()
    expect(e.confianca).toBe("sem_dados")
    expect(e.estado).toBe("sem_previsao")
  })

  it("chute sem nenhuma ocorrência não tem âncora, então não projeta data", () => {
    const e = estimar([], { intervaloChuteDias: 30, alertaDiasAntes: null }, "2025-06-01")
    expect(e.intervaloDias).toBe(30)
    expect(e.confianca).toBe("chute")
    expect(e.proximaData).toBeNull()
    expect(e.estado).toBe("sem_previsao")
  })

  it("uma ocorrência mais chute já projeta a próxima data", () => {
    const e = estimar(
      [{ data: "2025-05-01", aproximada: false }],
      { intervaloChuteDias: 30, alertaDiasAntes: null },
      "2025-05-10",
    )
    expect(e.origem).toBe("chute")
    expect(e.proximaData).toBe("2025-05-31")
    expect(e.diasRestantes).toBe(21)
    expect(e.estado).toBe("em_dia")
  })
})

describe("o chute é descartável", () => {
  it("um único intervalo real já substitui o chute", () => {
    const e = estimar(
      serie("2025-01-01", [50]),
      { intervaloChuteDias: 30, alertaDiasAntes: null },
      "2025-02-20",
    )
    expect(e.intervaloDias).toBe(50)
    expect(e.origem).toBe("historico")
  })

  it("o chute nunca entra na mediana como se fosse observação", () => {
    // Chute absurdo de 1000 dias não deve puxar a mediana de 30.
    const e = estimar(
      serie("2025-01-01", [30, 30, 30]),
      { intervaloChuteDias: 1000, alertaDiasAntes: null },
      "2025-03-15",
    )
    expect(e.intervaloDias).toBe(30)
  })
})

describe("mediana", () => {
  it("ignora outlier que envenenaria a média", () => {
    // A viagem de 4 meses: média seria 48, mediana é 30.
    const e = estimar(serie("2025-01-01", [30, 30, 120, 30, 30]), SEM_PARAMS, "2025-08-01")
    expect(e.intervaloDias).toBe(30)
  })

  it("com quantidade par, tira a média dos dois centrais e arredonda", () => {
    const e = estimar(serie("2025-01-01", [30, 40]), SEM_PARAMS, "2025-03-15")
    expect(e.intervaloDias).toBe(35)
  })

  it("usa apenas os últimos 5 intervalos", () => {
    // Os 90 antigos ficam fora da janela; sobram cinco 10.
    const e = estimar(
      serie("2024-01-01", [90, 90, 90, 10, 10, 10, 10, 10]),
      SEM_PARAMS,
      "2025-01-01",
    )
    expect(e.intervaloDias).toBe(10)
    expect(e.qtdIntervalos).toBe(8)
  })

  it("ordena ocorrências fora de ordem antes de calcular", () => {
    const bagunçado: OcorrenciaCalculo[] = [
      { data: "2025-03-01", aproximada: false },
      { data: "2025-01-01", aproximada: false },
      { data: "2025-02-01", aproximada: false },
    ]
    const e = estimar(bagunçado, SEM_PARAMS, "2025-03-10")
    expect(e.ultimaData).toBe("2025-03-01")
    expect(e.intervaloDias).toBe(30) // mediana de [31, 28]
  })
})

describe("confiança", () => {
  it("1 intervalo é fraca", () => {
    expect(estimar(serie("2025-01-01", [30]), SEM_PARAMS, "2025-02-05").confianca).toBe("fraca")
  })

  it("2 intervalos é razoável", () => {
    expect(estimar(serie("2025-01-01", [30, 30]), SEM_PARAMS, "2025-03-05").confianca).toBe(
      "razoavel",
    )
  })

  it("3 ou mais é boa", () => {
    expect(estimar(serie("2025-01-01", [30, 30, 30]), SEM_PARAMS, "2025-04-05").confianca).toBe(
      "boa",
    )
  })

  it("data aproximada na janela rebaixa um nível", () => {
    const ocorrencias = serie("2025-01-01", [30, 30, 30])
    ocorrencias[3].aproximada = true
    expect(estimar(ocorrencias, SEM_PARAMS, "2025-04-05").confianca).toBe("razoavel")
  })

  it("não rebaixa abaixo de fraca quando há histórico real", () => {
    const ocorrencias = serie("2025-01-01", [30])
    ocorrencias[0].aproximada = true
    expect(estimar(ocorrencias, SEM_PARAMS, "2025-02-05").confianca).toBe("fraca")
  })

  it("aproximada fora da janela não rebaixa nada", () => {
    // 8 ocorrências = 7 intervalos; a janela usa as 6 últimas ocorrências.
    const ocorrencias = serie("2025-01-01", [30, 30, 30, 30, 30, 30, 30])
    ocorrencias[0].aproximada = true
    expect(estimar(ocorrencias, SEM_PARAMS, "2025-08-05").confianca).toBe("boa")
  })
})

describe("estados e limiar de alerta", () => {
  const params = SEM_PARAMS

  it("em dia quando falta mais que o limiar", () => {
    // Ocorrências: 01-01, 01-31, 03-02 → intervalo 30 → próxima 2025-04-01.
    // Limiar = 15% de 30 = 5 dias.
    const e = estimar(serie("2025-01-01", [30, 30]), params, "2025-03-01")
    expect(e.proximaData).toBe("2025-04-01")
    expect(e.limiarAlertaDias).toBe(5)
    expect(e.diasRestantes).toBe(31)
    expect(e.estado).toBe("em_dia")
  })

  it("aproximando dentro do limiar", () => {
    const e = estimar(serie("2025-01-01", [30, 30]), params, "2025-03-29")
    expect(e.diasRestantes).toBe(3)
    expect(e.estado).toBe("aproximando")
  })

  it("aproximando no dia exato do vencimento", () => {
    const e = estimar(serie("2025-01-01", [30, 30]), params, "2025-04-01")
    expect(e.diasRestantes).toBe(0)
    expect(e.estado).toBe("aproximando")
  })

  it("atrasada depois do vencimento", () => {
    const e = estimar(serie("2025-01-01", [30, 30]), params, "2025-04-15")
    expect(e.diasRestantes).toBe(-14)
    expect(e.estado).toBe("atrasada")
  })

  it("limiar escala com o intervalo em vez de ser fixo", () => {
    const anual = estimar(serie("2023-01-01", [365, 365]), params, "2025-01-01")
    expect(anual.limiarAlertaDias).toBe(55) // 15% de 365

    const quinzenal = estimar(serie("2025-01-01", [15, 15]), params, "2025-02-01")
    expect(quinzenal.limiarAlertaDias).toBe(2) // 15% de 15
  })

  it("limiar nunca é zero", () => {
    const e = estimar(serie("2025-01-01", [3, 3]), params, "2025-01-08")
    expect(e.limiarAlertaDias).toBe(1)
  })

  it("override manual vence o percentual", () => {
    // Faltam 7 dias: com o limiar padrão de 5 estaria em dia; com 14, não.
    const e = estimar(serie("2025-01-01", [30, 30]), { ...params, alertaDiasAntes: 14 }, "2025-03-25")
    expect(e.diasRestantes).toBe(7)
    expect(e.limiarAlertaDias).toBe(14)
    expect(e.estado).toBe("aproximando")
  })
})

describe("destaque", () => {
  it("não destaca com um único intervalo, mesmo vencida", () => {
    const e = estimar(serie("2025-01-01", [30]), SEM_PARAMS, "2025-12-01")
    expect(e.estado).toBe("atrasada")
    expect(e.destacar).toBe(false)
  })

  it("destaca a partir de dois intervalos", () => {
    expect(estimar(serie("2025-01-01", [30, 30]), SEM_PARAMS, "2025-03-05").destacar).toBe(true)
  })
})

describe("ordenação por urgência", () => {
  it("atrasada vem antes de aproximando, que vem antes de em dia", () => {
    const atrasada = estimar(serie("2025-01-01", [30, 30]), SEM_PARAMS, "2025-05-01")
    const aproximando = estimar(serie("2025-01-01", [30, 30]), SEM_PARAMS, "2025-03-29")
    const emDia = estimar(serie("2025-01-01", [30, 30]), SEM_PARAMS, "2025-03-01")

    const ordenada = [emDia, atrasada, aproximando].sort(compararUrgencia)
    expect(ordenada.map((e) => e.estado)).toEqual(["atrasada", "aproximando", "em_dia"])
  })

  it("desempata pela que vence primeiro", () => {
    const cedo = estimar(serie("2025-01-01", [30, 30]), SEM_PARAMS, "2025-02-25")
    const tarde = estimar(serie("2025-01-01", [90, 90]), SEM_PARAMS, "2025-02-25")
    expect([tarde, cedo].sort(compararUrgencia)[0]).toBe(cedo)
  })

  it("ação sem destaque não disputa o topo mesmo atrasada", () => {
    const semDestaque = estimar(serie("2025-01-01", [30]), SEM_PARAMS, "2025-12-01")
    const comDestaque = estimar(serie("2025-01-01", [30, 30]), SEM_PARAMS, "2025-04-01")
    expect([semDestaque, comDestaque].sort(compararUrgencia)[0]).toBe(comDestaque)
  })

  it("sem previsão vai para o fim", () => {
    const semPrevisao = estimar([], SEM_PARAMS, "2025-06-01")
    const emDia = estimar(serie("2025-01-01", [30, 30]), SEM_PARAMS, "2025-02-10")
    expect([semPrevisao, emDia].sort(compararUrgencia)[0]).toBe(emDia)
  })
})
