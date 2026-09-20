# eval-dashboard

[![CI](https://github.com/njoroge-viktor/eval-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/njoroge-viktor/eval-dashboard/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A dashboard for LLM evaluation runs. Model leaderboards with confidence
intervals, inter-annotator agreement warnings, and **regression detection that
distinguishes a real drop from sampling noise**.

Next.js 14 App Router, React Server Components, zero client-side JavaScript for
the data views.

```bash
npm install && npm run dev
```

## The question it answers

A dashboard exists to answer "did anything get worse, and am I sure?" — not
"what is the score". Three design decisions follow from that.

### 1. A pass rate without an interval is not a measurement

Two models at 86% are not comparable if one was scored on 50 items and the
other on 5,000. Every rate is drawn with its **Wilson score interval**:

```
claude-3-5-sonnet   ├────■────┤   89.2%
gpt-4o              ├──────■──────┤   86.6%
```

Wilson rather than the textbook normal approximation, because the normal
interval misbehaves exactly where eval data lives — near 0%, near 100%, and at
small n. The normal interval around 20/20 is `[1, 1]`, claiming certainty from
twenty samples. Wilson reports a lower bound of 0.839.

Leaderboard ties break on the **lower** bound, preferring the model with more
evidence behind the same headline number.

### 2. A change is not a regression until it survives a significance test

Every criterion is compared against the previous run with a **two-proportion
z-test**. Only significant drops are listed as regressions:

```
gpt-4o   security   -11.6 pp
77.6% → 66.0%  (z = -4.21, p < 0.001)
```

Significance additionally requires at least five expected successes and five
expected failures in each group — the standard adequacy check for the normal
approximation. Without it, a 1-of-2 to 0-of-2 result would be reported as a
50-point regression with a straight face.

The line matters in both directions. 54% → 60% on n=500 gives p = 0.055 and is
**not** reported; a dashboard that flagged it would cost an engineer a day
chasing noise.

### 3. Low agreement invalidates the numbers above it

A pass rate computed from labels the annotators cannot agree on is not a
measurement. Criteria below α = 0.67 — the conventional "tentative conclusions
only" line — are surfaced **before** the leaderboard, not buried beneath it.

## Structure

```
app/
  page.tsx                 all runs, newest first
  runs/[runId]/page.tsx    leaderboard, regressions, improvements
lib/
  stats.ts                 Wilson intervals, two-proportion test, normal CDF
  analysis.ts              leaderboards, run comparison, agreement flags
  data.ts                  data access (fixture-backed)
components/                presentational only, no data fetching
data/runs.json             sample runs
```

All data views are **Server Components**, so the statistics run at build time
and ship as HTML. `lib/` is pure and framework-free — it has no React import
and could move to a worker or a CLI unchanged.

Swapping the fixture for a real warehouse means rewriting `lib/data.ts` only.
Its functions are already `async` so that change will not ripple outward.

## Accessibility

Confidence-interval bars are meaningless to a screen reader as pixels, so each
carries the numbers:

```
"gpt-4o: 70.0%, 95% confidence interval 67.0% to 73.0%"
```

Also: a skip link, one `<h1>` per page, table captions, `<th scope>` on every
header, visible focus rings, and `prefers-color-scheme` support. Model names
are row headers rather than cells, so a screen reader announces which model a
value belongs to.

## Testing

```bash
npm test              # 75 tests
npm run test:coverage # 99.7% statements
npm run lint
npm run typecheck     # strict + noUncheckedIndexedAccess
```

The statistics are pinned to values derived in the tests — Wilson's lower bound
for 20/20 must be 0.839, `z = 1.96` must put 97.5% below it — rather than to
whatever the implementation returned first.

Fixture integrity is asserted too: `passed <= total` everywhere, agreement
within `[0, 1]`, unique run ids. Sample data that drifts out of range produces
charts that are wrong rather than tests that fail, so it is checked.

## License

MIT — see [LICENSE](LICENSE).
