import Link from "next/link"

import { auth } from "@/auth"
import { listarAcoes } from "@/lib/acoes"

export default async function ArquivadasPage() {
  const session = await auth()
  const acoes = await listarAcoes(session!.user!.id!, { arquivadas: true })

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← todas as ações
      </Link>
      <h1 className="text-xl font-semibold">Arquivadas</h1>

      {acoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada arquivado.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {acoes.map((a) => (
            <li key={a.id}>
              <Link href={`/acoes/${a.id}`} className="block px-3 py-3 hover:bg-muted">
                <span className="font-medium">{a.nome}</span>
                <span className="block text-xs text-muted-foreground">
                  {a.qtdOcorrencias} registro{a.qtdOcorrencias === 1 ? "" : "s"} no histórico
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
