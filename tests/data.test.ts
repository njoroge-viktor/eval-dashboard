import { describe, expect, it } from 'vitest';

import { getRun, latestRun, listRuns, previousRun } from '@/lib/data';

describe('listRuns', () => {
  it('returns runs newest first', async () => {
    const runs = await listRuns();
    expect(runs.length).toBeGreaterThan(1);

    for (let i = 1; i < runs.length; i += 1) {
      const newer = new Date(runs[i - 1]!.startedAt).getTime();
      const older = new Date(runs[i]!.startedAt).getTime();
      expect(newer).toBeGreaterThanOrEqual(older);
    }
  });

  it('does not mutate the underlying fixture between calls', async () => {
    const first = await listRuns();
    const second = await listRuns();
    expect(first.map((r) => r.id)).toEqual(second.map((r) => r.id));
  });
});

describe('getRun', () => {
  it('finds a run by id', async () => {
    const runs = await listRuns();
    const target = runs[0]!;
    await expect(getRun(target.id)).resolves.toMatchObject({ id: target.id });
  });

  it('returns null for an unknown id rather than throwing', async () => {
    await expect(getRun('no-such-run')).resolves.toBeNull();
  });
});

describe('latestRun', () => {
  it('is the first of listRuns', async () => {
    const runs = await listRuns();
    await expect(latestRun()).resolves.toMatchObject({ id: runs[0]!.id });
  });
});

describe('previousRun', () => {
  it('returns the run immediately older', async () => {
    const runs = await listRuns();
    const previous = await previousRun(runs[0]!.id);
    expect(previous?.id).toBe(runs[1]!.id);
  });

  it('returns null for the oldest run', async () => {
    const runs = await listRuns();
    await expect(previousRun(runs[runs.length - 1]!.id)).resolves.toBeNull();
  });

  it('returns null for an unknown id', async () => {
    await expect(previousRun('no-such-run')).resolves.toBeNull();
  });
});

describe('fixture integrity', () => {
  it('has consistent pass counts within every criterion', async () => {
    for (const run of await listRuns()) {
      for (const result of run.results) {
        for (const criterion of result.criteria) {
          expect(criterion.passed).toBeLessThanOrEqual(criterion.total);
          expect(criterion.passed).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('keeps agreement within [0, 1]', async () => {
    for (const run of await listRuns()) {
      for (const result of run.results) {
        for (const criterion of result.criteria) {
          if (criterion.agreement !== undefined) {
            expect(criterion.agreement).toBeGreaterThanOrEqual(0);
            expect(criterion.agreement).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('uses unique run ids', async () => {
    const runs = await listRuns();
    expect(new Set(runs.map((r) => r.id)).size).toBe(runs.length);
  });
});
