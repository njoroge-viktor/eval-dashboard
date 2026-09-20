import { describe, expect, it } from 'vitest';

import {
  AGREEMENT_FLOOR,
  compareRuns,
  improvements,
  leaderboard,
  lowAgreementCriteria,
  regressions,
  standingFor,
  summarize,
} from '@/lib/analysis';
import type { EvalRun, ModelResult } from '@/lib/types';

const model = (over: Partial<ModelResult> = {}): ModelResult => ({
  model: 'gpt-4o',
  criteria: [
    { criterion: 'correctness', passed: 400, total: 500, agreement: 0.85 },
    { criterion: 'security', passed: 300, total: 500, agreement: 0.8 },
  ],
  ...over,
});

const run = (over: Partial<EvalRun> = {}): EvalRun => ({
  id: 'run-1',
  label: 'Run 1',
  startedAt: '2026-09-01T00:00:00Z',
  suite: 'suite-a',
  annotators: 4,
  results: [model()],
  ...over,
});

describe('standingFor', () => {
  it('aggregates pass counts across criteria', () => {
    const standing = standingFor(model());
    expect(standing.passed).toBe(700);
    expect(standing.total).toBe(1000);
    expect(standing.passRate).toBe(0.7);
  });

  it('averages agreement across criteria that reported it', () => {
    const standing = standingFor(
      model({
        criteria: [
          { criterion: 'a', passed: 1, total: 2, agreement: 0.9 },
          { criterion: 'b', passed: 1, total: 2 },
        ],
      }),
    );
    expect(standing.meanAgreement).toBe(0.9);
  });

  it('reports null agreement when nothing measured it', () => {
    const standing = standingFor(
      model({ criteria: [{ criterion: 'a', passed: 1, total: 2 }] }),
    );
    expect(standing.meanAgreement).toBeNull();
  });

  it('counts ties as half a win', () => {
    const standing = standingFor(model({ wins: 4, losses: 4, ties: 2 }));
    expect(standing.winRate).toBe(0.5);
  });

  it('reports null win rate when no matches were played', () => {
    expect(standingFor(model()).winRate).toBeNull();
  });

  it('handles a model with no items scored', () => {
    const standing = standingFor(
      model({ criteria: [{ criterion: 'a', passed: 0, total: 0 }] }),
    );
    expect(standing.passRate).toBe(0);
  });
});

describe('leaderboard', () => {
  it('orders by pass rate descending', () => {
    const ranked = leaderboard(
      run({
        results: [
          model({ model: 'weak', criteria: [{ criterion: 'c', passed: 10, total: 100 }] }),
          model({ model: 'strong', criteria: [{ criterion: 'c', passed: 90, total: 100 }] }),
        ],
      }),
    );
    expect(ranked.map((s) => s.model)).toEqual(['strong', 'weak']);
  });

  it('breaks ties on the lower confidence bound, preferring more evidence', () => {
    // Both at exactly 90%, but one measured on 10x the items.
    const ranked = leaderboard(
      run({
        results: [
          model({ model: 'thin', criteria: [{ criterion: 'c', passed: 90, total: 100 }] }),
          model({ model: 'thick', criteria: [{ criterion: 'c', passed: 900, total: 1000 }] }),
        ],
      }),
    );
    expect(ranked[0]?.model).toBe('thick');
  });

  it('returns an empty list for a run with no models', () => {
    expect(leaderboard(run({ results: [] }))).toEqual([]);
  });
});

