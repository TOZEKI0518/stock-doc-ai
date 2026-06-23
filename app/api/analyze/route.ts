import { NextResponse } from "next/server";
import { getStockData } from "@/lib/stockData";
import { calculateDetailedScore, getRating } from "@/lib/scoring";
import { analyzeStockWithAI } from "@/lib/gemini";
import { findStockByCode } from "@/lib/stockMaster";
import { calculateThemeScore } from "@/lib/themeScore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ticker = String(body.ticker ?? "").trim();

    if (!ticker) {
      return NextResponse.json(
        { error: "東証コードを入力してください。" },
        { status: 400 }
      );
    }

    const stock = await getStockData(ticker, {
      includeAdvanced: true,
      includeHistory: true,
    });

    const master = findStockByCode(stock.ticker);
    const themes = master?.themes ?? [];
    const themeScore = calculateThemeScore(themes);

    const scores = calculateDetailedScore({
      per: stock.per,
      pbr: stock.pbr,
      dividendYield: stock.dividendYield,
      changePercent: stock.changePercent,
      volume: stock.volume,
      roe: stock.roe,
      profitMargin: stock.profitMargin,
      revenueGrowth: stock.revenueGrowth,
      earningsGrowth: stock.earningsGrowth,
      debtToEquity: stock.debtToEquity,
      freeCashflow: stock.freeCashflow,
      operatingCashflow: stock.operatingCashflow,
      fiftyTwoWeekHighGap: stock.fiftyTwoWeekHighGap,
      ma25Gap: stock.ma25Gap,
      ma75Gap: stock.ma75Gap,
      volumeAvg20: stock.volumeAvg20,
      sixMonthReturn: stock.sixMonthReturn,
    });

    // 半年保有向けの総合点にテーマ性を少し反映
    const finalScore = Math.min(
      Math.max(
        Math.round(scores.total * 0.85 + themeScore * 0.15),
        0
      ),
      100
    );

    const rating = getRating(finalScore);

    const breakdown = {
      ...scores,
      theme: themeScore,
    };

    const ai = await analyzeStockWithAI({
      ...stock,
      themes,
      score: finalScore,
      breakdown,
      rating,
    });

    return NextResponse.json({
      ...stock,
      themes,
      score: finalScore,
      breakdown,
      rating,
      ai,
    });
  } catch (error: any) {
    console.error("ANALYZE API ERROR:", error);

    return NextResponse.json(
      {
        error: "銘柄分析に失敗しました。",
        detail: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
