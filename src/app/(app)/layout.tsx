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
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <span className="font-semibold tracking-tight">Activity Tracker</span>
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarImage src={image ?? undefined} alt={name ?? ""} />
            <AvatarFallback>{name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 pb-24">{children}</main>
    </div>
  )
}
