import { X } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { auth, signOut } from "@/auth"
import { NavLinks } from "@/components/nav-links"
import { Star } from "@/components/stickers"
import { Button } from "@/components/ui/button"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { name } = session.user

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Barra de navegação. O conteúdo vai até as bordas em vez de ficar preso
          na largura da lista: com max-w-2xl, no desktop sobravam dois vazios
          rosas enormes nas laterais e a barra parecia um retângulo sem função. */}
      <header className="sticky top-0 z-30 border-b-2 border-border bg-candy">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Star className="size-4 text-butter" />
              {/* Some no celular: aí o espaço vale mais para a navegação. */}
              <span className="hidden font-heading text-sm tracking-tight text-ink sm:inline">
                activity tracker
              </span>
            </Link>

            <NavLinks />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className="hidden font-heading text-[10px] text-ink sm:inline"
              title={name ?? undefined}
            >
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
