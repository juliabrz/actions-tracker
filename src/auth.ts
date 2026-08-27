import { DrizzleAdapter } from "@auth/drizzle-adapter"
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

import { db } from "@/db"
import { accounts, sessions, users, verificationTokens } from "@/db/schema"

/** Allowlist fixa: o app é para duas pessoas, não tem cadastro aberto. */
const emailsPermitidos = (process.env.EMAILS_PERMITIDOS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
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
      const email = profile?.email?.toLowerCase()
      return Boolean(email && emailsPermitidos.includes(email))
    },
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})

/** Sessão garantida — use em Server Actions. Lança se não houver login. */
export async function exigirUsuario() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autenticado")
  return session.user as { id: string; name?: string | null; image?: string | null }
}
