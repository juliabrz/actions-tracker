"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { requireUser } from "@/auth"
import { db } from "@/db"
import { activities, occurrences } from "@/db/schema"
import { requireAccess } from "@/lib/activities"
import { isUniqueViolation } from "@/lib/db-errors"
import { isValidDate, today } from "@/lib/dates"

export type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string }

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
    if (isUniqueViolation(e)) {
      return { ok: false, error: "Esta atividade já foi registrada nesse dia." }
    }
    throw e
  }
}

/**
 * Attaches the cost to an occurrence that already exists.
 *
 * Deliberately cannot change the date: date editing was rejected in favour of
 * delete-and-re-add (spec §3). This exists so the one-tap path stays one tap —
 * you log first, and attach the cost afterwards.
 *
 * It also cannot mark the occurrence approximate: the one-tap button records
 * today, so there is no uncertainty about the date to declare.
 */
export async function updateOccurrence(input: {
  occurrenceId: string
  cost?: string | null
}): Promise<Result> {
  const user = await requireUser()

  const target = await db.query.occurrences.findFirst({
    where: eq(occurrences.id, input.occurrenceId),
    columns: { id: true, activityId: true },
  })
  if (!target) return { ok: false, error: "Registro não encontrado." }

  await requireAccess(user.id, target.activityId)
  await db
    .update(occurrences)
    .set({ cost: parseCost(input.cost) })
    .where(eq(occurrences.id, input.occurrenceId))

  revalidatePath("/")
  revalidatePath(`/activities/${target.activityId}`)
  return { ok: true }
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
  lastDoneApproximate?: boolean
}): Promise<Result<{ activityId: string }>> {
  const user = await requireUser()

  const name = input.name.trim()
  if (!name) return { ok: false, error: "Dê um nome para a atividade." }

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
      approximate: input.lastDoneApproximate ?? false,
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
  if (!name) return { ok: false, error: "Dê um nome para a atividade." }

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

/**
 * Permanent removal, occurrences included — the FK cascades. Distinct from
 * archiving on purpose: archiving is for "I stopped doing this", deleting is
 * for "this should never have existed". Only the latter destroys history.
 */
export async function deleteActivity(activityId: string): Promise<Result> {
  const user = await requireUser()
  await requireAccess(user.id, activityId)

  await db.delete(activities).where(eq(activities.id, activityId))

  revalidatePath("/")
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
