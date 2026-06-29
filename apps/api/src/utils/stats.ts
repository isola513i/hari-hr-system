/**
 * Lightweight statistics helpers for predictive analytics.
 *
 * Pure functions, no ML dependency — ordinary least-squares linear regression
 * over an evenly-spaced series (x = 0,1,2,…) plus a forward projection with a
 * ~95% confidence band derived from the residual standard error.
 */

export interface LinearFit {
  slope: number;
  intercept: number;
  r2: number;        // coefficient of determination (goodness of fit, 0..1)
  stdError: number;  // residual standard error (drives the confidence band)
}

export interface Projection {
  value: number;
  lower: number;
  upper: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Fit y = slope·x + intercept over x = 0..n-1 by ordinary least squares.
 */
export function linearRegression(ys: number[]): LinearFit {
  const n = ys.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0, stdError: 0 };
  if (n === 1) return { slope: 0, intercept: ys[0], r2: 1, stdError: 0 };

  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (ys[i] - meanY);
    den += (i - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = slope * i + intercept;
    ssRes += (ys[i] - pred) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  // Residual standard error needs n>2 degrees of freedom; else no spread.
  const stdError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  return { slope, intercept, r2, stdError };
}

/**
 * Project `periodsAhead` future points from the fitted trend. Each point gets a
 * ~95% band (±1.96·stdError). Values are clamped at 0 (counts can't be negative).
 */
export function projectForward(ys: number[], periodsAhead: number): Projection[] {
  const fit = linearRegression(ys);
  const n = ys.length;
  const out: Projection[] = [];
  for (let k = 1; k <= periodsAhead; k++) {
    const x = n - 1 + k;
    const value = fit.slope * x + fit.intercept;
    const margin = 1.96 * fit.stdError;
    out.push({
      value: Math.max(0, round2(value)),
      lower: Math.max(0, round2(value - margin)),
      upper: Math.max(0, round2(value + margin)),
    });
  }
  return out;
}

export function mean(ys: number[]): number {
  if (ys.length === 0) return 0;
  return round2(ys.reduce((a, b) => a + b, 0) / ys.length);
}

/** Percentage change between the average of the last `window` points and the prior `window`. */
export function momentum(ys: number[], window = 3): number {
  if (ys.length < window * 2) return 0;
  const recent = ys.slice(-window);
  const prior = ys.slice(-window * 2, -window);
  const recentMean = recent.reduce((a, b) => a + b, 0) / window;
  const priorMean = prior.reduce((a, b) => a + b, 0) / window;
  if (priorMean === 0) return 0;
  return round2(((recentMean - priorMean) / priorMean) * 100);
}
