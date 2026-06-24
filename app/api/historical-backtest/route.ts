import { NextResponse } from "next/server";
import { runHistoricalBacktest } from "@/lib/historicalBacktest";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const monthsAgo = Number(searchParams.get("monthsAgo") ?? 12);
    const holdingMonths = Number(searchParams.get("holdingMonths") ?? 6);
    const topN = Number(searchParams.get("topN") ?? 10);
    const universeSize = Number(searchParams.get("universeSize") ?? 120);

    const result = await runHistoricalBacktest({
      monthsAgo,
      holdingMonths,
      topN,
      universeSize,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("HISTORICAL BACKTEST API ERROR:", error);

    return NextResponse.json(
      {
        error: "過去データバックテストに失敗しました。",
        detail: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
