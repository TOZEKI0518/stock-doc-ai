import { supabaseAdmin } from "@/lib/supabase";

type ShortBreakdown = {
  momentum7d?: unknown;
  momentum20d?: unknown;
  trend?: unknown;
  acceleration?: unknown;
  risk?: unknown;
  regimeFit?: unknown;
  liquidity?: unknown;
};

type Row = {
  snapshot_date: string;
  symbol: string;
  name: string | null;
  category: string | null;
  strategy: string | null;
  price: number | string | null;
  market_regime: string | null;
  short_term_score: number | string | null;
  short_term_signal: string | null;
  short_term_breakdown: ShortBreakdown | null;
  short_term_overheat_penalty: number | string | null;
  short_term_score_version: string | null;
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
      .select("snapshot_date,symbol,name,category,strategy,price,market_regime,short_term_score,short_term_signal,short_term_breakdown,short_term_overheat_penalty,short_term_score_version")
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
  for (const base of scored) {
    const basePrice = num(base.price);
    const score = num(base.short_term_score);
    if (basePrice === null || score === null) continue;
    const list = bySymbol.get(base.symbol) ?? [];
    const idx = list.findIndex((r) => r.snapshot_date === base.snapshot_date);
    if (idx < 0) continue;
    const future = list.slice(idx + 1, idx + 1 + HORIZON);
    // Exactly 7 later snapshot observations are required. This avoids mixing incomplete windows into the result.
    if (future.length < HORIZON) continue;
    const path = future.map((r) => ({ row: r, price: num(r.price) })).filter((x): x is { row: Row; price: number } => x.price !== null);
    if (path.length < HORIZON) continue;
    const pathReturns = path.map((x) => ret(basePrice, x.price));
    const hitIndex = pathReturns.findIndex((r) => r >= TARGET_RETURN);
    const b = base.short_term_breakdown ?? {};
    trades.push({
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
    });
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
