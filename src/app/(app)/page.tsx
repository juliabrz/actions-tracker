import { Plus } from "lucide-react"
import Link from "next/link"

import { auth } from "@/auth"
import { ActivityRow } from "@/components/activity-row"
import { PillLink } from "@/components/pill-link"
import { Smiley, Sparkles, Star } from "@/components/stickers"
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
      {/* Os filtros ganham a linha inteira e rolam: numa tela estreita eles
          disputavam espaço com o botão de criar e o empurravam para fora. */}
      <nav className="flex gap-2 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(({ value, label }) => (
          <Link
            key={value}
            href={value === "all" ? "/" : `/?f=${value}`}
            className={`shrink-0 rounded-full border-2 border-border px-3 py-1.5 font-heading text-[11px] transition-transform ${
              filter === value
                ? "bg-candy text-ink shadow-pop-sm"
                : "bg-card text-muted-foreground hover:bg-bubblegum hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {activities.length === 0 ? (
        <div className="pop-panel mx-4 space-y-3 px-4 py-14 text-center">
          <Smiley className="mx-auto size-12 text-butter" />
          <p className="text-sm text-muted-foreground">
            {filter === "all"
              ? "Nada cadastrado ainda. Comece pela coisa que você mais esquece."
              : "Nada aqui com esse filtro."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3 px-4">
          {activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 px-4 py-8">
        <PillLink href="/archived">ver arquivadas</PillLink>
        <Sparkles />
      </div>

      {/* Ação flutuante: nunca disputa largura com nada e fica no alcance do
          polegar. O `pb-24` do layout existe para ela não cobrir a última linha. */}
      <Button
        asChild
        size="lg"
        className="fixed right-4 bottom-6 z-20 rounded-full font-heading text-[11px]"
      >
        <Link href="/activities/new">
          <Plus className="size-5" aria-hidden />
          Nova atividade
          <Star className="size-4 text-butter" />
        </Link>
      </Button>
    </div>
  )
}
