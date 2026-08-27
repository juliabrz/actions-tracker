"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { apagarOcorrencia, definirArquivada } from "@/app/(app)/acoes/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function BotaoApagarOcorrencia({
  ocorrenciaId,
  rotuloData,
}: {
  ocorrenciaId: string
  rotuloData: string
}) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={pendente}
          className="text-muted-foreground hover:text-destructive"
        >
          Apagar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar o registro de {rotuloData}?</AlertDialogTitle>
          <AlertDialogDescription>
            O intervalo estimado será recalculado sem ele.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              iniciar(async () => {
                const r = await apagarOcorrencia(ocorrenciaId)
                if (r.ok) {
                  toast.success("Registro apagado.")
                  router.refresh()
                } else toast.error(r.erro)
              })
            }
          >
            Apagar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function BotaoArquivar({
  acaoId,
  arquivada,
}: {
  acaoId: string
  arquivada: boolean
}) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pendente}
      className="text-muted-foreground"
      onClick={() =>
        iniciar(async () => {
          const r = await definirArquivada(acaoId, !arquivada)
          if (!r.ok) {
            toast.error(r.erro)
            return
          }
          toast.success(arquivada ? "Ação reativada." : "Ação arquivada.")
          if (arquivada) router.refresh()
          else router.push("/")
        })
      }
    >
      {arquivada ? "Reativar" : "Arquivar"}
    </Button>
  )
}
