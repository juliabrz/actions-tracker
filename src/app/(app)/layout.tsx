import { redirect } from "next/navigation"

import { auth, signOut } from "@/auth"
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
            <span aria-hidden className="flex gap-1">
              <span className="size-2.5 rounded-full border-2 border-ink bg-butter" />
              <span className="size-2.5 rounded-full border-2 border-ink bg-mint" />
            </span>
            <span className="font-heading text-sm tracking-tight text-ink">
              activity tracker
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Avatar className="size-7 border-2 border-ink">
              <AvatarImage src={image ?? undefined} alt={name ?? ""} />
              <AvatarFallback className="bg-cream text-xs text-ink">
                {name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="font-heading text-xs text-ink hover:bg-bubblegum"
              >
                sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-28">{children}</main>
    </div>
  )
}
