import { describe, expect, it } from 'vitest';

import {
  formatDelta,
  formatPercent,
  mean,
  normalCdf,
  twoProportionTest,
  wilsonInterval,
} from '@/lib/stats';

describe('normalCdf', () => {
  it('is 0.5 at the mean', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });

  it.each([
    [1.96, 0.975],
    [1.645, 0.95],
    [2.576, 0.995],
    [-1.96, 0.025],
  ])('matches the standard table at z=%s', (z, expected) => {
    expect(normalCdf(z)).toBeCloseTo(expected, 3);
  });
});

describe('wilsonInterval', () => {
  it('brackets the point estimate', () => {
    const interval = wilsonInterval(43, 100);
    expect(interval.lower).toBeLessThan(interval.point);
    expect(interval.upper).toBeGreaterThan(interval.point);
    expect(interval.point).toBeCloseTo(0.43, 10);
  });

  it('does not claim certainty from a perfect small sample', () => {
    // The naive normal interval around 20/20 is [1, 1]. Wilson correctly
    // reports a lower bound near 0.839 — this is the whole reason for it.
    const interval = wilsonInterval(20, 20);
    expect(interval.point).toBe(1);
    expect(interval.lower).toBeCloseTo(0.8389, 3);
    expect(interval.upper).toBe(1);
  });

  it('stays within [0, 1] at the zero boundary', () => {
    const interval = wilsonInterval(0, 15);
    expect(interval.lower).toBe(0);
    expect(interval.upper).toBeGreaterThan(0);
    expect(interval.upper).toBeLessThanOrEqual(1);
  });

  it('narrows as the sample grows', () => {
    const small = wilsonInterval(50, 100);
    const large = wilsonInterval(5000, 10000);
    const width = (i: { lower: number; upper: number }) => i.upper - i.lower;

    expect(width(large)).toBeLessThan(width(small));
  });

  it('returns a maximally uninformative interval for no data', () => {
    expect(wilsonInterval(0, 0)).toEqual({ point: 0, lower: 0, upper: 1 });
  });

  it.each([
    [5, 3],
    [-1, 10],
  ])('rejects impossible counts (%i of %i)', (successes, total) => {
    expect(() => wilsonInterval(successes, total)).toThrow(RangeError);
  });
});

describe('twoProportionTest', () => {
  it('reports no difference for identical proportions', () => {
    const result = twoProportionTest(400, 500, 400, 500);
    expect(result.z).toBeCloseTo(0, 10);
    expect(result.significant).toBe(false);
  });

  it('detects a large drop on a large sample', () => {
    const result = twoProportionTest(388, 500, 330, 500);
    expect(result.z).toBeLessThan(0);
    expect(result.pValue).toBeLessThan(0.001);
    expect(result.significant).toBe(true);
  });

  it('signs z by the direction of change', () => {
    const up = twoProportionTest(300, 500, 400, 500);
    const down = twoProportionTest(400, 500, 300, 500);

    expect(up.z).toBeGreaterThan(0);
    expect(down.z).toBeLessThan(0);
    expect(up.z).toBeCloseTo(-down.z, 10);
  });

  it('refuses significance when the sample is too small for the approximation', () => {
    // 1 of 2 to 0 of 2 is a 50-point "drop" that means nothing.
    const result = twoProportionTest(1, 2, 0, 2);
    expect(result.significant).toBe(false);
  });

  it('treats a small real difference on a huge sample as significant', () => {
    const result = twoProportionTest(50000, 100000, 51000, 100000);
    expect(result.significant).toBe(true);
  });

  it('handles zero variance without dividing by zero', () => {
    const result = twoProportionTest(500, 500, 500, 500);
    expect(Number.isFinite(result.z)).toBe(true);
    expect(result.significant).toBe(false);
  });

  it('returns a null result for empty groups', () => {
    expect(twoProportionTest(0, 0, 5, 10)).toEqual({ z: 0, pValue: 1, significant: false });
  });

  it('honours a custom alpha', () => {
    // 53% -> 60% on n=500 each gives z = 2.23, p = 0.026: significant at the
    // default 0.05, but not at a stricter 0.001.
    const borderline = twoProportionTest(265, 500, 300, 500);
    expect(borderline.pValue).toBeGreaterThan(0.001);
    expect(borderline.pValue).toBeLessThan(0.05);
    expect(borderline.significant).toBe(true);
    expect(twoProportionTest(265, 500, 300, 500, 0.001).significant).toBe(false);
  });

  it('sits just short of significance at p just above alpha', () => {
    // 54% -> 60% is p = 0.055. A dashboard that called this a regression
    // would cost an engineer a day chasing noise.
    const result = twoProportionTest(270, 500, 300, 500);
    expect(result.pValue).toBeGreaterThan(0.05);
    expect(result.significant).toBe(false);
  });
});

describe('mean', () => {
  it('averages', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it('returns 0 for an empty list rather than NaN', () => {
    expect(mean([])).toBe(0);
  });
});

describe('formatting', () => {
  it('formats percentages', () => {
    expect(formatPercent(0.8234)).toBe('82.3%');
    expect(formatPercent(0.5, 0)).toBe('50%');
  });

  it('signs deltas explicitly', () => {
    expect(formatDelta(0.023)).toBe('+2.3 pp');
    expect(formatDelta(-0.116)).toBe('-11.6 pp');
    expect(formatDelta(0)).toBe('0.0 pp');
  });
});
