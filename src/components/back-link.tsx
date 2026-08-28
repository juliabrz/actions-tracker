import Link from "next/link"

/**
 * Voltar para a lista. Pastilha com contorno em vez de texto pequeno: como
 * legenda cinza de 11px ele não se lia como navegação — nada indicava que
 * dava para clicar.
 */
export function BackLink() {
  return (
    <Link
      href="/"
      className="pop-panel inline-flex items-center gap-2 px-3 py-1.5 font-heading text-[10px] text-ink transition-transform hover:-translate-y-px hover:bg-bubblegum"
    >
      <span aria-hidden>←</span>
      todas as atividades
    </Link>
  )
}
