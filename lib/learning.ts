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
  medianReturn: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number | null;
  bestReturn: number;
  worstReturn: number;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function calcReturn(basePrice: number, futurePrice: number): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  return ((futurePrice - basePrice) / basePrice) * 100;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function summarize(label: string, trades: LearningTrade[]): LearningBucket {
  if (trades.length === 0) {
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
    profitFactor:
      grossLoss > 0 ? round(grossProfit / grossLoss) : grossProfit > 0 ? null : 0,
    bestReturn: round(Math.max(...returns)),
    worstReturn: round(Math.min(...returns)),
  };
}

function buildBuckets(trades: LearningTrade[]): LearningBucket[] {
  return [
    summarize("90点以上", trades.filter((trade) => trade.totalScore >= 90)),
    summarize("80〜89点", trades.filter((trade) => trade.totalScore >= 80 && trade.totalScore < 90)),
    summarize("70〜79点", trades.filter((trade) => trade.totalScore >= 70 && trade.totalScore < 80)),
    summarize("60〜69点", trades.filter((trade) => trade.totalScore >= 60 && trade.totalScore < 70)),
    summarize("60点未満", trades.filter((trade) => trade.totalScore < 60)),
  ];
}

function buildRecommendationBuckets(trades: LearningTrade[]): LearningBucket[] {
  const labels = ["Strong Buy", "Buy", "Hold", "Watch", "Avoid"];
  return labels.map((label) =>
    summarize(label, trades.filter((trade) => trade.recommendation === label))
  );
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function findNearestFutureSnapshot(
  rowsByCode: Map<string, SnapshotRow[]>,
  code: string,
  targetDate: string
): SnapshotRow | null {
  return (rowsByCode.get(code) ?? []).find(
    (row) => row.snapshot_date >= targetDate
  ) ?? null;
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
  const daysBehind = Math.max(
    0,
    Math.floor((today.getTime() - latest.getTime()) / 86_400_000)
  );

  return daysBehind <= 1
    ? { status: "normal" as const, label: "正常", daysBehind }
    : { status: "warning" as const, label: "更新遅延の可能性", daysBehind };
}

function buildInsights(
  overall: LearningBucket,
  scoreBuckets: LearningBucket[],
  recommendationBuckets: LearningBucket[]
): string[] {
  const insights: string[] = [];

  const bestScoreBucket = [...scoreBuckets]
    .filter((bucket) => bucket.count >= 5)
    .sort((a, b) => b.averageReturn - a.averageReturn)[0];

  if (bestScoreBucket) {
    insights.push(
      `${bestScoreBucket.label}が、件数5件以上のスコア帯で平均リターン最大（${bestScoreBucket.averageReturn >= 0 ? "+" : ""}${bestScoreBucket.averageReturn.toFixed(2)}%）です。`
    );
  }

  const bestRecommendation = [...recommendationBuckets]
    .filter((bucket) => bucket.count >= 5)
    .sort((a, b) => b.averageReturn - a.averageReturn)[0];

  if (bestRecommendation) {
    insights.push(
      `${bestRecommendation.label}判定が、件数5件以上の判定区分で平均リターン最大（${bestRecommendation.averageReturn >= 0 ? "+" : ""}${bestRecommendation.averageReturn.toFixed(2)}%）です。`
    );
  }

  if (overall.count > 0) {
    insights.push(
      `全体では勝率${overall.winRate.toFixed(1)}%、平均リターン${overall.averageReturn >= 0 ? "+" : ""}${overall.averageReturn.toFixed(2)}%です。`
    );
  }

  return insights.length > 0
    ? insights.slice(0, 3)
    : ["判断に十分な件数がまだありません。日次スナップショットの蓄積を続けてください。"];
}

export async function getLearningSummary(days = 30) {
  const safeDays = [7, 30, 90, 180].includes(days) ? days : 30;

  const { data, error } = await supabaseAdmin
    .from("snapshots")
    .select(
      "snapshot_date, code, name, price, total_score, recommendation, theme_score, fundamental_score, technical_score"
    )
    .order("snapshot_date", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as SnapshotRow[];
  const validRows = rows.filter(
    (row) => row.snapshot_date && row.code && toNumber(row.price) !== null
  );

  const latestSnapshotDate =
    validRows.length === 0
      ? null
      : validRows.reduce(
          (latest, row) => row.snapshot_date > latest ? row.snapshot_date : latest,
          validRows[0].snapshot_date
        );

  const latestSnapshotCount =
    latestSnapshotDate === null
      ? 0
      : validRows.filter((row) => row.snapshot_date === latestSnapshotDate).length;

  const rowsByCode = new Map<string, SnapshotRow[]>();
  for (const row of validRows) {
    const existing = rowsByCode.get(row.code) ?? [];
    existing.push(row);
    rowsByCode.set(row.code, existing);
  }

  for (const codeRows of rowsByCode.values()) {
    codeRows.sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
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
  const themeHighTrades = trades.filter(
    (trade) => (trade.themeScore ?? 0) >= 85
  );

  const overall = summarize("全体", trades);
  const scoreBuckets = buildBuckets(trades);
  const recommendationBuckets = buildRecommendationBuckets(trades);

  return {
    days: safeDays,
    snapshotCount: validRows.length,
    tradeCount: trades.length,
    latestSnapshotDate,
    latestSnapshotCount,
    dataStatus: calculateDataStatus(latestSnapshotDate),
    overall,
    highScore: summarize("80点以上", highScoreTrades),
    highTheme: summarize("テーマ85点以上", themeHighTrades),
    scoreBuckets,
    recommendationBuckets,
    insights: buildInsights(overall, scoreBuckets, recommendationBuckets),
    topWinners: [...trades]
      .sort((a, b) => b.returnPercent - a.returnPercent)
      .slice(0, 10),
    topLosers: [...trades]
      .sort((a, b) => a.returnPercent - b.returnPercent)
      .slice(0, 10),
  };
}
