import { X } from "lucide-react"
import { redirect } from "next/navigation"

import { auth, signOut } from "@/auth"
import { Star } from "@/components/stickers"
import { Button } from "@/components/ui/button"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { name } = session.user

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Barra de título, como a janelinha da referência. */}
      <header className="sticky top-0 z-30 border-b-2 border-border bg-candy">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-4 py-2">
          <div className="flex items-center gap-2">
            <Star className="size-4 text-butter" />
            <span className="font-heading text-sm tracking-tight text-ink">
              activity tracker
            </span>
          </div>

          {/* Nome escrito no lugar da bolinha com a inicial: "J" exige decodificar
              e nao cabe em duas contas que dividem atividades. O sair e o ✕ da
              barra de titulo, em vermelho proprio — o destructive da paleta e
              rosado demais e sumiria contra o rosa daqui. */}
          <div className="flex items-center gap-2">
            <span className="font-heading text-[10px] text-ink" title={name ?? undefined}>
              {(name ?? "").split(" ")[0].toLowerCase()}
            </span>

            <form
              className="flex"
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                title="Sair"
                aria-label={`Sair da conta de ${name ?? "usuária"}`}
                className="size-7 rounded-md border-2 border-ink bg-cherry text-cream transition-transform hover:-translate-y-px hover:bg-cherry/85"
              >
                <X className="size-4" strokeWidth={3} aria-hidden />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-28">{children}</main>
    </div>
  )
}
