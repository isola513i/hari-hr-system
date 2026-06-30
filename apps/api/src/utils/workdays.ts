/**
 * Per-employee work-day helpers.
 *
 * An employee's `work_days` is an array of weekday numbers (0=Sun … 6=Sat).
 * When unset/empty we fall back to Mon–Fri, which matches the legacy hardcoded
 * "Mon–Fri are working days" rule used across attendance, payroll and leave.
 */
export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

/** Day-of-week (0=Sun … 6=Sat) of a YYYY-MM-DD date, computed in UTC to avoid timezone drift. */
export function dayOfWeekUTC(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** Coerce a possibly-null/empty work_days array to a sane default (Mon–Fri). */
export function resolveWorkDays(workDays?: number[] | null): number[] {
  return workDays && workDays.length ? workDays : DEFAULT_WORK_DAYS;
}

/** True if the given YYYY-MM-DD date is a scheduled work day for the employee. */
export function isWorkDay(dateStr: string, workDays?: number[] | null): boolean {
  return resolveWorkDays(workDays).includes(dayOfWeekUTC(dateStr));
}
