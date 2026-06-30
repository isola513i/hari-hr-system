import HolidayService, { holidayDateSql } from '../../services/HolidayService';
import { query } from '../../db';

const mockedQuery = query as jest.MockedFunction<typeof query>;

// Build a holidays row the way pg returns a DATE column (local-midnight Date),
// so getMonth()/getDate() are timezone-stable in the test.
const row = (
  y: number,
  m: number,
  d: number,
  isRecurring: boolean,
  end?: [number, number, number]
) => ({
  date: new Date(y, m - 1, d),
  end_date: end ? new Date(end[0], end[1] - 1, end[2]) : null,
  is_recurring: isRecurring,
});

describe('HolidayService.getHolidayDatesSet', () => {
  beforeEach(() => mockedQuery.mockReset());

  it('expands a multi-day non-recurring holiday fully inside the range', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [row(2026, 4, 13, false, [2026, 4, 15])] } as never);
    const set = await HolidayService.getHolidayDatesSet('2026-04-01', '2026-04-30');
    expect(set.has('2026-04-13')).toBe(true);
    expect(set.has('2026-04-14')).toBe(true);
    expect(set.has('2026-04-15')).toBe(true);
    expect(set.has('2026-04-16')).toBe(false);
  });

  it('clips a multi-day holiday that overlaps the range start (regression: was dropped entirely)', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [row(2026, 4, 13, false, [2026, 4, 15])] } as never);
    const set = await HolidayService.getHolidayDatesSet('2026-04-14', '2026-04-20');
    expect(set.has('2026-04-13')).toBe(false); // before range
    expect(set.has('2026-04-14')).toBe(true);
    expect(set.has('2026-04-15')).toBe(true);
  });

  it('projects a recurring holiday into a year other than the stored one', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [row(2026, 4, 13, true)] } as never);
    const set = await HolidayService.getHolidayDatesSet('2027-04-01', '2027-04-30');
    expect(set.has('2027-04-13')).toBe(true);
  });

  it('handles a recurring holiday that wraps the year boundary (Dec 31 → Jan 2)', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [row(2026, 12, 31, true, [2027, 1, 2])] } as never);
    const set = await HolidayService.getHolidayDatesSet('2027-01-01', '2027-01-31');
    expect(set.has('2027-01-01')).toBe(true);
    expect(set.has('2027-01-02')).toBe(true);
  });
});

describe('holidayDateSql', () => {
  it('embeds the date expression and a year-wrap-safe recurring branch', () => {
    const sql = holidayDateSql('d.day::date');
    expect(sql).toContain('d.day::date');
    expect(sql).toContain('is_recurring');
    expect(sql).toContain('CASE'); // wrap handling for recurring spans
    expect(sql).toContain('COALESCE(h.end_date, h.date)'); // multi-day span
  });
});
