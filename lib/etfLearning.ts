import { supabaseAdmin } from "@/lib/supabase";

type Breakdown = {
  trend?: unknown;
  momentum?: unknown;
  risk?: unknown;
  liquidity?: unknown;
  regimeFit?: unknown;
};

type EtfSnapshotRow = {
  snapshot_date: string;
  symbol: string;
  name: string | null;
  category: string | null;
  strategy: string | null;
  price: number | string | null;
  etf_score: number | string | null;
  exit_score: number | string | null;
  signal: string | null;
  market_regime: string | null;
  breakdown: Breakdown | null;
  score_version: string | null;
};

export type EtfLearningTrade = {
  symbol: string;
  name: string;
  category: string;
  strategy: string;
  baseDate: string;
  futureDate: string;
  basePrice: number;
  futurePrice: number;
  returnPercent: number;
  etfScore: number;
  exitScore: number | null;
  signal: string;
  marketRegime: string;
  scoreVersion: string;
  breakdown: {
    trend: number | null;
    momentum: number | null;
    risk: number | null;
    liquidity: number | null;
    regimeFit: number | null;
  };
};

export type EtfLearningBucket = {
  label: string;
  count: number;
  winRate: number;
  averageReturn: number;
  medianReturn: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number | null;
  bestReturn: number;
  worstReturn: number;
};

