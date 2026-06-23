import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

type StockDataOptions = {
  includeAdvanced?: boolean;
  includeHistory?: boolean;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calcChangePercent(current: number | null, past: number | null) {
  if (!current || !past || past === 0) return null;
  return ((current - past) / past) * 100;
}

async function getHistory(symbol: string) {
  const period1 = new Date();
  period1.setDate(period1.getDate() - 260);

  try {
    const history = await yahooFinance.historical(symbol, {
      period1,
      interval: "1d",
    });

    const sorted = history
      .filter((item) => typeof item.close === "number")
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const closes = sorted.map((item) => item.close as number);
    const volumes = sorted
      .map((item) => item.volume)
      .filter((value): value is number => typeof value === "number");

    const latestClose = closes.at(-1) ?? null;
    const close25 = average(closes.slice(-25));
    const close75 = average(closes.slice(-75));
    const close120 = closes.length >= 120 ? closes.at(-120) ?? null : null;
    const volume20 = average(volumes.slice(-20));

    return {
      ma25: close25,
      ma75: close75,
      volumeAvg20: volume20,
      ma25Gap: calcChangePercent(latestClose, close25),
      ma75Gap: calcChangePercent(latestClose, close75),
      sixMonthReturn: calcChangePercent(latestClose, close120),
    };
  } catch (error) {
    console.error(`Historical data failed: ${symbol}`, error);

    return {
      ma25: null,
      ma75: null,
      volumeAvg20: null,
      ma25Gap: null,
      ma75Gap: null,
      sixMonthReturn: null,
    };
  }
}

export async function getStockData(
  ticker: string,
  options: StockDataOptions = {}
) {
  const { includeAdvanced = true, includeHistory = true } = options;

  const cleanTicker = ticker.replace(".T", "").trim();
  const symbol = `${cleanTicker}.T`;

  const quote = await yahooFinance.quote(symbol);

  let advanced: any = {};

  if (includeAdvanced) {
    try {
      advanced = await yahooFinance.quoteSummary(symbol, {
        modules: [
          "price",
          "summaryDetail",
          "financialData",
          "defaultKeyStatistics",
        ],
      });
    } catch (error) {
      console.error(`Quote summary failed: ${symbol}`, error);
    }
  }

  const history = includeHistory ? await getHistory(symbol) : null;

  const price = toNumber(quote.regularMarketPrice);
  const fiftyTwoWeekHigh =
    toNumber((quote as any).fiftyTwoWeekHigh) ??
    toNumber(advanced?.summaryDetail?.fiftyTwoWeekHigh);
  const fiftyTwoWeekLow =
    toNumber((quote as any).fiftyTwoWeekLow) ??
    toNumber(advanced?.summaryDetail?.fiftyTwoWeekLow);

  return {
    ticker: cleanTicker,
    symbol,
    companyName: quote.longName ?? quote.shortName ?? symbol,
    price,
    changePercent: toNumber(quote.regularMarketChangePercent),
    marketCap:
      toNumber(quote.marketCap) ?? toNumber(advanced?.summaryDetail?.marketCap),
    volume: toNumber(quote.regularMarketVolume),
    per: toNumber(quote.trailingPE) ?? toNumber(advanced?.summaryDetail?.trailingPE),
    pbr:
      toNumber((quote as any).priceToBook) ??
      toNumber(advanced?.defaultKeyStatistics?.priceToBook),
    dividendYield:
      toNumber(quote.trailingAnnualDividendYield) ??
      toNumber(advanced?.summaryDetail?.dividendYield),
    currency: quote.currency ?? "JPY",

    // 半年保有向けに追加したファンダメンタル指標
    roe: toNumber(advanced?.financialData?.returnOnEquity),
    profitMargin: toNumber(advanced?.financialData?.profitMargins),
    revenueGrowth: toNumber(advanced?.financialData?.revenueGrowth),
    earningsGrowth: toNumber(advanced?.financialData?.earningsGrowth),
    debtToEquity: toNumber(advanced?.financialData?.debtToEquity),
    operatingCashflow: toNumber(advanced?.financialData?.operatingCashflow),
    freeCashflow: toNumber(advanced?.financialData?.freeCashflow),
    targetMeanPrice: toNumber(advanced?.financialData?.targetMeanPrice),

    // 過熱感・半年保有判断に使うテクニカル指標
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    fiftyTwoWeekHighGap: calcChangePercent(price, fiftyTwoWeekHigh),
    fiftyTwoWeekLowGap: calcChangePercent(price, fiftyTwoWeekLow),
    ma25: history?.ma25 ?? null,
    ma75: history?.ma75 ?? null,
    ma25Gap: history?.ma25Gap ?? null,
    ma75Gap: history?.ma75Gap ?? null,
    volumeAvg20: history?.volumeAvg20 ?? null,
    sixMonthReturn: history?.sixMonthReturn ?? null,
  };
}
