import { NextResponse } from "next/server";
import { getLearningSummary } from "@/lib/learning";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") ?? 30);
    const summary = await getLearningSummary(days);

    return NextResponse.json({ ok: true, ...summary });
  } catch (error: any) {
    console.error("LEARNING SUMMARY ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
