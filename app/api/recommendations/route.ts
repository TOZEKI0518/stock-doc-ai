import { NextResponse } from "next/server";
import { getTopRecommendations } from "@/lib/recommendations";

export async function GET() {
const recommendations =
await getTopRecommendations();

return NextResponse.json(
recommendations
);
}
