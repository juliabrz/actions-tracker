import Link from "next/link"

import { DoneButton } from "@/components/done-button"
import { SnoozeButton } from "@/components/snooze-button"
import type { ActivityWithForecast } from "@/lib/activities"
import { describeConfidence, describeDue, describeInterval } from "@/lib/format"
import type { Status } from "@/lib/periodicity"

type Tone = { stripe: string; text: string }

/**
 * Duas intensidades por estado. Com menos de dois ciclos medidos a ação não
 * disputa o topo da lista (spec §4.5) — mas continua colorida, em tom mais
 * fraco. Pintar de neutro algo que vence hoje é sinal falso.
 */
const TONE: Record<Status, { strong: Tone; soft: Tone }> = {
  overdue: {
    strong: { stripe: "bg-destructive", text: "text-destructive" },
    soft: { stripe: "bg-destructive/40", text: "text-destructive/70" },
  },
  due_soon: {
    strong: { stripe: "bg-butter", text: "text-ink/80 dark:text-butter" },
    soft: { stripe: "bg-butter/40", text: "text-ink/55 dark:text-butter/70" },
  },
  on_track: {
    strong: { stripe: "bg-mint", text: "text-muted-foreground" },
    soft: { stripe: "bg-mint/40", text: "text-muted-foreground" },
  },
  no_forecast: {
    strong: { stripe: "bg-lilac", text: "text-muted-foreground" },
    soft: { stripe: "bg-lilac", text: "text-muted-foreground" },
  },
}

export function ActivityRow({ activity }: { activity: ActivityWithForecast }) {
  const { forecast } = activity
  // Adiada usa o tom neutro: ela está pausada, não em dia nem urgente.
  const tone = forecast.snoozed
    ? TONE.no_forecast.strong
    : TONE[forecast.status][forecast.highlight ? "strong" : "soft"]

  // Só faz sentido adiar o que está pedindo atenção.
  const podeAdiar =
    forecast.snoozed ||
    forecast.status === "overdue" ||
    forecast.status === "due_soon"

  return (
    <li className="pop-panel flex items-stretch overflow-hidden p-0 transition-transform hover:-translate-x-px hover:-translate-y-px">
      {/* Faixa de estado: com contorno em volta do card inteiro, uma borda
          esquerda colorida sumiria — então a faixa vira um bloco próprio. */}
      <span
        aria-hidden
        className={`w-3 shrink-0 border-r-2 border-border ${tone.stripe}`}
      />

      <Link href={`/activities/${activity.id}`} className="min-w-0 flex-1 py-3 pl-3 pr-2">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{activity.name}</span>
          {activity.scope === "shared" && (
            <span className="shrink-0 rounded-full border-2 border-border bg-seafoam px-2 py-0.5 font-pixel text-[9px] text-ink">
              nós duas
            </span>
          )}
        </div>

        <div className={`text-sm ${tone.text} ${forecast.highlight ? "font-medium" : ""}`}>
          {describeDue(forecast)}
        </div>

        <div className="truncate text-xs text-muted-foreground">
          {[
            describeInterval(forecast.intervalDays),
            describeConfidence(forecast),
            activity.scope === "shared" && activity.lastDoneBy?.name
              ? `última: ${activity.lastDoneBy.name.split(" ")[0]}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </Link>

      <div className="flex items-center gap-1 pr-2">
        {podeAdiar && (
          <SnoozeButton
            activityId={activity.id}
            name={activity.name}
            snoozed={forecast.snoozed}
          />
        )}
        <DoneButton
          activityId={activity.id}
          name={activity.name}
          doneToday={activity.doneToday}
        />
      </div>
    </li>
  )
}
