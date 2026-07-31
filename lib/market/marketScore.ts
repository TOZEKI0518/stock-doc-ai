import {
  MARKET_SYMBOLS,
  REGIME_LABELS,
  classifyRegime,
} from "./constants";
import {
  clamp,
  round,
  scoreTrend,
  scoreUsdJpy,
  scoreUs10y,
  scoreVix,
} from "./indicators";
import type {
  MarketDataPoint,
  MarketDriver,
  MarketIndicatorKey,
  MarketIndicatorScore,
  MarketRegimeResult,
} from "./marketTypes";

function scoreIndicator(indicator: MarketDataPoint): number {
  switch (indicator.key) {
    case "vix":
      return scoreVix(indicator.price, indicator.changePercent1d);
    case "usdJpy":
      return scoreUsdJpy(
        indicator.return20d,
        indicator.distanceFromMa50
      );
    case "us10y":
      return scoreUs10y(indicator.price, indicator.return20d);
    default:
      return scoreTrend(
        indicator.return20d,
        indicator.distanceFromMa50
      );
  }
}

function describe(indicator: MarketDataPoint, score: number): string {
  const change = indicator.changePercent1d;
  const trend = indicator.distanceFromMa50;

  if (indicator.key === "vix") {
    return `VIX ${indicator.price.toFixed(1)}${
      change === null ? "" : ` (${change >= 0 ? "+" : ""}${change.toFixed(1)}%)`
    }`;
  }

  if (indicator.key === "us10y") {
    return `Yield ${indicator.price.toFixed(2)}%${
      indicator.return20d === null
        ? ""
        : `, 20d ${indicator.return20d >= 0 ? "+" : ""}${indicator.return20d.toFixed(1)}%`
    }`;
  }

  if (indicator.key === "usdJpy") {
    return `USD/JPY ${indicator.price.toFixed(2)}, FX stability score ${score.toFixed(0)}`;
  }

  return `20d ${
    indicator.return20d === null
      ? "n/a"
      : `${indicator.return20d >= 0 ? "+" : ""}${indicator.return20d.toFixed(1)}%`
  }, vs MA50 ${
    trend === null ? "n/a" : `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`
  }`;
}

function buildDrivers(scores: MarketIndicatorScore[]): MarketDriver[] {
  return [...scores]
    .sort(
      (a, b) =>
        Math.abs(b.contribution - b.weight * 0.5) -
        Math.abs(a.contribution - a.weight * 0.5)
    )
    .slice(0, 3)
    .map((item) => ({
      key: item.key,
      label: item.label,
      contribution: item.contribution,
      direction:
        item.score >= 58
          ? "POSITIVE"
          : item.score <= 42
            ? "NEGATIVE"
            : "NEUTRAL",
      summary: item.summary,
    }));
}

export function calculateMarketRegime(
  indicators: MarketDataPoint[],
  warnings: string[] = []
): MarketRegimeResult {
  const byKey = new Map(indicators.map((indicator) => [indicator.key, indicator]));
  const keys = Object.keys(MARKET_SYMBOLS) as MarketIndicatorKey[];

  const indicatorScores: MarketIndicatorScore[] = keys.map((key) => {
    const config = MARKET_SYMBOLS[key];
    const indicator = byKey.get(key);

    if (!indicator) {
      return {
        key,
        label: config.label,
        score: 50,
        weight: config.weight,
        contribution: 0,
        summary: "Data unavailable",
        available: false,
      };
    }

    const score = scoreIndicator(indicator);
    return {
      key,
      label: config.label,
      score,
      weight: config.weight,
      contribution: round((score / 100) * config.weight),
      summary: describe(indicator, score),
      available: true,
    };
  });

  const available = indicatorScores.filter((item) => item.available);
  const availableWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const contribution = available.reduce(
    (sum, item) => sum + item.contribution,
    0
  );
  const normalizedScore =
    availableWeight === 0 ? 50 : (contribution / availableWeight) * 100;
  const score = round(clamp(normalizedScore), 1);

  const completeness = availableWeight;
  const sampleConfidence =
    indicators.length === 0
      ? 0
      : indicators.reduce(
          (sum, item) => sum + Math.min(item.sampleSize / 50, 1),
          0
        ) / indicators.length;
  const confidence = round(
    clamp(completeness * 0.75 + sampleConfidence * 25),
    1
  );
  const regime = classifyRegime(score);
  const marketDate =
    indicators
      .map((item) => item.asOf)
      .sort()
      .at(-1)
      ?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    marketDate,
    score,
    confidence,
    regime,
    regimeLabel: REGIME_LABELS[regime],
    indicators,
    indicatorScores,
    drivers: buildDrivers(available),
    warnings,
  };
}
