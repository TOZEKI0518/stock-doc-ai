import YahooFinance from "yahoo-finance2";
import { annualizedVolatility, average, pct, round } from "./indicators";
import type { EtfMasterItem, EtfPriceMetrics } from "./etfTypes";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

type Row = { date: Date; close: number; volume: number | null };

export async function fetchEtfMetrics(item: EtfMasterItem): Promise<EtfPriceMetrics> {
  const period1 = new Date();
  period1.setDate(period1.getDate() - 420);
  const chart = await yahooFinance.chart(item.yahooSymbol, { period1, period2: new Date(), interval: "1d", return: "array" });
  const rows: Row[] = chart.quotes
    .filter((q): q is typeof q & { date: Date; close: number } => q.date instanceof Date && typeof q.close === "number" && Number.isFinite(q.close))
    .map((q) => ({ date: q.date, close: q.close, volume: typeof q.volume === "number" ? q.volume : null }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  if (!rows.length) throw new Error(`No price data for ${item.yahooSymbol}`);

  const closes = rows.map((row) => row.close);
  const latest = rows.at(-1)!;
  const ma20 = average(closes.slice(-20));
  const ma50 = average(closes.slice(-50));
  const ma200 = average(closes.slice(-200));
  const high120 = Math.max(...closes.slice(-120));
  const volumes = rows.slice(-20).map((row) => row.volume).filter((v): v is number => typeof v === "number");

  return {
    asOf: latest.date.toISOString(),
    price: round(latest.close, 4),
    previousClose: closes.at(-2) ?? null,
    changePercent1d: pct(latest.close, closes.at(-2) ?? null),
    return7d: pct(latest.close, closes.at(-8) ?? null),
    return20d: pct(latest.close, closes.at(-21) ?? null),
    return60d: pct(latest.close, closes.at(-61) ?? null),
    return120d: pct(latest.close, closes.at(-121) ?? null),
    movingAverage20: ma20,
    movingAverage50: ma50,
    movingAverage200: ma200,
    distanceFromMa20: pct(latest.close, ma20),
    distanceFromMa50: pct(latest.close, ma50),
    distanceFromMa200: pct(latest.close, ma200),
    volatility20d: annualizedVolatility(closes.slice(-21)),
    drawdownFromHigh: pct(latest.close, high120),
    averageVolume20d: average(volumes),
    sampleSize: rows.length,
  };
}

