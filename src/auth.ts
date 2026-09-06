import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { redirect } from "next/navigation"
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

import { db } from "@/db"
import { accounts, sessions, users, verificationTokens } from "@/db/schema"

/** Fixed allowlist: this app is for two people, there is no open sign-up. */
const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Google],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    signIn({ profile }) {
      // Exige e-mail verificado além da allowlist: sem isso, uma conta de
      // domínio próprio com e-mail não confirmado poderia casar com um endereço
      // da lista.
      if (profile?.email_verified === false) return false
      const email = profile?.email?.toLowerCase()
      return Boolean(email && allowedEmails.includes(email))
    },
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})

/**
 * Sessão garantida em páginas. Redireciona em vez de lançar.
 *
 * O layout já redireciona, mas layout e página renderizam em paralelo: o
 * `redirect` de um não impede o outro de executar. Sem esta checagem, a página
 * assumia a sessão com `!` e estourava quando ela faltava.
 */
export async function requireUserOrRedirect() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  return session.user as { id: string; name?: string | null; email?: string | null }
}

/** Guaranteed session — use inside Server Actions. Throws when signed out. */
export async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Not authenticated")
  return session.user as {
    id: string
    name?: string | null
    image?: string | null
  }
}