describe('compareRuns', () => {
  const baseline = run({
    id: 'base',
    results: [
      model({
        criteria: [
          { criterion: 'correctness', passed: 412, total: 500 },
          { criterion: 'security', passed: 388, total: 500 },
        ],
      }),
    ],
  });

  it('computes a per-criterion delta', () => {
    const candidate = run({
      id: 'cand',
      results: [
        model({
          criteria: [
            { criterion: 'correctness', passed: 428, total: 500 },
            { criterion: 'security', passed: 330, total: 500 },
          ],
        }),
      ],
    });

    const changes = compareRuns(baseline, candidate);
    const security = changes.find((c) => c.criterion === 'security');

    expect(security?.direction).toBe('regressed');
    expect(security?.delta).toBeCloseTo(-0.116, 3);
    expect(security?.significant).toBe(true);
  });

  it('sorts the worst regression first', () => {
    const candidate = run({
      id: 'cand',
      results: [
        model({
          criteria: [
            { criterion: 'correctness', passed: 380, total: 500 },
            { criterion: 'security', passed: 200, total: 500 },
          ],
        }),
      ],
    });

    expect(compareRuns(baseline, candidate)[0]?.criterion).toBe('security');
  });

  it('ignores models absent from the baseline', () => {
    const candidate = run({
      id: 'cand',
      results: [model({ model: 'brand-new' })],
    });
    expect(compareRuns(baseline, candidate)).toEqual([]);
  });

  it('ignores criteria absent from the baseline', () => {
    // A criterion added between runs has no baseline, and inventing one would
    // manufacture a regression out of a schema change.
    const candidate = run({
      id: 'cand',
      results: [model({ criteria: [{ criterion: 'brand-new', passed: 1, total: 500 }] })],
    });
    expect(compareRuns(baseline, candidate)).toEqual([]);
  });

  it('skips criteria with no items scored', () => {
    const candidate = run({
      id: 'cand',
      results: [model({ criteria: [{ criterion: 'correctness', passed: 0, total: 0 }] })],
    });
    expect(compareRuns(baseline, candidate)).toEqual([]);
  });

  it('marks an identical result as unchanged', () => {
    const changes = compareRuns(baseline, run({ id: 'cand', results: baseline.results }));
    expect(changes.every((c) => c.direction === 'unchanged')).toBe(true);
    expect(changes.every((c) => c.significant === false)).toBe(true);
  });
});

describe('regressions and improvements', () => {
  const baseline = run({
    id: 'base',
    results: [
      model({
        criteria: [
          { criterion: 'up', passed: 300, total: 500 },
          { criterion: 'down', passed: 400, total: 500 },
          { criterion: 'noise', passed: 400, total: 500 },
        ],
      }),
    ],
  });
  const candidate = run({
    id: 'cand',
    results: [
      model({
        criteria: [
          { criterion: 'up', passed: 400, total: 500 },
          { criterion: 'down', passed: 300, total: 500 },
          { criterion: 'noise', passed: 398, total: 500 },
        ],
      }),
    ],
  });
  const changes = compareRuns(baseline, candidate);

  it('reports only significant drops as regressions', () => {
    expect(regressions(changes).map((c) => c.criterion)).toEqual(['down']);
  });

  it('reports only significant rises as improvements', () => {
    expect(improvements(changes).map((c) => c.criterion)).toEqual(['up']);
  });

  it('excludes changes indistinguishable from noise', () => {
    const noise = changes.find((c) => c.criterion === 'noise');
    expect(noise?.direction).toBe('regressed');
    expect(noise?.significant).toBe(false);
  });
});

describe('summarize', () => {
  it('counts models, distinct criteria and items', () => {
    const summary = summarize(
      run({ results: [model({ model: 'a' }), model({ model: 'b' })] }),
    );
    expect(summary.models).toBe(2);
    expect(summary.criteria).toBe(2);
    expect(summary.items).toBe(2000);
    expect(summary.passRate).toBe(0.7);
  });

  it('handles an empty run', () => {
    expect(summarize(run({ results: [] }))).toMatchObject({
      models: 0,
      items: 0,
      passRate: 0,
      meanAgreement: null,
    });
  });
});

describe('lowAgreementCriteria', () => {
  it('flags criteria below the floor, worst first', () => {
    const flagged = lowAgreementCriteria(
      run({
        results: [
          model({
            criteria: [
              { criterion: 'fine', passed: 1, total: 2, agreement: 0.9 },
              { criterion: 'shaky', passed: 1, total: 2, agreement: 0.62 },
              { criterion: 'worst', passed: 1, total: 2, agreement: 0.41 },
            ],
          }),
        ],
      }),
    );

    expect(flagged.map((f) => f.criterion)).toEqual(['worst', 'shaky']);
  });

  it('ignores criteria that never reported agreement', () => {
    const flagged = lowAgreementCriteria(
      run({ results: [model({ criteria: [{ criterion: 'a', passed: 1, total: 2 }] })] }),
    );
    expect(flagged).toEqual([]);
  });

  it('treats the floor itself as acceptable', () => {
    const flagged = lowAgreementCriteria(
      run({
        results: [
          model({
            criteria: [{ criterion: 'a', passed: 1, total: 2, agreement: AGREEMENT_FLOOR }],
          }),
        ],
      }),
    );
    expect(flagged).toEqual([]);
  });
});
