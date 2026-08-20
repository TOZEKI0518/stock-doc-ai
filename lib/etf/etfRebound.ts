import type { MarketRegime } from "@/lib/market";
import { clamp, round } from "./indicators";
import type { EtfPriceMetrics, EtfReboundResult, EtfReboundStatus } from "./etfTypes";

export const ETF_REBOUND_VERSION = "1.0.0";

function oversoldScore(m: EtfPriceMetrics) {
  const ma20 = m.distanceFromMa20 ?? 0;
  const dd = m.drawdownFromHigh ?? 0;
  const r20 = m.return20d ?? 0;
  return clamp(35 + Math.max(0, -ma20) * 5 + Math.max(0, -dd - 3) * 2 + Math.max(0, -r20) * 1.5);
}

function reversalScore(m: EtfPriceMetrics) {
  const d1 = m.changePercent1d ?? 0;
  const r7 = m.return7d ?? 0;
  const r20 = m.return20d ?? 0;
  const acceleration = r7 * (20 / 7) - r20;
  return clamp(45 + d1 * 8 + acceleration * 3);
}

function trendRepairScore(m: EtfPriceMetrics) {
  const ma20 = m.distanceFromMa20 ?? 0;
  const ma50 = m.distanceFromMa50 ?? 0;
  const r7 = m.return7d ?? 0;
  let score = 45;
  if (ma20 >= 0) score += 25; else score += Math.max(-20, ma20 * 4);
  if (ma50 >= 0) score += 15; else score += Math.max(-15, ma50 * 1.5);
  score += Math.max(-15, Math.min(15, r7 * 3));
  return clamp(score);
}

function regimeScore(regime: MarketRegime) {
  if (regime === "STRONG_RISK_ON") return 90;
  if (regime === "RISK_ON") return 82;
  if (regime === "NEUTRAL") return 65;
  if (regime === "RISK_OFF") return 38;
  return 15;
}

function statusFrom(score: number, m: EtfPriceMetrics): EtfReboundStatus {
  const r7 = m.return7d ?? 0;
  const ma20 = m.distanceFromMa20 ?? 0;
  const d1 = m.changePercent1d ?? 0;
  if (r7 > 10 && ma20 > 8) return "EXTENDED";
  if (score >= 75 && d1 > 0 && r7 > 0) return "CONFIRMED";
  if (score >= 58) return "PREPARING";
  if (ma20 <= -4 || (m.return20d ?? 0) <= -6) return "OVERSOLD";
  return "FALLING";
}

export function analyzeEtfRebound(metrics: EtfPriceMetrics, regime: MarketRegime): EtfReboundResult {
  const oversold = round(oversoldScore(metrics));
  const reversal = round(reversalScore(metrics));
  const repair = round(trendRepairScore(metrics));
  const regimeValue = round(regimeScore(regime));

  // Oversold is a setup, not a buy signal. Reversal + repair carry more weight.
  const score = round(
    oversold * 0.25 +
    reversal * 0.30 +
    repair * 0.30 +
    regimeValue * 0.15,
    1
  );
  const status = statusFrom(score, metrics);
  const reasons: string[] = [];

  if ((metrics.distanceFromMa20 ?? 0) <= -4) reasons.push("20日線から下方乖離し売られ過ぎ候補");
  if ((metrics.changePercent1d ?? 0) > 0) reasons.push("前日比がプラスに転換");
  if ((metrics.return7d ?? 0) > 0) reasons.push("7日モメンタムが改善");
  if ((metrics.distanceFromMa20 ?? 0) >= 0) reasons.push("20日線を回復");
  if (regime === "RISK_OFF" || regime === "PANIC") reasons.push("Market Regimeが反発の信頼度を抑制");
  if (!reasons.length) reasons.push("反発確認材料はまだ限定的");

  return {
    score,
    status,
    oversoldScore: oversold,
    reversalScore: reversal,
    trendRepairScore: repair,
    regimeScore: regimeValue,
    reasons,
  };
}
