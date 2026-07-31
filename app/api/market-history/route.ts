import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MarketHistoryRow = {
  marketDate: string;
  generatedAt: string;
  scoreVersion: string;
  score: number;
  confidence: number;
  regime: string;
  regimeLabel: string;
};

function parseLimit(value: string | null): number {
  if (!value) return 365;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 365;

  return Math.min(Math.max(parsed, 1), 1000);
}

export async function GET(request: NextRequest) {
  try {
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
    const order = request.nextUrl.searchParams.get("order") === "asc" ? "asc" : "desc";

    const { data, error } = await supabaseAdmin
      .from("market_snapshots")
      .select(
        "market_date, generated_at, score_version, market_score, confidence, regime, regime_label"
      )
      .order("market_date", { ascending: order === "asc" })
      .limit(limit);

    if (error) {
      throw new Error(`market_snapshots query failed: ${error.message}`);
    }

    const history: MarketHistoryRow[] = (data ?? []).map((row) => ({
      marketDate: String(row.market_date),
      generatedAt: String(row.generated_at),
      scoreVersion: String(row.score_version),
      score: Number(row.market_score),
      confidence: Number(row.confidence),
      regime: String(row.regime),
      regimeLabel: String(row.regime_label),
    }));

    return NextResponse.json({
      count: history.length,
      limit,
      order,
      history,
    });
  } catch (error) {
    console.error("Market history API failed", error);

    return NextResponse.json(
      {
        error: "Failed to load market history.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
