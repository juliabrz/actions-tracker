import { diasEntre, hoje, somarDias } from "./datas"

/** Quantos intervalos entram no cálculo. Janela curta dá recência de graça. */
export const JANELA = 5

/** Fração do intervalo usada como antecedência do alerta, quando não há override. */
export const FRACAO_ALERTA = 0.15

export const CONFIANCAS = ["sem_dados", "chute", "fraca", "razoavel", "boa"] as const
export type Confianca = (typeof CONFIANCAS)[number]

export type Estado = "sem_previsao" | "em_dia" | "aproximando" | "atrasada"

export type OcorrenciaCalculo = {
  data: string
  aproximada: boolean
}

export type ParametrosAcao = {
  intervaloChuteDias: number | null
  alertaDiasAntes: number | null
}

export type Estimativa = {
  intervaloDias: number | null
  origem: "chute" | "historico" | null
  confianca: Confianca
  /** Quantidade de intervalos reais observados (não limitada pela janela). */
  qtdIntervalos: number
  ultimaData: string | null
  proximaData: string | null
  /** Negativo = atrasada. */
  diasRestantes: number | null
  limiarAlertaDias: number | null
  estado: Estado
  /**
   * Só com 2+ intervalos reais a ação ganha cor de alerta e sobe na ordenação.
   * Com 1 intervalo a previsão aparece, mas em cinza (spec §4.5).
   */
  destacar: boolean
}

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  const bruta =
    ordenados.length % 2 === 1
      ? ordenados[meio]
      : (ordenados[meio - 1] + ordenados[meio]) / 2
  return Math.round(bruta)
}

function rebaixar(c: Confianca, piso: Confianca): Confianca {
  const i = CONFIANCAS.indexOf(c)
  const iPiso = CONFIANCAS.indexOf(piso)
  return CONFIANCAS[Math.max(i - 1, iPiso)]
}

function nivelPorIntervalos(qtd: number): Confianca {
  if (qtd >= 3) return "boa"
  if (qtd === 2) return "razoavel"
  return "fraca"
}

/**
 * Calcula a periodicidade de uma ação a partir do seu histórico.
 *
 * Função pura: recebe as ocorrências e os parâmetros da ação, devolve tudo que
 * a UI precisa. Nada aqui é persistido — deriva-se na leitura (spec §6).
 */
export function estimar(
  ocorrencias: OcorrenciaCalculo[],
  { intervaloChuteDias, alertaDiasAntes }: ParametrosAcao,
  hojeStr: string = hoje(),
): Estimativa {
  const historico = [...ocorrencias].sort((a, b) => a.data.localeCompare(b.data))
  const ultimaData = historico.at(-1)?.data ?? null

  const intervalos: number[] = []
  for (let i = 1; i < historico.length; i++) {
    intervalos.push(diasEntre(historico[i - 1].data, historico[i].data))
  }

  const janela = intervalos.slice(-JANELA)

  let intervaloDias: number | null = null
  let origem: Estimativa["origem"] = null
  let confianca: Confianca = "sem_dados"

  if (janela.length > 0) {
    // Há intervalo real: o chute é descartado para sempre (spec §4.2).
    intervaloDias = mediana(janela)
    origem = "historico"
    confianca = nivelPorIntervalos(janela.length)

    // Datas lembradas de cabeça rebaixam a confiança, mas nunca abaixo de
    // "fraca" — existe histórico real, ainda que impreciso.
    const usadas = historico.slice(-(janela.length + 1))
    if (usadas.some((o) => o.aproximada)) {
      confianca = rebaixar(confianca, "fraca")
    }
  } else if (intervaloChuteDias != null && intervaloChuteDias > 0) {
    intervaloDias = intervaloChuteDias
    origem = "chute"
    confianca = "chute"
  }

  let proximaData: string | null = null
  let limiarAlertaDias: number | null = null

  // Sem âncora (nenhuma ocorrência) não há o que projetar, mesmo com chute.
  if (intervaloDias != null && ultimaData != null) {
    proximaData = somarDias(ultimaData, intervaloDias)
    limiarAlertaDias =
      alertaDiasAntes ?? Math.max(1, Math.round(intervaloDias * FRACAO_ALERTA))
  }

  const diasRestantes = proximaData ? diasEntre(hojeStr, proximaData) : null

  let estado: Estado = "sem_previsao"
  if (diasRestantes != null && limiarAlertaDias != null) {
    if (diasRestantes < 0) estado = "atrasada"
    else if (diasRestantes <= limiarAlertaDias) estado = "aproximando"
    else estado = "em_dia"
  }

  return {
    intervaloDias,
    origem,
    confianca,
    qtdIntervalos: intervalos.length,
    ultimaData,
    proximaData,
    diasRestantes,
    limiarAlertaDias,
    estado,
    destacar: intervalos.length >= 2,
  }
}

/** Ordem da lista: atrasadas primeiro, depois as mais próximas de vencer. */
const PESO_ESTADO: Record<Estado, number> = {
  atrasada: 0,
  aproximando: 1,
  em_dia: 2,
  sem_previsao: 3,
}

export function compararUrgencia(a: Estimativa, b: Estimativa): number {
  // Sem destaque (só 1 intervalo) não disputa o topo, mesmo se vencida.
  const pesoA = a.destacar ? PESO_ESTADO[a.estado] : PESO_ESTADO.em_dia
  const pesoB = b.destacar ? PESO_ESTADO[b.estado] : PESO_ESTADO.em_dia
  if (pesoA !== pesoB) return pesoA - pesoB

  const diasA = a.diasRestantes ?? Number.POSITIVE_INFINITY
  const diasB = b.diasRestantes ?? Number.POSITIVE_INFINITY
  return diasA - diasB
}
