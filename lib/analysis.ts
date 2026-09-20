/**
 * Comparing evaluation runs.
 *
 * The question a dashboard exists to answer is not "what is the score" but
 * "did anything get worse, and am I sure?"
 */

import type { Change, CriterionResult, EvalRun, ModelResult } from './types';
import { twoProportionTest, wilsonInterval } from './stats';
import type { Interval } from './stats';

/** A model's aggregate standing within one run. */
export interface Standing {
  readonly model: string;
  readonly passed: number;
  readonly total: number;
  readonly passRate: number;
  /** 95% Wilson interval on the pass rate. */
  readonly interval: Interval;
  readonly meanAgreement: number | null;
  readonly winRate: number | null;
}

/** Overall pass rate for one model across every criterion. */
export function standingFor(result: ModelResult): Standing {
  let passed = 0;
  let total = 0;
  const agreements: number[] = [];

  for (const criterion of result.criteria) {
    passed += criterion.passed;
    total += criterion.total;
    if (criterion.agreement !== undefined) agreements.push(criterion.agreement);
  }

  const matches = (result.wins ?? 0) + (result.losses ?? 0) + (result.ties ?? 0);
  const winRate =
    matches === 0 ? null : ((result.wins ?? 0) + 0.5 * (result.ties ?? 0)) / matches;

  return {
    model: result.model,
    passed,
    total,
    passRate: total === 0 ? 0 : passed / total,
    interval: wilsonInterval(passed, total),
    meanAgreement:
      agreements.length === 0
        ? null
        : agreements.reduce((sum, v) => sum + v, 0) / agreements.length,
    winRate,
  };
}

/**
 * Rank every model in a run, strongest first.
 *
 * Ties on pass rate break on the **lower** confidence bound, which prefers the
 * model with more evidence behind the same headline number.
 */
export function leaderboard(run: EvalRun): readonly Standing[] {
  return run.results
    .map(standingFor)
    .sort(
      (a, b) =>
        b.passRate - a.passRate ||
        b.interval.lower - a.interval.lower ||
        a.model.localeCompare(b.model),
    );
}

function criteriaByName(result: ModelResult): Map<string, CriterionResult> {
  return new Map(result.criteria.map((c) => [c.criterion, c]));
}

/**
 * Compare two runs criterion by criterion.
 *
 * Only models and criteria present in **both** runs are compared; a criterion
 * added or removed between runs has no baseline, and inventing one would
 * manufacture a regression out of a schema change.
 */
export function compareRuns(baseline: EvalRun, candidate: EvalRun): readonly Change[] {
  const baselineModels = new Map(baseline.results.map((r) => [r.model, r]));
  const changes: Change[] = [];

  for (const candidateResult of candidate.results) {
    const baselineResult = baselineModels.get(candidateResult.model);
    if (baselineResult === undefined) continue;

    const baselineCriteria = criteriaByName(baselineResult);

    for (const candidateCriterion of candidateResult.criteria) {
      const baselineCriterion = baselineCriteria.get(candidateCriterion.criterion);
      if (baselineCriterion === undefined) continue;
      if (baselineCriterion.total === 0 || candidateCriterion.total === 0) continue;

      const baselineRate = baselineCriterion.passed / baselineCriterion.total;
      const candidateRate = candidateCriterion.passed / candidateCriterion.total;
      const delta = candidateRate - baselineRate;

      const test = twoProportionTest(
        baselineCriterion.passed,
        baselineCriterion.total,
        candidateCriterion.passed,
        candidateCriterion.total,
      );

      changes.push({
        model: candidateResult.model,
        criterion: candidateCriterion.criterion,
        baselineRate,
        candidateRate,
        delta,
        direction: delta > 0 ? 'improved' : delta < 0 ? 'regressed' : 'unchanged',
        z: test.z,
        pValue: test.pValue,
        significant: test.significant,
      });
    }
  }

  // Largest regressions first: that is what a release decision hinges on.
  return changes.sort((a, b) => a.delta - b.delta);
}

/** Significant regressions only — the subset that should block a release. */
export function regressions(changes: readonly Change[]): readonly Change[] {
  return changes.filter((c) => c.direction === 'regressed' && c.significant);
}

/** Significant improvements only. */
export function improvements(changes: readonly Change[]): readonly Change[] {
  return changes
    .filter((c) => c.direction === 'improved' && c.significant)
    .slice()
    .sort((a, b) => b.delta - a.delta);
}

/** Headline numbers for a run. */
export interface RunSummary {
  readonly models: number;
  readonly criteria: number;
  readonly items: number;
  readonly passRate: number;
  readonly meanAgreement: number | null;
}

export function summarize(run: EvalRun): RunSummary {
  const criteria = new Set<string>();
  let passed = 0;
  let total = 0;
  const agreements: number[] = [];

  for (const result of run.results) {
    for (const criterion of result.criteria) {
      criteria.add(criterion.criterion);
      passed += criterion.passed;
      total += criterion.total;
      if (criterion.agreement !== undefined) agreements.push(criterion.agreement);
    }
  }

  return {
    models: run.results.length,
    criteria: criteria.size,
    items: total,
    passRate: total === 0 ? 0 : passed / total,
    meanAgreement:
      agreements.length === 0
        ? null
        : agreements.reduce((sum, v) => sum + v, 0) / agreements.length,
  };
}

/** Agreement below this is treated as untrustworthy labelling. */
export const AGREEMENT_FLOOR = 0.67;

/**
 * Criteria whose agreement falls below the floor.
 *
 * A pass rate computed from labels the annotators cannot agree on is not a
 * measurement, so these are surfaced before anybody reads the leaderboard.
 * The 0.67 threshold is the conventional "tentative conclusions only" line for
 * Krippendorff's alpha.
 */
export function lowAgreementCriteria(
  run: EvalRun,
): readonly { model: string; criterion: string; agreement: number }[] {
  const flagged: { model: string; criterion: string; agreement: number }[] = [];

  for (const result of run.results) {
    for (const criterion of result.criteria) {
      if (criterion.agreement !== undefined && criterion.agreement < AGREEMENT_FLOOR) {
        flagged.push({
          model: result.model,
          criterion: criterion.criterion,
          agreement: criterion.agreement,
        });
      }
    }
  }

  return flagged.sort((a, b) => a.agreement - b.agreement);
}
