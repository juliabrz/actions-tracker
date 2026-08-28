"use client"

import { Clock } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { clearSnooze, snoozeActivity } from "@/app/(app)/activities/actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PRAZOS = [
  { days: 3, label: "3 dias" },
  { days: 7, label: "1 semana" },
  { days: 30, label: "1 mês" },
]

/**
 * Adiar aparece só onde há o que adiar — vencida ou chegando —, senão cada
 * linha da lista carregaria um botão inútil.
 */
export function SnoozeButton({
  activityId,
  name,
  snoozed,
}: {
  activityId: string
  name: string
  snoozed: boolean
}) {
  const [pending, start] = useTransition()

  function adiar(days: number, label: string) {
    start(async () => {
      const r = await snoozeActivity(activityId, days)
      if (r.ok) toast.success(`${name} — adiada por ${label}.`)
      else toast.error(r.error)
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          title={snoozed ? "Adiamento" : "Adiar"}
          aria-label={snoozed ? `Adiamento de "${name}"` : `Adiar "${name}"`}
          className="size-8 shrink-0 rounded-full text-muted-foreground hover:bg-bubblegum hover:text-ink"
        >
          <Clock className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {snoozed ? (
          <DropdownMenuItem
            onClick={() =>
              start(async () => {
                const r = await clearSnooze(activityId)
                if (r.ok) toast.success("Adiamento cancelado.")
                else toast.error(r.error)
              })
            }
          >
            Cancelar adiamento
          </DropdownMenuItem>
        ) : (
          PRAZOS.map(({ days, label }) => (
            <DropdownMenuItem key={days} onClick={() => adiar(days, label)}>
              Adiar por {label}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
