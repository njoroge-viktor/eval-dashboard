import Link from 'next/link';

import { listRuns } from '@/lib/data';
import { summarize } from '@/lib/analysis';
import { formatPercent } from '@/lib/stats';
import { StatCard } from '@/components/StatCard';

export default async function RunsPage() {
  const runs = await listRuns();

  return (
    <>
      <h1>Evaluation runs</h1>
      <p className="lede">
        Every run in the suite, newest first. Open one to see its leaderboard and what
        changed against the previous run.
      </p>

      {runs.length === 0 ? (
        <p className="empty">No runs recorded yet.</p>
      ) : (
        <ul className="run-list">
          {runs.map((run) => {
            const summary = summarize(run);
            return (
              <li key={run.id}>
                <Link href={`/runs/${run.id}`} className="run-card">
                  <div className="run-head">
                    <h2>{run.label}</h2>
                    <time dateTime={run.startedAt}>
                      {new Date(run.startedAt).toISOString().slice(0, 10)}
                    </time>
                  </div>
                  <dl className="run-meta">
                    <div>
                      <dt>Suite</dt>
                      <dd>{run.suite}</dd>
                    </div>
                    <div>
                      <dt>Models</dt>
                      <dd>{summary.models}</dd>
                    </div>
                    <div>
                      <dt>Items</dt>
                      <dd>{summary.items.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Pass rate</dt>
                      <dd>{formatPercent(summary.passRate)}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {runs[0] !== undefined && (
        <section aria-labelledby="latest-heading" className="section">
          <h2 id="latest-heading">Latest run at a glance</h2>
          <div className="cards">
            <StatCard
              label="Run"
              value={runs[0].label}
              hint={`${runs[0].annotators} annotators`}
            />
            <StatCard
              label="Pass rate"
              value={formatPercent(summarize(runs[0]).passRate)}
              hint={`${summarize(runs[0]).items.toLocaleString()} items scored`}
            />
            <StatCard
              label="Mean agreement"
              value={summarize(runs[0]).meanAgreement?.toFixed(2) ?? '—'}
              hint="Across all criteria"
            />
          </div>
        </section>
      )}
    </>
  );
}
