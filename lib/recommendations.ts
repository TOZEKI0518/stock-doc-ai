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

  if (themeScore >= 85) {
    reasons.push("注目テーマ性が高い");
  }

  if (baseScore >= 75) {
    reasons.push("財務・株価指標の総合評価が高い");
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

export async function getTopRecommendations() {
  // 低スコア銘柄が無理に表示されないよう、注目テーマ銘柄を中心に全マスターから抽出します。
  // ただしVercelのタイムアウト回避のため、候補は最大120件に絞ります。
  const priorityTargets = STOCK_MASTER.filter((stock) =>
    hasImportantTheme(stock.themes)
  );

  const fallbackTargets = STOCK_MASTER.filter(
    (stock) => !hasImportantTheme(stock.themes)
  );

  const targets = [...priorityTargets, ...fallbackTargets].slice(0, 120);

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

      // 今日の推奨銘柄は「テーマ性」をやや強めに評価します。
      // 財務データの詳細取得を省いているため、baseScoreだけだと良いテーマ株が低く出やすいためです。
      const finalScore = Math.round(
        detailedScore.total * 0.55 + themeScore * 0.45
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

  return results
    .filter((stock) => stock.score >= 75 && stock.themeScore >= 75)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
