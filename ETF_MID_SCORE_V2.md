# ETF Mid Score v2

## Goal
v1 tended to reward ETFs after a large rise. v2 keeps medium-term trend quality but reduces the chance of buying at an extended top.

## Changes
- v1 formula preserved as `legacyScore` / version `1.0.0`
- v2 version `2.0.0`
- trend and momentum rewards are capped beyond healthy ranges
- `overextensionPenalty` (0-25) is subtracted for:
  - >5% above MA20
  - >10% above MA50
  - >6% 7-day return
  - >12% 20-day return
- Rebound Score remains separate. It is not mixed into Mid Score v2.

## Validation principle
Do not delete v1 history. Compare v1 and v2 by 7/30/90-day forward returns as data accumulates.
