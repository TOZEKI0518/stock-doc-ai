import type { MarketRegime } from "@/lib/market";
import { clamp, round } from "./indicators";
import type {
  EtfMasterItem,
  EtfPriceMetrics,
  EtfShortTermBreakdown,
  EtfShortTermSignal,
} from "./etfTypes";

export const ETF_SHORT_TERM_SCORE_VERSION = "2.0.0";
export const ETF_SHORT_TERM_SCORE_V1_VERSION = "1.0.0";

function sweetSpot7dV1(return7d: number | null) {
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
function momentum20ScoreV1(m: EtfPriceMetrics) { return clamp(50 + (m.return20d ?? 0) * 4); }
function trendConfirmationScoreV1(m: EtfPriceMetrics) { return clamp(50 + (m.distanceFromMa20 ?? 0) * 3 + (m.distanceFromMa50 ?? 0) * 1.5); }
function accelerationScoreV1(m: EtfPriceMetrics) {
  const acceleration = (m.return7d ?? 0) * (20 / 7) - (m.return20d ?? 0);
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
function regimeFitV1(item: EtfMasterItem, regime: MarketRegime) {
  const growth = ["GROWTH", "TECH"].includes(item.category);
  const defensive = ["DIVIDEND", "DEFENSIVE", "CORE"].includes(item.category);
  if (regime === "STRONG_RISK_ON") return growth ? 95 : 80;
  if (regime === "RISK_ON") return growth ? 90 : 80;
  if (regime === "NEUTRAL") return defensive ? 80 : 65;
  if (regime === "RISK_OFF") return defensive ? 60 : 30;
  return defensive ? 35 : 10;
}
function overheatPenaltyV1(m: EtfPriceMetrics) {
  const r7 = m.return7d ?? 0;
  const ma20 = m.distanceFromMa20 ?? 0;
  let penalty = 0;
  if (r7 > 8) penalty += Math.min(25, (r7 - 8) * 3);
  if (ma20 > 8) penalty += Math.min(15, (ma20 - 8) * 1.5);
  return round(Math.min(35, penalty), 1);
}
function signalFromV1(score: number, penalty: number, m: EtfPriceMetrics, regime: MarketRegime): EtfShortTermSignal {
  const r7 = m.return7d ?? 0;
  if (regime === "PANIC" || score < 40) return "AVOID";
  if (r7 >= 12 || penalty >= 18) return "OVERHEATED";
  if (score >= 78 && penalty < 12) return "SHORT_BUY";
  if (score >= 65 && penalty < 18) return "READY";
  return "WAIT";
}

export function analyzeEtfShortTermV1(item: EtfMasterItem, metrics: EtfPriceMetrics, marketRegime: MarketRegime) {
  const breakdown: EtfShortTermBreakdown = {
    momentum7d: round(sweetSpot7dV1(metrics.return7d)), momentum20d: round(momentum20ScoreV1(metrics)),
    trend: round(trendConfirmationScoreV1(metrics)), acceleration: round(accelerationScoreV1(metrics)),
    risk: round(shortRiskScore(metrics)), regimeFit: round(regimeFitV1(item, marketRegime)), liquidity: round(liquidityScore(metrics)),
  };
  const raw = breakdown.momentum7d*.25 + breakdown.momentum20d*.15 + breakdown.trend*.2 + breakdown.acceleration*.15 + breakdown.risk*.1 + breakdown.regimeFit*.1 + breakdown.liquidity*.05;
  const penalty = overheatPenaltyV1(metrics);
  const score = round(clamp(raw - penalty), 1);
  return { score, signal: signalFromV1(score, penalty, metrics, marketRegime), breakdown, overheatPenalty: penalty, scoreVersion: ETF_SHORT_TERM_SCORE_V1_VERSION };
}

// v2: 250 historical observations showed v1 was strongly inverted: high scores underperformed.
// The new score looks for a controlled pullback / mean-reversion setup instead of chasing strength.
function pullbackScore(m: EtfPriceMetrics) {
  const r = m.return7d ?? 0;
  if (r <= -12) return 20;       // falling knife
  if (r <= -7) return 55 + (r + 12) * 7; // 20 -> 55
  if (r <= -2) return 90 + (r + 7) * 2;  // 90 -> 100
  if (r <= 1) return 100 - (r + 2) * 8;  // 100 -> 76
  if (r <= 5) return 76 - (r - 1) * 10;  // 76 -> 36
  if (r <= 10) return 36 - (r - 5) * 5;  // 36 -> 11
  return 5;
}
function meanReversionScore(m: EtfPriceMetrics) {
  const d = m.distanceFromMa20 ?? 0;
  if (d <= -12) return 20;
  if (d <= -6) return 55 + (d + 12) * 6;
  if (d <= -1) return 91 + (d + 6) * 1.8;
  if (d <= 2) return 100 - (d + 1) * 8;
  if (d <= 8) return 76 - (d - 2) * 9;
  return 15;
}
function stabilizationScore(m: EtfPriceMetrics) {
  const r7 = m.return7d ?? 0;
  const r20 = m.return20d ?? 0;
  // Positive value = the latest 7d pace is improving versus the prior 20d trend.
  const improvement = r7 - r20 * (7 / 20);
  return clamp(55 + improvement * 7);
}
function contextScore(m: EtfPriceMetrics) {
  const ma50 = m.distanceFromMa50 ?? 0;
  const r20 = m.return20d ?? 0;
  // Prefer a correction, not a structural collapse and not a far-extended uptrend.
  let score = 75;
  if (ma50 < -12) score -= Math.min(45, (-ma50 - 12) * 3);
  else if (ma50 < -6) score -= (-ma50 - 6) * 2;
  else if (ma50 > 8) score -= Math.min(45, (ma50 - 8) * 4);
  if (r20 < -15) score -= Math.min(30, (-r20 - 15) * 2);
  if (r20 > 15) score -= Math.min(30, (r20 - 15) * 2);
  return clamp(score);
}
function regimeFitV2(regime: MarketRegime) {
  // Historical sample: NEUTRAL materially outperformed RISK_ON. Keep regime influence modest.
  if (regime === "NEUTRAL") return 85;
  if (regime === "RISK_ON") return 60;
  if (regime === "STRONG_RISK_ON") return 50;
  if (regime === "RISK_OFF") return 45;
  return 20;
}
function dangerPenaltyV2(m: EtfPriceMetrics, regime: MarketRegime) {
  const r7 = m.return7d ?? 0, ma20 = m.distanceFromMa20 ?? 0, r20 = m.return20d ?? 0;
  let p = 0;
  if (r7 > 5) p += Math.min(25, (r7 - 5) * 3);
  if (ma20 > 5) p += Math.min(20, (ma20 - 5) * 2.5);
  if (r7 < -10) p += Math.min(20, (-r7 - 10) * 2);
  if (r20 < -18) p += Math.min(15, (-r20 - 18));
  if (regime === "PANIC") p += 20;
  return round(Math.min(45, p), 1);
}
function signalFromV2(score:number, penalty:number, m:EtfPriceMetrics, regime:MarketRegime):EtfShortTermSignal {
  const r7=m.return7d??0;
  if (r7 > 10 || (m.distanceFromMa20 ?? 0) > 9) return "OVERHEATED";
  if (regime === "PANIC" || penalty >= 35 || score < 40) return "AVOID";
  if (score >= 75 && penalty < 15) return "SHORT_BUY";
  if (score >= 62 && penalty < 22) return "READY";
  return "WAIT";
}

export function analyzeEtfShortTerm(item: EtfMasterItem, metrics: EtfPriceMetrics, marketRegime: MarketRegime) {
  const legacy = analyzeEtfShortTermV1(item, metrics, marketRegime);
  const pullback = round(pullbackScore(metrics));
  const meanReversion = round(meanReversionScore(metrics));
  const stabilization = round(stabilizationScore(metrics));
  const context = round(contextScore(metrics));
  const risk = round(shortRiskScore(metrics));
  const regime = round(regimeFitV2(marketRegime));
  const liquidity = round(liquidityScore(metrics));
  const raw = pullback*.25 + meanReversion*.20 + stabilization*.20 + context*.10 + risk*.10 + regime*.10 + liquidity*.05;
  const penalty = dangerPenaltyV2(metrics, marketRegime);
  const score = round(clamp(raw - penalty), 1);
  const signal = signalFromV2(score, penalty, metrics, marketRegime);
  const reasons:string[]=[];
  const r7=metrics.return7d??0, ma20=metrics.distanceFromMa20??0;
  if (r7 >= -7 && r7 <= 1) reasons.push("7日騰落率が押し目・反発候補帯です");
  else if (r7 > 5) reasons.push("直近上昇が強く追いかけ買いを抑制します");
  else if (r7 < -10) reasons.push("下落が急で落ちるナイフに注意です");
  if (ma20 >= -6 && ma20 <= 1) reasons.push("20日線との乖離が平均回帰候補帯です");
  if (stabilization >= 65) reasons.push("7日ペースが20日トレンド比で改善しています");
  if (penalty > 0) reasons.push(`短期リスクPenalty ${penalty.toFixed(1)}点`);
  return {
    score, signal,
    breakdown: { momentum7d: pullback, momentum20d: meanReversion, trend: context, acceleration: stabilization, risk, regimeFit: regime, liquidity },
    overheatPenalty: penalty, reasons, scoreVersion: ETF_SHORT_TERM_SCORE_VERSION,
    legacyScore: legacy.score, legacySignal: legacy.signal, legacyScoreVersion: legacy.scoreVersion,
  };
}
