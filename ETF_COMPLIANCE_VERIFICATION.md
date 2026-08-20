# ETF Compliance Verification

社内ルール判定は安全側です。

- 21銘柄未満: PRE_APPROVAL_REQUIRED
- 最大1銘柄 25%以上: PRE_APPROVAL_REQUIRED
- デリバティブを主な投資対象とするETF: NOT_ELIGIBLE
- 全項目確認済みで該当なし: ELIGIBLE
- 未確認項目あり: UNKNOWN

## 公式資料で確認済み（Phase 2）
2854, 315A, 2644, 235A, 2847, 2646, 2641, 234A

注意: 「先物を補助的に利用する現物株ETF」と「デリバティブを主な投資対象とするETF」は区別しています。
