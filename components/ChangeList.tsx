import type { Change } from '@/lib/types';
import { formatDelta, formatPercent } from '@/lib/stats';

interface ChangeListProps {
  readonly changes: readonly Change[];
  readonly emptyMessage: string;
}

export function ChangeList({ changes, emptyMessage }: ChangeListProps) {
  if (changes.length === 0) {
    return <p className="empty">{emptyMessage}</p>;
  }

  return (
    <ul className="changes">
      {changes.map((change) => (
        <li key={`${change.model}-${change.criterion}`} data-direction={change.direction}>
          <div className="change-head">
            <span className="change-model">{change.model}</span>
            <span className="change-criterion">{change.criterion}</span>
            <span className="change-delta">{formatDelta(change.delta)}</span>
          </div>
          <p className="change-detail">
            {formatPercent(change.baselineRate)} → {formatPercent(change.candidateRate)}
            <span className="change-stat">
              {' '}
              (z = {change.z.toFixed(2)}, p{' '}
              {change.pValue < 0.001 ? '< 0.001' : `= ${change.pValue.toFixed(3)}`})
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}
