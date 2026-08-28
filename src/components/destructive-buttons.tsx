"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import {
  deleteActivity,
  deleteOccurrence,
  setArchived,
} from "@/app/(app)/activities/actions"
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

export function DeleteOccurrenceButton({
  occurrenceId,
  dateLabel,
}: {
  occurrenceId: string
  dateLabel: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Apagar o registro de ${dateLabel}`}
        >
          <Trash2 className="size-4" aria-hidden />
          Apagar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar o registro de {dateLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            O intervalo estimado será recalculado sem ele.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                const result = await deleteOccurrence(occurrenceId)
                if (result.ok) {
                  toast.success("Registro apagado.")
                  router.refresh()
                } else toast.error(result.error)
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

export function ArchiveButton({
  activityId,
  archived,
}: {
  activityId: string
  archived: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      className="text-muted-foreground"
      onClick={() =>
        start(async () => {
          const result = await setArchived(activityId, !archived)
          if (!result.ok) {
            toast.error(result.error)
            return
          }
          toast.success(archived ? "Atividade reativada." : "Atividade arquivada.")
          if (archived) router.refresh()
          else router.push("/")
        })
      }
    >
      {archived ? "Reativar" : "Arquivar"}
    </Button>
  )
}

/**
 * Deleting an activity is the only action in the app that destroys history, so
 * the dialog says exactly how much is about to be lost.
 */
export function DeleteActivityButton({
  activityId,
  name,
  occurrenceCount,
}: {
  activityId: string
  name: string
  occurrenceCount: number
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir &ldquo;{name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            {occurrenceCount === 0
              ? "A atividade será removida. Não há histórico a perder."
              : `Os ${occurrenceCount} registros do histórico serão apagados junto, e a periodicidade medida se perde. Isso não tem desfazer.`}
            {" "}
            Se você só parou de fazer isso, prefira arquivar — some da lista e
            guarda o histórico.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                const result = await deleteActivity(activityId)
                if (!result.ok) {
                  toast.error(result.error)
                  return
                }
                toast.success(`"${name}" foi excluída.`)
                router.push("/")
              })
            }
          >
            Excluir para sempre
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
