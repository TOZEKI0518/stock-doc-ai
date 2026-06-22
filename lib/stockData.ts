import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function getStockData(ticker: string) {
  const cleanTicker = ticker.replace(".T", "").trim();
  const symbol = `${cleanTicker}.T`;

  const quote = await yahooFinance.quote(symbol);

  return {
    ticker: cleanTicker,
    symbol,
    companyName: quote.longName ?? quote.shortName ?? symbol,
    price: quote.regularMarketPrice ?? null,
    changePercent: quote.regularMarketChangePercent ?? null,
    marketCap: quote.marketCap ?? null,
    volume: quote.regularMarketVolume ?? null,
    per: quote.trailingPE ?? null,
    pbr: quote.priceToBook ?? null,
    dividendYield: quote.trailingAnnualDividendYield ?? null,
    currency: quote.currency ?? "JPY",
  };
}