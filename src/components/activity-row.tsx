import Link from "next/link"

import { DoneButton } from "@/components/done-button"
import { Badge } from "@/components/ui/badge"
import type { ActivityWithForecast } from "@/lib/activities"
import { describeConfidence, describeDue, describeInterval } from "@/lib/format"
import type { Status } from "@/lib/periodicity"

const BORDER: Record<Status, string> = {
  overdue: "border-l-red-500",
  due_soon: "border-l-amber-500",
  on_track: "border-l-emerald-500",
  no_forecast: "border-l-muted",
}

const STATUS_LABEL: Record<Status, string> = {
  overdue: "Atrasada",
  due_soon: "Chegando",
  on_track: "Em dia",
  no_forecast: "Sem previsão",
}

export function ActivityRow({ activity }: { activity: ActivityWithForecast }) {
  const { forecast } = activity

  // Under two measured cycles the forecast exists but does not shout: it shows
  // in grey and does not climb the list (spec §4.5).
  const border = forecast.highlight ? BORDER[forecast.status] : BORDER.no_forecast
  const emphasis =
    forecast.highlight && forecast.status === "overdue"
      ? "text-red-600 dark:text-red-400"
      : forecast.highlight && forecast.status === "due_soon"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground"

  return (
    <li className={`flex items-center gap-3 border-l-4 ${border} bg-card py-3 pl-3 pr-2`}>
      <Link href={`/activities/${activity.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{activity.name}</span>
          {activity.scope === "shared" && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              compartilhada
            </Badge>
          )}
        </div>

        <div className={`text-sm ${emphasis}`}>
          {forecast.highlight && (
            <span className="font-medium">{STATUS_LABEL[forecast.status]} · </span>
          )}
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
