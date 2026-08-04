# ETF Learning Engine v1.0

## Design

ETF Learning reads `etf_snapshots` only. It does not modify ETF scoring, stock scoring, Market Regime, existing snapshots, or Cron jobs.

## Added

- `lib/etfLearning.ts`
- `app/api/etf-learning-summary/route.ts`
- `app/etf-learning/page.tsx`
- Link from `/etf` to `/etf-learning`

## Analysis

- 7 / 30 / 90 / 180 calendar-day forward return using the first available snapshot on or after the target date
- Score bands
- Signal groups
- ETF categories
- Market Regime groups
- ETF-level performance
- Factor validation using the existing `breakdown` JSON

## Data safety

- No new Supabase table is required
- `etf_snapshots` is read only
- ETF score weights and signal thresholds are unchanged
- Existing stock and market files are unchanged, except for the navigation link in `app/etf/page.tsx`
