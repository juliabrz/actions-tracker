import { Plus } from "lucide-react"
import Link from "next/link"

import { requireUserOrRedirect } from "@/auth"
import { ActivityRow } from "@/components/activity-row"
import { Smiley, Sparkles, Star } from "@/components/stickers"
import { SearchBox } from "@/components/search-box"
import { Button } from "@/components/ui/button"
import { listActivities, type Filter } from "@/lib/activities"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "mine", label: "Minhas" },
  { value: "shared", label: "Compartilhadas" },
]

export default async function ListPage({ searchParams }: PageProps<"/">) {
  const { id: userId } = await requireUserOrRedirect()

  const { f, q } = await searchParams
  const filter: Filter = FILTERS.some((x) => x.value === f) ? (f as Filter) : "all"

  const query = typeof q === "string" ? q : ""
  const activities = await listActivities(userId, { filter, query })

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Os filtros ganham a linha inteira e rolam: numa tela estreita eles
          disputavam espaço com o botão de criar e o empurravam para fora. */}
      <div className="flex items-center gap-2 px-4 py-4 [&:has([data-search-open])>nav]:hidden">
        {/* -m-1 p-1: overflow-x-auto recorta tudo que sai da caixa, e a sombra
            dura de 2px da pastilha ativa era cortada. O padding dá espaço para
            ela; a margem negativa devolve o espaço ao layout. */}
        <nav className="-m-1 flex min-w-0 gap-2 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(({ value, label }) => (
          <Link
            key={value}
            href={value === "all" ? "/" : `/?f=${value}`}
            className={`inline-flex h-8 shrink-0 items-center rounded-full border-2 border-border px-3 font-pixel text-[11px] transition-transform ${
              filter === value
                ? "bg-candy text-ink shadow-pop-sm"
                : "bg-card text-muted-foreground hover:bg-bubblegum hover:text-ink"
            }`}
          >
            {label}
            </Link>
          ))}
        </nav>
        {/* Encostada na direita: o wrapper toma o espaço que sobra e empurra a
            lupa para a borda. Aberta, a nav some e ele vira a linha inteira. */}
        <div className="ml-auto flex min-w-0 flex-1 justify-end">
          <SearchBox query={query} filter={filter} />
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="pop-panel mx-4 space-y-3 px-4 py-14 text-center">
          <Smiley className="mx-auto size-12 text-butter" />
          <p className="text-sm text-muted-foreground">
            {query
              ? `Nada encontrado para "${query}".`
              : filter === "all"
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

      <div className="flex justify-center px-4 py-10">
        <Sparkles />
      </div>

      {/* Ação flutuante: nunca disputa largura com nada e fica no alcance do
          polegar. O `pb-24` do layout existe para ela não cobrir a última linha. */}
      <Button
        asChild
        size="lg"
        className="fixed right-4 bottom-6 z-20 rounded-full font-pixel text-[11px]"
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
