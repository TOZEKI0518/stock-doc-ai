import YahooFinance from "yahoo-finance2";
import { STOCK_MASTER } from "./stockMaster";
import { getStockData } from "./stockData";
import { calculateDetailedScore } from "./scoring";
import { calculateThemeScore } from "./themeScore";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

type BacktestHolding = {
  code: string;
  name: string;
  themes: string[];
  score: number;
  baseScore: number;
  themeScore: number;
  startPrice: number;
  endPrice: number;
  returnPct: number;
};

function toDateMonthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function calcReturnPct(startPrice: number | null, endPrice: number | null) {
  if (!startPrice || !endPrice || startPrice <= 0) return null;
  return ((endPrice - startPrice) / startPrice) * 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

async function getReturnForPeriod(code: string, months: number) {
  const symbol = `${code}.T`;
  const period1 = toDateMonthsAgo(months + 1);
  const period2 = new Date();

  const history = await yahooFinance.historical(symbol, {
    period1,
    period2,
    interval: "1d",
  });

  const rows = history
    .filter((item) => typeof item.close === "number")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (rows.length < 2) return null;

  const targetStart = toDateMonthsAgo(months).getTime();

  let startRow = rows[0];
  for (const row of rows) {
    if (row.date.getTime() >= targetStart) {
      startRow = row;
      break;
    }
  }

  const endRow = rows.at(-1);
  if (!endRow) return null;

  const startPrice = toNumber(startRow.close);
  const endPrice = toNumber(endRow.close);
  const returnPct = calcReturnPct(startPrice, endPrice);

  if (startPrice === null || endPrice === null || returnPct === null) {
    return null;
  }

  return {
    startPrice,
    endPrice,
    returnPct,
  };
}

export async function runSimpleBacktest(options?: {
  months?: number;
  universeSize?: number;
  topN?: number;
}) {
  const months = options?.months ?? 12;
  const universeSize = options?.universeSize ?? 80;
  const topN = options?.topN ?? 10;

  const targets = STOCK_MASTER.slice(0, universeSize);

  const holdings: BacktestHolding[] = [];

  for (const stock of targets) {
    try {
      const stockData = await getStockData(stock.code, {
        includeAdvanced: false,
        includeHistory: false,
      });

      const detailedScore = calculateDetailedScore({
        per: stockData.per,
        pbr: stockData.pbr,
        dividendYield: stockData.dividendYield,
        changePercent: stockData.changePercent,
        volume: stockData.volume,
      });

      const themeScore = calculateThemeScore(stock.themes);

      const score = Math.round(detailedScore.total * 0.75 + themeScore * 0.25);

      const periodReturn = await getReturnForPeriod(stock.code, months);

      if (!periodReturn) continue;

      holdings.push({
        code: stock.code,
        name: stock.name,
        themes: stock.themes,
        score,
        baseScore: detailedScore.total,
        themeScore,
        startPrice: periodReturn.startPrice,
        endPrice: periodReturn.endPrice,
        returnPct: periodReturn.returnPct,
      });
    } catch (error) {
      console.error(`Backtest failed: ${stock.code}`, error);
      continue;
    }
  }

  const rankedByScore = [...holdings].sort((a, b) => b.score - a.score);
  const selected = rankedByScore.slice(0, topN);
  const allReturns = holdings.map((item) => item.returnPct);
  const selectedReturns = selected.map((item) => item.returnPct);

  const selectedAverageReturn = average(selectedReturns);
  const universeAverageReturn = average(allReturns);
  const selectedWinRate =
    selected.length === 0
      ? 0
      : (selected.filter((item) => item.returnPct > 0).length / selected.length) *
        100;

  const best = [...holdings]
    .sort((a, b) => b.returnPct - a.returnPct)
    .slice(0, 10);

  return {
    months,
    universeSize: targets.length,
    analyzedCount: holdings.length,
    topN,
    selectedAverageReturn,
    universeAverageReturn,
    excessReturn: selectedAverageReturn - universeAverageReturn,
    selectedWinRate,
    selectedMedianReturn: median(selectedReturns),
    universeMedianReturn: median(allReturns),
    selected,
    best,
    note:
      "これは簡易バックテストです。現在取得できるPER/PBR/テーマ等でスコアリングして過去リターンと比較するため、厳密な過去時点分析ではありません。",
  };
}
