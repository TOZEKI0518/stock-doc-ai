/** Builds a research prompt from already displayed ETF card values. No network or score changes. */
export function buildEtfAnalysisPrompt(input: {
  name: string;
  symbol: string;
  referencePrice: number;
  recommendedUnits: number;
  recommendedAmount: number;
  updatedAt: string | null;
  marketSession: string;
}): string {
  const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;
  const hasUnits = Number.isFinite(input.recommendedUnits) && input.recommendedUnits > 0;
  const updated = input.updatedAt && !Number.isNaN(new Date(input.updatedAt).getTime())
    ? new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      }).format(new Date(input.updatedAt)) + `（${input.marketSession}）`
    : "未取得（更新日時を確認できません）";
  const unitsText = hasUnits ? `${input.recommendedUnits.toLocaleString("ja-JP")}口` : "推奨口数なし";
  const amountText = hasUnits && Number.isFinite(input.recommendedAmount) && input.recommendedAmount > 0
    ? yen(input.recommendedAmount) : "推奨投資額なし";

  return `${input.name}（${input.symbol}）の購入を検討しています。保有期間は1週間前後です。StockDoc AIの表示価格（参考単価）は1口${yen(input.referencePrice)}、推奨口数は${unitsText}、推奨投資額は${amountText}です。アプリの最終更新は${updated}です。\n\n最新の市場価格とデータの時点を確認し、アプリ表示価格との差があれば明示してください。選挙・政策・紛争などの地政学イベントのうち、このETFに影響する材料を確認し、予想や一般論と実際の市場・株価反応を分けて整理してください。今後1週間の重要イベントと発表日時、想定される影響も確認してください。\n\n以上を踏まえ、1週間前後の保有を前提に「購入を検討」「条件待ち」「見送り」のいずれかを選び、根拠、主なリスク、判断が変わる具体的な価格・イベント・市場条件を示してください。最新情報を確認できない場合は、その旨を明記し、推測で補わないでください。`;
}
