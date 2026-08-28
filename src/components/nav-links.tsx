"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
  { href: "/", label: "atividades" },
  { href: "/archived", label: "arquivadas" },
]

/**
 * Client component só por causa do usePathname: o estado ativo precisa da rota
 * atual, e o layout que a envolve é server component.
 */
export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        // A lista responde por toda a seção de atividades: criar e editar são
        // telas dela, e a barra ficaria apagada dentro do próprio fluxo.
        const active =
          href === "/"
            ? pathname === "/" || pathname.startsWith("/activities")
            : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md border-2 px-2.5 py-1 font-pixel text-[10px] transition-transform hover:-translate-y-px ${
              active
                ? "border-ink bg-cream text-ink"
                : "border-transparent text-ink/70 hover:border-ink hover:bg-bubblegum hover:text-ink"
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
