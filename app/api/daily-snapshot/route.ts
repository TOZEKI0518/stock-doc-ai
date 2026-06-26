import { NextResponse } from "next/server";
import { getStockData } from "@/lib/stockData";
import { calculateDetailedScore, getRating } from "@/lib/scoring";
import { STOCK_MASTER } from "@/lib/stockMaster";
import { calculateThemeScore } from "@/lib/themeScore";
import { supabaseAdmin } from "@/lib/supabase";

const SNAPSHOT_LIMIT = Number(process.env.SNAPSHOT_LIMIT ?? 120);
const SNAPSHOT_SECRET = process.env.SNAPSHOT_SECRET;

function todayJst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function toDividendPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function hasCronPermission(req: Request) {
  if (!SNAPSHOT_SECRET) return true;

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();
  return token === SNAPSHOT_SECRET;
}

export async function GET(req: Request) {
  if (!hasCronPermission(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const snapshotDate = todayJst();
  const targets = STOCK_MASTER.slice(0, SNAPSHOT_LIMIT);

  const snapshots = [];
  const recommendations = [];
  const errors: { code: string; message: string }[] = [];

  for (const stock of targets) {
    try {
      const data = await getStockData(stock.code, {
        includeAdvanced: true,
        includeHistory: true,
      });

      const scores = calculateDetailedScore({
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
        fiftyTwoWeekHighGap: data.fiftyTwoWeekHighGap,
        ma25Gap: data.ma25Gap,
        ma75Gap: data.ma75Gap,
        volumeAvg20: data.volumeAvg20,
        sixMonthReturn: data.sixMonthReturn,
      });

      const themeScore = calculateThemeScore(stock.themes);
      const totalScore = Math.round(scores.total * 0.85 + themeScore * 0.15);
      const rating = getRating(totalScore);

      snapshots.push({
        snapshot_date: snapshotDate,
        code: stock.code,
        name: stock.name,
        price: data.price,
        per: data.per,
        pbr: data.pbr,
        roe: data.roe,
        dividend: toDividendPercent(data.dividendYield),
        market_cap: data.marketCap,
        volume: data.volume,
        change_percent: data.changePercent,
        theme_score: themeScore,
        technical_score: Math.round(
          scores.momentum * 0.45 +
            scores.overheat * 0.35 +
            scores.sixMonthSuitability * 0.20
        ),
        fundamental_score: Math.round(
          scores.valuation * 0.20 +
            scores.dividend * 0.15 +
            scores.profitability * 0.25 +
            scores.growth * 0.25 +
            scores.safety * 0.15
        ),
        total_score: totalScore,
        recommendation: rating,
      });

      if (totalScore >= 80) {
        recommendations.push({
          recommendation_date: snapshotDate,
          code: stock.code,
          name: stock.name,
          score: totalScore,
          recommendation: rating,
          reason: stock.themes.slice(0, 4).join(" / "),
        });
      }
    } catch (error: any) {
      console.error(`Daily snapshot failed: ${stock.code}`, error);
      errors.push({
        code: stock.code,
        message: error?.message ?? String(error),
      });
    }
  }

  if (snapshots.length > 0) {
    const { error } = await supabaseAdmin
      .from("snapshots")
      .upsert(snapshots, {
        onConflict: "snapshot_date,code",
      });

    if (error) {
      return NextResponse.json(
        { error: "snapshots insert failed", detail: error.message },
        { status: 500 }
      );
    }
  }

  if (recommendations.length > 0) {
    const { error } = await supabaseAdmin
      .from("recommendations")
      .insert(recommendations);

    if (error) {
      return NextResponse.json(
        { error: "recommendations insert failed", detail: error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    snapshotDate,
    targetCount: targets.length,
    savedSnapshots: snapshots.length,
    savedRecommendations: recommendations.length,
    errors,
  });
}
