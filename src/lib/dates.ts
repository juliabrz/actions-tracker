import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"

/** Fixed app time zone. Occurrences are day-granular (spec §6). */
export const TIME_ZONE = "America/Sao_Paulo"

const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/**
 * Today in São Paulo, as YYYY-MM-DD.
 * The only place that turns an instant into a calendar date, and therefore the
 * only one that needs the time zone. Same result on Vercel (UTC) and locally.
 */
export function today(): string {
  return zonedFormatter.format(new Date())
}

/**
 * Date arithmetic on YYYY-MM-DD strings, time zone free.
 *
 * parseISO returns LOCAL midnight and format reads LOCAL time, so the pair
 * round-trips correctly under any server time zone. Formatting here with the
 * São Paulo formatter would be a bug: it would shift a day whenever the server
 * runs in UTC — that is, in production.
 */
export function shiftDays(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd")
}

/** Calendar days between two YYYY-MM-DD dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a))
}

/** Validates both the format and that the day really exists (rejects 2025-02-30). */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = parseISO(date)
  return !Number.isNaN(parsed.getTime()) && format(parsed, "yyyy-MM-dd") === date
}
