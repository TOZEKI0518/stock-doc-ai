import { NextResponse } from "next/server";

import { calculateMarketRegime, getMarketIndicators } from "@/lib/market";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { indicators, warnings } = await getMarketIndicators();

    if (indicators.length === 0) {
      return NextResponse.json(
        {
          error: "Market data could not be retrieved.",
          warnings,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(calculateMarketRegime(indicators, warnings));
  } catch (error) {
    console.error("Market regime API failed", error);

    return NextResponse.json(
      {
        error: "Failed to calculate market regime.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
