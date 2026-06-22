/**
 * Runtime coercion helpers for raw DB query results.
 *
 * node-postgres returns numeric/bigint aggregates (COUNT, SUM) as strings, and
 * a missing column or SQL NULL surfaces as undefined/null. Calling parseInt /
 * parseFloat on those silently yields NaN, which then corrupts pagination math
 * (totalPages, hasNext) and computed totals without any error. These helpers
 * always return a finite value (or the supplied fallback) instead.
 */

/** Coerce an unknown DB value to a finite integer, or `fallback` if it can't. */
export function toInt(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : fallback;
  }
  if (typeof value === 'string') {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Coerce an unknown DB value to a finite float, or `fallback` if it can't. */
export function toFloat(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Coerce an unknown DB value (boolean, 0/1, 't'/'f', 'true'/'false') to boolean. */
export function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', 't', '1', 'yes'].includes(v)) return true;
    if (['false', 'f', '0', 'no'].includes(v)) return false;
  }
  return fallback;
}

/** Coerce an unknown DB value to a string, preserving null/undefined as null. */
export function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}
