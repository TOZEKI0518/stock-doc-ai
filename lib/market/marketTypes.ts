export type MarketIndicatorKey =
  | "sp500"
  | "nasdaq"
  | "vix"
  | "usdJpy"
  | "us10y"
  | "nikkei225"
  | "topix";

export type MarketRegime =
  | "STRONG_RISK_ON"
  | "RISK_ON"
  | "NEUTRAL"
  | "RISK_OFF"
  | "PANIC";

export type MarketDataPoint = {
  key: MarketIndicatorKey;
  symbol: string;
  label: string;
  asOf: string;
  price: number;
  previousClose: number | null;
  changePercent1d: number | null;
  return20d: number | null;
  return50d: number | null;
  movingAverage20: number | null;
  movingAverage50: number | null;
  distanceFromMa20: number | null;
  distanceFromMa50: number | null;
  sampleSize: number;
};

export type MarketIndicatorScore = {
  key: MarketIndicatorKey;
  label: string;
  score: number;
  weight: number;
  contribution: number;
  summary: string;
  available: boolean;
};

export type MarketDriver = {
  key: MarketIndicatorKey;
  label: string;
  contribution: number;
  direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  summary: string;
};

export type MarketRegimeResult = {
  generatedAt: string;
  marketDate: string;
  score: number;
  confidence: number;
  regime: MarketRegime;
  regimeLabel: string;
  indicators: MarketDataPoint[];
  indicatorScores: MarketIndicatorScore[];
  drivers: MarketDriver[];
  warnings: string[];
};
