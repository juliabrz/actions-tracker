/**
 * Local development seed. Creates a PGlite database, runs the migrations and
 * fills it with data that exercises every UI state.
 *
 * Occurrence dates are expressed as offsets from today, so the states below
 * hold no matter when this runs.
 *
 *   npm run db:seed
 */
import { config } from "dotenv"

config({ path: ".env.local" })

const url = process.env.DATABASE_URL ?? ""
if (!url.startsWith("pglite://")) {
  console.error(
    `Refusing to seed: DATABASE_URL is not a pglite:// URL.\n` +
      `This script wipes every table. Point it at a local database first.`,
  )
  process.exit(1)
}

// PGlite e de processo unico: abrir o mesmo diretorio com o dev server no ar
// corrompe o banco. Aconteceu tres vezes durante o desenvolvimento.
async function servidorNoAr() {
  try {
    await fetch("http://localhost:3000/", { signal: AbortSignal.timeout(700) })
    return true
  } catch {
    return false
  }
}

if (await servidorNoAr()) {
  console.error(
    "Ha um servidor rodando em localhost:3000.\n" +
      "PGlite nao aceita dois processos no mesmo banco — pare o dev server antes.",
  )
  process.exit(1)
}

const { PGlite } = await import("@electric-sql/pglite")
const { drizzle } = await import("drizzle-orm/pglite")
const { migrate } = await import("drizzle-orm/pglite/migrator")
const schema = await import("../src/db/schema")
const { shiftDays, today } = await import("../src/lib/dates")

const { activities, occurrences, users } = schema

const dir = url.replace("pglite://", "")

// Apaga o diretorio antes de abrir. O seed ja recria tudo, e sem isso ele nao
// serve para o que mais importa: recuperar um banco corrompido — ele tentaria
// abrir o que esta quebrado e morreria na primeira instrucao.
const { rmSync } = await import("node:fs")
rmSync(dir, { recursive: true, force: true })

const client = new PGlite(dir)
const db = drizzle(client, { schema })

await migrate(db, { migrationsFolder: "./drizzle" })

const [ana, bia] = await db
  .insert(users)
  .values([
    { name: "Ana", email: "ana@exemplo.dev" },
    { name: "Bia", email: "bia@exemplo.dev" },
  ])
  .returning()

/** Days ago → YYYY-MM-DD. */
const ago = (days: number) => shiftDays(today(), -days)

type Entry = { daysAgo: number; by?: string; approximate?: boolean; cost?: string }

type Seed = {
  name: string
  scope: "personal" | "shared"
  owner: string
  guessedIntervalDays?: number
  alertDaysBefore?: number
  archived?: boolean
  entries: Entry[]
  /** What this row is here to demonstrate. */
  demonstrates: string
}

