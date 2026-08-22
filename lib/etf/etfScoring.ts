import { classifyDiversification, evaluateEtfCompliance } from "./etfCompliance";
import { analyzeEtfRebound } from "./etfRebound";
import type { MarketRegime } from "@/lib/market";
import { clamp, round } from "./indicators";
import { analyzeEtfShortTerm } from "./etfShortTermScoring";
import type { EtfAnalysis, EtfMasterItem, EtfPriceMetrics, EtfScoreBreakdown, EtfSignal } from "./etfTypes";

export const ETF_SCORE_VERSION = "2.0.0";
export const ETF_SCORE_V1_VERSION = "1.0.0";

function trendScoreV1(m: EtfPriceMetrics) {
  return clamp(50 + (m.distanceFromMa20 ?? 0) * 2 + (m.distanceFromMa50 ?? 0) * 1.5 + (m.distanceFromMa200 ?? 0));
}
function momentumScoreV1(m: EtfPriceMetrics) {
  return clamp(50 + (m.return20d ?? 0) * 2 + (m.return60d ?? 0) + (m.return120d ?? 0) * 0.5);
}
function riskScore(m: EtfPriceMetrics) {
  return clamp(85 - Math.max(0, m.volatility20d ?? 25) * 1.2 + (m.drawdownFromHigh ?? -5) * 1.5);
}
function liquidityScore(m: EtfPriceMetrics) {
  const volume = m.averageVolume20d ?? 0;
  return clamp(30 + Math.log10(Math.max(volume, 1)) * 12);
}
function regimeFit(item: EtfMasterItem, regime: MarketRegime) {
  const growth = ["GROWTH", "TECH"].includes(item.category);
  const defensive = ["DIVIDEND", "DEFENSIVE", "CORE"].includes(item.category);
  if (regime === "STRONG_RISK_ON") return growth ? 95 : 75;
  if (regime === "RISK_ON") return growth ? 85 : 75;
  if (regime === "NEUTRAL") return item.category === "CORE" || item.category === "DIVIDEND" ? 85 : 65;
  if (regime === "RISK_OFF") return defensive ? 75 : 35;
  return defensive ? 50 : 15;
}

function trendScoreV2(m: EtfPriceMetrics) {
  // Keep medium-term trend quality, but cap the reward for being far above moving averages.
  const ma50 = m.distanceFromMa50 ?? 0;
  const ma200 = m.distanceFromMa200 ?? 0;
  const ma20 = m.distanceFromMa20 ?? 0;
  const healthy50 = Math.max(-12, Math.min(8, ma50));
  const healthy200 = Math.max(-18, Math.min(15, ma200));
  const healthy20 = Math.max(-8, Math.min(5, ma20));
  return clamp(50 + healthy20 * 1.4 + healthy50 * 1.6 + healthy200 * 0.8);
}

function momentumScoreV2(m: EtfPriceMetrics) {
  // Reward positive medium-term momentum, but stop giving extra credit to runaway 20d moves.
  const r20 = Math.max(-12, Math.min(8, m.return20d ?? 0));
  const r60 = Math.max(-20, Math.min(18, m.return60d ?? 0));
  const r120 = Math.max(-30, Math.min(28, m.return120d ?? 0));
  return clamp(50 + r20 * 1.5 + r60 * 0.8 + r120 * 0.35);
}

function overextensionPenalty(m: EtfPriceMetrics) {
  const ma20 = m.distanceFromMa20 ?? 0;
  const ma50 = m.distanceFromMa50 ?? 0;
  const r7 = m.return7d ?? 0;
  const r20 = m.return20d ?? 0;

  // Penalty starts only after a healthy trend has become stretched.
  const pMa20 = Math.max(0, ma20 - 5) * 2.2;
  const pMa50 = Math.max(0, ma50 - 10) * 1.2;
  const p7 = Math.max(0, r7 - 6) * 1.5;
  const p20 = Math.max(0, r20 - 12) * 0.8;
  return clamp(pMa20 + pMa50 + p7 + p20, 0, 25);
}

