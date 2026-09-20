import { IntervalBar } from './IntervalBar';
import type { Standing } from '@/lib/analysis';
import { formatPercent } from '@/lib/stats';

interface LeaderboardProps {
  readonly standings: readonly Standing[];
}

export function Leaderboard({ standings }: LeaderboardProps) {
  if (standings.length === 0) {
    return <p className="empty">No models were scored in this run.</p>;
  }

  return (
    <table className="table">
      <caption className="visually-hidden">
        Models ranked by pass rate, with 95% confidence intervals
      </caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Model</th>
          <th scope="col">Pass rate (95% CI)</th>
          <th scope="col" className="numeric">Items</th>
          <th scope="col" className="numeric">Agreement</th>
          <th scope="col" className="numeric">Win rate</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((standing, index) => (
          <tr key={standing.model}>
            <td className="rank">{index + 1}</td>
            <th scope="row" className="model">{standing.model}</th>
            <td className="interval-cell">
              <IntervalBar interval={standing.interval} label={standing.model} />
            </td>
            <td className="numeric">{standing.total.toLocaleString()}</td>
            <td className="numeric">
              {standing.meanAgreement === null
                ? '—'
                : standing.meanAgreement.toFixed(2)}
            </td>
            <td className="numeric">
              {standing.winRate === null ? '—' : formatPercent(standing.winRate, 0)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