const SEEDS: Seed[] = [
  {
    name: "Cortar o cabelo",
    scope: "personal",
    owner: ana.id,
    entries: [{ daysAgo: 140 }, { daysAgo: 95 }, { daysAgo: 50 }],
    demonstrates: "atrasada há 5 dias · estimativa razoável",
  },
  {
    name: "Trocar a escova de dentes",
    scope: "personal",
    owner: ana.id,
    entries: [{ daysAgo: 270 }, { daysAgo: 180 }, { daysAgo: 90 }],
    demonstrates: "vence hoje",
  },
  {
    name: "Comprar ração do gato",
    scope: "shared",
    owner: ana.id,
    entries: [
      { daysAgo: 120, by: ana.id, cost: "89.90" },
      { daysAgo: 80, by: bia.id, cost: "92.50" },
      { daysAgo: 37, by: ana.id, cost: "89.90" },
    ],
    demonstrates: "chegando em 5 dias · compartilhada com valores",
  },
  {
    name: "Lavar as cortinas",
    scope: "shared",
    owner: bia.id,
    entries: [
      { daysAgo: 400, by: bia.id },
      { daysAgo: 220, by: ana.id },
      { daysAgo: 40, by: bia.id },
    ],
    demonstrates: "em dia, ciclo longo",
  },
  {
    name: "Limpar o filtro do ar-condicionado",
    scope: "shared",
    owner: ana.id,
    entries: [
      { daysAgo: 250, by: ana.id },
      { daysAgo: 220, by: bia.id },
      { daysAgo: 190, by: ana.id },
      // A viagem: 120 dias de intervalo que a mediana precisa ignorar.
      { daysAgo: 70, by: bia.id },
      { daysAgo: 40, by: ana.id },
      { daysAgo: 10, by: bia.id },
    ],
    demonstrates: "mediana ignorando um outlier de 120 dias",
  },
  {
    name: "Cortar as unhas do cachorro",
    scope: "personal",
    owner: ana.id,
    entries: [{ daysAgo: 80 }, { daysAgo: 40 }],
    demonstrates: "vencida, mas em cinza — só 1 ciclo medido, não destaca",
  },
  {
    name: "Revisar o carro",
    scope: "personal",
    owner: ana.id,
    guessedIntervalDays: 365,
    entries: [{ daysAgo: 200, approximate: true }],
    demonstrates: "rodando no palpite, sem ciclo medido",
  },
  {
    name: "Trocar o filtro do purificador",
    scope: "personal",
    owner: ana.id,
    guessedIntervalDays: 180,
    entries: [],
    demonstrates: "nunca registrada — sem âncora, sem previsão",
  },
  {
    name: "Lavar o edredom",
    scope: "shared",
    owner: bia.id,
    entries: [
      { daysAgo: 300, by: bia.id, approximate: true },
      { daysAgo: 210, by: ana.id, approximate: true },
      { daysAgo: 120, by: bia.id },
      { daysAgo: 25, by: ana.id },
    ],
    demonstrates: "confiança rebaixada por datas aproximadas",
  },
  {
    name: "Trocar as lâminas do barbeador",
    scope: "personal",
    owner: ana.id,
    entries: [
      { daysAgo: 44, cost: "34.90" },
      { daysAgo: 30, cost: "34.90" },
      { daysAgo: 16, cost: "38.00" },
    ],
    demonstrates: "ciclo curto, limiar mínimo de 1 dia",
  },
  {
    name: "Ir ao dentista",
    scope: "personal",
    owner: ana.id,
    alertDaysBefore: 30,
    entries: [{ daysAgo: 370 }, { daysAgo: 190 }, { daysAgo: 15 }],
    demonstrates: "override manual do aviso (30 dias)",
  },
  {
    name: "Faxina pesada da casa",
    scope: "shared",
    owner: bia.id,
    archived: true,
    entries: [
      { daysAgo: 200, by: ana.id },
      { daysAgo: 110, by: bia.id },
    ],
    demonstrates: "arquivada — não aparece na lista principal",
  },
]

for (const seed of SEEDS) {
  const [activity] = await db
    .insert(activities)
    .values({
      ownerId: seed.owner,
      name: seed.name,
      scope: seed.scope,
      guessedIntervalDays: seed.guessedIntervalDays ?? null,
      alertDaysBefore: seed.alertDaysBefore ?? null,
      archived: seed.archived ?? false,
    })
    .returning()

  if (seed.entries.length > 0) {
    await db.insert(occurrences).values(
      seed.entries.map((entry) => ({
        activityId: activity.id,
        date: ago(entry.daysAgo),
        doneById: entry.by ?? seed.owner,
        approximate: entry.approximate ?? false,
        cost: entry.cost ?? null,
      })),
    )
  }

  console.log(`  ${seed.name.padEnd(38)} ${seed.demonstrates}`)
}

console.log(`\n${SEEDS.length} ações criadas para Ana e Bia.`)
console.log(`Entre em http://localhost:3000/dev-login para escolher com quem entrar.`)

await client.close()
