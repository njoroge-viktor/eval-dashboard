/**
 * Statistics for comparing evaluation runs.
 *
 * The point of these is to separate a real regression from sampling noise. A
 * dashboard that reports "pass rate fell 2 points" without saying whether that
 * is distinguishable from chance costs more engineering time than it saves.
 */

/** Abramowitz & Stegun 7.1.26; max absolute error 1.5e-7. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);

  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);

  return sign * y;
}

/** Standard normal CDF. */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** A confidence interval on a proportion. */
export interface Interval {
  readonly point: number;
  readonly lower: number;
  readonly upper: number;
}

/**
 * Wilson score interval for a binomial proportion.
 *
 * Preferred over the textbook normal approximation, which misbehaves badly
 * exactly where eval data lives: near 0% and 100%, and at small n. The normal
 * interval around 20/20 is [1, 1] — claiming certainty from twenty samples —
 * whereas Wilson correctly reports a lower bound near 0.83.
 *
 * @param successes Items that passed.
 * @param total Items scored.
 * @param z Critical value; 1.96 for 95%.
 */
export function wilsonInterval(successes: number, total: number, z = 1.96): Interval {
  if (total < 0 || successes < 0 || successes > total) {
    throw new RangeError(`invalid counts: ${successes} of ${total}`);
  }
  if (total === 0) return { point: 0, lower: 0, upper: 1 };

  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const centre = (p + z2 / (2 * total)) / denominator;
  const spread =
    (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denominator;

  return {
    point: p,
    lower: Math.max(0, centre - spread),
    upper: Math.min(1, centre + spread),
  };
}

/** Result of comparing two proportions. */
export interface ProportionTest {
  readonly z: number;
  readonly pValue: number;
  readonly significant: boolean;
}

/**
 * Two-proportion z-test using the pooled standard error.
 *
 * Significance additionally requires at least five expected successes and five
 * expected failures in each group — the standard adequacy check for the normal
 * approximation. Without it, a 1-of-2 to 0-of-2 "regression" would be reported
 * with a straight face.
 */
export function twoProportionTest(
  successesA: number,
  totalA: number,
  successesB: number,
  totalB: number,
  alpha = 0.05,
): ProportionTest {
  if (totalA <= 0 || totalB <= 0) {
    return { z: 0, pValue: 1, significant: false };
  }

  const pA = successesA / totalA;
  const pB = successesB / totalB;
  const pooled = (successesA + successesB) / (totalA + totalB);

  const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / totalA + 1 / totalB));
  if (standardError === 0) {
    // Both groups are all-pass or all-fail: there is no variance to test.
    return { z: 0, pValue: 1, significant: false };
  }

  const z = (pB - pA) / standardError;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));

  const adequate =
    totalA * pooled >= 5 &&
    totalA * (1 - pooled) >= 5 &&
    totalB * pooled >= 5 &&
    totalB * (1 - pooled) >= 5;

  return { z, pValue, significant: adequate && pValue < alpha };
}

/** Arithmetic mean, or 0 for an empty input. */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Format a proportion as a percentage string. */
export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Format a signed change in percentage points. */
export function formatDelta(value: number, digits = 1): string {
  const points = value * 100;
  const sign = points > 0 ? '+' : '';
  return `${sign}${points.toFixed(digits)} pp`;
}
