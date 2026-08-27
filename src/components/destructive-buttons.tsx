"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { deleteOccurrence, setArchived } from "@/app/(app)/activities/actions"
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
        >
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
          toast.success(archived ? "Ação reativada." : "Ação arquivada.")
          if (archived) router.refresh()
          else router.push("/")
        })
      }
    >
      {archived ? "Reativar" : "Arquivar"}
    </Button>
  )
}
