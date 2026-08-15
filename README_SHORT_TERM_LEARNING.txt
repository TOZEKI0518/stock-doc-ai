StockDoc AI Pro - Short-Term Learning v1

既存の中期Score / 短期Score計算式は変更しません。
既存の etf_snapshots に保存済みの short_term_* カラムを読み取り、短期Learningを追加します。
追加SQLはありません（supabase/etf_short_term_v1.sql を実行済みであることが前提）。

追加:
- /etf-short-learning
- /api/etf-short-learning-summary
- 7営業日以内に終値で+2%へ到達した割合
- MFE（7営業日中の最大終値リターン）
- MAE（7営業日中の最小終値リターン）
- +2%到達までの平均営業日数
- 短期Score帯 / Signal / Category / Market Regime / ETF別
- 過熱判定の事後検証

重要:
日次Snapshotには日中高値・安値がないため、+2%到達/MFE/MAEは終値ベースです。
基準日の翌Snapshotから7件を「7営業日」として扱い、7件すべて揃ったケースだけ検証します。

コピー先:
lib/etfShortTermLearning.ts
app/api/etf-short-learning-summary/route.ts
app/etf-short-learning/page.tsx
app/etf/page.tsx
app/etf-learning/page.tsx

コピー後:
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev

確認:
http://localhost:3000/etf-short-learning

注意:
短期Scoreを保存し始めてから7営業日が経過するまでは「検証可能 0件」が正常です。
