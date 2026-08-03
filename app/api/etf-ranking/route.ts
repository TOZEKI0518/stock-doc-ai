import { NextResponse } from "next/server";
import { analyzeEtf, fetchEtfMetrics, getEtfMaster } from "@/lib/etf";
import type { EtfCategory } from "@/lib/etf";
import { calculateMarketRegime, getMarketIndicators } from "@/lib/market";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_CATEGORIES = new Set<EtfCategory>([
  "CORE",
  "GROWTH",
  "TECH",
  "DIVIDEND",
  "SECTOR",
  "DEFENSIVE",
]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requestedCategory = url.searchParams.get("category");
  const category = requestedCategory && VALID_CATEGORIES.has(requestedCategory as EtfCategory)
    ? (requestedCategory as EtfCategory)
    : null;

  const master = getEtfMaster({ enabledOnly: true, category });
  const marketData = await getMarketIndicators();
  const market = calculateMarketRegime(
    marketData.indicators,
    marketData.warnings
  );

  const settled = await Promise.allSettled(
    master.map(async (item) =>
      analyzeEtf(item, await fetchEtfMetrics(item), market.regime)
    )
  );

  const analyses = settled
    .flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
    .sort((a, b) => b.score - a.score);

  const warnings = settled.flatMap((result, index) =>
    result.status === "rejected"
      ? [
          `${master[index].symbol}: ${
            result.reason instanceof Error
              ? result.reason.message
              : "取得失敗"
          }`,
        ]
      : []
  );

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    marketRegime: market.regime,
    marketScore: market.score,
    count: analyses.length,
    analyses,
    warnings,
  });
}
