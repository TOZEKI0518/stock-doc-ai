import { NextResponse } from "next/server";
import { getStockData } from "@/lib/stockData";
import { calculateScore, getRating } from "@/lib/scoring";
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

    const stock = await getStockData(ticker);

    const score = calculateScore({
      per: stock.per,
      pbr: stock.pbr,
      dividendYield: stock.dividendYield,
      changePercent: stock.changePercent,
      volume: stock.volume,
    });

    const rating = getRating(score);

    const ai = await analyzeStockWithAI({
      ...stock,
      score,
      rating,
    });

    return NextResponse.json({
      ...stock,
      score,
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