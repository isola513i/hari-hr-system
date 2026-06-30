import type { PublicHoliday } from '../types';

/** Format a Date as a local "YYYY-MM-DD" key (no timezone shift). */
function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Normalize any date-ish string to a local "YYYY-MM-DD" key. */
function toDateKey(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1] as string;
  return fmt(new Date(raw));
}

/**
 * Expand a list of holidays into a flat Set of "YYYY-MM-DD" strings the user must not pick.
 *
 * Mirrors the backend `HolidayService.getHolidayDatesSet` logic:
 * - multi-day holidays (`date`..`endDate`) expand to every day in the span
 * - recurring holidays (`isRecurring`) are projected onto every year in [startYear, endYear]
 *   by month/day, so an annual holiday blocks the matching date in each covered year.
 *
 * @param holidays  raw holidays from `useHolidays()`
 * @param startYear first year to cover (inclusive)
 * @param endYear   last year to cover (inclusive)
 */
export function expandHolidayDates(
  holidays: PublicHoliday[] | undefined,
  startYear: number,
  endYear: number
): Set<string> {
  const set = new Set<string>();
  if (!holidays) return set;

  for (const h of holidays) {
    const start = new Date(toDateKey(h.date) + 'T00:00:00');
    const end = new Date(toDateKey(h.endDate ?? h.date) + 'T00:00:00');

    if (h.isRecurring) {
      for (let y = startYear; y <= endYear; y++) {
        const cur = new Date(y, start.getMonth(), start.getDate());
        const last = new Date(y, end.getMonth(), end.getDate());
        while (cur <= last) {
          set.add(fmt(cur));
          cur.setDate(cur.getDate() + 1);
        }
      }
    } else {
      const cur = new Date(start);
      while (cur <= end) {
        set.add(fmt(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  return set;
}
