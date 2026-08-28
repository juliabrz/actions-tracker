import { relations } from "drizzle-orm"
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { AdapterAccountType } from "next-auth/adapters"

/* ------------------------------------------------------------------ */
/* Auth.js — names and shape required by @auth/drizzle-adapter          */
/* ------------------------------------------------------------------ */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
})

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
)

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
)

/* ------------------------------------------------------------------ */
/* Domain                                                               */
/* ------------------------------------------------------------------ */

export const scopeEnum = pgEnum("scope", ["personal", "shared"])

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    scope: scopeEnum("scope").notNull().default("personal"),
    /** The user's hunch. Dropped as soon as one real interval exists. */
    guessedIntervalDays: integer("guessed_interval_days"),
    /** Alert override. Without it, 15% of the estimated interval is used. */
    alertDaysBefore: integer("alert_days_before"),
    /**
     * Silences the urgency treatment until this date. Never touches the
     * estimate: the interval comes from occurrences, and postponing a reminder
     * is not evidence about when the activity is due.
     */
    snoozedUntil: date("snoozed_until", { mode: "string" }),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("activities_owner_idx").on(t.ownerId)],
)

export const occurrences = pgTable(
  "occurrences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    /** Plain DATE (YYYY-MM-DD). No time, no time zone — spec §6. */
    date: date("date", { mode: "string" }).notNull(),
    doneById: text("done_by_id")
      .notNull()
      .references(() => users.id),
    /** Recalled from memory: still counts, but lowers confidence. */
    approximate: boolean("approximate").notNull().default(false),
    cost: numeric("cost", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("occurrences_activity_date_uq").on(t.activityId, t.date)],
)

/* ------------------------------------------------------------------ */
/* Relations                                                            */
/* ------------------------------------------------------------------ */

export const usersRelations = relations(users, ({ many }) => ({
  activities: many(activities),
  occurrences: many(occurrences),
}))

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  owner: one(users, { fields: [activities.ownerId], references: [users.id] }),
  occurrences: many(occurrences),
}))

export const occurrencesRelations = relations(occurrences, ({ one }) => ({
  activity: one(activities, {
    fields: [occurrences.activityId],
    references: [activities.id],
  }),
  doneBy: one(users, {
    fields: [occurrences.doneById],
    references: [users.id],
  }),
}))

export type Activity = typeof activities.$inferSelect
export type Occurrence = typeof occurrences.$inferSelect
