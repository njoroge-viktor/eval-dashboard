/** Domain types for evaluation runs. */

/** A single scored dimension within a run. */
export interface CriterionResult {
  readonly criterion: string;
  /** Items that met the bar. */
  readonly passed: number;
  /** Items scored. */
  readonly total: number;
  /** Inter-annotator agreement for this criterion, if measured. */
  readonly agreement?: number;
}

/** One model's results within one run. */
export interface ModelResult {
  readonly model: string;
  readonly criteria: readonly CriterionResult[];
  /** Pairwise wins against other models in this run. */
  readonly wins?: number;
  readonly losses?: number;
  readonly ties?: number;
}

/** A complete evaluation run. */
export interface EvalRun {
  readonly id: string;
  readonly label: string;
  /** ISO-8601 timestamp. */
  readonly startedAt: string;
  readonly suite: string;
  readonly annotators: number;
  readonly results: readonly ModelResult[];
}

/** Direction of a measured change. */
export type ChangeDirection = 'improved' | 'regressed' | 'unchanged';

/** A criterion whose pass rate moved between two runs. */
export interface Change {
  readonly model: string;
  readonly criterion: string;
  readonly baselineRate: number;
  readonly candidateRate: number;
  /** candidateRate - baselineRate, in percentage points. */
  readonly delta: number;
  readonly direction: ChangeDirection;
  /** Two-proportion z statistic. */
  readonly z: number;
  readonly pValue: number;
  /** True when the change is unlikely to be sampling noise. */
  readonly significant: boolean;
}
