import Link from "next/link"

import { auth } from "@/auth"
import { Star } from "@/components/stickers"
import { WindowPanel } from "@/components/window-panel"
import { listActivities } from "@/lib/activities"

export default async function ArchivedPage() {
  const session = await auth()
  const activities = await listActivities(session!.user!.id!, { archived: true })

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <Link href="/" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-ink hover:underline">
        ← todas as ações
      </Link>
      
      <WindowPanel title="Arquivadas" sticker={<Star className="size-5 text-lilac" />}>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada arquivado.</p>
        ) : (
          <ul className="divide-y-2 divide-border">
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
      </WindowPanel>
    </div>
  )
}
