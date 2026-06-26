import { supabaseAdmin } from "./supabase";

type SnapshotRow = {
  snapshot_date: string;
  code: string;
  name: string | null;
  price: number | null;
  total_score: number | null;
  recommendation: string | null;
  theme_score: number | null;
  fundamental_score: number | null;
  technical_score: number | null;
};

type LearningTrade = {
  code: string;
  name: string;
  baseDate: string;
  futureDate: string;
  basePrice: number;
  futurePrice: number;
  returnPercent: number;
  totalScore: number;
  recommendation: string;
  themeScore: number | null;
};

type LearningBucket = {
  label: string;
  count: number;
  winRate: number;
  averageReturn: number;
  bestReturn: number;
  worstReturn: number;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function calcReturn(basePrice: number, futurePrice: number) {
  if (!basePrice || basePrice <= 0) return 0;
  return ((futurePrice - basePrice) / basePrice) * 100;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarize(label: string, trades: LearningTrade[]): LearningBucket {
  if (trades.length === 0) {
    return {
      label,
      count: 0,
      winRate: 0,
      averageReturn: 0,
      bestReturn: 0,
      worstReturn: 0,
    };
  }

  const returns = trades.map((trade) => trade.returnPercent);
  const wins = returns.filter((value) => value > 0).length;
  const average = returns.reduce((sum, value) => sum + value, 0) / returns.length;

  return {
    label,
    count: trades.length,
    winRate: round((wins / trades.length) * 100),
    averageReturn: round(average),
    bestReturn: round(Math.max(...returns)),
    worstReturn: round(Math.min(...returns)),
  };
}

function buildBuckets(trades: LearningTrade[]) {
  return [
    summarize("90点以上", trades.filter((trade) => trade.totalScore >= 90)),
    summarize("80〜89点", trades.filter((trade) => trade.totalScore >= 80 && trade.totalScore < 90)),
    summarize("70〜79点", trades.filter((trade) => trade.totalScore >= 70 && trade.totalScore < 80)),
    summarize("60〜69点", trades.filter((trade) => trade.totalScore >= 60 && trade.totalScore < 70)),
    summarize("60点未満", trades.filter((trade) => trade.totalScore < 60)),
  ];
}

function buildRecommendationBuckets(trades: LearningTrade[]) {
  const labels = ["Strong Buy", "Buy", "Hold", "Watch", "Avoid"];
  return labels.map((label) =>
    summarize(label, trades.filter((trade) => trade.recommendation === label))
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function findNearestFutureSnapshot(
  rowsByCode: Map<string, SnapshotRow[]>,
  code: string,
  targetDate: string
) {
  const rows = rowsByCode.get(code) ?? [];
  return rows.find((row) => row.snapshot_date >= targetDate) ?? null;
}

export async function getLearningSummary(days = 30) {
  const safeDays = [7, 30, 90, 180].includes(days) ? days : 30;

  const { data, error } = await supabaseAdmin
    .from("snapshots")
    .select(
      "snapshot_date, code, name, price, total_score, recommendation, theme_score, fundamental_score, technical_score"
    )
    .order("snapshot_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as SnapshotRow[];

  const validRows = rows.filter((row) => {
    return row.snapshot_date && row.code && toNumber(row.price) !== null;
  });

  const rowsByCode = new Map<string, SnapshotRow[]>();
  for (const row of validRows) {
    const existing = rowsByCode.get(row.code) ?? [];
    existing.push(row);
    rowsByCode.set(row.code, existing);
  }

  for (const [code, codeRows] of rowsByCode.entries()) {
    codeRows.sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    rowsByCode.set(code, codeRows);
  }

  const trades: LearningTrade[] = [];

  for (const row of validRows) {
    const basePrice = toNumber(row.price);
    const totalScore = toNumber(row.total_score);

    if (basePrice === null || totalScore === null) continue;

    const baseDate = new Date(`${row.snapshot_date}T00:00:00.000Z`);
    const targetDate = dateOnly(addDays(baseDate, safeDays));
    const future = findNearestFutureSnapshot(rowsByCode, row.code, targetDate);

    if (!future) continue;

    const futurePrice = toNumber(future.price);
    if (futurePrice === null) continue;

    trades.push({
      code: row.code,
      name: row.name ?? row.code,
      baseDate: row.snapshot_date,
      futureDate: future.snapshot_date,
      basePrice,
      futurePrice,
      returnPercent: round(calcReturn(basePrice, futurePrice)),
      totalScore,
      recommendation: row.recommendation ?? "Unknown",
      themeScore: toNumber(row.theme_score),
    });
  }

  const highScoreTrades = trades.filter((trade) => trade.totalScore >= 80);
  const themeHighTrades = trades.filter((trade) => (trade.themeScore ?? 0) >= 85);

  const topWinners = [...trades]
    .sort((a, b) => b.returnPercent - a.returnPercent)
    .slice(0, 10);

  const topLosers = [...trades]
    .sort((a, b) => a.returnPercent - b.returnPercent)
    .slice(0, 10);

  return {
    days: safeDays,
    snapshotCount: validRows.length,
    tradeCount: trades.length,
    overall: summarize("全体", trades),
    highScore: summarize("80点以上", highScoreTrades),
    highTheme: summarize("テーマ85点以上", themeHighTrades),
    scoreBuckets: buildBuckets(trades),
    recommendationBuckets: buildRecommendationBuckets(trades),
    topWinners,
    topLosers,
  };
}
