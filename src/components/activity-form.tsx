"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createActivity, updateActivity } from "@/app/(app)/activities/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { automaticAlertDays } from "@/lib/periodicity"

type Scope = "personal" | "shared"

type Props = {
  /** Intervalo já medido desta ação, quando existe. Alimenta a sugestão de aviso. */
  measuredIntervalDays?: number | null
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

export function ActivityForm({ activity, measuredIntervalDays }: Props) {
  const editing = Boolean(activity)
  const router = useRouter()
  const [pending, start] = useTransition()
  // Já abre quando a ação tem algo configurado: um valor salvo que só aparece
  // depois de um clique é um valor que o usuário não sabe que existe.
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(activity?.guessedIntervalDays ?? activity?.alertDaysBefore),
  )

  const [name, setName] = useState(activity?.name ?? "")
  const [scope, setScope] = useState<Scope>(activity?.scope ?? "personal")
  const [lastDoneOn, setLastDoneOn] = useState("")
  // Padrão desmarcado: a data vem de um seletor de calendário, então tratá-la
  // como exata é a leitura literal do que foi preenchido. Quem chutou marca.
  const [lastDoneApproximate, setLastDoneApproximate] = useState(false)
  const [guess, setGuess] = useState(activity?.guessedIntervalDays?.toString() ?? "")
  const [alert, setAlert] = useState(activity?.alertDaysBefore?.toString() ?? "")

  // Sugestão viva: o palpite que você está digitando manda, e na falta dele
  // vale o intervalo já medido. Só sugere — preencher o campo gravaria um
  // override, que congela o valor enquanto o automático acompanha o ciclo.
  const referenceInterval = positiveIntOrNull(guess) ?? measuredIntervalDays ?? null
  const suggestedAlert = automaticAlertDays(referenceInterval)

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
        : await createActivity({
            ...shared,
            lastDoneOn: lastDoneOn || null,
            lastDoneApproximate,
          })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(editing ? "Atividade atualizada." : "Atividade criada.")
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
          {lastDoneOn ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="lastDoneApproximate"
                checked={lastDoneApproximate}
                onCheckedChange={(v) => setLastDoneApproximate(v === true)}
              />
              <Label
                htmlFor="lastDoneApproximate"
                className="text-sm font-normal text-muted-foreground"
              >
                Data aproximada (lembrei de cabeça)
              </Label>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Opcional, mas sem isso não há de onde contar.
            </p>
          )}
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
        <div className="pop-panel space-y-5 p-4">
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
            <Label htmlFor="alert">Avisar quantos dias antes?</Label>
            <div className="flex items-center gap-2">
              <Input
                id="alert"
                type="number"
                min={1}
                inputMode="numeric"
                value={alert}
                onChange={(e) => setAlert(e.target.value)}
                placeholder="7"
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">dias antes</span>
            </div>
            {alert.trim() === "" ? (
              <p className="text-xs text-muted-foreground">
                Vazio significa automático, proporcional ao ciclo.
                {suggestedAlert != null ? (
                  <>
                    {" "}
                    Com {referenceInterval} dias de ciclo, isso dá{" "}
                    <strong>{suggestedAlert} {suggestedAlert === 1 ? "dia" : "dias"}</strong>.{" "}
                    <button
                      type="button"
                      onClick={() => setAlert(String(suggestedAlert))}
                      className="underline underline-offset-2 hover:no-underline"
                    >
                      Fixar esse valor
                    </button>
                  </>
                ) : (
                  " Quanto mais longo o ciclo, maior a antecedência."
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Valor fixo: não muda quando o ciclo mudar.{" "}
                <button
                  type="button"
                  onClick={() => setAlert("")}
                  className="underline underline-offset-2 hover:no-underline"
                >
                  Voltar ao automático
                </button>
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? "Salvando..." : editing ? "Salvar" : "Criar atividade"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
