import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ChangeList } from '@/components/ChangeList';
import { Leaderboard } from '@/components/Leaderboard';
import { StatCard } from '@/components/StatCard';
import {
  compareRuns,
  improvements,
  leaderboard,
  lowAgreementCriteria,
  regressions,
  summarize,
} from '@/lib/analysis';
import { getRun, listRuns, previousRun } from '@/lib/data';
import { formatPercent } from '@/lib/stats';

export async function generateStaticParams() {
  const runs = await listRuns();
  return runs.map((run) => ({ runId: run.id }));
}

export default async function RunPage({ params }: { params: { runId: string } }) {
  const run = await getRun(params.runId);
  if (run === null) notFound();

  const baseline = await previousRun(run.id);
  const summary = summarize(run);
  const standings = leaderboard(run);
  const changes = baseline === null ? [] : compareRuns(baseline, run);
  const regressed = regressions(changes);
  const improved = improvements(changes);
  const lowAgreement = lowAgreementCriteria(run);

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">Runs</Link> / {run.label}
      </p>

      <h1>{run.label}</h1>
      <p className="lede">
        Suite <code>{run.suite}</code>, {run.annotators} annotators, started{' '}
        <time dateTime={run.startedAt}>
          {new Date(run.startedAt).toISOString().slice(0, 10)}
        </time>
        .
      </p>

      <div className="cards">
        <StatCard
          label="Pass rate"
          value={formatPercent(summary.passRate)}
          hint={`${summary.items.toLocaleString()} items`}
        />
        <StatCard label="Models" value={String(summary.models)} hint={`${summary.criteria} criteria`} />
        <StatCard
          label="Regressions"
          value={String(regressed.length)}
          tone={regressed.length > 0 ? 'bad' : 'good'}
          hint={baseline === null ? 'No baseline run' : `vs ${baseline.label}`}
        />
        <StatCard
          label="Improvements"
          value={String(improved.length)}
          tone={improved.length > 0 ? 'good' : 'neutral'}
          hint={baseline === null ? 'No baseline run' : `vs ${baseline.label}`}
        />
      </div>

      {lowAgreement.length > 0 && (
        <section aria-labelledby="agreement-heading" className="section">
          <h2 id="agreement-heading">Low agreement</h2>
          <p className="note">
            A pass rate computed from labels the annotators cannot agree on is not a
            measurement. Treat these as unresolved before reading anything else.
          </p>
          <ul className="flags">
            {lowAgreement.map((flag) => (
              <li key={`${flag.model}-${flag.criterion}`}>
                <span className="flag-model">{flag.model}</span>
                <span className="flag-criterion">{flag.criterion}</span>
                <span className="flag-value">α = {flag.agreement.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="leaderboard-heading" className="section">
        <h2 id="leaderboard-heading">Leaderboard</h2>
        <Leaderboard standings={standings} />
      </section>

      <section aria-labelledby="regressions-heading" className="section">
        <h2 id="regressions-heading">Regressions</h2>
        <p className="note">
          Statistically significant drops only, by two-proportion z-test. Changes too
          small to distinguish from sampling noise are not listed.
        </p>
        <ChangeList
          changes={regressed}
          emptyMessage={
            baseline === null
              ? 'No earlier run to compare against.'
              : 'No significant regressions against the previous run.'
          }
        />
      </section>

      <section aria-labelledby="improvements-heading" className="section">
        <h2 id="improvements-heading">Improvements</h2>
        <ChangeList
          changes={improved}
          emptyMessage={
            baseline === null
              ? 'No earlier run to compare against.'
              : 'No significant improvements against the previous run.'
          }
        />
      </section>
    </>
  );
}
