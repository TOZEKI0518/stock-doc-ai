# ETF Rebound Detector v1

目的: 底値そのものを当てるのではなく、「売られ過ぎ → 反発準備 → 反発確認」をETFごとに判定する。

## Score
- Oversold 25%
- Reversal 30%
- Trend Repair 30%
- Market Regime 15%

## Status
- FALLING
- OVERSOLD
- PREPARING
- CONFIRMED
- EXTENDED

RSIやmarket breadthは現在のETF price metricsにまだ無いため、v1では既存データだけで実装。
次段階で RSI / breadth / rates / FX を追加する。
