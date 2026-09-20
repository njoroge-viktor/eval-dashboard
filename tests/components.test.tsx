import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChangeList } from '@/components/ChangeList';
import { IntervalBar } from '@/components/IntervalBar';
import { Leaderboard } from '@/components/Leaderboard';
import { StatCard } from '@/components/StatCard';
import type { Standing } from '@/lib/analysis';
import type { Change } from '@/lib/types';

const standing = (over: Partial<Standing> = {}): Standing => ({
  model: 'gpt-4o',
  passed: 700,
  total: 1000,
  passRate: 0.7,
  interval: { point: 0.7, lower: 0.67, upper: 0.73 },
  meanAgreement: 0.82,
  winRate: 0.61,
  ...over,
});

const change = (over: Partial<Change> = {}): Change => ({
  model: 'gpt-4o',
  criterion: 'security',
  baselineRate: 0.776,
  candidateRate: 0.66,
  delta: -0.116,
  direction: 'regressed',
  z: -4.21,
  pValue: 0.000025,
  significant: true,
  ...over,
});

describe('StatCard', () => {
  it('renders its label and value', () => {
    render(<StatCard label="Pass rate" value="86.4%" hint="5,000 items" />);

    expect(screen.getByText('Pass rate')).toBeInTheDocument();
    expect(screen.getByText('86.4%')).toBeInTheDocument();
    expect(screen.getByText('5,000 items')).toBeInTheDocument();
  });

  it('omits the hint when none is given', () => {
    const { container } = render(<StatCard label="Models" value="3" />);
    expect(container.querySelector('.card-hint')).toBeNull();
  });

  it('exposes tone for styling', () => {
    const { container } = render(<StatCard label="Regressions" value="2" tone="bad" />);
    expect(container.querySelector('[data-tone="bad"]')).toBeInTheDocument();
  });
});

describe('IntervalBar', () => {
  it('describes the interval to screen readers', () => {
    render(
      <IntervalBar interval={{ point: 0.7, lower: 0.67, upper: 0.73 }} label="gpt-4o" />,
    );

    // The visual bar is meaningless without this; the numbers must be readable.
    const bar = screen.getByRole('img');
    expect(bar).toHaveAccessibleName(
      'gpt-4o: 70.0%, 95% confidence interval 67.0% to 73.0%',
    );
  });

  it('shows the point estimate as text', () => {
    render(
      <IntervalBar interval={{ point: 0.865, lower: 0.84, upper: 0.89 }} label="m" />,
    );
    expect(screen.getByText('86.5%')).toBeInTheDocument();
  });
});

describe('Leaderboard', () => {
  it('ranks rows in the order given', () => {
    render(
      <Leaderboard
        standings={[
          standing({ model: 'claude-3-5-sonnet' }),
          standing({ model: 'gpt-4o' }),
          standing({ model: 'llama-3-70b' }),
        ]}
      />,
    );

    const rows = screen.getAllByRole('row').slice(1); // drop the header row
    expect(within(rows[0] as HTMLElement).getByText('claude-3-5-sonnet')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText('llama-3-70b')).toBeInTheDocument();
  });

  it('numbers each rank', () => {
    render(<Leaderboard standings={[standing({ model: 'a' }), standing({ model: 'b' })]} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders an em dash for missing agreement and win rate', () => {
    render(
      <Leaderboard standings={[standing({ meanAgreement: null, winRate: null })]} />,
    );
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('explains an empty run instead of rendering a bare table', () => {
    render(<Leaderboard standings={[]} />);
    expect(screen.getByText('No models were scored in this run.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('gives the table an accessible caption', () => {
    render(<Leaderboard standings={[standing()]} />);
    expect(
      screen.getByRole('table', {
        name: /ranked by pass rate, with 95% confidence intervals/i,
      }),
    ).toBeInTheDocument();
  });
});

describe('ChangeList', () => {
  it('renders the delta and both rates', () => {
    render(<ChangeList changes={[change()]} emptyMessage="none" />);

    expect(screen.getByText('-11.6 pp')).toBeInTheDocument();
    expect(screen.getByText(/77\.6% → 66\.0%/)).toBeInTheDocument();
  });

  it('shows the test statistic so a reader can judge the claim', () => {
    render(<ChangeList changes={[change()]} emptyMessage="none" />);
    expect(screen.getByText(/z = -4\.21/)).toBeInTheDocument();
  });

  it('abbreviates very small p-values', () => {
    render(<ChangeList changes={[change({ pValue: 0.0000001 })]} emptyMessage="none" />);
    expect(screen.getByText(/p < 0\.001/)).toBeInTheDocument();
  });

  it('prints an exact p-value when it is not tiny', () => {
    render(<ChangeList changes={[change({ pValue: 0.032 })]} emptyMessage="none" />);
    expect(screen.getByText(/p = 0\.032/)).toBeInTheDocument();
  });

  it('marks direction for styling', () => {
    const { container } = render(
      <ChangeList
        changes={[change(), change({ criterion: 'clarity', direction: 'improved', delta: 0.05 })]}
        emptyMessage="none"
      />,
    );

    expect(container.querySelector('[data-direction="regressed"]')).toBeInTheDocument();
    expect(container.querySelector('[data-direction="improved"]')).toBeInTheDocument();
  });

  it('shows the supplied message when there is nothing to report', () => {
    render(<ChangeList changes={[]} emptyMessage="No significant regressions." />);
    expect(screen.getByText('No significant regressions.')).toBeInTheDocument();
  });
});
