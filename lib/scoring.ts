function normalizePercent(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function clamp(value: number) {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

export function calculateDetailedScore(params: {
  per?: number | null;
  pbr?: number | null;
  dividendYield?: number | null;
  changePercent?: number | null;
  volume?: number | null;

  roe?: number | null;
  profitMargin?: number | null;
  revenueGrowth?: number | null;
  earningsGrowth?: number | null;
  debtToEquity?: number | null;
  freeCashflow?: number | null;
  operatingCashflow?: number | null;

  fiftyTwoWeekHighGap?: number | null;
  ma25Gap?: number | null;
  ma75Gap?: number | null;
  volumeAvg20?: number | null;
  sixMonthReturn?: number | null;
}) {
  const per = params.per ?? 0;
  const pbr = params.pbr ?? 0;
  const dividendYield = normalizePercent(params.dividendYield);
  const changePercent = params.changePercent ?? 0;
  const volume = params.volume ?? 0;

  const roe = normalizePercent(params.roe);
  const profitMargin = normalizePercent(params.profitMargin);
  const revenueGrowth = normalizePercent(params.revenueGrowth);
  const earningsGrowth = normalizePercent(params.earningsGrowth);
  const debtToEquity = params.debtToEquity ?? null;
  const freeCashflow = params.freeCashflow ?? null;
  const operatingCashflow = params.operatingCashflow ?? null;

  const fiftyTwoWeekHighGap = params.fiftyTwoWeekHighGap ?? null;
  const ma25Gap = params.ma25Gap ?? null;
  const ma75Gap = params.ma75Gap ?? null;
  const volumeAvg20 = params.volumeAvg20 ?? null;
  const sixMonthReturn = params.sixMonthReturn ?? null;

  // 1. 割安性：PER/PBR/配当を従来通り活かす
  let valuation = 50;
  if (per > 0 && per < 10) valuation += 25;
  else if (per > 0 && per < 15) valuation += 18;
  else if (per > 0 && per < 25) valuation += 8;
  else if (per >= 40) valuation -= 15;

  if (pbr > 0 && pbr < 1) valuation += 25;
  else if (pbr > 0 && pbr < 2) valuation += 15;
  else if (pbr >= 5) valuation -= 15;

  // 2. 配当：半年売れない前提では重要
  let dividend = 45;
  if (dividendYield >= 5) dividend = 100;
  else if (dividendYield >= 4) dividend = 90;
  else if (dividendYield >= 3) dividend = 80;
  else if (dividendYield >= 2) dividend = 65;
  else if (dividendYield > 0) dividend = 55;

  // 3. 需給：残すが、長期前提なので重みは低め
  let momentum = 50;
  if (changePercent > 5) momentum += 20;
  else if (changePercent > 2) momentum += 12;
  else if (changePercent > 0) momentum += 6;
  else if (changePercent < -5) momentum -= 10;

  if (volumeAvg20 && volume > volumeAvg20 * 2) momentum += 18;
  else if (volumeAvg20 && volume > volumeAvg20 * 1.3) momentum += 10;
  else if (volume > 10000000) momentum += 12;
  else if (volume > 1000000) momentum += 6;

  // 4. 収益性：ROE/利益率。長期判断で重要
  let profitability = 50;
  if (roe >= 20) profitability += 28;
  else if (roe >= 15) profitability += 20;
  else if (roe >= 10) profitability += 12;
  else if (roe > 0 && roe < 5) profitability -= 10;

  if (profitMargin >= 20) profitability += 22;
  else if (profitMargin >= 10) profitability += 14;
  else if (profitMargin >= 5) profitability += 6;
  else if (profitMargin < 0) profitability -= 20;

  // 5. 成長性：半年保有前提で最重要
  let growth = 50;
  if (revenueGrowth >= 20) growth += 20;
  else if (revenueGrowth >= 10) growth += 12;
  else if (revenueGrowth >= 3) growth += 5;
  else if (revenueGrowth < 0) growth -= 12;

  if (earningsGrowth >= 30) growth += 30;
  else if (earningsGrowth >= 15) growth += 20;
  else if (earningsGrowth >= 5) growth += 10;
  else if (earningsGrowth < 0) growth -= 18;

  // 6. 財務健全性：半年売れないなら大切
  let safety = 55;
  if (debtToEquity !== null) {
    if (debtToEquity < 50) safety += 28;
    else if (debtToEquity < 100) safety += 15;
    else if (debtToEquity > 200) safety -= 18;
  }
  if (freeCashflow !== null && freeCashflow > 0) safety += 8;
  if (operatingCashflow !== null && operatingCashflow > 0) safety += 7;

  // 7. 過熱感：高値掴み回避
  let overheat = 70;
  if (fiftyTwoWeekHighGap !== null) {
    // 52週高値にかなり近い場合はやや減点、15%以上下なら押し目候補として加点
    if (fiftyTwoWeekHighGap > -3) overheat -= 20;
    else if (fiftyTwoWeekHighGap < -15) overheat += 10;
  }
  if (ma25Gap !== null) {
    if (ma25Gap > 20) overheat -= 25;
    else if (ma25Gap > 10) overheat -= 12;
    else if (ma25Gap < -10) overheat += 5;
  }
  if (ma75Gap !== null) {
    if (ma75Gap > 30) overheat -= 15;
    else if (ma75Gap > 0) overheat += 5;
  }

  // 8. 半年保有適性：6ヶ月リターンが極端すぎないか
  let sixMonthSuitability = 60;
  if (sixMonthReturn !== null) {
    if (sixMonthReturn > 80) sixMonthSuitability -= 25;
    else if (sixMonthReturn > 40) sixMonthSuitability -= 10;
    else if (sixMonthReturn > 5) sixMonthSuitability += 15;
    else if (sixMonthReturn < -30) sixMonthSuitability -= 15;
  }

  const scores = {
    valuation: clamp(valuation),
    dividend: clamp(dividend),
    momentum: clamp(momentum),
    profitability: clamp(profitability),
    growth: clamp(growth),
    safety: clamp(safety),
    overheat: clamp(overheat),
    sixMonthSuitability: clamp(sixMonthSuitability),
  };

  const total = clamp(
    scores.valuation * 0.15 +
      scores.dividend * 0.10 +
      scores.momentum * 0.08 +
      scores.profitability * 0.18 +
      scores.growth * 0.24 +
      scores.safety * 0.15 +
      scores.overheat * 0.05 +
      scores.sixMonthSuitability * 0.05
  );

  return {
    total,
    ...scores,
  };
}

export function getRating(score: number) {
  if (score >= 90) return "Strong Buy";
  if (score >= 80) return "Buy";
  if (score >= 65) return "Hold";
  if (score >= 50) return "Watch";
  return "Avoid";
}
