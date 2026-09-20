/**
 * Data access.
 *
 * Reads from a bundled fixture so the dashboard runs with no infrastructure.
 * The async signatures are deliberate: swapping this for a warehouse query
 * later should not force every caller to change shape.
 */

import runsFixture from '@/data/runs.json';
import type { EvalRun } from './types';

const RUNS = runsFixture as readonly EvalRun[];

/** Every run, newest first. */
export async function listRuns(): Promise<readonly EvalRun[]> {
  return [...RUNS].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

/** One run by id, or null when unknown. */
export async function getRun(id: string): Promise<EvalRun | null> {
  return RUNS.find((run) => run.id === id) ?? null;
}

/** The most recent run, or null when there are none. */
export async function latestRun(): Promise<EvalRun | null> {
  const runs = await listRuns();
  return runs[0] ?? null;
}

/** The run immediately preceding `id`, for comparison. */
export async function previousRun(id: string): Promise<EvalRun | null> {
  const runs = await listRuns();
  const index = runs.findIndex((run) => run.id === id);
  if (index === -1) return null;
  return runs[index + 1] ?? null;
}
