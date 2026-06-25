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
  rating: "Strong Buy" | "Buy";
  reasons: string[];
};

const IMPORTANT_THEMES = [
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
  "パワー半導体",
  "検査装置",
  "EUV",
  "DX",
  "ロボット",
  "FA",
  "水素",
  "金利上昇",
];

function buildReasons(themes: string[], baseScore: number, themeScore: number) {
  const reasons: string[] = [];

  if (baseScore >= 85) {
    reasons.push("財務・株価指標の総合評価が高い");
  } else if (baseScore >= 80) {
    reasons.push("財務・株価指標がBuy水準");
  }

  if (themeScore >= 85) {
    reasons.push("注目テーマ性が高い");
  } else if (themeScore >= 75) {
    reasons.push("テーマ性が良好");
  }

  const importantThemes = themes.filter((theme) =>
    IMPORTANT_THEMES.includes(theme)
  );

  if (importantThemes.length > 0) {
    reasons.push(importantThemes.slice(0, 3).join(" / "));
  } else {
    reasons.push(themes.slice(0, 3).join(" / "));
  }

  return reasons.slice(0, 3);
}

function hasImportantTheme(themes: string[]) {
  return themes.some((theme) => IMPORTANT_THEMES.includes(theme));
}

function getRecommendationRating(score: number): "Strong Buy" | "Buy" {
  return score >= 90 ? "Strong Buy" : "Buy";
}

export async function getTopRecommendations() {
  // 「今日の推奨銘柄」は、分析画面でHoldに見えにくいように、
  // 財務・株価指標のbaseScoreも重視します。
  const priorityTargets = STOCK_MASTER.filter((stock) =>
    hasImportantTheme(stock.themes)
  );

  const fallbackTargets = STOCK_MASTER.filter(
    (stock) => !hasImportantTheme(stock.themes)
  );

  // Vercelのタイムアウト回避のため、まずは重要テーマ銘柄を中心に最大100件。
  const targets = [...priorityTargets, ...fallbackTargets].slice(0, 100);

  const results: Recommendation[] = [];

  for (const stock of targets) {
    try {
      const data = await getStockData(stock.code, {
        // 推奨銘柄は精度重視。ROE、成長率、負債比率なども見る。
        includeAdvanced: true,
        // 履歴取得は重いので今日の推奨ではOFF。
        includeHistory: false,
      });

      const detailedScore = calculateDetailedScore({
        per: data.per,
        pbr: data.pbr,
        dividendYield: data.dividendYield,
        changePercent: data.changePercent,
        volume: data.volume,
        roe: data.roe,
        profitMargin: data.profitMargin,
        revenueGrowth: data.revenueGrowth,
        earningsGrowth: data.earningsGrowth,
        debtToEquity: data.debtToEquity,
        freeCashflow: data.freeCashflow,
        operatingCashflow: data.operatingCashflow,
      });

      const themeScore = calculateThemeScore(stock.themes);

      // テーマだけで高評価になりすぎないよう、baseScoreを強めにする。
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
        rating: getRecommendationRating(finalScore),
        reasons: buildReasons(stock.themes, detailedScore.total, themeScore),
      });
    } catch (error) {
      console.error(`Recommendation failed: ${stock.code}`, error);
      continue;
    }
  }

  return results
    // ここが重要。Hold水準を「今日の推奨銘柄」に出さない。
    .filter(
      (stock) =>
        stock.score >= 80 &&
        stock.baseScore >= 75 &&
        stock.themeScore >= 70
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.baseScore !== a.baseScore) return b.baseScore - a.baseScore;
      return b.themeScore - a.themeScore;
    })
    .slice(0, 5);
}
