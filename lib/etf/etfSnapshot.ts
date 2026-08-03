import { supabaseAdmin } from "@/lib/supabase";
import type { EtfAnalysis } from "./etfTypes";

export async function saveEtfSnapshots(items: EtfAnalysis[]) {
  if (!items.length) return [];
  const rows = items.map((item) => ({
    snapshot_date: item.metrics.asOf.slice(0, 10), symbol: item.master.symbol, yahoo_symbol: item.master.yahooSymbol,
    name: item.master.name, category: item.master.category, strategy: item.master.strategy, price: item.metrics.price,
    etf_score: item.score, exit_score: item.exitScore, signal: item.signal, market_regime: item.marketRegime,
    return_20d: item.metrics.return20d, return_60d: item.metrics.return60d, return_120d: item.metrics.return120d,
    distance_ma20: item.metrics.distanceFromMa20, distance_ma50: item.metrics.distanceFromMa50,
    distance_ma200: item.metrics.distanceFromMa200, volatility_20d: item.metrics.volatility20d,
    drawdown_from_high: item.metrics.drawdownFromHigh, average_volume_20d: item.metrics.averageVolume20d,
    breakdown: item.breakdown, reasons: item.reasons, score_version: item.scoreVersion, generated_at: new Date().toISOString(),
  }));
  const { data, error } = await supabaseAdmin.from("etf_snapshots").upsert(rows, { onConflict: "snapshot_date,symbol" }).select();
  if (error) throw new Error(error.message);
  return data ?? [];
}
