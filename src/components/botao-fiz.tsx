"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { apagarOcorrencia, registrarOcorrencia } from "@/app/(app)/acoes/actions"
import { Button } from "@/components/ui/button"

/**
 * Registro de um toque. O desfazer não é enfeite: com botão de um toque na
 * lista, registro acidental é questão de tempo — e uma ocorrência falsa
 * envenena a mediana (spec §5).
 */
export function BotaoFiz({ acaoId, nome }: { acaoId: string; nome: string }) {
  const [pendente, iniciar] = useTransition()

  function registrar() {
    iniciar(async () => {
      const r = await registrarOcorrencia({ acaoId })

      if (!r.ok) {
        toast.error(r.erro)
        return
      }

      const { ocorrenciaId } = r.dados
      toast.success(`${nome} — registrado hoje`, {
        duration: 10_000,
        action: {
          label: "Desfazer",
          onClick: () => {
            iniciar(async () => {
              const desfeito = await apagarOcorrencia(ocorrenciaId)
              if (desfeito.ok) toast("Registro desfeito.")
              else toast.error(desfeito.erro)
            })
          },
        },
      })
    })
  }

  return (
    <Button size="sm" onClick={registrar} disabled={pendente} className="shrink-0">
      {pendente ? "..." : "Fiz"}
    </Button>
  )
}
