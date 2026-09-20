import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Eval Dashboard',
  description:
    'Model leaderboards, inter-annotator agreement and regression detection for LLM evaluation runs.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <div className="shell">
            <span className="brand">Eval Dashboard</span>
            <nav aria-label="Primary">
              <a href="/">Runs</a>
            </nav>
          </div>
        </header>
        <main id="main" className="shell">
          {children}
        </main>
      </body>
    </html>
  );
}
