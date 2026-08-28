"use client"

import { Check } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  deleteOccurrence,
  recordOccurrence,
  updateOccurrence,
} from "@/app/(app)/activities/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * One-tap logging. The tap always records immediately — the optional fields
 * (cost, approximate) are offered afterwards, from the same toast that carries
 * undo. Putting them before the tap would add friction to the hot path, which
 * is what the whole design is built to avoid (spec §5).
 *
 * Undo is not a nicety either: with a one-tap button in the list, an accidental
 * tap is a matter of time, and a false occurrence poisons the median.
 */
export function DoneButton({
  activityId,
  name,
}: {
  activityId: string
  name: string
}) {
  const [pending, start] = useTransition()
  const [detailsFor, setDetailsFor] = useState<string | null>(null)
  const [cost, setCost] = useState("")
  const [approximate, setApproximate] = useState(false)

  function openDetails(occurrenceId: string) {
    setCost("")
    setApproximate(false)
    setDetailsFor(occurrenceId)
  }

  function record() {
    start(async () => {
      const result = await recordOccurrence({ activityId })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      const { occurrenceId } = result.data

      toast.custom(
        (id) => (
          <div className="pop-panel flex w-[min(22rem,90vw)] items-center gap-2 p-3">
            <span className="min-w-0 flex-1 truncate text-sm">
              <strong className="font-medium">{name}</strong> — registrado hoje
            </span>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(id)
                openDetails(occurrenceId)
              }}
              className="shrink-0 rounded-md border-2 border-border bg-seafoam px-2 py-1 text-xs font-medium text-ink"
            >
              Detalhes
            </button>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(id)
                start(async () => {
                  const undone = await deleteOccurrence(occurrenceId)
                  if (undone.ok) toast("Registro desfeito.")
                  else toast.error(undone.error)
                })
              }}
              className="shrink-0 rounded-md border-2 border-border bg-candy px-2 py-1 text-xs font-medium text-ink"
            >
              Desfazer
            </button>
          </div>
        ),
        { duration: 10_000 },
      )
    })
  }

  function saveDetails() {
    if (!detailsFor) return
    const occurrenceId = detailsFor
    start(async () => {
      const result = await updateOccurrence({
        occurrenceId,
        approximate,
        cost: cost || null,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDetailsFor(null)
      toast.success("Detalhes salvos.")
    })
  }

  return (
    <>
      <Button
        size="icon"
        onClick={record}
        disabled={pending}
        aria-label={`Registrar que fiz "${name}" hoje`}
        title="Registrar que fiz hoje"
        className="size-11 shrink-0 rounded-full bg-mint text-ink hover:bg-mint/80"
      >
        <Check className="size-6" strokeWidth={3} aria-hidden />
      </Button>

      <Dialog open={detailsFor !== null} onOpenChange={(o) => !o && setDetailsFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>
              Registrado hoje. Estes campos são opcionais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="details-cost">Quanto custou?</Label>
              <Input
                id="details-cost"
                type="text"
                inputMode="decimal"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="R$"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="details-approximate"
                checked={approximate}
                onCheckedChange={(v) => setApproximate(v === true)}
              />
              <Label
                htmlFor="details-approximate"
                className="text-sm font-normal text-muted-foreground"
              >
                Na verdade foi outro dia (data aproximada)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={saveDetails} disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
