import { describe, it, expect } from 'vitest';
import { expandHolidayDates } from '../holidays';
import type { PublicHoliday } from '../../types';

const h = (date: string, isRecurring: boolean, endDate: string | null = null): PublicHoliday => ({
  id: 'x',
  date,
  endDate,
  name: 'H',
  isRecurring,
  createdAt: '',
  updatedAt: '',
});

describe('expandHolidayDates', () => {
  it('returns an empty set for no holidays', () => {
    expect(expandHolidayDates(undefined, 2026, 2026).size).toBe(0);
    expect(expandHolidayDates([], 2026, 2026).size).toBe(0);
  });

  it('expands a multi-day non-recurring holiday', () => {
    const set = expandHolidayDates([h('2026-04-13', false, '2026-04-15')], 2026, 2026);
    expect(set.has('2026-04-13')).toBe(true);
    expect(set.has('2026-04-14')).toBe(true);
    expect(set.has('2026-04-15')).toBe(true);
    expect(set.has('2026-04-16')).toBe(false);
  });

  it('projects a recurring holiday across the whole year range', () => {
    const set = expandHolidayDates([h('2026-04-13', true)], 2026, 2028);
    expect(set.has('2026-04-13')).toBe(true);
    expect(set.has('2027-04-13')).toBe(true);
    expect(set.has('2028-04-13')).toBe(true);
  });

  it('handles a recurring holiday that wraps the year boundary (Dec 31 → Jan 2)', () => {
    const set = expandHolidayDates([h('2026-12-31', true, '2027-01-02')], 2027, 2027);
    expect(set.has('2027-01-01')).toBe(true);
    expect(set.has('2027-01-02')).toBe(true);
    expect(set.has('2027-12-31')).toBe(true);
  });
});
