import { NextResponse } from "next/server";
import { runSimpleBacktest } from "@/lib/backtest";

export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const months = Number(url.searchParams.get("months") ?? 12);
    const universeSize = Number(url.searchParams.get("universeSize") ?? 80);
    const topN = Number(url.searchParams.get("topN") ?? 10);

    const result = await runSimpleBacktest({
      months: Number.isFinite(months) ? months : 12,
      universeSize: Number.isFinite(universeSize) ? universeSize : 80,
      topN: Number.isFinite(topN) ? topN : 10,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("BACKTEST API ERROR:", error);

    return NextResponse.json(
      {
        error: "バックテストに失敗しました。",
        detail: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
