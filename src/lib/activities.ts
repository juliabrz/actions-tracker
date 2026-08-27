import "server-only"

import { and, eq, or } from "drizzle-orm"

import { db } from "@/db"
import { activities } from "@/db/schema"

import { compareUrgency, estimate, type Forecast } from "./periodicity"

export type Filter = "all" | "mine" | "shared"

export type ActivityWithForecast = {
  id: string
  name: string
  scope: "personal" | "shared"
  archived: boolean
  ownerId: string
  guessedIntervalDays: number | null
  alertDaysBefore: number | null
  forecast: Forecast
  lastDoneBy: { id: string; name: string | null } | null
  occurrenceCount: number
}

/**
 * The visibility rule for the whole app: you see what is yours and what is
 * shared. With only two accounts, "shared" already means "visible to the other
 * person" — there is no third party to hide it from.
 */
function visibleTo(userId: string) {
  return or(eq(activities.ownerId, userId), eq(activities.scope, "shared"))!
}

export async function listActivities(
  userId: string,
  { filter = "all", archived = false }: { filter?: Filter; archived?: boolean } = {},
): Promise<ActivityWithForecast[]> {
  const rows = await db.query.activities.findMany({
    where: and(visibleTo(userId), eq(activities.archived, archived)),
    with: {
      occurrences: {
        orderBy: (o, { asc }) => [asc(o.date)],
        with: { doneBy: { columns: { id: true, name: true } } },
      },
    },
  })

  return rows
    .filter((a) =>
      filter === "mine"
        ? a.scope === "personal"
        : filter === "shared"
          ? a.scope === "shared"
          : true,
    )
    .map((a) => ({
      id: a.id,
      name: a.name,
      scope: a.scope,
      archived: a.archived,
      ownerId: a.ownerId,
      guessedIntervalDays: a.guessedIntervalDays,
      alertDaysBefore: a.alertDaysBefore,
      occurrenceCount: a.occurrences.length,
      lastDoneBy: a.occurrences.at(-1)?.doneBy ?? null,
      forecast: estimate(a.occurrences, {
        guessedIntervalDays: a.guessedIntervalDays,
        alertDaysBefore: a.alertDaysBefore,
      }),
    }))
    .sort((a, b) => compareUrgency(a.forecast, b.forecast))
}

export async function getActivity(userId: string, activityId: string) {
  const activity = await db.query.activities.findFirst({
    where: and(eq(activities.id, activityId), visibleTo(userId)),
    with: {
      occurrences: {
        orderBy: (o, { desc }) => [desc(o.date)],
        with: { doneBy: { columns: { id: true, name: true, image: true } } },
      },
      owner: { columns: { id: true, name: true } },
    },
  })
  if (!activity) return null

  return {
    ...activity,
    forecast: estimate(activity.occurrences, {
      guessedIntervalDays: activity.guessedIntervalDays,
      alertDaysBefore: activity.alertDaysBefore,
    }),
  }
}

/** Asserts the user may touch this activity. Throws when they may not. */
export async function requireAccess(userId: string, activityId: string) {
  const activity = await db.query.activities.findFirst({
    where: and(eq(activities.id, activityId), visibleTo(userId)),
    columns: { id: true },
  })
  if (!activity) throw new Error("Activity not found")
  return activity
}
