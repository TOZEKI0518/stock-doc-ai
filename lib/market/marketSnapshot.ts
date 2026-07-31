import { supabaseAdmin } from "@/lib/supabase";

import { MARKET_SCORE_VERSION } from "./constants";
import type { MarketRegimeResult } from "./marketTypes";

export type MarketSnapshotSaveResult = {
  marketDate: string;
  score: number;
  regime: string;
};

function findIndicator(result: MarketRegimeResult, key: string) {
  return result.indicators.find((item) => item.key === key) ?? null;
}

export async function saveMarketSnapshot(
  result: MarketRegimeResult
): Promise<MarketSnapshotSaveResult> {
  const row = {
    market_date: result.marketDate,
    generated_at: result.generatedAt,
    score_version: MARKET_SCORE_VERSION,
    market_score: result.score,
    confidence: result.confidence,
    regime: result.regime,
    regime_label: result.regimeLabel,
    sp500_price: findIndicator(result, "sp500")?.price ?? null,
    sp500_return_20d: findIndicator(result, "sp500")?.return20d ?? null,
    nasdaq_price: findIndicator(result, "nasdaq")?.price ?? null,
    nasdaq_return_20d: findIndicator(result, "nasdaq")?.return20d ?? null,
    vix_price: findIndicator(result, "vix")?.price ?? null,
    usd_jpy_price: findIndicator(result, "usdJpy")?.price ?? null,
    us10y_yield: findIndicator(result, "us10y")?.price ?? null,
    nikkei225_price: findIndicator(result, "nikkei225")?.price ?? null,
    nikkei225_return_20d: findIndicator(result, "nikkei225")?.return20d ?? null,
    topix_price: findIndicator(result, "topix")?.price ?? null,
    topix_return_20d: findIndicator(result, "topix")?.return20d ?? null,
    indicators: result.indicators,
    indicator_scores: result.indicatorScores,
    drivers: result.drivers,
    warnings: result.warnings,
  };

  const { error } = await supabaseAdmin
    .from("market_snapshots")
    .upsert(row, { onConflict: "market_date" });

  if (error) {
    throw new Error(`market_snapshots upsert failed: ${error.message}`);
  }

  return {
    marketDate: result.marketDate,
    score: result.score,
    regime: result.regime,
  };
}
