# Market Regime v1.2.1 Release Addendum

## Added

- Home dashboard Market Regime card (already included in v2)
- `GET /api/market-history`

## Market History API

Default:

```text
/api/market-history
```

Optional parameters:

```text
/api/market-history?limit=30&order=asc
```

- `limit`: 1-1000, default 365
- `order`: `asc` or `desc`, default `desc`

The API returns daily market score, confidence, regime, label and score version from `market_snapshots`.
