import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { FormularioAcao } from "@/components/formulario-acao"
import { buscarAcao } from "@/lib/acoes"

export default async function EditarAcaoPage({ params }: PageProps<"/acoes/[id]/editar">) {
  const session = await auth()
  const { id } = await params

  const acao = await buscarAcao(session!.user!.id!, id)
  if (!acao) notFound()

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4">
      <h1 className="text-xl font-semibold">Editar ação</h1>
      <FormularioAcao
        acao={{
          id: acao.id,
          nome: acao.nome,
          escopo: acao.escopo,
          intervaloChuteDias: acao.intervaloChuteDias,
          alertaDiasAntes: acao.alertaDiasAntes,
        }}
      />
    </div>
  )
}
