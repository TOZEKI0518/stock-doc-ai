import { supabaseAdmin } from "@/lib/supabase";
import { analyzeEtfShortTerm, analyzeEtfShortTermV1 } from "@/lib/etf/etfShortTermScoring";
import { analyzeEtfRebound } from "@/lib/etf/etfRebound";
import type { EtfMasterItem, EtfPriceMetrics } from "@/lib/etf/etfTypes";
import type { MarketRegime } from "@/lib/market";

type ShortBreakdown = {
  momentum7d?: unknown;
  momentum20d?: unknown;
  trend?: unknown;
  acceleration?: unknown;
  risk?: unknown;
  regimeFit?: unknown;
  liquidity?: unknown;
  legacyScore?: unknown;
  legacySignal?: unknown;
};

type Row = {
  snapshot_date: string;
  symbol: string;
  name: string | null;
  category: string | null;
  strategy: string | null;
  price: number | string | null;
  market_regime: string | null;
  etf_score: number | string | null;
  short_term_score: number | string | null;
  short_term_signal: string | null;
  short_term_breakdown: ShortBreakdown | null;
  short_term_overheat_penalty: number | string | null;
  short_term_score_version: string | null;
  return_7d: number | string | null;
  return_20d: number | string | null;
  return_60d: number | string | null;
  return_120d: number | string | null;
  distance_ma20: number | string | null;
  distance_ma50: number | string | null;
  distance_ma200: number | string | null;
  volatility_20d: number | string | null;
  drawdown_from_high: number | string | null;
  average_volume_20d: number | string | null;
};

export type ShortLearningTrade = {
  symbol: string;
  name: string;
  category: string;
  strategy: string;
  baseDate: string;
  endDate: string;
  basePrice: number;
  endPrice: number;
  endReturn: number;
  shortTermScore: number;
  midTermScore: number | null;
  shortTermSignal: string;
  marketRegime: string;
  scoreVersion: string;
  overheatPenalty: number | null;
  targetHit: boolean;
  targetHitDay: number | null;
  targetHitDate: string | null;
  mfe: number;
  mae: number;
  breakdown: Record<string, number | null>;
  reboundStatus: string;
  reboundScore: number;
};

export type FactorComparison = {
  factor: string;
  successAverage: number;
  failureAverage: number;
  difference: number;
};

export type HighScoreDiagnostic = {
  count: number;
  targetHitRate: number;
  averageEndReturn: number;
  averageMfe: number;
  averageMae: number;
  factors: FactorComparison[];
};

export type ShortLearningBucket = {
  label: string;
  count: number;
  targetHits: number;
  targetHitRate: number;
  averageMfe: number;
  averageMae: number;
  averageEndReturn: number;
  averageHitDay: number | null;
};

