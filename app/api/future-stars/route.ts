import { NextResponse } from "next/server";
import { getStockData } from "@/lib/stockData";
import { calculateDetailedScore } from "@/lib/scoring";
import { STOCK_MASTER } from "@/lib/stockMaster";
import { calculateThemeScore } from "@/lib/themeScore";

type FutureStar = {
  code: string;
  name: string;
  themes: string[];
  score: number;
  growth: number;
  theme: number;
  profitability: number;
  safety: number;
  reasons: string[];
};

function buildReasons(params: {
  themes: string[];
  growth: number;
  theme: number;
  profitability: number;
  safety: number;
}) {
  const reasons: string[] = [];

  if (params.theme >= 85) {
    reasons.push(`強いテーマ性：${params.themes.slice(0, 3).join(" / ")}`);
  }

  if (params.growth >= 75) {
    reasons.push("成長性スコアが高い");
  }

  if (params.profitability >= 70) {
    reasons.push("収益性が比較的高い");
  }

  if (params.safety >= 70) {
    reasons.push("財務健全性が比較的高い");
  }

  if (reasons.length === 0) {
    reasons.push(`テーマ：${params.themes.slice(0, 3).join(" / ")}`);
  }

  return reasons.slice(0, 3);
}

export async function GET() {
  const targets = STOCK_MASTER.slice(0, 80);
  const results: FutureStar[] = [];

  for (const stock of targets) {
    try {
      const data = await getStockData(stock.code, {
        includeAdvanced: true,
        includeHistory: true,
      });

      const scores = calculateDetailedScore({
        per: data.per,
        pbr: data.pbr,
        dividendYield: data.dividendYield,
        changePercent: data.changePercent,
        volume: data.volume,
        roe: data.roe,
        profitMargin: data.profitMargin,
        revenueGrowth: data.revenueGrowth,
        earningsGrowth: data.earningsGrowth,
        debtToEquity: data.debtToEquity,
        freeCashflow: data.freeCashflow,
        operatingCashflow: data.operatingCashflow,
        fiftyTwoWeekHighGap: data.fiftyTwoWeekHighGap,
        ma25Gap: data.ma25Gap,
        ma75Gap: data.ma75Gap,
        volumeAvg20: data.volumeAvg20,
        sixMonthReturn: data.sixMonthReturn,
      });

      const theme = calculateThemeScore(stock.themes);

      const futureScore = Math.round(
        scores.growth * 0.35 +
          theme * 0.30 +
          scores.profitability * 0.15 +
          scores.safety * 0.10 +
          scores.overheat * 0.05 +
          scores.sixMonthSuitability * 0.05
      );

      results.push({
        code: stock.code,
        name: stock.name,
        themes: stock.themes,
        score: futureScore,
        growth: scores.growth,
        theme,
        profitability: scores.profitability,
        safety: scores.safety,
        reasons: buildReasons({
          themes: stock.themes,
          growth: scores.growth,
          theme,
          profitability: scores.profitability,
          safety: scores.safety,
        }),
      });
    } catch (error) {
      console.error(`Future star failed: ${stock.code}`, error);
      continue;
    }
  }

  return NextResponse.json(
    results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  );
}
