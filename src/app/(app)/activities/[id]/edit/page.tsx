import { notFound } from "next/navigation"

import { requireUserOrRedirect } from "@/auth"
import { ActivityForm } from "@/components/activity-form"
import { Flower } from "@/components/stickers"
import { getActivity } from "@/lib/activities"

export default async function EditActivityPage({
  params,
}: PageProps<"/activities/[id]/edit">) {
  const { id: userId } = await requireUserOrRedirect()
  const { id } = await params

  const activity = await getActivity(userId, id)
  if (!activity) notFound()

  return (
    <div className="mx-auto w-full max-w-md p-4">
      <ActivityForm
        title="Editar atividade"
        sticker={<Flower className="size-5 text-mint" />}
        measuredIntervalDays={activity.forecast.intervalDays}
        activity={{
          id: activity.id,
          name: activity.name,
          scope: activity.scope,
          guessedIntervalDays: activity.guessedIntervalDays,
          alertDaysBefore: activity.alertDaysBefore,
        }}
      />
    </div>
  )
}
