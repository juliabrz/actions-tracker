import { eq } from "drizzle-orm"
import { cookies } from "next/headers"

import { db } from "@/db"
import { sessions, users } from "@/db/schema"

/**
 * Development-only sign-in. Google OAuth needs real credentials and a real
 * redirect URI; this route exists so the UI can be exercised against seeded
 * data before any of that is set up.
 *
 * It writes a session row and sets the cookie directly, which is why it works
 * with the database session strategy where a Credentials provider would not.
 *
 * Double-gated: never in production, and only when DEV_LOGIN=true.
 */
function enabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN === "true"
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Esta rota monta HTML na mão, então nome vindo do banco precisa ser escapado.
 * Não há React aqui para fazer isso automaticamente, e o nome vem do perfil do
 * Google — dado externo.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export async function GET(request: Request) {
  if (!enabled()) return new Response("Not found", { status: 404 })

  const email = new URL(request.url).searchParams.get("email")

  if (!email) {
    const all = await db.select().from(users)
    const links = all
      .map(
        (u) =>
          `<li><a href="/dev-login?email=${encodeURIComponent(u.email)}">` +
          `Entrar como <strong>${escapeHtml(u.name ?? u.email)}</strong></a></li>`,
      )
      .join("")

    return new Response(
      `<!doctype html><meta charset="utf-8">
       <title>Login de desenvolvimento</title>
       <style>
         body{font:16px/1.6 system-ui;margin:3rem auto;max-width:28rem;padding:0 1rem}
         li{margin:.5rem 0} code{background:#eee;padding:.1rem .3rem;border-radius:3px}
       </style>
       <h1>Login de desenvolvimento</h1>
       ${all.length ? `<ul>${links}</ul>` : "<p>Nenhum usuário. Rode <code>npm run db:seed</code>.</p>"}
       <p><small>Rota disponível apenas com <code>DEV_LOGIN=true</code> fora de produção.</small></p>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    )
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) return new Response("Usuário não encontrado", { status: 404 })

  const sessionToken = crypto.randomUUID()
  const expires = new Date(Date.now() + THIRTY_DAYS_MS)

  await db.insert(sessions).values({ sessionToken, userId: user.id, expires })

  const jar = await cookies()
  jar.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  })

  return new Response(null, { status: 302, headers: { location: "/" } })
}
