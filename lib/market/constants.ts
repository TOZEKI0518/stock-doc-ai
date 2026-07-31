import type { MarketIndicatorKey, MarketRegime } from "./marketTypes";

export const MARKET_SYMBOLS: Record<
  MarketIndicatorKey,
  { symbol: string; fallbackSymbols?: string[]; label: string; weight: number }
> = {
  sp500: { symbol: "^GSPC", label: "S&P 500", weight: 20 },
  nasdaq: { symbol: "^IXIC", label: "NASDAQ Composite", weight: 20 },
  vix: { symbol: "^VIX", label: "VIX", weight: 20 },
  usdJpy: { symbol: "JPY=X", label: "USD/JPY", weight: 10 },
  us10y: { symbol: "^TNX", label: "US 10Y Yield", weight: 10 },
  nikkei225: { symbol: "^N225", label: "Nikkei 225", weight: 10 },
  topix: {
    symbol: "^TOPX",
    fallbackSymbols: ["1306.T"],
    label: "TOPIX",
    weight: 10,
  },
};

export const MARKET_SCORE_VERSION = "1.0.0";

export function classifyRegime(score: number): MarketRegime {
  if (score >= 80) return "STRONG_RISK_ON";
  if (score >= 60) return "RISK_ON";
  if (score >= 40) return "NEUTRAL";
  if (score >= 20) return "RISK_OFF";
  return "PANIC";
}

export const REGIME_LABELS: Record<MarketRegime, string> = {
  STRONG_RISK_ON: "Strong Risk ON",
  RISK_ON: "Risk ON",
  NEUTRAL: "Neutral",
  RISK_OFF: "Risk OFF",
  PANIC: "Panic",
};
