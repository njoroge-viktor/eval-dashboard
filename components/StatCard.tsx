import type { ReactNode } from 'react';

interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly tone?: 'neutral' | 'good' | 'bad';
  readonly children?: ReactNode;
}

export function StatCard({ label, value, hint, tone = 'neutral', children }: StatCardProps) {
  return (
    <div className="card" data-tone={tone}>
      <p className="card-label">{label}</p>
      <p className="card-value">{value}</p>
      {hint !== undefined && <p className="card-hint">{hint}</p>}
      {children}
    </div>
  );
}
