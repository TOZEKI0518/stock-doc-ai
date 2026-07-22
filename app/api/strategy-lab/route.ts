import { NextResponse } from "next/server";
import { getStrategyLabSummary } from "@/lib/strategyLab";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const summary = await getStrategyLabSummary(Number(searchParams.get("days") ?? 30));
    return NextResponse.json({ ok: true, ...summary });
  } catch (error: unknown) {
    console.error("STRATEGY LAB ERROR:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
