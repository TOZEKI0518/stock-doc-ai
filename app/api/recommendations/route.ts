import { NextResponse } from "next/server";
import { getTopRecommendations } from "@/lib/recommendations";

export async function GET() {
  try {
    const recommendations = await getTopRecommendations();
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("RECOMMENDATIONS API ERROR:", error);
    return NextResponse.json(
      { error: "推奨銘柄の取得に失敗しました。" },
      { status: 500 }
    );
  }
}
