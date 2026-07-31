import { NextResponse } from "next/server";

import {
  calculateMarketRegime,
  getMarketIndicators,
  saveMarketSnapshot,
} from "@/lib/market";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SNAPSHOT_SECRET = process.env.SNAPSHOT_SECRET;

function hasPermission(req: Request): boolean {
  if (!SNAPSHOT_SECRET) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth.replace("Bearer ", "").trim() === SNAPSHOT_SECRET;
}

export async function GET(req: Request) {
  if (!hasPermission(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { indicators, warnings } = await getMarketIndicators();
    if (indicators.length === 0) {
      return NextResponse.json(
        { error: "Market data could not be retrieved.", warnings },
        { status: 503 }
      );
    }

    const result = calculateMarketRegime(indicators, warnings);
    const saved = await saveMarketSnapshot(result);

    return NextResponse.json({ ok: true, saved, result });
  } catch (error) {
    console.error("Market snapshot API failed", error);
    return NextResponse.json(
      {
        error: "Failed to save market snapshot.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
