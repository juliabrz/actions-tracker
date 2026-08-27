import { auth } from "@/auth"

export default async function ListaPage() {
  const session = await auth()

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Suas ações</h1>
      <p className="text-sm text-muted-foreground">
        Logada como {session?.user?.email}. A lista chega na etapa 4.
      </p>
    </div>
  )
}
