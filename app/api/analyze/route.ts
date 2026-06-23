import { NextResponse } from "next/server";
import { getStockData } from "@/lib/stockData";
import { calculateDetailedScore, getRating } from "@/lib/scoring";
import { analyzeStockWithAI } from "@/lib/gemini";

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

    const rating = getRating(scores.total);

    const ai = await analyzeStockWithAI({
      ...stock,
      score: scores.total,
      breakdown: scores,
      rating,
    });

    return NextResponse.json({
      ...stock,
      score: scores.total,
      breakdown: scores,
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
