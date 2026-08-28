import { redirect } from "next/navigation"

import { auth, signIn } from "@/auth"
import { Button } from "@/components/ui/button"

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await auth()
  if (session?.user) redirect("/")

  const { error } = await searchParams
  const denied = error === "AccessDenied"

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="pop-panel w-full max-w-sm overflow-hidden p-0">
        {/* Barra de título da janelinha. */}
        <div className="flex items-center justify-between border-b-2 border-border bg-candy px-3 py-2">
          <span className="font-heading text-xs text-ink">activity tracker</span>
          <span aria-hidden className="flex gap-1">
            <span className="size-3 rounded-full border-2 border-ink bg-butter" />
            <span className="size-3 rounded-full border-2 border-ink bg-mint" />
          </span>
        </div>

        <div className="space-y-5 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            De quanto em quanto tempo você faz cada coisa.
          </p>

          {denied && (
            <p className="rounded-md border-2 border-border bg-destructive/20 p-3 text-sm text-ink dark:text-foreground">
              Esta conta não tem acesso ao app.
            </p>
          )}

          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/" })
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              Entrar com Google
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
