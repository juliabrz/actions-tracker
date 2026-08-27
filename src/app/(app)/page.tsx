import Link from "next/link"

import { auth } from "@/auth"
import { ActivityRow } from "@/components/activity-row"
import { Button } from "@/components/ui/button"
import { listActivities, type Filter } from "@/lib/activities"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "mine", label: "Minhas" },
  { value: "shared", label: "Compartilhadas" },
]

export default async function ListPage({ searchParams }: PageProps<"/">) {
  const session = await auth()
  const userId = session!.user!.id!

  const { f } = await searchParams
  const filter: Filter = FILTERS.some((x) => x.value === f) ? (f as Filter) : "all"

  const activities = await listActivities(userId, { filter })

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <nav className="flex gap-1">
          {FILTERS.map(({ value, label }) => (
            <Link
              key={value}
              href={value === "all" ? "/" : `/?f=${value}`}
              className={`rounded-full px-3 py-1 text-sm ${
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <Button asChild size="sm">
          <Link href="/activities/new">Nova</Link>
        </Button>
      </div>

      {activities.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "all"
              ? "Nada cadastrado ainda. Comece pela coisa que você mais esquece."
              : "Nada aqui com esse filtro."}
          </p>
        </div>
      ) : (
        <ul className="divide-y border-y">
          {activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </ul>
      )}

      <div className="px-4 py-6">
        <Link href="/archived" className="text-xs text-muted-foreground hover:underline">
          Ver arquivadas
        </Link>
      </div>
    </div>
  )
}
