import type { MarketRegime } from "@/lib/market";

export type EtfCategory = "CORE" | "GROWTH" | "TECH" | "DIVIDEND" | "SECTOR" | "DEFENSIVE";
export type EtfSignal = "ACCUMULATE" | "HOLD" | "WATCH" | "REDUCE" | "EXIT";

export type EtfMasterItem = {
  symbol: string;
  yahooSymbol: string;
  name: string;
  shortName: string;
  issuer: string;
  category: EtfCategory;
  strategy: string;
  benchmark: string;
  enabled: boolean;
  priority: number;
  tags: string[];
};

export type EtfPriceMetrics = {
  asOf: string;
  price: number;
  previousClose: number | null;
  changePercent1d: number | null;
  return7d: number | null;
  return20d: number | null;
  return60d: number | null;
  return120d: number | null;
  movingAverage20: number | null;
  movingAverage50: number | null;
  movingAverage200: number | null;
  distanceFromMa20: number | null;
  distanceFromMa50: number | null;
  distanceFromMa200: number | null;
  volatility20d: number | null;
  drawdownFromHigh: number | null;
  averageVolume20d: number | null;
  sampleSize: number;
};

export type EtfScoreBreakdown = {
  trend: number;
  momentum: number;
  risk: number;
  liquidity: number;
  regimeFit: number;
};

export type EtfAnalysis = {
  master: EtfMasterItem;
  metrics: EtfPriceMetrics;
  score: number;
  exitScore: number;
  signal: EtfSignal;
  breakdown: EtfScoreBreakdown;
  marketRegime: MarketRegime;
  reasons: string[];
  warnings: string[];
  scoreVersion: string;
};

