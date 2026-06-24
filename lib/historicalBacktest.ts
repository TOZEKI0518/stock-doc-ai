import YahooFinance from "yahoo-finance2";
import { STOCK_MASTER } from "./stockMaster";
import { calculateThemeScore } from "./themeScore";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

type HistoryRow = {
  date: Date;
  close?: number;
  volume?: number;
};

type HistoricalCandidate = {
  code: string;
  name: string;
  score: number;
  buyPrice: number;
  sellPrice: number;
  returnPercent: number;
  momentumScore: number;
  volumeScore: number;
  trendScore: number;
  themeScore: number;
  reasons: string[];
};

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentChange(current: number, past: number) {
  if (!past) return 0;
  return ((current - past) / past) * 100;
}

function getNearestTradingRow(rows: HistoryRow[], target: Date) {
  const pastRows = rows.filter(
    (row) => row.date.getTime() <= target.getTime() && typeof row.close === "number"
  );

  return pastRows.at(-1) ?? null;
}

function getFutureTradingRow(rows: HistoryRow[], target: Date) {
  const futureRows = rows.filter(
    (row) => row.date.getTime() >= target.getTime() && typeof row.close === "number"
  );

  return futureRows[0] ?? null;
}

function clamp(value: number) {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function buildReasons(params: {
  momentumScore: number;
  volumeScore: number;
  trendScore: number;
  themeScore: number;
  themes: string[];
}) {
  const reasons: string[] = [];

  if (params.momentumScore >= 75) reasons.push("基準日時点で株価モメンタムが強い");
  if (params.volumeScore >= 75) reasons.push("出来高が増加しており注目度が高い");
  if (params.trendScore >= 75) reasons.push("移動平均線より上で上昇トレンド");
  if (params.themeScore >= 80) reasons.push("テーマ性が高い");
  if (reasons.length === 0) reasons.push(params.themes.slice(0, 3).join(" / "));

  return reasons.slice(0, 3);
}

function scoreAtBaseDate(rows: HistoryRow[], baseRow: HistoryRow, baseIndex: number, themes: string[]) {
  const close = baseRow.close as number;

  const close25 = average(
    rows
      .slice(Math.max(0, baseIndex - 24), baseIndex + 1)
      .map((row) => row.close)
      .filter((value): value is number => typeof value === "number")
  );

  const close75 = average(
    rows
      .slice(Math.max(0, baseIndex - 74), baseIndex + 1)
      .map((row) => row.close)
      .filter((value): value is number => typeof value === "number")
  );

  const close120 = rows[baseIndex - 120]?.close ?? null;

  const recentVolumes = rows
    .slice(Math.max(0, baseIndex - 19), baseIndex + 1)
    .map((row) => row.volume)
    .filter((value): value is number => typeof value === "number");

  const pastVolumes = rows
    .slice(Math.max(0, baseIndex - 59), Math.max(0, baseIndex - 20))
    .map((row) => row.volume)
    .filter((value): value is number => typeof value === "number");

  const volume20 = average(recentVolumes);
  const volumePast = average(pastVolumes);

  const threeMonthReturn = close120 ? percentChange(close, close120) : 0;

  let momentumScore = 50;
  if (threeMonthReturn > 40) momentumScore += 30;
  else if (threeMonthReturn > 20) momentumScore += 20;
  else if (threeMonthReturn > 5) momentumScore += 12;
  else if (threeMonthReturn < -20) momentumScore -= 20;

  let trendScore = 50;
  if (close25 && close > close25) trendScore += 15;
  if (close75 && close > close75) trendScore += 20;
  if (close25 && close75 && close25 > close75) trendScore += 15;

  let volumeScore = 50;
  if (volume20 && volumePast && volume20 > volumePast * 1.8) volumeScore += 30;
  else if (volume20 && volumePast && volume20 > volumePast * 1.25) volumeScore += 18;

  const themeScore = calculateThemeScore(themes);

  const total = clamp(
    momentumScore * 0.35 +
      trendScore * 0.25 +
      volumeScore * 0.15 +
      themeScore * 0.25
  );

  return {
    total,
    momentumScore: clamp(momentumScore),
    trendScore: clamp(trendScore),
    volumeScore: clamp(volumeScore),
    themeScore,
  };
}

export async function runHistoricalBacktest(params?: {
  monthsAgo?: number;
  holdingMonths?: number;
  topN?: number;
  universeSize?: number;
}) {
  const monthsAgo = params?.monthsAgo ?? 12;
  const holdingMonths = params?.holdingMonths ?? 6;
  const topN = params?.topN ?? 10;
  const universeSize = params?.universeSize ?? 120;

  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() - monthsAgo);

  const sellDate = new Date(baseDate);
  sellDate.setMonth(sellDate.getMonth() + holdingMonths);

  const period1 = new Date(baseDate);
  period1.setDate(period1.getDate() - 220);

  const period2 = new Date(sellDate);
  period2.setDate(period2.getDate() + 20);

  const candidates: HistoricalCandidate[] = [];

  for (const stock of STOCK_MASTER.slice(0, universeSize)) {
    try {
      const symbol = `${stock.code}.T`;

      const history = await yahooFinance.historical(symbol, {
        period1,
        period2,
        interval: "1d",
      });

      const rows = history
        .filter((row) => typeof row.close === "number")
        .map((row) => ({
          date: row.date,
          close: row.close,
          volume: row.volume,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      const baseRow = getNearestTradingRow(rows, baseDate);
      const sellRow = getFutureTradingRow(rows, sellDate);

      if (!baseRow || !sellRow || !baseRow.close || !sellRow.close) continue;

      const baseIndex = rows.findIndex(
        (row) => row.date.getTime() === baseRow.date.getTime()
      );

      if (baseIndex < 80) continue;

      const score = scoreAtBaseDate(rows, baseRow, baseIndex, stock.themes);
      const returnPercent = percentChange(sellRow.close, baseRow.close);

      candidates.push({
        code: stock.code,
        name: stock.name,
        score: score.total,
        buyPrice: baseRow.close,
        sellPrice: sellRow.close,
        returnPercent,
        momentumScore: score.momentumScore,
        volumeScore: score.volumeScore,
        trendScore: score.trendScore,
        themeScore: score.themeScore,
        reasons: buildReasons({
          momentumScore: score.momentumScore,
          volumeScore: score.volumeScore,
          trendScore: score.trendScore,
          themeScore: score.themeScore,
          themes: stock.themes,
        }),
      });
    } catch (error) {
      console.error(`Historical backtest failed: ${stock.code}`, error);
      continue;
    }
  }

  const ranked = candidates.sort((a, b) => b.score - a.score);
  const selected = ranked.slice(0, topN);
  const allAverage =
    candidates.reduce((sum, item) => sum + item.returnPercent, 0) /
    Math.max(candidates.length, 1);
  const selectedAverage =
    selected.reduce((sum, item) => sum + item.returnPercent, 0) /
    Math.max(selected.length, 1);
  const winRate =
    (selected.filter((item) => item.returnPercent > 0).length /
      Math.max(selected.length, 1)) *
    100;

  return {
    baseDate: baseDate.toISOString().slice(0, 10),
    sellDate: sellDate.toISOString().slice(0, 10),
    universeSize: candidates.length,
    topN,
    selectedAverage,
    allAverage,
    winRate,
    selected,
  };
}
