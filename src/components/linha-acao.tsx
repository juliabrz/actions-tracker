import Link from "next/link"

import { BotaoFiz } from "@/components/botao-fiz"
import { Badge } from "@/components/ui/badge"
import type { AcaoComEstimativa } from "@/lib/acoes"
import { descreverConfianca, descreverIntervalo, descreverPrazo } from "@/lib/formato"
import type { Estado } from "@/lib/periodicidade"

const CORES: Record<Estado, string> = {
  atrasada: "border-l-red-500",
  aproximando: "border-l-amber-500",
  em_dia: "border-l-emerald-500",
  sem_previsao: "border-l-muted",
}

const ROTULO_ESTADO: Record<Estado, string> = {
  atrasada: "Atrasada",
  aproximando: "Chegando",
  em_dia: "Em dia",
  sem_previsao: "Sem previsão",
}

export function LinhaAcao({ acao }: { acao: AcaoComEstimativa }) {
  const { estimativa: e } = acao

  // Com menos de 2 ciclos medidos a previsão existe, mas não grita: aparece
  // em cinza e não sobe no topo da lista (spec §4.5).
  const borda = e.destacar ? CORES[e.estado] : CORES.sem_previsao
  const enfase =
    e.destacar && e.estado === "atrasada"
      ? "text-red-600 dark:text-red-400"
      : e.destacar && e.estado === "aproximando"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground"

  return (
    <li className={`flex items-center gap-3 border-l-4 ${borda} bg-card py-3 pl-3 pr-2`}>
      <Link href={`/acoes/${acao.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{acao.nome}</span>
          {acao.escopo === "compartilhada" && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              compartilhada
            </Badge>
          )}
        </div>

        <div className={`text-sm ${enfase}`}>
          {e.destacar && <span className="font-medium">{ROTULO_ESTADO[e.estado]} · </span>}
          {descreverPrazo(e)}
        </div>

        <div className="truncate text-xs text-muted-foreground">
          {[
            descreverIntervalo(e.intervaloDias),
            descreverConfianca(e),
            acao.escopo === "compartilhada" && acao.ultimaFeitaPor?.name
              ? `última: ${acao.ultimaFeitaPor.name.split(" ")[0]}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </Link>

      <BotaoFiz acaoId={acao.id} nome={acao.nome} />
    </li>
  )
}
