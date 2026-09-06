"use client";

import Link from "next/link";
import MarketRegimeCard from "@/components/MarketRegimeCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-md p-5 pb-10">
        <div className="mb-5">
          <p className="mb-1 text-xs font-bold text-emerald-300">StockDoc AI Pro</p>
          <h1 className="mb-2 text-3xl font-bold">株ドックAI</h1>
          <p className="text-sm text-slate-300">
            市場環境を確認して、個別株とETFをそれぞれ専用のランキング・分析画面から確認できます。
          </p>
        </div>

        <MarketRegimeCard />

        <div className="mb-5 mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/stocks"
            className="rounded-2xl border border-emerald-700 bg-emerald-950 p-4 transition hover:border-emerald-400"
          >
            <div className="mb-2 text-2xl">📈</div>
            <div className="font-bold text-white">株ランキング</div>
            <div className="mt-1 text-xs leading-5 text-emerald-100">
              個別株分析・推奨銘柄・テンバガー候補
            </div>
          </Link>

          <Link
            href="/etf"
            className="rounded-2xl border border-cyan-700 bg-cyan-950 p-4 transition hover:border-cyan-400"
          >
            <div className="mb-2 text-2xl">📊</div>
            <div className="font-bold text-white">ETFランキング</div>
            <div className="mt-1 text-xs leading-5 text-cyan-100">
              ETF専用スコア・短期/中期分析
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/dashboard"
            className="rounded-2xl border border-blue-700 bg-blue-950 p-4"
          >
            <div className="mb-1 text-2xl">📊</div>
            <div className="font-bold text-white">ダッシュボード</div>
            <div className="mt-1 text-xs text-blue-100">共通メニュー</div>
          </Link>

          <Link
            href="/glossary"
            className="rounded-2xl border border-slate-700 bg-slate-900 p-4"
          >
            <div className="mb-1 text-2xl">📚</div>
            <div className="font-bold text-white">用語辞典</div>
            <div className="mt-1 text-xs text-slate-300">指標の意味</div>
          </Link>
        </div>
      </div>
    </main>
  );
}
