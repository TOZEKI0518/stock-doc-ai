import type { MarketRegime } from "@/lib/market";
import { clamp, round } from "./indicators";
import { analyzeEtfShortTerm } from "./etfShortTermScoring";
import type { EtfAnalysis, EtfMasterItem, EtfPriceMetrics, EtfScoreBreakdown, EtfSignal } from "./etfTypes";

export const ETF_SCORE_VERSION = "1.0.0";

function trendScore(m: EtfPriceMetrics) {
  return clamp(50 + (m.distanceFromMa20 ?? 0) * 2 + (m.distanceFromMa50 ?? 0) * 1.5 + (m.distanceFromMa200 ?? 0));
}
function momentumScore(m: EtfPriceMetrics) {
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

function signalFrom(score: number, exitScore: number): EtfSignal {
  if (exitScore >= 75) return "EXIT";
  if (exitScore >= 60) return "REDUCE";
  if (score >= 78 && exitScore < 40) return "ACCUMULATE";
  if (score >= 58 && exitScore < 55) return "HOLD";
  return "WATCH";
}

export function analyzeEtf(item: EtfMasterItem, metrics: EtfPriceMetrics, marketRegime: MarketRegime): EtfAnalysis {
  const breakdown: EtfScoreBreakdown = {
    trend: round(trendScore(metrics)),
    momentum: round(momentumScore(metrics)),
    risk: round(riskScore(metrics)),
    liquidity: round(liquidityScore(metrics)),
    regimeFit: round(regimeFit(item, marketRegime)),
  };
  const score = round(breakdown.trend * 0.3 + breakdown.momentum * 0.25 + breakdown.risk * 0.2 + breakdown.liquidity * 0.15 + breakdown.regimeFit * 0.1, 1);
  const trendRisk = clamp(50 - (metrics.distanceFromMa50 ?? 0) * 4 - (metrics.distanceFromMa200 ?? 0) * 2);
  const momentumRisk = clamp(50 - (metrics.return20d ?? 0) * 3 - (metrics.return60d ?? 0));
  const drawdownRisk = clamp(Math.abs(Math.min(metrics.drawdownFromHigh ?? 0, 0)) * 5);
  const regimeRisk = marketRegime === "PANIC" ? 95 : marketRegime === "RISK_OFF" ? 75 : marketRegime === "NEUTRAL" ? 40 : 20;
  const exitScore = round(trendRisk * 0.35 + momentumRisk * 0.3 + drawdownRisk * 0.2 + regimeRisk * 0.15, 1);
  const reasons: string[] = [];
  if ((metrics.distanceFromMa50 ?? 0) > 0) reasons.push("50日移動平均を上回っています"); else reasons.push("50日移動平均を下回っています");
  if ((metrics.return20d ?? 0) > 0) reasons.push("20日モメンタムがプラスです"); else reasons.push("20日モメンタムが弱含みです");
  reasons.push(`Market Regimeは${marketRegime.replaceAll("_", " ")}です`);
  const shortTerm = analyzeEtfShortTerm(item, metrics, marketRegime);
  return {
    master: item, metrics, score, exitScore, signal: signalFrom(score, exitScore), breakdown, marketRegime, reasons, warnings: [], scoreVersion: ETF_SCORE_VERSION,
    shortTermScore: shortTerm.score, shortTermSignal: shortTerm.signal, shortTermBreakdown: shortTerm.breakdown,
    shortTermOverheatPenalty: shortTerm.overheatPenalty, shortTermReasons: shortTerm.reasons, shortTermScoreVersion: shortTerm.scoreVersion,
  };
}
