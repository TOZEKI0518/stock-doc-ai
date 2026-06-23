import { getStockData } from "./stockData";
import { calculateDetailedScore } from "./scoring";
import { STOCK_MASTER } from "./stockMaster";

export async function getTopRecommendations() {
  const targets = STOCK_MASTER.slice(0, 30);

  const results: {
    code: string;
    name: string;
    themes: string[];
    score: number;
  }[] = [];

  for (const stock of targets) {
    try {
      const data = await getStockData(stock.code);

      const score = calculateDetailedScore({
        per: data.per,
        pbr: data.pbr,
        dividendYield: data.dividendYield,
        changePercent: data.changePercent,
        volume: data.volume,
      });

      results.push({
        code: stock.code,
        name: stock.name,
        themes: stock.themes,
        score: score.total,
      });
    } catch (error) {
      console.error(`Recommendation failed: ${stock.code}`, error);
      continue;
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}