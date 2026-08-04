import { NextResponse } from "next/server";
import { getEtfLearningSummary } from "@/lib/etfLearning";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") ?? 30);
    const summary = await getEtfLearningSummary(days);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("ETF LEARNING SUMMARY ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
