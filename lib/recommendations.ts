import { getStockData } from "./stockData";
import { calculateDetailedScore } from "./scoring";
import { STOCK_MASTER } from "./stockMaster";
import { calculateThemeScore } from "./themeScore";

type Recommendation = {
  code: string;
  name: string;
  themes: string[];
  score: number;
  baseScore: number;
  themeScore: number;
  reasons: string[];
};

function buildReasons(themes: string[], baseScore: number, themeScore: number) {
  const reasons: string[] = [];

  if (themeScore >= 85) {
    reasons.push("注目テーマ性が高い");
  }

  if (baseScore >= 80) {
    reasons.push("財務・株価指標の総合評価が高い");
  }

  const importantThemes = themes.filter((theme) =>
    [
      "AI",
      "生成AI",
      "半導体",
      "半導体材料",
      "半導体製造装置",
      "データセンター",
      "防衛",
      "電力",
      "原子力",
      "光ファイバー",
      "光配線",
      "高配当",
    ].includes(theme)
  );

  if (importantThemes.length > 0) {
    reasons.push(importantThemes.slice(0, 3).join(" / "));
  } else {
    reasons.push(themes.slice(0, 3).join(" / "));
  }

  return reasons.slice(0, 3);
}

export async function getTopRecommendations() {
  const targets = STOCK_MASTER.slice(0, 80);

  const results: Recommendation[] = [];

  for (const stock of targets) {
    try {
      const data = await getStockData(stock.code, {
        includeAdvanced: false,
        includeHistory: false,
      });

      const detailedScore = calculateDetailedScore({
        per: data.per,
        pbr: data.pbr,
        dividendYield: data.dividendYield,
        changePercent: data.changePercent,
        volume: data.volume,
      });

      const themeScore = calculateThemeScore(stock.themes);

      const finalScore = Math.round(
        detailedScore.total * 0.75 + themeScore * 0.25
      );

      results.push({
        code: stock.code,
        name: stock.name,
        themes: stock.themes,
        score: finalScore,
        baseScore: detailedScore.total,
        themeScore,
        reasons: buildReasons(stock.themes, detailedScore.total, themeScore),
      });
    } catch (error) {
      console.error(`Recommendation failed: ${stock.code}`, error);
      continue;
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}
