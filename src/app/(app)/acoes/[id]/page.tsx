import Link from "next/link"
import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { BotaoApagarOcorrencia, BotaoArquivar } from "@/components/acoes-perigosas"
import { BotaoFiz } from "@/components/botao-fiz"
import { FormularioRetroativo } from "@/components/formulario-retroativo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buscarAcao } from "@/lib/acoes"
import {
  descreverConfianca,
  descreverIntervalo,
  descreverPrazo,
  formatarDataLonga,
  formatarValor,
} from "@/lib/formato"

export default async function DetalheAcaoPage({ params }: PageProps<"/acoes/[id]">) {
  const session = await auth()
  const { id } = await params

  const acao = await buscarAcao(session!.user!.id!, id)
  if (!acao) notFound()

  const e = acao.estimativa

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4">
      <div>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← todas as ações
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{acao.nome}</h1>
          <BotaoFiz acaoId={acao.id} nome={acao.nome} />
        </div>
        {acao.escopo === "compartilhada" && <Badge variant="secondary">compartilhada</Badge>}
      </header>

      <section className="space-y-1 rounded-md border p-4">
        <p className="text-lg font-medium">{descreverPrazo(e)}</p>
        <p className="text-sm text-muted-foreground">
          {[descreverIntervalo(e.intervaloDias), descreverConfianca(e)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {e.limiarAlertaDias != null && (
          <p className="text-xs text-muted-foreground">
            Aviso a partir de {e.limiarAlertaDias} dias antes
            {acao.alertaDiasAntes == null ? " (automático)" : ""}.
          </p>
        )}
        {!e.destacar && e.intervaloDias != null && (
          <p className="pt-1 text-xs text-muted-foreground">
            Ainda com poucos ciclos medidos — a previsão aparece, mas não entra na
            ordenação por urgência.
          </p>
        )}
      </section>

      <FormularioRetroativo acaoId={acao.id} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Histórico ({acao.ocorrencias.length})
        </h2>
        {acao.ocorrencias.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {acao.ocorrencias.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm">
                    {formatarDataLonga(o.data)}
                    {o.aproximada && (
                      <span className="text-muted-foreground"> · aproximada</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      acao.escopo === "compartilhada" ? o.feitaPor?.name : null,
                      formatarValor(o.valor),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <BotaoApagarOcorrencia
                  ocorrenciaId={o.id}
                  rotuloData={formatarDataLonga(o.data)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="flex gap-2 border-t pt-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/acoes/${acao.id}/editar`}>Editar</Link>
        </Button>
        <BotaoArquivar acaoId={acao.id} arquivada={acao.arquivada} />
      </footer>
    </div>
  )
}
