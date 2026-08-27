"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { exigirUsuario } from "@/auth"
import { db } from "@/db"
import { acoes, ocorrencias } from "@/db/schema"
import { exigirAcesso } from "@/lib/acoes"
import { ehDataValida, hoje } from "@/lib/datas"

export type Resultado<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { dados: T }))
  | { ok: false; erro: string }

/** Postgres unique_violation — a ação já foi registrada naquele dia. */
function ehDuplicata(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && e.code === "23505"
}

function paraCentavos(valor: string | null | undefined): string | null {
  if (!valor) return null
  const n = Number(valor.replace(",", "."))
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : null
}

export async function registrarOcorrencia(input: {
  acaoId: string
  data?: string
  aproximada?: boolean
  valor?: string | null
}): Promise<Resultado<{ ocorrenciaId: string }>> {
  const usuario = await exigirUsuario()
  await exigirAcesso(usuario.id, input.acaoId)

  const data = input.data ?? hoje()
  if (!ehDataValida(data)) return { ok: false, erro: "Data inválida." }
  if (data > hoje()) return { ok: false, erro: "Não dá para registrar no futuro." }

  try {
    const [nova] = await db
      .insert(ocorrencias)
      .values({
        acaoId: input.acaoId,
        data,
        feitaPorId: usuario.id,
        aproximada: input.aproximada ?? false,
        valor: paraCentavos(input.valor),
      })
      .returning({ id: ocorrencias.id })

    revalidatePath("/")
    revalidatePath(`/acoes/${input.acaoId}`)
    return { ok: true, dados: { ocorrenciaId: nova.id } }
  } catch (e) {
    if (ehDuplicata(e)) {
      return { ok: false, erro: "Esta ação já foi registrada nesse dia." }
    }
    throw e
  }
}

/** Usada tanto pelo "desfazer" quanto pelo apagar do histórico. */
export async function apagarOcorrencia(ocorrenciaId: string): Promise<Resultado> {
  const usuario = await exigirUsuario()

  const alvo = await db.query.ocorrencias.findFirst({
    where: eq(ocorrencias.id, ocorrenciaId),
    columns: { id: true, acaoId: true },
  })
  if (!alvo) return { ok: false, erro: "Registro não encontrado." }

  await exigirAcesso(usuario.id, alvo.acaoId)
  await db.delete(ocorrencias).where(eq(ocorrencias.id, ocorrenciaId))

  revalidatePath("/")
  revalidatePath(`/acoes/${alvo.acaoId}`)
  return { ok: true }
}

export async function criarAcao(input: {
  nome: string
  escopo: "pessoal" | "compartilhada"
  intervaloChuteDias?: number | null
  alertaDiasAntes?: number | null
  ultimaVez?: string | null
}): Promise<Resultado<{ acaoId: string }>> {
  const usuario = await exigirUsuario()

  const nome = input.nome.trim()
  if (!nome) return { ok: false, erro: "Dê um nome para a ação." }

  if (input.ultimaVez) {
    if (!ehDataValida(input.ultimaVez)) return { ok: false, erro: "Data inválida." }
    if (input.ultimaVez > hoje()) return { ok: false, erro: "Não dá para registrar no futuro." }
  }

  const [nova] = await db
    .insert(acoes)
    .values({
      donoId: usuario.id,
      nome,
      escopo: input.escopo,
      intervaloChuteDias: input.intervaloChuteDias ?? null,
      alertaDiasAntes: input.alertaDiasAntes ?? null,
    })
    .returning({ id: acoes.id })

  // "Quando foi a última vez?" vira a primeira ocorrência: sem âncora não há
  // o que projetar, mesmo havendo chute (spec §10).
  if (input.ultimaVez) {
    await db.insert(ocorrencias).values({
      acaoId: nova.id,
      data: input.ultimaVez,
      feitaPorId: usuario.id,
      aproximada: true,
    })
  }

  revalidatePath("/")
  return { ok: true, dados: { acaoId: nova.id } }
}

export async function atualizarAcao(input: {
  acaoId: string
  nome: string
  escopo: "pessoal" | "compartilhada"
  intervaloChuteDias?: number | null
  alertaDiasAntes?: number | null
}): Promise<Resultado> {
  const usuario = await exigirUsuario()
  await exigirAcesso(usuario.id, input.acaoId)

  const nome = input.nome.trim()
  if (!nome) return { ok: false, erro: "Dê um nome para a ação." }

  await db
    .update(acoes)
    .set({
      nome,
      escopo: input.escopo,
      intervaloChuteDias: input.intervaloChuteDias ?? null,
      alertaDiasAntes: input.alertaDiasAntes ?? null,
    })
    .where(eq(acoes.id, input.acaoId))

  revalidatePath("/")
  revalidatePath(`/acoes/${input.acaoId}`)
  return { ok: true }
}

export async function definirArquivada(
  acaoId: string,
  arquivada: boolean,
): Promise<Resultado> {
  const usuario = await exigirUsuario()
  await exigirAcesso(usuario.id, acaoId)

  await db.update(acoes).set({ arquivada }).where(eq(acoes.id, acaoId))

  revalidatePath("/")
  revalidatePath(`/acoes/${acaoId}`)
  return { ok: true }
}
