"use client"

import { Check, X } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  deleteOccurrence,
  recordOccurrence,
  updateOccurrence,
} from "@/app/(app)/activities/actions"
import { Button } from "@/components/ui/button"
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
  doneToday,
}: {
  activityId: string
  name: string
  doneToday: boolean
}) {
  const [pending, start] = useTransition()
  const [detailsFor, setDetailsFor] = useState<string | null>(null)
  const [cost, setCost] = useState("")

  function openDetails(occurrenceId: string) {
    setCost("")
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
          // Empilhado, não em linha: nome de atividade é livre e longo, e numa
          // linha só com os botões ao lado ele era truncado.
          <div className="pop-panel w-[min(24rem,92vw)] space-y-2 p-3">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-sm leading-snug">
                <strong className="font-semibold">{name}</strong>
                <span className="text-muted-foreground"> — registrado hoje</span>
              </p>
              {/* Fechar: se o registro saiu certo, não há motivo para esperar os
                  10 segundos da janela de desfazer olhando para o aviso. */}
              <button
                type="button"
                onClick={() => toast.dismiss(id)}
                title="Fechar"
                aria-label="Fechar aviso"
                className="-mt-0.5 shrink-0 rounded-md border-2 border-border bg-cream p-0.5 text-ink hover:bg-bubblegum"
              >
                <X className="size-3.5" strokeWidth={3} aria-hidden />
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(id)
                  openDetails(occurrenceId)
                }}
                className="rounded-md border-2 border-border bg-seafoam px-2.5 py-1 text-xs font-medium text-ink"
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
                className="rounded-md border-2 border-border bg-candy px-2.5 py-1 text-xs font-medium text-ink"
              >
                Desfazer
              </button>
            </div>
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
      const result = await updateOccurrence({ occurrenceId, cost: cost || null })
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
      {/* Já registrado hoje: o botão mostra o estado em vez de aceitar o toque e
          devolver erro de duplicata. Colorido significa "dá para agir";
          apagado, "já está feito". */}
      <Button
        size="icon"
        onClick={record}
        disabled={pending || doneToday}
        aria-label={
          doneToday
            ? `"${name}" já foi registrada hoje`
            : `Registrar que fiz "${name}" hoje`
        }
        title={doneToday ? "Já registrado hoje" : "Registrar que fiz hoje"}
        className={`size-9 shrink-0 rounded-full transition-transform ${
          doneToday
            ? "bg-cream text-ink/35 disabled:opacity-100"
            : "bg-mint text-ink hover:scale-110 hover:bg-mint"
        }`}
      >
        <Check className="size-5" strokeWidth={3} aria-hidden />
      </Button>

      <Dialog open={detailsFor !== null} onOpenChange={(o) => !o && setDetailsFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>
              Registrado hoje. Anotar o valor é opcional.
            </DialogDescription>
          </DialogHeader>

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
