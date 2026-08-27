import "server-only"

import { and, eq, or } from "drizzle-orm"

import { db } from "@/db"
import { acoes } from "@/db/schema"

import { compararUrgencia, estimar, type Estimativa } from "./periodicidade"

export type Filtro = "todas" | "minhas" | "compartilhadas"

export type AcaoComEstimativa = {
  id: string
  nome: string
  escopo: "pessoal" | "compartilhada"
  arquivada: boolean
  donoId: string
  intervaloChuteDias: number | null
  alertaDiasAntes: number | null
  estimativa: Estimativa
  ultimaFeitaPor: { id: string; name: string | null } | null
  qtdOcorrencias: number
}

/**
 * Regra de visibilidade do app inteiro: você vê o que é seu e o que é
 * compartilhado. Como só existem duas contas, "compartilhada" já significa
 * "visível para a outra pessoa" — não há terceiro de quem esconder.
 */
function visivelPara(usuarioId: string) {
  return or(eq(acoes.donoId, usuarioId), eq(acoes.escopo, "compartilhada"))!
}

export async function listarAcoes(
  usuarioId: string,
  { filtro = "todas", arquivadas = false }: { filtro?: Filtro; arquivadas?: boolean } = {},
): Promise<AcaoComEstimativa[]> {
  const linhas = await db.query.acoes.findMany({
    where: and(visivelPara(usuarioId), eq(acoes.arquivada, arquivadas)),
    with: {
      ocorrencias: {
        orderBy: (o, { asc }) => [asc(o.data)],
        with: { feitaPor: { columns: { id: true, name: true } } },
      },
    },
  })

  const comEstimativa = linhas
    .filter((a) =>
      filtro === "minhas"
        ? a.escopo === "pessoal"
        : filtro === "compartilhadas"
          ? a.escopo === "compartilhada"
          : true,
    )
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      escopo: a.escopo,
      arquivada: a.arquivada,
      donoId: a.donoId,
      intervaloChuteDias: a.intervaloChuteDias,
      alertaDiasAntes: a.alertaDiasAntes,
      qtdOcorrencias: a.ocorrencias.length,
      ultimaFeitaPor: a.ocorrencias.at(-1)?.feitaPor ?? null,
      estimativa: estimar(a.ocorrencias, {
        intervaloChuteDias: a.intervaloChuteDias,
        alertaDiasAntes: a.alertaDiasAntes,
      }),
    }))

  return comEstimativa.sort((a, b) => compararUrgencia(a.estimativa, b.estimativa))
}

export async function buscarAcao(usuarioId: string, acaoId: string) {
  const acao = await db.query.acoes.findFirst({
    where: and(eq(acoes.id, acaoId), visivelPara(usuarioId)),
    with: {
      ocorrencias: {
        orderBy: (o, { desc }) => [desc(o.data)],
        with: { feitaPor: { columns: { id: true, name: true, image: true } } },
      },
      dono: { columns: { id: true, name: true } },
    },
  })
  if (!acao) return null

  return {
    ...acao,
    estimativa: estimar(acao.ocorrencias, {
      intervaloChuteDias: acao.intervaloChuteDias,
      alertaDiasAntes: acao.alertaDiasAntes,
    }),
  }
}

/** Confere que o usuário pode mexer nesta ação. Lança se não puder. */
export async function exigirAcesso(usuarioId: string, acaoId: string) {
  const acao = await db.query.acoes.findFirst({
    where: and(eq(acoes.id, acaoId), visivelPara(usuarioId)),
    columns: { id: true },
  })
  if (!acao) throw new Error("Ação não encontrada")
  return acao
}
