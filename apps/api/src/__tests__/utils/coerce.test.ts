import { toInt, toFloat, toBoolean, toNullableString } from '../../utils/coerce';
import { createPaginatedResult } from '../../utils/pagination';

describe('coerce', () => {
  describe('toInt', () => {
    it('parses numeric strings (pg COUNT returns strings)', () => {
      expect(toInt('42')).toBe(42);
    });
    it('truncates finite numbers', () => {
      expect(toInt(3.9)).toBe(3);
    });
    it('falls back on null/undefined/garbage instead of returning NaN', () => {
      expect(toInt(null)).toBe(0);
      expect(toInt(undefined)).toBe(0);
      expect(toInt('not-a-number')).toBe(0);
      expect(toInt(NaN)).toBe(0);
    });
    it('honors a custom fallback', () => {
      expect(toInt(undefined, -1)).toBe(-1);
    });
  });

  describe('toFloat', () => {
    it('parses decimal strings (pg SUM returns strings)', () => {
      expect(toFloat('1234.56')).toBeCloseTo(1234.56);
    });
    it('falls back on garbage', () => {
      expect(toFloat('abc')).toBe(0);
      expect(toFloat(null)).toBe(0);
    });
  });

  describe('toBoolean', () => {
    it('handles pg boolean string representations', () => {
      expect(toBoolean('t')).toBe(true);
      expect(toBoolean('false')).toBe(false);
      expect(toBoolean(1)).toBe(true);
      expect(toBoolean(0)).toBe(false);
    });
    it('falls back on unknown values', () => {
      expect(toBoolean('maybe')).toBe(false);
      expect(toBoolean(undefined, true)).toBe(true);
    });
  });

  describe('toNullableString', () => {
    it('preserves null/undefined as null', () => {
      expect(toNullableString(null)).toBeNull();
      expect(toNullableString(undefined)).toBeNull();
    });
    it('stringifies other values', () => {
      expect(toNullableString(123)).toBe('123');
    });
  });
});

describe('createPaginatedResult (runtime-hardened)', () => {
  const params = { page: 1, limit: 20, offset: 0 };

  it('produces correct pagination metadata', () => {
    const result = createPaginatedResult([1, 2, 3], 45, params);
    expect(result.pagination.total).toBe(45);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrev).toBe(false);
  });

  it('never lets a NaN total leak into the metadata', () => {
    // Simulates a caller passing parseInt(undefined) === NaN.
    const result = createPaginatedResult([], NaN as unknown as number, params);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasNext).toBe(false);
  });
});
