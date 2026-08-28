import type { ReactNode } from "react"

/**
 * A janelinha da referência: barra de título colorida com contorno, conteúdo
 * embaixo. Existe para as telas de formulário pertencerem ao mesmo sistema que
 * a lista e o login, em vez de flutuarem soltas sobre o fundo quadriculado.
 */
export function WindowPanel({
  title,
  sticker,
  children,
}: {
  title: string
  sticker?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="pop-panel overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-candy px-4 py-2">
        <h1 className="font-display text-base text-ink">{title}</h1>
        {sticker}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}
