"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { recordOccurrence } from "@/app/(app)/activities/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { today } from "@/lib/dates"

/**
 * Backfilling old entries. Exact date plus an "approximate" flag: storing the
 * date as fact and the uncertainty as a flag delivers nearly everything a
 * declared-precision model would, at a fraction of the cost (spec §3).
 */
export function BackfillForm({ activityId }: { activityId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [date, setDate] = useState("")
  const [approximate, setApproximate] = useState(true)
  const [cost, setCost] = useState("")

  function submit(event: React.FormEvent) {
    event.preventDefault()
    start(async () => {
      const result = await recordOccurrence({
        activityId,
        date,
        approximate,
        cost: cost || null,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Registro adicionado.")
      setDate("")
      setCost("")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border p-4">
      <p className="text-sm font-medium">Adicionar um registro antigo</p>

      <div className="flex gap-2">
        <Input
          type="date"
          max={today()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="flex-1"
        />
        <Input
          type="text"
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="R$ (opcional)"
          className="w-32"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="approximate"
          checked={approximate}
          onCheckedChange={(v) => setApproximate(v === true)}
        />
        <Label htmlFor="approximate" className="text-sm font-normal text-muted-foreground">
          Data aproximada (lembrei de cabeça)
        </Label>
      </div>

      <Button type="submit" size="sm" variant="secondary" disabled={pending || !date}>
        {pending ? "Salvando..." : "Adicionar"}
      </Button>
    </form>
  )
}
