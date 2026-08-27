import Link from "next/link"
import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { BackfillForm } from "@/components/backfill-form"
import {
  ArchiveButton,
  DeleteOccurrenceButton,
} from "@/components/destructive-buttons"
import { DoneButton } from "@/components/done-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getActivity } from "@/lib/activities"
import {
  describeConfidence,
  describeDue,
  describeInterval,
  formatCost,
  formatLongDate,
} from "@/lib/format"

export default async function ActivityPage({ params }: PageProps<"/activities/[id]">) {
  const session = await auth()
  const { id } = await params

  const activity = await getActivity(session!.user!.id!, id)
  if (!activity) notFound()

  const { forecast } = activity

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4">
      <div>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← todas as ações
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{activity.name}</h1>
          <DoneButton activityId={activity.id} name={activity.name} />
        </div>
        {activity.scope === "shared" && <Badge variant="secondary">compartilhada</Badge>}
      </header>

      <section className="space-y-1 rounded-md border p-4">
        <p className="text-lg font-medium">{describeDue(forecast)}</p>
        <p className="text-sm text-muted-foreground">
          {[describeInterval(forecast.intervalDays), describeConfidence(forecast)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {forecast.alertThresholdDays != null && (
          <p className="text-xs text-muted-foreground">
            Aviso a partir de {forecast.alertThresholdDays} dias antes
            {activity.alertDaysBefore == null ? " (automático)" : ""}.
          </p>
        )}
        {!forecast.highlight && forecast.intervalDays != null && (
          <p className="pt-1 text-xs text-muted-foreground">
            Ainda com poucos ciclos medidos — a previsão aparece, mas não entra na
            ordenação por urgência.
          </p>
        )}
      </section>

      <BackfillForm activityId={activity.id} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Histórico ({activity.occurrences.length})
        </h2>
        {activity.occurrences.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {activity.occurrences.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm">
                    {formatLongDate(o.date)}
                    {o.approximate && (
                      <span className="text-muted-foreground"> · aproximada</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      activity.scope === "shared" ? o.doneBy?.name : null,
                      formatCost(o.cost),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <DeleteOccurrenceButton
                  occurrenceId={o.id}
                  dateLabel={formatLongDate(o.date)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="flex gap-2 border-t pt-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/activities/${activity.id}/edit`}>Editar</Link>
        </Button>
        <ArchiveButton activityId={activity.id} archived={activity.archived} />
      </footer>
    </div>
  )
}
