import { redirect } from "next/navigation"

import { auth, signIn } from "@/auth"
import { Button } from "@/components/ui/button"

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await auth()
  if (session?.user) redirect("/")

  const { error } = await searchParams
  const recusado = error === "AccessDenied"

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Actions Tracker</h1>
          <p className="text-sm text-muted-foreground">
            De quanto em quanto tempo você faz cada coisa.
          </p>
        </div>

        {recusado && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
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
    </main>
  )
}