export type EtfFactorResult = {
  key: "trend" | "momentum" | "risk" | "liquidity" | "regimeFit";
  label: string;
  high: EtfLearningBucket;
  low: EtfLearningBucket;
  spread: number;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function calcReturn(basePrice: number, futurePrice: number): number {
  return basePrice > 0 ? ((futurePrice - basePrice) / basePrice) * 100 : 0;
}

function summarize(label: string, trades: EtfLearningTrade[]): EtfLearningBucket {
  if (!trades.length) {
    return {
      label,
      count: 0,
      winRate: 0,
      averageReturn: 0,
      medianReturn: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: null,
      bestReturn: 0,
      worstReturn: 0,
    };
  }

  const returns = trades.map((trade) => trade.returnPercent);
  const wins = returns.filter((value) => value > 0);
  const losses = returns.filter((value) => value < 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));

  return {
    label,
    count: trades.length,
    winRate: round((wins.length / trades.length) * 100),
    averageReturn: round(average(returns)),
    medianReturn: round(median(returns)),
    averageWin: round(average(wins)),
    averageLoss: round(average(losses)),
    profitFactor: grossLoss > 0 ? round(grossProfit / grossLoss) : grossProfit > 0 ? null : 0,
    bestReturn: round(Math.max(...returns)),
    worstReturn: round(Math.min(...returns)),
  };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getJstToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function calculateDataStatus(latestSnapshotDate: string | null) {
  if (!latestSnapshotDate) {
    return { status: "empty" as const, label: "データなし", daysBehind: null };
  }

  const today = new Date(`${getJstToday()}T00:00:00.000Z`);
  const latest = new Date(`${latestSnapshotDate}T00:00:00.000Z`);
  const daysBehind = Math.max(0, Math.floor((today.getTime() - latest.getTime()) / 86_400_000));

  return daysBehind <= 1
    ? { status: "normal" as const, label: "正常", daysBehind }
    : { status: "warning" as const, label: "更新遅延の可能性", daysBehind };
}

async function fetchAllEtfSnapshots(): Promise<EtfSnapshotRow[]> {
  const pageSize = 1000;
  const rows: EtfSnapshotRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("etf_snapshots")
      .select(
        "snapshot_date,symbol,name,category,strategy,price,etf_score,exit_score,signal,market_regime,breakdown,score_version"
      )
      .order("snapshot_date", { ascending: true })
      .order("symbol", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    const page = (data ?? []) as EtfSnapshotRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function findNearestFutureSnapshot(rows: EtfSnapshotRow[], targetDate: string): EtfSnapshotRow | null {
  return rows.find((row) => row.snapshot_date >= targetDate) ?? null;
}

function buildGroupedBuckets(
  trades: EtfLearningTrade[],
  values: Array<{ label: string; matches: (trade: EtfLearningTrade) => boolean }>
): EtfLearningBucket[] {
  return values.map(({ label, matches }) => summarize(label, trades.filter(matches)));
}

function factorResults(trades: EtfLearningTrade[]): EtfFactorResult[] {
  const definitions: Array<{
    key: EtfFactorResult["key"];
    label: string;
  }> = [
    { key: "trend", label: "Trend" },
    { key: "momentum", label: "Momentum" },
    { key: "risk", label: "Risk" },
    { key: "liquidity", label: "Liquidity" },
    { key: "regimeFit", label: "Market Regime Fit" },
  ];

  return definitions.map(({ key, label }) => {
    const available = trades.filter((trade) => trade.breakdown[key] !== null);
    const high = summarize(`${label} 70以上`, available.filter((trade) => (trade.breakdown[key] ?? 0) >= 70));
    const low = summarize(`${label} 50未満`, available.filter((trade) => (trade.breakdown[key] ?? 0) < 50));
    return {
      key,
      label,
      high,
      low,
      spread: round(high.averageReturn - low.averageReturn),
    };
  });
}

function buildInsights(
  overall: EtfLearningBucket,
  scoreBuckets: EtfLearningBucket[],
  factorAnalysis: EtfFactorResult[]
): string[] {
  const insights: string[] = [];
  const eligibleScores = scoreBuckets.filter((bucket) => bucket.count >= 5);
  const bestScore = [...eligibleScores].sort((a, b) => b.averageReturn - a.averageReturn)[0];
  if (bestScore) {
    insights.push(`${bestScore.label}が件数5件以上のスコア帯で平均リターン最大（${bestScore.averageReturn >= 0 ? "+" : ""}${bestScore.averageReturn.toFixed(2)}%）です。`);
  }

  const eligibleFactors = factorAnalysis.filter((factor) => factor.high.count >= 5 && factor.low.count >= 5);
  const strongestFactor = [...eligibleFactors].sort((a, b) => b.spread - a.spread)[0];
  if (strongestFactor) {
    insights.push(`${strongestFactor.label}の高スコア群と低スコア群の平均リターン差は${strongestFactor.spread >= 0 ? "+" : ""}${strongestFactor.spread.toFixed(2)}ポイントです。`);
  }

  if (overall.count > 0) {
    insights.push(`全体では勝率${overall.winRate.toFixed(1)}%、平均リターン${overall.averageReturn >= 0 ? "+" : ""}${overall.averageReturn.toFixed(2)}%です。`);
  }

  return insights.length
    ? insights.slice(0, 3)
    : ["将来価格がそろうまで検証結果は表示されません。日次ETF Snapshotの蓄積を続けてください。"];
}

export async function getEtfLearningSummary(days = 30) {
  const safeDays = [7, 30, 90, 180].includes(days) ? days : 30;
  const rows = await fetchAllEtfSnapshots();
  const validRows = rows.filter(
    (row) => row.snapshot_date && row.symbol && toNumber(row.price) !== null && toNumber(row.etf_score) !== null
  );

  const latestSnapshotDate = validRows.length
    ? validRows.reduce((latest, row) => (row.snapshot_date > latest ? row.snapshot_date : latest), validRows[0].snapshot_date)
    : null;
  const latestSnapshotCount = latestSnapshotDate
    ? validRows.filter((row) => row.snapshot_date === latestSnapshotDate).length
    : 0;

  const rowsBySymbol = new Map<string, EtfSnapshotRow[]>();
  for (const row of validRows) {
    const symbolRows = rowsBySymbol.get(row.symbol) ?? [];
    symbolRows.push(row);
    rowsBySymbol.set(row.symbol, symbolRows);
  }
  for (const symbolRows of rowsBySymbol.values()) {
    symbolRows.sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  }

  const trades: EtfLearningTrade[] = [];
  for (const row of validRows) {
    const basePrice = toNumber(row.price);
    const etfScore = toNumber(row.etf_score);
    if (basePrice === null || etfScore === null) continue;

    const targetDate = dateOnly(addDays(new Date(`${row.snapshot_date}T00:00:00.000Z`), safeDays));
    const future = findNearestFutureSnapshot(rowsBySymbol.get(row.symbol) ?? [], targetDate);
    const futurePrice = future ? toNumber(future.price) : null;
    if (!future || futurePrice === null) continue;

    const breakdown = row.breakdown ?? {};
    trades.push({
      symbol: row.symbol,
      name: row.name ?? row.symbol,
      category: row.category ?? "UNKNOWN",
      strategy: row.strategy ?? "Unknown",
      baseDate: row.snapshot_date,
      futureDate: future.snapshot_date,
      basePrice,
      futurePrice,
      returnPercent: round(calcReturn(basePrice, futurePrice)),
      etfScore,
      exitScore: toNumber(row.exit_score),
      signal: row.signal ?? "UNKNOWN",
      marketRegime: row.market_regime ?? "UNKNOWN",
      scoreVersion: row.score_version ?? "unknown",
      breakdown: {
        trend: toNumber(breakdown.trend),
        momentum: toNumber(breakdown.momentum),
        risk: toNumber(breakdown.risk),
        liquidity: toNumber(breakdown.liquidity),
        regimeFit: toNumber(breakdown.regimeFit),
      },
    });
  }

  const scoreBuckets = buildGroupedBuckets(trades, [
    { label: "80点以上", matches: (trade) => trade.etfScore >= 80 },
    { label: "70〜79点", matches: (trade) => trade.etfScore >= 70 && trade.etfScore < 80 },
    { label: "60〜69点", matches: (trade) => trade.etfScore >= 60 && trade.etfScore < 70 },
    { label: "60点未満", matches: (trade) => trade.etfScore < 60 },
  ]);

  const signals = ["ACCUMULATE", "HOLD", "WATCH", "REDUCE", "EXIT"];
  const signalBuckets = signals.map((signal) => summarize(signal, trades.filter((trade) => trade.signal === signal)));

  const categories = [...new Set(validRows.map((row) => row.category ?? "UNKNOWN"))].sort();
  const categoryBuckets = categories.map((category) => summarize(category, trades.filter((trade) => trade.category === category)));

  const regimes = [...new Set(validRows.map((row) => row.market_regime ?? "UNKNOWN"))].sort();
  const regimeBuckets = regimes.map((regime) => summarize(regime.replaceAll("_", " "), trades.filter((trade) => trade.marketRegime === regime)));

  const symbols = [...new Set(validRows.map((row) => row.symbol))].sort();
  const etfBuckets = symbols
    .map((symbol) => {
      const sample = trades.find((trade) => trade.symbol === symbol);
      return summarize(sample ? `${symbol} ${sample.name}` : symbol, trades.filter((trade) => trade.symbol === symbol));
    })
    .sort((a, b) => b.averageReturn - a.averageReturn);

  const overall = summarize("全体", trades);
  const factors = factorResults(trades);

  return {
    days: safeDays,
    snapshotCount: validRows.length,
    tradeCount: trades.length,
    latestSnapshotDate,
    latestSnapshotCount,
    dataStatus: calculateDataStatus(latestSnapshotDate),
    overall,
    highScore: summarize("70点以上", trades.filter((trade) => trade.etfScore >= 70)),
    scoreBuckets,
    signalBuckets,
    categoryBuckets,
    regimeBuckets,
    etfBuckets,
    factorAnalysis: factors,
    insights: buildInsights(overall, scoreBuckets, factors),
    topWinners: [...trades].sort((a, b) => b.returnPercent - a.returnPercent).slice(0, 10),
    topLosers: [...trades].sort((a, b) => a.returnPercent - b.returnPercent).slice(0, 10),
  };
}
