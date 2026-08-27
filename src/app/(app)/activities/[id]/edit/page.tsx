import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { ActivityForm } from "@/components/activity-form"
import { getActivity } from "@/lib/activities"

export default async function EditActivityPage({
  params,
}: PageProps<"/activities/[id]/edit">) {
  const session = await auth()
  const { id } = await params

  const activity = await getActivity(session!.user!.id!, id)
  if (!activity) notFound()

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4">
      <h1 className="text-xl font-semibold">Editar ação</h1>
      <ActivityForm
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
