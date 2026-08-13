import type { MarketRegime } from "@/lib/market";
import { clamp, round } from "./indicators";
import type {
  EtfMasterItem,
  EtfPriceMetrics,
  EtfShortTermBreakdown,
  EtfShortTermSignal,
} from "./etfTypes";

export const ETF_SHORT_TERM_SCORE_VERSION = "1.0.0";

function sweetSpot7d(return7d: number | null) {
  const r = return7d ?? 0;
  if (r < -6) return 10;
  if (r < -3) return 25;
  if (r < 0) return 45 + ((r + 3) / 3) * 15;
  if (r <= 2) return 70 + (r / 2) * 20;
  if (r <= 5) return 90 + ((r - 2) / 3) * 10;
  if (r <= 8) return 100 - ((r - 5) / 3) * 15;
  if (r <= 12) return 85 - ((r - 8) / 4) * 30;
  if (r <= 16) return 55 - ((r - 12) / 4) * 30;
  return 15;
}

function momentum20Score(m: EtfPriceMetrics) {
  const r = m.return20d ?? 0;
  return clamp(50 + r * 4);
}

function trendConfirmationScore(m: EtfPriceMetrics) {
  return clamp(
    50 +
      (m.distanceFromMa20 ?? 0) * 3 +
      (m.distanceFromMa50 ?? 0) * 1.5
  );
}

function accelerationScore(m: EtfPriceMetrics) {
  const r7 = m.return7d ?? 0;
  const r20 = m.return20d ?? 0;
  // 7-day momentum annualized to a 20-trading-day pace versus actual 20-day return.
  const acceleration = r7 * (20 / 7) - r20;
  return clamp(50 + acceleration * 4);
}

function shortRiskScore(m: EtfPriceMetrics) {
  const volatility = Math.max(0, m.volatility20d ?? 25);
  const drawdown = Math.abs(Math.min(m.drawdownFromHigh ?? 0, 0));
  return clamp(90 - volatility * 1.1 - drawdown * 2);
}

function liquidityScore(m: EtfPriceMetrics) {
  const volume = m.averageVolume20d ?? 0;
  return clamp(30 + Math.log10(Math.max(volume, 1)) * 12);
}

function regimeFit(item: EtfMasterItem, regime: MarketRegime) {
  const growth = ["GROWTH", "TECH"].includes(item.category);
  const defensive = ["DIVIDEND", "DEFENSIVE", "CORE"].includes(item.category);
  if (regime === "STRONG_RISK_ON") return growth ? 95 : 80;
  if (regime === "RISK_ON") return growth ? 90 : 80;
  if (regime === "NEUTRAL") return defensive ? 80 : 65;
  if (regime === "RISK_OFF") return defensive ? 60 : 30;
  return defensive ? 35 : 10;
}

function overheatPenalty(m: EtfPriceMetrics) {
  const r7 = m.return7d ?? 0;
  const ma20 = m.distanceFromMa20 ?? 0;
  let penalty = 0;
  if (r7 > 8) penalty += Math.min(25, (r7 - 8) * 3);
  if (ma20 > 8) penalty += Math.min(15, (ma20 - 8) * 1.5);
  return round(Math.min(35, penalty), 1);
}

function signalFrom(score: number, penalty: number, m: EtfPriceMetrics, regime: MarketRegime): EtfShortTermSignal {
  const r7 = m.return7d ?? 0;
  if (regime === "PANIC" || score < 40) return "AVOID";
  if (r7 >= 12 || penalty >= 18) return "OVERHEATED";
  if (score >= 78 && penalty < 12) return "SHORT_BUY";
  if (score >= 65 && penalty < 18) return "READY";
  return "WAIT";
}

export function analyzeEtfShortTerm(item: EtfMasterItem, metrics: EtfPriceMetrics, marketRegime: MarketRegime) {
  const breakdown: EtfShortTermBreakdown = {
    momentum7d: round(sweetSpot7d(metrics.return7d)),
    momentum20d: round(momentum20Score(metrics)),
    trend: round(trendConfirmationScore(metrics)),
    acceleration: round(accelerationScore(metrics)),
    risk: round(shortRiskScore(metrics)),
    regimeFit: round(regimeFit(item, marketRegime)),
    liquidity: round(liquidityScore(metrics)),
  };

  const rawScore =
    breakdown.momentum7d * 0.25 +
    breakdown.momentum20d * 0.15 +
    breakdown.trend * 0.2 +
    breakdown.acceleration * 0.15 +
    breakdown.risk * 0.1 +
    breakdown.regimeFit * 0.1 +
    breakdown.liquidity * 0.05;

  const penalty = overheatPenalty(metrics);
  const score = round(clamp(rawScore - penalty), 1);
  const signal = signalFrom(score, penalty, metrics, marketRegime);
  const reasons: string[] = [];
  const r7 = metrics.return7d ?? 0;
  if (r7 >= 0 && r7 <= 5) reasons.push("7日モメンタムが短期エントリーの適正帯です");
  else if (r7 > 12) reasons.push("7日上昇率が高く短期的な過熱に注意です");
  else if (r7 < 0) reasons.push("7日モメンタムはまだ弱めです");
  else reasons.push("7日モメンタムは強いですが過熱度を確認します");
  if ((metrics.return20d ?? 0) > 0) reasons.push("20日トレンドはプラスです");
  if (penalty > 0) reasons.push(`過熱ペナルティ ${penalty.toFixed(1)}点`);

  return { score, signal, breakdown, overheatPenalty: penalty, reasons, scoreVersion: ETF_SHORT_TERM_SCORE_VERSION };
}
