import { NextResponse } from "next/server";
import { analyzeEtf, fetchEtfMetrics, getEtfMaster } from "@/lib/etf";
import { saveEtfSnapshots } from "@/lib/etf/etfSnapshot";
import { calculateMarketRegime, getMarketIndicators } from "@/lib/market";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const SECRET = process.env.SNAPSHOT_SECRET;

export async function GET(req: Request) {
  if (SECRET && (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim() !== SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const marketRaw = await getMarketIndicators();
    const market = calculateMarketRegime(marketRaw.indicators, marketRaw.warnings);
    const master = getEtfMaster({ enabledOnly: true });
    const settled = await Promise.allSettled(master.map(async (item) => analyzeEtf(item, await fetchEtfMetrics(item), market.regime)));
    const analyses = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const saved = await saveEtfSnapshots(analyses);
    return NextResponse.json({ ok: true, marketRegime: market.regime, analyzed: analyses.length, saved: saved.length, failed: settled.length - analyses.length });
  } catch (error) {
    return NextResponse.json({ error: "ETF snapshot failed", detail: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
