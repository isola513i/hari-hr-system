import { linearRegression, projectForward, mean, momentum } from '../../utils/stats';

describe('stats', () => {
  describe('linearRegression', () => {
    it('fits a perfect upward line', () => {
      const fit = linearRegression([2, 4, 6, 8, 10]);
      expect(fit.slope).toBeCloseTo(2);
      expect(fit.intercept).toBeCloseTo(2);
      expect(fit.r2).toBeCloseTo(1);
      expect(fit.stdError).toBeCloseTo(0);
    });

    it('fits a flat line (zero slope)', () => {
      const fit = linearRegression([5, 5, 5, 5]);
      expect(fit.slope).toBeCloseTo(0);
      expect(fit.intercept).toBeCloseTo(5);
    });

    it('handles empty and single-point series without NaN', () => {
      expect(linearRegression([])).toEqual({ slope: 0, intercept: 0, r2: 0, stdError: 0 });
      const one = linearRegression([7]);
      expect(one.slope).toBe(0);
      expect(one.intercept).toBe(7);
    });

    it('produces a residual std error for noisy data', () => {
      const fit = linearRegression([1, 3, 2, 5, 4]);
      expect(fit.stdError).toBeGreaterThan(0);
      expect(fit.r2).toBeLessThan(1);
    });
  });

  describe('projectForward', () => {
    it('extends a linear trend correctly', () => {
      const proj = projectForward([2, 4, 6, 8, 10], 3);
      expect(proj).toHaveLength(3);
      expect(proj[0].value).toBeCloseTo(12);
      expect(proj[1].value).toBeCloseTo(14);
      expect(proj[2].value).toBeCloseTo(16);
    });

    it('clamps negative projections and bands at zero', () => {
      const proj = projectForward([5, 4, 3, 2, 1], 5);
      // Trend goes negative; values must never drop below 0
      for (const p of proj) {
        expect(p.value).toBeGreaterThanOrEqual(0);
        expect(p.lower).toBeGreaterThanOrEqual(0);
      }
    });

    it('widens the confidence band for noisy data', () => {
      const noisy = projectForward([1, 6, 2, 7, 3, 8], 1)[0];
      expect(noisy.upper).toBeGreaterThan(noisy.lower);
    });
  });

  describe('mean', () => {
    it('averages a series', () => {
      expect(mean([2, 4, 6])).toBe(4);
    });
    it('returns 0 for empty', () => {
      expect(mean([])).toBe(0);
    });
  });

  describe('momentum', () => {
    it('reports positive momentum on a rising series', () => {
      expect(momentum([1, 1, 1, 2, 2, 2])).toBeGreaterThan(0);
    });
    it('returns 0 when there is not enough history', () => {
      expect(momentum([1, 2])).toBe(0);
    });
  });
});
