# Market Regime Engine v1.0.0

Implemented:

- `lib/market/marketTypes.ts`
- `lib/market/constants.ts`
- `lib/market/indicators.ts`
- `lib/market/marketEngine.ts`
- `lib/market/marketScore.ts`
- `lib/market/index.ts`
- `app/api/market-regime/route.ts`

API endpoint:

- `GET /api/market-regime`

Initial indicators:

- S&P 500 (`^GSPC`)
- NASDAQ Composite (`^IXIC`)
- VIX (`^VIX`)
- USD/JPY (`JPY=X`)
- US 10Y Yield (`^TNX`)
- Nikkei 225 (`^N225`)
- TOPIX (`^TOPX`)

The endpoint returns a 0-100 Market Score, regime, confidence, indicator details,
weighted scores, major drivers, and data warnings.

Validation:

- `npx tsc --noEmit`: passed
- `npm run build`: not completed in the container because the included
  `node_modules/.bin/next` executable did not have execution permission.
  Run `npm install` and `npm run build` on Windows after replacing the files.

No Supabase schema or existing Stock Snapshot logic was changed.
