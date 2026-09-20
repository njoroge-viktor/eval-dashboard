import { formatPercent } from '@/lib/stats';
import type { Interval } from '@/lib/stats';

interface IntervalBarProps {
  readonly interval: Interval;
  readonly label: string;
}

/**
 * A pass rate drawn with its confidence interval.
 *
 * Showing the interval rather than the bare number is the whole point: two
 * models at 86% are not comparable if one was measured on 50 items and the
 * other on 5,000, and a plain bar chart hides that completely.
 */
export function IntervalBar({ interval, label }: IntervalBarProps) {
  const point = interval.point * 100;
  const lower = interval.lower * 100;
  const width = Math.max((interval.upper - interval.lower) * 100, 0.5);

  return (
    <div
      className="interval"
      role="img"
      aria-label={`${label}: ${formatPercent(interval.point)}, 95% confidence interval ${formatPercent(interval.lower)} to ${formatPercent(interval.upper)}`}
    >
      <div className="interval-track">
        <div className="interval-range" style={{ left: `${lower}%`, width: `${width}%` }} />
        <div className="interval-point" style={{ left: `${point}%` }} />
      </div>
      <span className="interval-value">{formatPercent(interval.point)}</span>
    </div>
  );
}
