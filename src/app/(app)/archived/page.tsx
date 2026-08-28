import Link from "next/link"

import { auth } from "@/auth"
import { listActivities } from "@/lib/activities"

export default async function ArchivedPage() {
  const session = await auth()
  const activities = await listActivities(session!.user!.id!, { archived: true })

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <Link href="/" className="font-heading text-[10px] text-muted-foreground hover:text-ink hover:underline">
        ← todas as ações
      </Link>
      <h1 className="font-heading text-base text-ink dark:text-foreground">arquivadas</h1>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada arquivado.</p>
      ) : (
        <ul className="pop-panel divide-y-2 divide-border overflow-hidden p-0">
          {activities.map((a) => (
            <li key={a.id}>
              <Link href={`/activities/${a.id}`} className="block px-3 py-3 hover:bg-bubblegum">
                <span className="font-medium">{a.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {a.occurrenceCount} registro{a.occurrenceCount === 1 ? "" : "s"} no
                  histórico
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
