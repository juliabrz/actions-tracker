import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

import type { Confianca, Estimativa } from "./periodicidade"

export function formatarData(data: string): string {
  return format(parseISO(data), "d 'de' MMM", { locale: ptBR })
}

export function formatarDataLonga(data: string): string {
  return format(parseISO(data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function dias(n: number): string {
  return n === 1 ? "1 dia" : `${n} dias`
}

export function descreverIntervalo(intervaloDias: number | null): string | null {
  if (intervaloDias == null) return null
  if (intervaloDias >= 365) {
    const anos = Math.round(intervaloDias / 365)
    return anos === 1 ? "a cada ano" : `a cada ${anos} anos`
  }
  if (intervaloDias >= 60) return `a cada ${Math.round(intervaloDias / 30)} meses`
  if (intervaloDias >= 14) return `a cada ${Math.round(intervaloDias / 7)} semanas`
  return `a cada ${dias(intervaloDias)}`
}

/** A frase principal da linha: o quanto falta, em linguagem de gente. */
export function descreverPrazo(e: Estimativa): string {
  if (e.diasRestantes == null || e.proximaData == null) {
    return e.ultimaData ? "sem estimativa ainda" : "nunca foi registrada"
  }
  if (e.diasRestantes < 0) return `atrasada há ${dias(-e.diasRestantes)}`
  if (e.diasRestantes === 0) return "é hoje"
  if (e.diasRestantes === 1) return "é amanhã"
  return `em ${dias(e.diasRestantes)} · ${formatarData(e.proximaData)}`
}

const CONFIANCA_ROTULO: Record<Confianca, string> = {
  sem_dados: "sem dados",
  chute: "seu palpite",
  fraca: "estimativa fraca",
  razoavel: "estimativa razoável",
  boa: "estimativa boa",
}

export function descreverConfianca(e: Estimativa): string {
  const base = CONFIANCA_ROTULO[e.confianca]
  if (e.origem === "chute") return base
  if (e.qtdIntervalos === 0) return base
  return `${base} · ${e.qtdIntervalos === 1 ? "1 ciclo medido" : `${e.qtdIntervalos} ciclos medidos`}`
}

export function formatarValor(valor: string | null): string | null {
  if (valor == null) return null
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
