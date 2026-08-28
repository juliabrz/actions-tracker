import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Link em forma de pastilha, no mesmo traço dos filtros.
 *
 * Existe porque links de navegação secundária estavam como texto pequeno em
 * cinza claro: liam-se como legenda, sem nada indicando que dava para clicar —
 * e num deles era o único caminho de volta da tela.
 */
export function PillLink({
  href,
  children,
  className = "",
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`pop-panel inline-flex items-center gap-2 px-3 py-1.5 font-pixel text-[10px] text-ink transition-transform hover:-translate-y-px hover:bg-bubblegum ${className}`}
    >
      {children}
    </Link>
  )
}

export function BackLink() {
  return (
    <PillLink href="/">
      <span aria-hidden>←</span>
      todas as atividades
    </PillLink>
  )
}
