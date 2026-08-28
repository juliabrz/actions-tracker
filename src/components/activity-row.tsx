import Link from "next/link"

import { DoneButton } from "@/components/done-button"
import { Badge } from "@/components/ui/badge"
import type { ActivityWithForecast } from "@/lib/activities"
import { describeConfidence, describeDue, describeInterval } from "@/lib/format"
import type { Status } from "@/lib/periodicity"

/**
 * Duas intensidades por estado. Com menos de dois ciclos medidos a ação não
 * disputa o topo da lista (spec §4.5) — mas continua colorida, em tom mais
 * fraco. Pintar de cinza algo que vence hoje é sinal falso: o texto anuncia
 * urgência e a cor desmente. "Não gritar" nunca quis dizer "ficar mudo".
 */
type Tone = { border: string; text: string }

const TONE: Record<Status, { strong: Tone; soft: Tone }> = {
  overdue: {
    strong: { border: "border-l-red-500", text: "text-red-600 dark:text-red-400" },
    soft: { border: "border-l-red-500/40", text: "text-red-600/70 dark:text-red-400/70" },
  },
  due_soon: {
    strong: { border: "border-l-amber-500", text: "text-amber-600 dark:text-amber-400" },
    soft: {
      border: "border-l-amber-500/40",
      text: "text-amber-600/70 dark:text-amber-400/70",
    },
  },
  on_track: {
    strong: { border: "border-l-emerald-500", text: "text-muted-foreground" },
    soft: { border: "border-l-emerald-500/40", text: "text-muted-foreground" },
  },
  no_forecast: {
    strong: { border: "border-l-muted", text: "text-muted-foreground" },
    soft: { border: "border-l-muted", text: "text-muted-foreground" },
  },
}


export function ActivityRow({ activity }: { activity: ActivityWithForecast }) {
  const { forecast } = activity

  const tone = TONE[forecast.status][forecast.highlight ? "strong" : "soft"]

  return (
    <li className={`flex items-center gap-3 border-l-4 ${tone.border} bg-card py-3 pl-3 pr-2`}>
      <Link href={`/activities/${activity.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{activity.name}</span>
          {activity.scope === "shared" && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              compartilhada
            </Badge>
          )}
        </div>

        <div
          className={`text-sm ${tone.text} ${forecast.highlight ? "font-medium" : ""}`}
        >
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

      <DoneButton activityId={activity.id} name={activity.name} />
    </li>
  )
}
