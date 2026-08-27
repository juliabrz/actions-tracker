"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { requireUser } from "@/auth"
import { db } from "@/db"
import { activities, occurrences } from "@/db/schema"
import { requireAccess } from "@/lib/activities"
import { isValidDate, today } from "@/lib/dates"

export type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string }

/** Postgres unique_violation — the activity is already logged for that day. */
function isDuplicate(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && e.code === "23505"
}

function parseCost(cost: string | null | undefined): string | null {
  if (!cost) return null
  const n = Number(cost.replace(",", "."))
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : null
}

export async function recordOccurrence(input: {
  activityId: string
  date?: string
  approximate?: boolean
  cost?: string | null
}): Promise<Result<{ occurrenceId: string }>> {
  const user = await requireUser()
  await requireAccess(user.id, input.activityId)

  const date = input.date ?? today()
  if (!isValidDate(date)) return { ok: false, error: "Data inválida." }
  if (date > today()) return { ok: false, error: "Não dá para registrar no futuro." }

  try {
    const [created] = await db
      .insert(occurrences)
      .values({
        activityId: input.activityId,
        date,
        doneById: user.id,
        approximate: input.approximate ?? false,
        cost: parseCost(input.cost),
      })
      .returning({ id: occurrences.id })

    revalidatePath("/")
    revalidatePath(`/activities/${input.activityId}`)
    return { ok: true, data: { occurrenceId: created.id } }
  } catch (e) {
    if (isDuplicate(e)) {
      return { ok: false, error: "Esta ação já foi registrada nesse dia." }
    }
    throw e
  }
}

/** Backs both the undo snackbar and the delete button in the history. */
export async function deleteOccurrence(occurrenceId: string): Promise<Result> {
  const user = await requireUser()

  const target = await db.query.occurrences.findFirst({
    where: eq(occurrences.id, occurrenceId),
    columns: { id: true, activityId: true },
  })
  if (!target) return { ok: false, error: "Registro não encontrado." }

  await requireAccess(user.id, target.activityId)
  await db.delete(occurrences).where(eq(occurrences.id, occurrenceId))

  revalidatePath("/")
  revalidatePath(`/activities/${target.activityId}`)
  return { ok: true }
}

export async function createActivity(input: {
  name: string
  scope: "personal" | "shared"
  guessedIntervalDays?: number | null
  alertDaysBefore?: number | null
  lastDoneOn?: string | null
}): Promise<Result<{ activityId: string }>> {
  const user = await requireUser()

  const name = input.name.trim()
  if (!name) return { ok: false, error: "Dê um nome para a ação." }

  if (input.lastDoneOn) {
    if (!isValidDate(input.lastDoneOn)) return { ok: false, error: "Data inválida." }
    if (input.lastDoneOn > today()) {
      return { ok: false, error: "Não dá para registrar no futuro." }
    }
  }

  const [created] = await db
    .insert(activities)
    .values({
      ownerId: user.id,
      name,
      scope: input.scope,
      guessedIntervalDays: input.guessedIntervalDays ?? null,
      alertDaysBefore: input.alertDaysBefore ?? null,
    })
    .returning({ id: activities.id })

  // "When did you last do it?" becomes the first occurrence: without an anchor
  // there is nothing to project, guess or no guess (spec §10).
  if (input.lastDoneOn) {
    await db.insert(occurrences).values({
      activityId: created.id,
      date: input.lastDoneOn,
      doneById: user.id,
      approximate: true,
    })
  }

  revalidatePath("/")
  return { ok: true, data: { activityId: created.id } }
}

export async function updateActivity(input: {
  activityId: string
  name: string
  scope: "personal" | "shared"
  guessedIntervalDays?: number | null
  alertDaysBefore?: number | null
}): Promise<Result> {
  const user = await requireUser()
  await requireAccess(user.id, input.activityId)

  const name = input.name.trim()
  if (!name) return { ok: false, error: "Dê um nome para a ação." }

  await db
    .update(activities)
    .set({
      name,
      scope: input.scope,
      guessedIntervalDays: input.guessedIntervalDays ?? null,
      alertDaysBefore: input.alertDaysBefore ?? null,
    })
    .where(eq(activities.id, input.activityId))

  revalidatePath("/")
  revalidatePath(`/activities/${input.activityId}`)
  return { ok: true }
}

export async function setArchived(
  activityId: string,
  archived: boolean,
): Promise<Result> {
  const user = await requireUser()
  await requireAccess(user.id, activityId)

  await db.update(activities).set({ archived }).where(eq(activities.id, activityId))

  revalidatePath("/")
  revalidatePath(`/activities/${activityId}`)
  return { ok: true }
}
