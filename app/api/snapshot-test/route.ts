import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  // テストデータを保存
  const { error: insertError } = await supabaseAdmin
    .from("snapshots")
    .upsert({
      snapshot_date: new Date().toISOString().slice(0, 10),
      code: "7203",
      name: "トヨタ自動車",
      price: 2700,
      per: 10,
      pbr: 1.2,
      roe: 14,
      dividend: 3.2,
      volume: 1000000,
      total_score: 88,
      recommendation: "Strong Buy",
    });

  if (insertError) {
    return NextResponse.json({
      ok: false,
      step: "insert",
      error: insertError.message,
    });
  }

  // 保存されたデータ取得
  const { data, error } = await supabaseAdmin
    .from("snapshots")
    .select("*")
    .eq("code", "7203")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({
      ok: false,
      step: "select",
      error: error.message,
    });
  }

  return NextResponse.json({
    ok: true,
    count: data.length,
    data,
  });
}