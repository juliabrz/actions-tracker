"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { deleteOccurrence, recordOccurrence } from "@/app/(app)/activities/actions"
import { Button } from "@/components/ui/button"

/**
 * One-tap logging. Undo is not a nicety: with a one-tap button sitting in the
 * list, an accidental tap is a matter of time — and a false occurrence poisons
 * the median (spec §5).
 */
export function DoneButton({
  activityId,
  name,
}: {
  activityId: string
  name: string
}) {
  const [pending, start] = useTransition()

  function record() {
    start(async () => {
      const result = await recordOccurrence({ activityId })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      const { occurrenceId } = result.data
      toast.success(`${name} — registrado hoje`, {
        duration: 10_000,
        action: {
          label: "Desfazer",
          onClick: () => {
            start(async () => {
              const undone = await deleteOccurrence(occurrenceId)
              if (undone.ok) toast("Registro desfeito.")
              else toast.error(undone.error)
            })
          },
        },
      })
    })
  }

  return (
    <Button size="sm" onClick={record} disabled={pending} className="shrink-0">
      {pending ? "..." : "Fiz"}
    </Button>
  )
}
