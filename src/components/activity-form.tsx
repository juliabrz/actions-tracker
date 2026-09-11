"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition, type ReactNode } from "react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PILL_CLASS } from "@/components/pill-link"
import { WindowPanel } from "@/components/window-panel"
import { today } from "@/lib/dates"
import { automaticAlertDays } from "@/lib/periodicity"

type Scope = "personal" | "shared"

type Props = {
  /** Título e adesivo do painel: o formulário o monta para poder colocar o
      "voltar" acima dele, guardado pelo aviso de alterações não salvas. */
  title: string
  sticker?: ReactNode
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

function soDigitos(value: string): string {
  return value.replace(/\D/g, "")
}

function positiveIntOrNull(value: string): number | null {
  const n = Number(value)
  return value.trim() !== "" && Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

export function ActivityForm({ activity, measuredIntervalDays, title, sticker }: Props) {
  const editing = Boolean(activity)
  const router = useRouter()
  const [pending, start] = useTransition()
  // Já abre quando há override salvo: um valor que só aparece depois de um
  // clique é um valor que o usuário não sabe que existe.
  const inicial = {
    name: activity?.name ?? "",
    scope: (activity?.scope ?? "personal") as Scope,
    lastDoneOn: "",
    lastDoneCost: "",
    guess: activity?.guessedIntervalDays?.toString() ?? "",
    alert: activity?.alertDaysBefore?.toString() ?? "",
  }

  const [confirmandoSaida, setConfirmandoSaida] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(Boolean(activity?.alertDaysBefore))

  const [name, setName] = useState(activity?.name ?? "")
  const [scope, setScope] = useState<Scope>(activity?.scope ?? "personal")
  const [lastDoneOn, setLastDoneOn] = useState("")
  const [lastDoneCost, setLastDoneCost] = useState("")
  // Padrão desmarcado: a data vem de um seletor de calendário, então tratá-la
  // como exata é a leitura literal do que foi preenchido. Quem chutou marca.
  const [lastDoneApproximate, setLastDoneApproximate] = useState(false)
  const [guess, setGuess] = useState(activity?.guessedIntervalDays?.toString() ?? "")
  const [alert, setAlert] = useState(activity?.alertDaysBefore?.toString() ?? "")

  // Mostra o que o automático daria para este ciclo: o palpite que você está
  // digitando manda, e na falta dele vale o intervalo já medido. É informação,
  // não atalho — havia um botão para adotar esse número, removido porque fixar
  // exatamente o valor que o automático produz não muda nada hoje e impede o
  // ajuste amanhã, quando o ciclo mudar. Override serve para escolher um número
  // diferente, e para isso basta digitar.
  const referenceInterval = positiveIntOrNull(guess) ?? measuredIntervalDays ?? null
  const suggestedAlert = automaticAlertDays(referenceInterval)

  const alterado =
    name !== inicial.name ||
    scope !== inicial.scope ||
    lastDoneOn !== inicial.lastDoneOn ||
    lastDoneCost !== inicial.lastDoneCost ||
    guess !== inicial.guess ||
    alert !== inicial.alert

  // Cobre recarregar e fechar a aba. Navegação interna o App Router não deixa
  // bloquear, e é por isso que os dois caminhos de saída daqui de dentro
  // perguntam antes: um aviso com buracos ensina a confiar e depois falha.
  useEffect(() => {
    if (!alterado) return
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", avisar)
    return () => window.removeEventListener("beforeunload", avisar)
  }, [alterado])

  function voltar() {
    router.push(activity ? `/activities/${activity.id}` : "/")
  }

  function sair() {
    if (alterado) setConfirmandoSaida(true)
    else voltar()
  }

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
            lastDoneCost: lastDoneCost || null,
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
    <div className="space-y-4">
      <button type="button" onClick={sair} className={PILL_CLASS}>
        <span aria-hidden>←</span>
        todas as atividades
      </button>

      <WindowPanel title={title} sticker={sticker}>
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
          {/* Sem altura fixa: no iOS o input[type=date] é um controle nativo com
              altura própria e não respeita o h-8 do componente, então ele
              crescia e o campo de valor ficava menor. Com h-auto os dois se
              esticam para a altura da linha, seja qual for a maior. */}
          <div className="flex items-stretch gap-2">
            <Input
              id="lastDoneOn"
              type="date"
              max={today()}
              value={lastDoneOn}
              onChange={(e) => setLastDoneOn(e.target.value)}
              className="h-auto min-h-8 flex-1"
            />
            {/* Sempre visível. Escondê-lo até haver data deixava o campo
                indescobrível: ninguém procura o que não está na tela. */}
            <Input
              type="text"
              inputMode="decimal"
              value={lastDoneCost}
              onChange={(e) => setLastDoneCost(e.target.value)}
              placeholder="R$ (opcional)"
              aria-label="Quanto custou"
              className="h-auto min-h-8 w-32"
            />
          </div>
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

      <div className="space-y-2">
        <Label htmlFor="guess">A cada quantos dias você acha que faz?</Label>
        <Input
          id="guess"
          type="text"
          inputMode="numeric"
          value={guess}
          onChange={(e) => setGuess(soDigitos(e.target.value))}
          placeholder="opcional"
          className="w-36"
        />
        <p className="text-xs text-muted-foreground">
          {measuredIntervalDays != null
            ? "O app já calcula pelo histórico desta atividade, então este palpite não tem mais efeito."
            : "Serve só até você registrar duas vezes. Depois o app passa a usar o intervalo real."}
        </p>
      </div>

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
            <Label htmlFor="alert">Avisar quantos dias antes?</Label>
            {/* Sem sufixo ao lado: a unidade já está no rótulo, e com ela aqui o
                campo vazio formava a frase quebrada "automático dias antes". */}
            <Input
              id="alert"
              type="text"
              inputMode="numeric"
              value={alert}
              onChange={(e) => setAlert(soDigitos(e.target.value))}
              placeholder="automático"
              className="w-36"
            />
            {alert.trim() === "" ? (
              <p className="text-xs text-muted-foreground">
                Deixe vazio para o app decidir sozinho.
                {suggestedAlert != null ? (
                  <>
                    {" "}
                    Para esta atividade, seriam{" "}
                    <strong>
                      {suggestedAlert} {suggestedAlert === 1 ? "dia" : "dias"}
                    </strong>
                    .
                  </>
                ) : (
                  " Quanto mais espaçada a atividade, mais cedo ele avisa."
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Fixo: continua o mesmo se a atividade mudar de ritmo.{" "}
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
        {/* Contorno, não fantasma: num app onde tudo que clica tem borda, um
            botão sem ela não parece botão — e quem queria sair do formulário
            acabava no ✕ da barra, que encerra a sessão. */}
        <Button type="button" variant="outline" onClick={sair}>
          Cancelar
        </Button>
      </div>
        </form>
      </WindowPanel>

      {/* Diálogo do app, não o confirm do navegador: aquele ignora a identidade
          visual e não deixa escrever o texto. Um aviso passivo não serviria —
          ele informaria sem impedir a saída. */}
      <AlertDialog open={confirmandoSaida} onOpenChange={setConfirmandoSaida}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              {editing
                ? "As alterações que você fez nesta atividade serão descartadas."
                : "O que você preencheu será descartado e a atividade não será criada."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={voltar}>Sair sem salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}