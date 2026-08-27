import Link from "next/link"

import { auth } from "@/auth"
import { LinhaAcao } from "@/components/linha-acao"
import { Button } from "@/components/ui/button"
import { listarAcoes, type Filtro } from "@/lib/acoes"

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "minhas", rotulo: "Minhas" },
  { valor: "compartilhadas", rotulo: "Compartilhadas" },
]

export default async function ListaPage({ searchParams }: PageProps<"/">) {
  const session = await auth()
  const usuarioId = session!.user!.id!

  const { f } = await searchParams
  const filtro: Filtro = FILTROS.some((x) => x.valor === f) ? (f as Filtro) : "todas"

  const acoes = await listarAcoes(usuarioId, { filtro })

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <nav className="flex gap-1">
          {FILTROS.map(({ valor, rotulo }) => (
            <Link
              key={valor}
              href={valor === "todas" ? "/" : `/?f=${valor}`}
              className={`rounded-full px-3 py-1 text-sm ${
                filtro === valor
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {rotulo}
            </Link>
          ))}
        </nav>

        <Button asChild size="sm">
          <Link href="/acoes/nova">Nova</Link>
        </Button>
      </div>

      {acoes.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {filtro === "todas"
              ? "Nada cadastrado ainda. Comece pela coisa que você mais esquece."
              : "Nada aqui com esse filtro."}
          </p>
        </div>
      ) : (
        <ul className="divide-y border-y">
          {acoes.map((acao) => (
            <LinhaAcao key={acao.id} acao={acao} />
          ))}
        </ul>
      )}

      <div className="px-4 py-6">
        <Link href="/arquivadas" className="text-xs text-muted-foreground hover:underline">
          Ver arquivadas
        </Link>
      </div>
    </div>
  )
}
