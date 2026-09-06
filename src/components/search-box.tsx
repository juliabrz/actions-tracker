"use client"

import { Search, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

/**
 * A busca vive na URL, não em estado de componente: assim ela compõe com o
 * filtro que já está lá, sobrevive a recarregar a página e o link pode ser
 * compartilhado. O servidor é quem filtra.
 */
export function SearchBox() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const atual = params.get("q") ?? ""

  const [aberto, setAberto] = useState(atual !== "")
  const [texto, setTexto] = useState(atual)
  const campo = useRef<HTMLInputElement>(null)

  // Debounce: cada tecla dispararia uma renderização no servidor.
  useEffect(() => {
    const t = setTimeout(() => {
      if (texto === atual) return
      const p = new URLSearchParams(params)
      if (texto.trim()) p.set("q", texto)
      else p.delete("q")
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, 250)
    return () => clearTimeout(t)
  }, [texto, atual, params, pathname, router])

  function fechar() {
    setTexto("")
    setAberto(false)
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => {
          setAberto(true)
          requestAnimationFrame(() => campo.current?.focus())
        }}
        title="Buscar atividade"
        aria-label="Buscar atividade"
        className="shrink-0 rounded-full border-2 border-border bg-card p-2 text-ink transition-transform hover:-translate-y-px hover:bg-bubblegum"
      >
        <Search className="size-4" aria-hidden />
      </button>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={campo}
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && fechar()}
          placeholder="Buscar atividade"
          aria-label="Buscar atividade"
          className="h-9 w-full rounded-full border-2 border-border bg-card pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <button
        type="button"
        onClick={fechar}
        title="Fechar busca"
        aria-label="Fechar busca"
        className="shrink-0 rounded-full border-2 border-border bg-card p-2 text-ink hover:bg-bubblegum"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