function calculateV1Score(m: EtfPriceMetrics, item: EtfMasterItem, regime: MarketRegime) {
  const breakdown: EtfScoreBreakdown = {
    trend: round(trendScoreV1(m)),
    momentum: round(momentumScoreV1(m)),
    risk: round(riskScore(m)),
    liquidity: round(liquidityScore(m)),
    regimeFit: round(regimeFit(item, regime)),
  };
  const score = round(
    breakdown.trend * 0.3 +
    breakdown.momentum * 0.25 +
    breakdown.risk * 0.2 +
    breakdown.liquidity * 0.15 +
    breakdown.regimeFit * 0.1,
    1
  );
  return { score, breakdown };
}

function signalFrom(score: number, exitScore: number): EtfSignal {
  if (exitScore >= 75) return "EXIT";
  if (exitScore >= 60) return "REDUCE";
  if (score >= 78 && exitScore < 40) return "ACCUMULATE";
  if (score >= 58 && exitScore < 55) return "HOLD";
  return "WATCH";
}

export function analyzeEtf(item: EtfMasterItem, metrics: EtfPriceMetrics, marketRegime: MarketRegime): EtfAnalysis {
  const legacy = calculateV1Score(metrics, item, marketRegime);
  const breakdown: EtfScoreBreakdown = {
    trend: round(trendScoreV2(metrics)),
    momentum: round(momentumScoreV2(metrics)),
    risk: round(riskScore(metrics)),
    liquidity: round(liquidityScore(metrics)),
    regimeFit: round(regimeFit(item, marketRegime)),
  };
  const baseScore = round(
    breakdown.trend * 0.3 +
    breakdown.momentum * 0.25 +
    breakdown.risk * 0.2 +
    breakdown.liquidity * 0.15 +
    breakdown.regimeFit * 0.1,
    1
  );
  const overextension = round(overextensionPenalty(metrics), 1);
  const score = round(clamp(baseScore - overextension), 1);
  const trendRisk = clamp(50 - (metrics.distanceFromMa50 ?? 0) * 4 - (metrics.distanceFromMa200 ?? 0) * 2);
  const momentumRisk = clamp(50 - (metrics.return20d ?? 0) * 3 - (metrics.return60d ?? 0));
  const drawdownRisk = clamp(Math.abs(Math.min(metrics.drawdownFromHigh ?? 0, 0)) * 5);
  const regimeRisk = marketRegime === "PANIC" ? 95 : marketRegime === "RISK_OFF" ? 75 : marketRegime === "NEUTRAL" ? 40 : 20;
  const exitScore = round(trendRisk * 0.35 + momentumRisk * 0.3 + drawdownRisk * 0.2 + regimeRisk * 0.15, 1);
  const reasons: string[] = [];
  if ((metrics.distanceFromMa50 ?? 0) > 0) reasons.push("50日移動平均を上回っています"); else reasons.push("50日移動平均を下回っています");
  if ((metrics.return20d ?? 0) > 0) reasons.push("20日モメンタムがプラスです"); else reasons.push("20日モメンタムが弱含みです");
  reasons.push(`Market Regimeは${marketRegime.replaceAll("_", " ")}です`);
  if (overextension > 0) reasons.push(`上昇過熱ペナルティ -${overextension.toFixed(1)}点です`);
  const shortTerm = analyzeEtfShortTerm(item, metrics, marketRegime);
  const compliance = evaluateEtfCompliance(item);
  const diversification = classifyDiversification(item);
  const rebound = analyzeEtfRebound(metrics, marketRegime);

  return {
    master: item, compliance, diversificationType: diversification.type, diversificationScore: diversification.score, rebound, metrics,
    score, legacyScore: legacy.score, overextensionPenalty: overextension,
    exitScore, signal: signalFrom(score, exitScore), breakdown, marketRegime, reasons, warnings: [], scoreVersion: ETF_SCORE_VERSION, legacyScoreVersion: ETF_SCORE_V1_VERSION,
    shortTermScore: shortTerm.score, shortTermSignal: shortTerm.signal, shortTermBreakdown: shortTerm.breakdown,
    shortTermOverheatPenalty: shortTerm.overheatPenalty, shortTermReasons: shortTerm.reasons, shortTermScoreVersion: shortTerm.scoreVersion,
  };
}
