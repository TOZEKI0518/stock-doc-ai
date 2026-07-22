import { supabaseAdmin } from "./supabase";

export type StrategyMetric = {
  id: string;
  label: string;
  description: string;
  count: number;
  winRate: number;
  averageReturn: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number | null;
  bestReturn: number;
  worstReturn: number;
  cumulativeReturn: number;
  equityCurve: { date: string; value: number }[];
};

type SnapshotRow = {
  snapshot_date: string;
  code: string;
  name: string | null;
  price: number | string | null;
  per: number | string | null;
  total_score: number | string | null;
  recommendation: string | null;
  theme_score: number | string | null;
};

type StrategyTrade = {
  code: string;
  baseDate: string;
  returnPercent: number;
  totalScore: number;
  recommendation: string;
  per: number | null;
  themeScore: number | null;
};

type Scenario = {
  id: string;
  label: string;
  description: string;
  select: (trades: StrategyTrade[]) => StrategyTrade[];
};

const SCENARIOS: Scenario[] = [
  { id: "baseline", label: "Baseline", description: "全銘柄", select: (trades) => trades },
  { id: "buy", label: "Buyのみ", description: "Buy判定のみ", select: (trades) => trades.filter((trade) => trade.recommendation === "Buy") },
  { id: "score80", label: "Score80以上", description: "総合スコア80点以上", select: (trades) => trades.filter((trade) => trade.totalScore >= 80) },
  { id: "score70", label: "Score70以上", description: "総合スコア70点以上", select: (trades) => trades.filter((trade) => trade.totalScore >= 70) },
  { id: "buy-per15", label: "Buy + PER15以下", description: "BuyかつPER15以下", select: (trades) => trades.filter((trade) => trade.recommendation === "Buy" && trade.per !== null && trade.per <= 15) },
  { id: "buy-theme85", label: "Buy + Theme85未満", description: "Buyかつテーマスコア85未満", select: (trades) => trades.filter((trade) => trade.recommendation === "Buy" && trade.themeScore !== null && trade.themeScore < 85) },
  { id: "top5", label: "Top5 Score", description: "各日スコア上位5銘柄", select: (trades) => selectTopByDate(trades, 5) },
  { id: "top10", label: "Top10 Score", description: "各日スコア上位10銘柄", select: (trades) => selectTopByDate(trades, 10) },
];

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

function selectTopByDate(trades: StrategyTrade[], limit: number): StrategyTrade[] {
  const grouped = new Map<string, StrategyTrade[]>();
  for (const trade of trades) grouped.set(trade.baseDate, [...(grouped.get(trade.baseDate) ?? []), trade]);
  return [...grouped.values()].flatMap((rows) => [...rows].sort((a, b) => b.totalScore - a.totalScore).slice(0, limit));
}

function summarize(scenario: Scenario, trades: StrategyTrade[]): StrategyMetric {
  const selected = scenario.select(trades);
  const returns = selected.map((trade) => trade.returnPercent);
  const wins = returns.filter((value) => value > 0);
  const losses = returns.filter((value) => value < 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  const byDate = new Map<string, number[]>();
  for (const trade of selected) byDate.set(trade.baseDate, [...(byDate.get(trade.baseDate) ?? []), trade.returnPercent]);
  let equity = 100;
  const equityCurve = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => {
    const dailyAverage = values.reduce((sum, value) => sum + value, 0) / values.length;
    equity *= 1 + dailyAverage / 100;
    return { date, value: round(equity - 100) };
  });
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return {
    id: scenario.id,
    label: scenario.label,
    description: scenario.description,
    count: selected.length,
    winRate: round(selected.length ? (wins.length / selected.length) * 100 : 0),
    averageReturn: round(average(returns)),
    averageWin: round(average(wins)),
    averageLoss: round(average(losses)),
    profitFactor: grossLoss > 0 ? round(grossProfit / grossLoss) : grossProfit > 0 ? null : 0,
    bestReturn: round(returns.length ? Math.max(...returns) : 0),
    worstReturn: round(returns.length ? Math.min(...returns) : 0),
    cumulativeReturn: equityCurve.at(-1)?.value ?? 0,
    equityCurve,
  };
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function fetchSnapshots(): Promise<SnapshotRow[]> {
  const rows: SnapshotRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin.from("snapshots")
      .select("snapshot_date, code, name, price, per, total_score, recommendation, theme_score")
      .order("snapshot_date", { ascending: true }).order("code", { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as SnapshotRow[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

export async function getStrategyLabSummary(days = 30) {
  const safeDays = [7, 30, 90, 180].includes(days) ? days : 30;
  const rows = (await fetchSnapshots()).filter((row) => row.snapshot_date && row.code && toNumber(row.price) !== null);
  const rowsByCode = new Map<string, SnapshotRow[]>();
  for (const row of rows) rowsByCode.set(row.code, [...(rowsByCode.get(row.code) ?? []), row]);
  const trades: StrategyTrade[] = [];
  for (const row of rows) {
    const basePrice = toNumber(row.price);
    const totalScore = toNumber(row.total_score);
    if (basePrice === null || basePrice <= 0 || totalScore === null) continue;
    const target = addDays(row.snapshot_date, safeDays);
    const future = (rowsByCode.get(row.code) ?? []).find((candidate) => candidate.snapshot_date >= target);
    const futurePrice = toNumber(future?.price);
    if (!future || futurePrice === null) continue;
    trades.push({
      code: row.code,
      baseDate: row.snapshot_date,
      returnPercent: round(((futurePrice - basePrice) / basePrice) * 100),
      totalScore,
      recommendation: row.recommendation ?? "Unknown",
      per: toNumber(row.per),
      themeScore: toNumber(row.theme_score),
    });
  }
  const scenarios = SCENARIOS.map((scenario) => summarize(scenario, trades));
  return {
    days: safeDays,
    snapshotCount: rows.length,
    tradeCount: trades.length,
    latestSnapshotDate: rows.at(-1)?.snapshot_date ?? null,
    scenarios,
    bestAverageReturn: [...scenarios].filter((item) => item.count > 0).sort((a, b) => b.averageReturn - a.averageReturn)[0]?.id ?? null,
    bestProfitFactor: [...scenarios].filter((item) => item.count > 0).sort((a, b) => (b.profitFactor ?? Number.POSITIVE_INFINITY) - (a.profitFactor ?? Number.POSITIVE_INFINITY))[0]?.id ?? null,
  };
}