const TARGET_RETURN = 2;
const HORIZON = 7;

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function round(value: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
function avg(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}
function ret(base: number, price: number) {
  return base > 0 ? ((price - base) / base) * 100 : 0;
}
function labelSignal(signal: string) {
  return signal === "SHORT_BUY" ? "短期BUY" : signal === "READY" ? "準備" : signal === "WAIT" ? "待機" : signal === "OVERHEATED" ? "過熱" : signal === "AVOID" ? "回避" : signal;
}
function summarize(label: string, trades: ShortLearningTrade[]): ShortLearningBucket {
  const hitDays = trades.flatMap((t) => (t.targetHitDay === null ? [] : [t.targetHitDay]));
  const hits = trades.filter((t) => t.targetHit).length;

  return {
    label,
    count: trades.length,
    targetHits: hits,
    targetHitRate: trades.length ? round((hits / trades.length) * 100, 1) : 0,
    averageMfe: round(avg(trades.map((t) => t.mfe))),
    averageMae: round(avg(trades.map((t) => t.mae))),
    averageEndReturn: round(avg(trades.map((t) => t.endReturn))),
    averageHitDay: hitDays.length ? round(avg(hitDays), 1) : null,
  };
}

async function fetchRows(): Promise<Row[]> {
  const pageSize = 1000;
  const rows: Row[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("etf_snapshots")
      .select("snapshot_date,symbol,name,category,strategy,price,market_regime,etf_score,short_term_score,short_term_signal,short_term_breakdown,short_term_overheat_penalty,short_term_score_version,return_7d,return_20d,return_60d,return_120d,distance_ma20,distance_ma50,distance_ma200,volatility_20d,drawdown_from_high,average_volume_20d")
      .order("snapshot_date", { ascending: true })
      .order("symbol", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Row[];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function metricsFromRow(base: Row, previousPrice: number | null = null): EtfPriceMetrics {
  const price = num(base.price) ?? 0;
  const changePercent1d = previousPrice !== null && previousPrice > 0 ? ret(previousPrice, price) : null;
  return {
    asOf: base.snapshot_date, price, previousClose: previousPrice, changePercent1d,
    return7d: num(base.return_7d), return20d: num(base.return_20d), return60d: num(base.return_60d), return120d: num(base.return_120d),
    movingAverage20: null, movingAverage50: null, movingAverage200: null,
    distanceFromMa20: num(base.distance_ma20), distanceFromMa50: num(base.distance_ma50), distanceFromMa200: num(base.distance_ma200),
    volatility20d: num(base.volatility_20d), drawdownFromHigh: num(base.drawdown_from_high), averageVolume20d: num(base.average_volume_20d), sampleSize: 0,
  };
}
function itemFromRow(base: Row) { return { category: (base.category ?? "CORE") } as EtfMasterItem; }
function deriveV1(base: Row, previousPrice: number | null = null) { return analyzeEtfShortTermV1(itemFromRow(base), metricsFromRow(base, previousPrice), (base.market_regime ?? "NEUTRAL") as MarketRegime); }
function deriveV2(base: Row, previousPrice: number | null = null) { return analyzeEtfShortTerm(itemFromRow(base), metricsFromRow(base, previousPrice), (base.market_regime ?? "NEUTRAL") as MarketRegime); }
function deriveRebound(base: Row, previousPrice: number | null = null) { return analyzeEtfRebound(metricsFromRow(base, previousPrice), (base.market_regime ?? "NEUTRAL") as MarketRegime); }

function compareFactors(trades: ShortLearningTrade[]): FactorComparison[] {
  const success = trades.filter((t) => t.targetHit);
  const failure = trades.filter((t) => !t.targetHit);
  const labels: Record<string,string> = { momentum7d:"Pullback (7日)", momentum20d:"Mean Reversion (MA20)", acceleration:"Stabilization", trend:"Context", risk:"Risk", regimeFit:"Regime", liquidity:"Liquidity" };
  return Object.entries(labels).map(([key, factor]) => {
    const a = success.map(t=>t.breakdown[key]).filter((v): v is number => v !== null && v !== undefined);
    const b = failure.map(t=>t.breakdown[key]).filter((v): v is number => v !== null && v !== undefined);
    const sa=round(avg(a)), fa=round(avg(b));
    return { factor, successAverage:sa, failureAverage:fa, difference:round(sa-fa) };
  }).sort((a,b)=>Math.abs(b.difference)-Math.abs(a.difference));
}

export async function getEtfShortTermLearningSummary() {
  const rows = await fetchRows();
  const valid = rows.filter((r) => r.snapshot_date && r.symbol && num(r.price) !== null);
  const scored = valid.filter((r) => num(r.short_term_score) !== null && r.short_term_signal);
  const latestSnapshotDate = valid.length ? valid[valid.length - 1].snapshot_date : null;
  const latestScoredDate = scored.length ? scored[scored.length - 1].snapshot_date : null;
  const latestScoredCount = latestScoredDate ? scored.filter((r) => r.snapshot_date === latestScoredDate).length : 0;

  const bySymbol = new Map<string, Row[]>();
  for (const row of valid) {
    const list = bySymbol.get(row.symbol) ?? [];
    list.push(row);
    bySymbol.set(row.symbol, list);
  }
  for (const list of bySymbol.values()) list.sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

  const trades: ShortLearningTrade[] = [];
  const v2Trades: ShortLearningTrade[] = [];
  for (const base of scored) {
    const basePrice = num(base.price);
    const score = num(base.short_term_score);
    if (basePrice === null || score === null) continue;
    const list = bySymbol.get(base.symbol) ?? [];
    const idx = list.findIndex((r) => r.snapshot_date === base.snapshot_date);
    if (idx < 0) continue;
    const previousPrice = idx > 0 ? num(list[idx - 1].price) : null;
    const future = list.slice(idx + 1, idx + 1 + HORIZON);
    // Exactly 7 later snapshot observations are required. This avoids mixing incomplete windows into the result.
    if (future.length < HORIZON) continue;
    const path = future.map((r) => ({ row: r, price: num(r.price) })).filter((x): x is { row: Row; price: number } => x.price !== null);
    if (path.length < HORIZON) continue;
    const pathReturns = path.map((x) => ret(basePrice, x.price));
    const hitIndex = pathReturns.findIndex((r) => r >= TARGET_RETURN);
    const b = base.short_term_breakdown ?? {};
    const trade: ShortLearningTrade = {
      symbol: base.symbol,
      name: base.name ?? base.symbol,
      category: base.category ?? "UNKNOWN",
      strategy: base.strategy ?? "UNKNOWN",
      baseDate: base.snapshot_date,
      endDate: path[HORIZON - 1].row.snapshot_date,
      basePrice,
      endPrice: path[HORIZON - 1].price,
      endReturn: round(pathReturns[HORIZON - 1]),
      shortTermScore: score,
      midTermScore: num(base.etf_score),
      shortTermSignal: base.short_term_signal ?? "UNKNOWN",
      marketRegime: base.market_regime ?? "UNKNOWN",
      scoreVersion: base.short_term_score_version ?? "unknown",
      overheatPenalty: num(base.short_term_overheat_penalty),
      targetHit: hitIndex >= 0,
      targetHitDay: hitIndex >= 0 ? hitIndex + 1 : null,
      targetHitDate: hitIndex >= 0 ? path[hitIndex].row.snapshot_date : null,
      mfe: round(Math.max(...pathReturns)),
      mae: round(Math.min(...pathReturns)),
      breakdown: {
        momentum7d: num(b.momentum7d), momentum20d: num(b.momentum20d), trend: num(b.trend), acceleration: num(b.acceleration),
        risk: num(b.risk), regimeFit: num(b.regimeFit), liquidity: num(b.liquidity),
      },
      reboundStatus: "UNKNOWN", reboundScore: 0,
    };
    const rebound = deriveRebound(base, previousPrice);
    const v1 = deriveV1(base, previousPrice);
    trades.push({ ...trade, shortTermScore: v1.score, shortTermSignal: v1.signal, scoreVersion: v1.scoreVersion, overheatPenalty: v1.overheatPenalty, breakdown: { ...v1.breakdown } });
    const v2 = deriveV2(base, previousPrice);
    v2Trades.push({ ...trade, shortTermScore: v2.score, shortTermSignal: v2.signal, scoreVersion: v2.scoreVersion, overheatPenalty: v2.overheatPenalty, breakdown: { ...v2.breakdown }, reboundStatus: rebound.status, reboundScore: rebound.score });
  }

  const scoreBuckets = [
    summarize("80点以上", trades.filter((t) => t.shortTermScore >= 80)),
    summarize("70〜79点", trades.filter((t) => t.shortTermScore >= 70 && t.shortTermScore < 80)),
    summarize("60〜69点", trades.filter((t) => t.shortTermScore >= 60 && t.shortTermScore < 70)),
    summarize("60点未満", trades.filter((t) => t.shortTermScore < 60)),
  ];
  const signals = ["SHORT_BUY", "READY", "WAIT", "OVERHEATED", "AVOID"];
  const signalBuckets = signals.map((s) => summarize(labelSignal(s), trades.filter((t) => t.shortTermSignal === s)));
  const categories = [...new Set(scored.map((r) => r.category ?? "UNKNOWN"))].sort();
  const categoryBuckets = categories.map((c) => summarize(c, trades.filter((t) => t.category === c)));
  const regimes = [...new Set(scored.map((r) => r.market_regime ?? "UNKNOWN"))].sort();
  const regimeBuckets = regimes.map((r) => summarize(r.replaceAll("_", " "), trades.filter((t) => t.marketRegime === r)));
  const symbols = [...new Set(scored.map((r) => r.symbol))].sort();
  const etfBuckets = symbols.map((s) => {
    const sample = trades.find((t) => t.symbol === s);
    return summarize(sample ? `${s} ${sample.name}` : s, trades.filter((t) => t.symbol === s));
  }).filter((b) => b.count > 0).sort((a, b) => b.targetHitRate - a.targetHitRate || b.averageMfe - a.averageMfe);

  const shortBuy = summarize("短期BUY", trades.filter((t) => t.shortTermSignal === "SHORT_BUY"));
  const overheated = summarize("過熱", trades.filter((t) => t.shortTermSignal === "OVERHEATED"));
  const insights: string[] = [];
  if (shortBuy.count >= 5) insights.push(`短期BUYは${shortBuy.count}件中${shortBuy.targetHits}件が7営業日以内の終値で+2%に到達（${shortBuy.targetHitRate.toFixed(1)}%）しました。`);
  if (overheated.count >= 5) insights.push(`過熱判定は${overheated.count}件。7営業日の平均MFE ${overheated.averageMfe >= 0 ? "+" : ""}${overheated.averageMfe.toFixed(2)}%、平均MAE ${overheated.averageMae.toFixed(2)}%です。`);
  const eligible = scoreBuckets.filter((b) => b.count >= 5).sort((a, b) => b.targetHitRate - a.targetHitRate);
  if (eligible[0]) insights.push(`${eligible[0].label}が件数5件以上のScore帯で+2%到達率最大（${eligible[0].targetHitRate.toFixed(1)}%）です。`);
  if (!insights.length) insights.push("短期Score保存開始後、7営業日分の将来Snapshotがそろうと検証結果が表示されます。");

  const v2ScoreBuckets = [
    summarize("80点以上", v2Trades.filter((t) => t.shortTermScore >= 80)),
    summarize("70〜79点", v2Trades.filter((t) => t.shortTermScore >= 70 && t.shortTermScore < 80)),
    summarize("60〜69点", v2Trades.filter((t) => t.shortTermScore >= 60 && t.shortTermScore < 70)),
    summarize("60点未満", v2Trades.filter((t) => t.shortTermScore < 60)),
  ];
  const v2SignalBuckets = signals.map((sig) => summarize(labelSignal(sig), v2Trades.filter((t) => t.shortTermSignal === sig)));
  const v2Overall = summarize("全短期Score v2", v2Trades);
  const v2ShortBuy = summarize("短期BUY v2", v2Trades.filter((t) => t.shortTermSignal === "SHORT_BUY"));

  const reboundStatuses = ["CONFIRMED", "PREPARING", "OVERSOLD", "FALLING", "EXTENDED"];
  const reboundLabels: Record<string,string> = { CONFIRMED:"反発確認", PREPARING:"反発準備", OVERSOLD:"売られ過ぎ", FALLING:"下落継続", EXTENDED:"上昇過熱" };
  const scoreReboundBuckets = [
    ...reboundStatuses.map(status => summarize(`70点以上 × ${reboundLabels[status]}`, v2Trades.filter(t => t.shortTermScore >= 70 && t.reboundStatus === status))),
    summarize("60〜69点 × 反発確認", v2Trades.filter(t => t.shortTermScore >= 60 && t.shortTermScore < 70 && t.reboundStatus === "CONFIRMED")),
    summarize("60点未満 × 反発確認", v2Trades.filter(t => t.shortTermScore < 60 && t.reboundStatus === "CONFIRMED")),
  ].filter(b => b.count > 0);

  // Diagnostic only: split the strongest observed rebound setup by Stabilization
  // (v2 breakdown.acceleration). This does not change Short Score v2 itself.
  const oversold70Trades = v2Trades.filter(t => t.shortTermScore >= 70 && t.reboundStatus === "OVERSOLD");
  const stabilizationValue = (t: ShortLearningTrade) => t.breakdown.acceleration;
  const oversoldStabilizationBuckets = [
    summarize("Stabilization 60以上", oversold70Trades.filter(t => (stabilizationValue(t) ?? -Infinity) >= 60)),
    summarize("Stabilization 50〜59", oversold70Trades.filter(t => { const v=stabilizationValue(t); return v !== null && v !== undefined && v >= 50 && v < 60; })),
    summarize("Stabilization 40〜49", oversold70Trades.filter(t => { const v=stabilizationValue(t); return v !== null && v !== undefined && v >= 40 && v < 50; })),
    summarize("Stabilization 40未満", oversold70Trades.filter(t => { const v=stabilizationValue(t); return v !== null && v !== undefined && v < 40; })),
  ];
  const oversold70Overall = summarize("70点以上 × 売られ過ぎ 全体", oversold70Trades);

  // Diagnostic only: test whether the medium-term score adds useful information
  // for a ~1-week holding horizon. Mid score is NOT used to alter v2 or OVERSOLD.
  const midBuckets = (sample: ShortLearningTrade[]) => [
    summarize("Mid 70以上", sample.filter(t => t.midTermScore !== null && t.midTermScore >= 70)),
    summarize("Mid 60〜69", sample.filter(t => t.midTermScore !== null && t.midTermScore >= 60 && t.midTermScore < 70)),
    summarize("Mid 50〜59", sample.filter(t => t.midTermScore !== null && t.midTermScore >= 50 && t.midTermScore < 60)),
    summarize("Mid 50未満", sample.filter(t => t.midTermScore !== null && t.midTermScore < 50)),
  ];
  const shortBuyMidBuckets = midBuckets(v2Trades.filter(t => t.shortTermSignal === "SHORT_BUY"));
  const reboundEntryMidBuckets = midBuckets(oversold70Trades);

  const buyTrades = v2Trades.filter(t => t.shortTermSignal === "SHORT_BUY");
  const buyFactorComparison = compareFactors(buyTrades);
  const highScoreTrades = v2Trades.filter(t => t.shortTermScore >= 80);
  const highScoreSummary = summarize("80点以上", highScoreTrades);
  const highScoreDiagnostic: HighScoreDiagnostic = {
    count: highScoreSummary.count, targetHitRate: highScoreSummary.targetHitRate,
    averageEndReturn: highScoreSummary.averageEndReturn, averageMfe: highScoreSummary.averageMfe, averageMae: highScoreSummary.averageMae,
    factors: compareFactors(highScoreTrades),
  };

  return {
    horizonTradingDays: HORIZON,
    targetReturn: TARGET_RETURN,
    snapshotCount: valid.length,
    scoredSnapshotCount: scored.length,
    tradeCount: trades.length,
    latestSnapshotDate,
    latestScoredDate,
    latestScoredCount,
    overall: summarize("全短期Score", trades),
    v2Overall, v2ShortBuy, v2ScoreBuckets, v2SignalBuckets,
    scoreReboundBuckets, oversold70Overall, oversoldStabilizationBuckets, shortBuyMidBuckets, reboundEntryMidBuckets, buyFactorComparison, highScoreDiagnostic,
    shortBuy,
    overheated,
    scoreBuckets,
    signalBuckets,
    categoryBuckets,
    regimeBuckets,
    etfBuckets,
    insights: insights.slice(0, 4),
    topMfe: [...trades].sort((a, b) => b.mfe - a.mfe).slice(0, 10),
    worstMae: [...trades].sort((a, b) => a.mae - b.mae).slice(0, 10),
    methodology: "基準日の翌Snapshotから7件を7営業日相当として使用。+2%到達・MFE・MAEはいずれも日次終値ベース。高値/安値のIntraday到達は判定しません。",
  };
}
