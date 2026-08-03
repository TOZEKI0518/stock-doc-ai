# ETF Engine Phase 1

- 日本株ETFマスター24本（初期有効20本）
- ETF専用価格取得・テクニカル指標
- ETF Score / Exit Score / Signal
- Market Regime連携
- `/etf` ランキング画面
- `/api/etf-ranking`
- `/api/etf-daily-snapshot`
- `etf_snapshots` Supabase SQL

既存の個別株分析・既存Daily Snapshotには変更なし。ETF Snapshotは独立APIで保存する。
