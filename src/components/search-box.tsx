"use client"

import { Search, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * A busca vive na URL, não em estado de componente: assim ela compõe com o
 * filtro que já está lá, sobrevive a recarregar a página e o link pode ser
 * compartilhado. O servidor é quem filtra.
 *
 * Recebe os parâmetros por propriedade em vez de ler com `useSearchParams`:
 * aquele hook suspende na renderização do servidor, então a lupa só aparecia
 * depois que o JavaScript carregava — e ainda exigia uma fronteira de Suspense.
 */
export function SearchBox({ query, filter }: { query: string; filter: string }) {
  const router = useRouter()
  const atual = query

  const [aberto, setAberto] = useState(atual !== "")
  const [texto, setTexto] = useState(atual)

  // Debounce: cada tecla dispararia uma renderização no servidor.
  useEffect(() => {
    const t = setTimeout(() => {
      if (texto === atual) return
      const p = new URLSearchParams()
      if (filter !== "all") p.set("f", filter)
      if (texto.trim()) p.set("q", texto)
      const qs = p.toString()
      router.replace(qs ? `/?${qs}` : "/", { scroll: false })
    }, 250)
    return () => clearTimeout(t)
  }, [texto, atual, filter, router])

  function fechar() {
    setTexto("")
    setAberto(false)
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        title="Buscar atividade"
        aria-label="Buscar atividade"
        className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-border bg-card text-ink transition-transform hover:-translate-y-px hover:bg-bubblegum"
      >
        <Search className="size-4" aria-hidden />
      </button>
    )
  }

  // Aberta, ela toma a linha e os filtros somem — a página esconde a nav ao ver
  // o data-search-open. Dividindo espaço com eles, num celular estreito alguém
  // sempre sobrava para fora da tela; sobrepor exigiria fundo opaco.
  return (
    <div data-search-open className="flex min-w-0 flex-1 items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && fechar()}
          placeholder="Buscar atividade"
          aria-label="Buscar atividade"
          // text-base no celular: abaixo de 16px o Safari do iOS dá zoom ao focar.
          // É a mesma convenção que o Input do shadcn já traz, e este campo,
          // escrito à mão, tinha ficado de fora dela.
          className="h-8 w-full rounded-full border-2 border-border bg-card pr-3 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
      </div>
      <button
        type="button"
        onClick={fechar}
        title="Fechar busca"
        aria-label="Fechar busca"
        className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-border bg-card text-ink hover:bg-bubblegum"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
