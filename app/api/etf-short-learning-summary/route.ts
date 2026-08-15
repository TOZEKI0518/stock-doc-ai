import { NextResponse } from "next/server";
import { getEtfShortTermLearningSummary } from "@/lib/etfShortTermLearning";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const summary = await getEtfShortTermLearningSummary();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("ETF SHORT LEARNING SUMMARY ERROR:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
