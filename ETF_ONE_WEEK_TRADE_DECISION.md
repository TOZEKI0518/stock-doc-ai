# ETF 1-week Trade Decision

- Trade horizon: about 1 week.
- Mid Score is background information only; it is no longer a mandatory BUY filter or part of BUY confidence.
- Normal BUY: Short signal SHORT_BUY, Short Score >= 75, Exit < 55, Danger/overheat penalty < 15.
- Rebound Entry: Short Score >= 70 and Rebound status OVERSOLD, with Exit < 55 and Danger/overheat penalty < 22.
- PANIC, OVERHEATED, AVOID and Compliance gates continue to take priority.
- Held positions continue to use Exit Score for HOLD/REDUCE/SELL.
- Stabilization remains diagnostic only and is not a filter yet.
- Learning UI continues to track Rebound Entry separately.
