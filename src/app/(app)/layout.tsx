import { X } from "lucide-react"
import { redirect } from "next/navigation"

import { auth, signOut } from "@/auth"
import { Star } from "@/components/stickers"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { name, image } = session.user

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

          {/* Controles de janela, como o ✕ da referência. A pastilha branca de
              antes usava o tratamento dos cards de conteúdo, então parecia um
              card do corpo da página caído em cima da barra. Aqui os dois
              elementos têm a mesma altura e o mesmo contorno: leem-se como um
              conjunto, não como uma bolinha solta ao lado de um link. */}
          <div className="flex items-center gap-1.5">
            <Avatar
              className="size-7 border-2 border-ink bg-cream"
              title={name ?? undefined}
            >
              <AvatarImage src={image ?? undefined} alt="" />
              <AvatarFallback className="bg-cream font-heading text-[10px] text-ink">
                {name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>

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
                className="size-7 rounded-md border-2 border-ink bg-seafoam text-ink transition-transform hover:-translate-y-px hover:bg-mint"
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
