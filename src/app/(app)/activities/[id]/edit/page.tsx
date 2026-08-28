import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { ActivityForm } from "@/components/activity-form"
import { Flower } from "@/components/stickers"
import { WindowPanel } from "@/components/window-panel"
import { getActivity } from "@/lib/activities"

export default async function EditActivityPage({
  params,
}: PageProps<"/activities/[id]/edit">) {
  const session = await auth()
  const { id } = await params

  const activity = await getActivity(session!.user!.id!, id)
  if (!activity) notFound()

  return (
    <div className="mx-auto w-full max-w-md p-4">
      <WindowPanel title="Editar atividade" sticker={<Flower className="size-5 text-mint" />}>
        <ActivityForm
          measuredIntervalDays={activity.forecast.intervalDays}
          activity={{
            id: activity.id,
            name: activity.name,
            scope: activity.scope,
            guessedIntervalDays: activity.guessedIntervalDays,
            alertDaysBefore: activity.alertDaysBefore,
          }}
        />
      </WindowPanel>
    </div>
  )
}
