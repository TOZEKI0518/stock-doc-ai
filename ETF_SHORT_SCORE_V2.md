# ETF Short Score v2

## Why v2
The first 250 completed 7-trading-day observations showed a strong inversion in v1: >=80 scored materially worse than <60, and SHORT_BUY underperformed WAIT/AVOID. v1 is preserved for comparison.

## v2 concept
v2 stops rewarding raw trend/momentum strength. It looks for a controlled pullback with stabilization and mean-reversion potential.

Weights:
- 7d pullback setup: 25%
- MA20 mean-reversion setup: 20%
- short-vs-20d stabilization: 20%
- medium trend context: 10%
- risk: 10%
- market regime: 10%
- liquidity: 5%

A separate danger penalty suppresses chasing (>5% 7d, >5% above MA20), falling knives, very weak 20d trends, and PANIC.

Signals:
- SHORT_BUY: score >=75 and penalty <15
- READY: score >=62 and penalty <22
- WAIT: otherwise
- OVERHEATED: 7d >10% or >9% above MA20
- AVOID: PANIC, penalty >=35, or score <40

## Learning
The Short-Term Learning page recomputes v2 from historical snapshot metrics and shows v2 score/signal buckets next to the preserved v1 results. This allows an apples-to-apples comparison on the same future 7-day paths.
