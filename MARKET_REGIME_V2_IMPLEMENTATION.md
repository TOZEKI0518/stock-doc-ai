# Market Regime V2

## Added

- Home dashboard card (`components/MarketRegimeCard.tsx`)
- Full detail page (`/market`)
- Supabase persistence (`market_snapshots`)
- Manual protected save endpoint (`/api/market-snapshot`)
- Automatic market snapshot save at the end of `/api/daily-snapshot`

## Supabase setup

Run `supabase/market_snapshots.sql` in the Supabase SQL Editor before testing persistence.

## Test

1. `npm run build`
2. `npm run dev`
3. Open `/` and `/market`
4. Open `/api/market-snapshot` to save once manually
5. Verify a row exists in `market_snapshots`

When `SNAPSHOT_SECRET` is configured, call the save endpoint with:

`Authorization: Bearer <SNAPSHOT_SECRET>`
