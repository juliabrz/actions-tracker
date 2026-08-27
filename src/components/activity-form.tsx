"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createActivity, updateActivity } from "@/app/(app)/activities/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { today } from "@/lib/dates"

type Scope = "personal" | "shared"

type Props = {
  activity?: {
    id: string
    name: string
    scope: Scope
    guessedIntervalDays: number | null
    alertDaysBefore: number | null
  }
}

function positiveIntOrNull(value: string): number | null {
  const n = Number(value)
  return value.trim() !== "" && Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

export function ActivityForm({ activity }: Props) {
  const editing = Boolean(activity)
  const router = useRouter()
  const [pending, start] = useTransition()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [name, setName] = useState(activity?.name ?? "")
  const [scope, setScope] = useState<Scope>(activity?.scope ?? "personal")
  const [lastDoneOn, setLastDoneOn] = useState("")
  const [guess, setGuess] = useState(activity?.guessedIntervalDays?.toString() ?? "")
  const [alert, setAlert] = useState(activity?.alertDaysBefore?.toString() ?? "")

  function submit(event: React.FormEvent) {
    event.preventDefault()
    start(async () => {
      const shared = {
        name,
        scope,
        guessedIntervalDays: positiveIntOrNull(guess),
        alertDaysBefore: positiveIntOrNull(alert),
      }

      const result = activity
        ? await updateActivity({ activityId: activity.id, ...shared })
        : await createActivity({ ...shared, lastDoneOn: lastDoneOn || null })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(editing ? "Ação atualizada." : "Ação criada.")
      router.push(activity ? `/activities/${activity.id}` : "/")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">O que é?</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cortar o cabelo"
          autoFocus={!editing}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scope">Quem acompanha</Label>
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger id="scope" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Só eu</SelectItem>
            <SelectItem value="shared">Nós duas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!editing && (
        <div className="space-y-2">
          <Label htmlFor="lastDoneOn">Quando foi a última vez?</Label>
          <Input
            id="lastDoneOn"
            type="date"
            max={today()}
            value={lastDoneOn}
            onChange={(e) => setLastDoneOn(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Opcional, mas sem isso não há de onde contar. Fica marcada como data
            aproximada.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-sm text-muted-foreground hover:underline"
      >
        {showAdvanced ? "− menos opções" : "+ mais opções"}
      </button>

      {showAdvanced && (
        <div className="space-y-5 rounded-md border p-4">
          <div className="space-y-2">
            <Label htmlFor="guess">De quanto em quanto tempo você acha que faz?</Label>
            <Input
              id="guess"
              type="number"
              min={1}
              inputMode="numeric"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="dias"
            />
            <p className="text-xs text-muted-foreground">
              Só um palpite para os primeiros dias. É descartado assim que existir
              um ciclo medido de verdade.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert">Me avise com quantos dias de antecedência?</Label>
            <Input
              id="alert"
              type="number"
              min={1}
              inputMode="numeric"
              value={alert}
              onChange={(e) => setAlert(e.target.value)}
              placeholder="automático (15% do intervalo)"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? "Salvando..." : editing ? "Salvar" : "Criar ação"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
