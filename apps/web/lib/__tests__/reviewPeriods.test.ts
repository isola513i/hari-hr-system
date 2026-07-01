import { describe, it, expect } from 'vitest';
import { getReviewPeriods } from '../reviewPeriods';

describe('getReviewPeriods', () => {
  it('builds the current-year halves and quarters plus prior-year tail', () => {
    const periods = getReviewPeriods(new Date(2026, 5, 15)); // June 2026
    expect(periods).toEqual([
      '2026-H1', '2026-H2',
      '2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4',
      '2025-H2', '2025-Q4',
    ]);
  });

  it('derives the year from the reference date', () => {
    const periods = getReviewPeriods(new Date(2030, 0, 1));
    expect(periods[0]).toBe('2030-H1');
    expect(periods).toContain('2029-Q4');
  });

  it('returns a stable count of 8 periods', () => {
    expect(getReviewPeriods(new Date(2024, 11, 31))).toHaveLength(8);
  });
});
