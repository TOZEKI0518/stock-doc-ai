import YahooFinance from "yahoo-finance2";

import { MARKET_SYMBOLS } from "./constants";
import { average, percentChange, round } from "./indicators";
import type {
  MarketDataPoint,
  MarketIndicatorKey,
} from "./marketTypes";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

type QuoteRow = {
  date: Date;
  close: number;
};

function validQuotes(
  quotes: Array<{ date?: Date; close?: number | null }>
): QuoteRow[] {
  return quotes
    .filter(
      (quote): quote is QuoteRow =>
        quote.date instanceof Date &&
        typeof quote.close === "number" &&
        Number.isFinite(quote.close)
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

async function fetchChart(symbol: string) {
  const period1 = new Date();
  period1.setDate(period1.getDate() - 140);

  return yahooFinance.chart(symbol, {
    period1,
    period2: new Date(),
    interval: "1d",
    return: "array",
  });
}

async function fetchIndicator(
  key: MarketIndicatorKey
): Promise<MarketDataPoint> {
  const config = MARKET_SYMBOLS[key];
  const candidates = [config.symbol, ...(config.fallbackSymbols ?? [])];
  let lastError: unknown = null;

  for (const symbol of candidates) {
    try {
      const chart = await fetchChart(symbol);
      const quotes = validQuotes(chart.quotes);
      if (quotes.length === 0) {
        throw new Error(`No chart data returned for ${symbol}`);
      }

      const closes = quotes.map((quote) => quote.close);
      const latest = quotes.at(-1)!;
      const previousClose = closes.at(-2) ?? null;
      const close20dAgo = closes.length >= 21 ? closes.at(-21) ?? null : null;
      const close50dAgo = closes.length >= 51 ? closes.at(-51) ?? null : null;
      const ma20 = average(closes.slice(-20));
      const ma50 = average(closes.slice(-50));

      return {
        key,
        symbol,
        label: config.label,
        asOf: latest.date.toISOString(),
        price: round(latest.close, 4),
        previousClose: previousClose === null ? null : round(previousClose, 4),
        changePercent1d: percentChange(latest.close, previousClose),
        return20d: percentChange(latest.close, close20dAgo),
        return50d: percentChange(latest.close, close50dAgo),
        movingAverage20: ma20 === null ? null : round(ma20, 4),
        movingAverage50: ma50 === null ? null : round(ma50, 4),
        distanceFromMa20: percentChange(latest.close, ma20),
        distanceFromMa50: percentChange(latest.close, ma50),
        sampleSize: quotes.length,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Market data fetch failed for ${config.label}`);
}

export async function getMarketIndicators(): Promise<{
  indicators: MarketDataPoint[];
  warnings: string[];
}> {
  const keys = Object.keys(MARKET_SYMBOLS) as MarketIndicatorKey[];
  const settled = await Promise.allSettled(keys.map(fetchIndicator));
  const indicators: MarketDataPoint[] = [];
  const warnings: string[] = [];

  settled.forEach((result, index) => {
    const key = keys[index];
    if (result.status === "fulfilled") {
      indicators.push(result.value);
      return;
    }

    warnings.push(
      `${MARKET_SYMBOLS[key].label}: ${
        result.reason instanceof Error
          ? result.reason.message
          : "Unknown data fetch error"
      }`
    );
  });

  return { indicators, warnings };
}
