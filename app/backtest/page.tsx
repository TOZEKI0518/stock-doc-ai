"use client";

import { useState } from "react";
import Link from "next/link";

type BacktestStock = {
  code: string;
  name: string;
  themes: string[];
  score: number;
  baseScore: number;
  themeScore: number;
  startPrice: number;
  endPrice: number;
  returnPct: number;
};

type BacktestResult = {
  months: number;
  universeSize: number;
  analyzedCount: number;
  topN: number;
  selectedAverageReturn: number;
  universeAverageReturn: number;
  excessReturn: number;
  selectedWinRate: number;
  selectedMedianReturn: number;
  universeMedianReturn: number;
  selected: BacktestStock[];
  best: BacktestStock[];
  note: string;
};

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function returnColor(value: number) {
  if (value >= 20) return "text-emerald-300";
  if (value >= 0) return "text-green-300";
  if (value >= -10) return "text-yellow-300";
  return "text-red-300";
}

export default function BacktestPage() {
  const [months, setMonths] = useState(12);
  const [topN, setTopN] = useState(10);
  const [universeSize, setUniverseSize] = useState(80);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const runBacktest = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setResult(null);

      const params = new URLSearchParams({
        months: String(months),
        topN: String(topN),
        universeSize: String(universeSize),
      });

      const res = await fetch(`/api/backtest?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("backtest api failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "バックテストの取得に失敗しました。少し時間を置いて再実行してください。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-md mx-auto p-6">
        <div className="mb-4">
          <Link href="/" className="text-emerald-300 underline">
            ← ホームへ戻る
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">バックテスト</h1>
        <p className="text-sm text-slate-300 mb-5">
          現在のスコアリングで選ばれる銘柄が、過去にどれくらい上がっていたかを簡易検証します。
        </p>

        <div className="space-y-4 rounded border border-slate-700 bg-slate-900 p-4">
          <label className="block">
            <span className="text-sm text-slate-200">検証期間</span>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-3 text-white"
            >
              <option value={6}>6ヶ月</option>
              <option value={12}>1年</option>
              <option value={24}>2年</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-slate-200">対象銘柄数</span>
            <select
              value={universeSize}
              onChange={(e) => setUniverseSize(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-3 text-white"
            >
              <option value={50}>50銘柄</option>
              <option value={80}>80銘柄</option>
              <option value={120}>120銘柄</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-slate-200">上位何銘柄を検証</span>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-3 text-white"
            >
              <option value={3}>上位3銘柄</option>
              <option value={5}>上位5銘柄</option>
              <option value={10}>上位10銘柄</option>
            </select>
          </label>

          <button
            onClick={runBacktest}
            disabled={loading}
            className="w-full rounded bg-emerald-600 p-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "検証中..." : "バックテスト開始"}
          </button>

          {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}
        </div>

        {result && (
          <div className="mt-6 space-y-5">
            <div className="rounded border border-emerald-700 bg-emerald-950 p-4">
              <h2 className="mb-3 text-xl font-bold">検証結果</h2>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded bg-slate-900 p-3">
                  <div className="text-slate-300">推奨銘柄平均</div>
                  <div
                    className={`text-xl font-bold ${returnColor(
                      result.selectedAverageReturn
                    )}`}
                  >
                    {formatPercent(result.selectedAverageReturn)}
                  </div>
                </div>

                <div className="rounded bg-slate-900 p-3">
                  <div className="text-slate-300">全体平均</div>
                  <div
                    className={`text-xl font-bold ${returnColor(
                      result.universeAverageReturn
                    )}`}
                  >
                    {formatPercent(result.universeAverageReturn)}
                  </div>
                </div>

                <div className="rounded bg-slate-900 p-3">
                  <div className="text-slate-300">超過リターン</div>
                  <div
                    className={`text-xl font-bold ${returnColor(
                      result.excessReturn
                    )}`}
                  >
                    {formatPercent(result.excessReturn)}
                  </div>
                </div>

                <div className="rounded bg-slate-900 p-3">
                  <div className="text-slate-300">勝率</div>
                  <div className="text-xl font-bold text-white">
                    {result.selectedWinRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-emerald-100">
                {result.note}
              </p>
            </div>

            <section className="rounded border border-slate-700 bg-slate-900 p-4">
              <h2 className="mb-3 text-lg font-bold">
                スコア上位 {result.topN} 銘柄の結果
              </h2>

              <div className="space-y-3">
                {result.selected.map((stock, index) => (
                  <div
                    key={stock.code}
                    className="rounded border border-slate-700 bg-slate-800 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold">
                          {index + 1}位 {stock.name}
                        </div>
                        <div className="text-xs text-slate-300">{stock.code}</div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-lg font-bold ${returnColor(
                            stock.returnPct
                          )}`}
                        >
                          {formatPercent(stock.returnPct)}
                        </div>
                        <div className="text-xs text-slate-300">
                          スコア {stock.score}点
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-300">
                      {formatPrice(stock.startPrice)}円 → {formatPrice(stock.endPrice)}円
                    </div>

                    <div className="mt-2 text-xs text-emerald-300">
                      {stock.themes.join(" / ")}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded border border-purple-700 bg-purple-950 p-4">
              <h2 className="mb-3 text-lg font-bold">実際に上がった銘柄 TOP10</h2>

              <div className="space-y-3">
                {result.best.map((stock, index) => (
                  <div
                    key={stock.code}
                    className="rounded border border-purple-700 bg-slate-900 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold">
                          {index + 1}位 {stock.name}
                        </div>
                        <div className="text-xs text-slate-300">{stock.code}</div>
                      </div>

                      <div className={`text-lg font-bold ${returnColor(stock.returnPct)}`}>
                        {formatPercent(stock.returnPct)}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-purple-100">
                      スコア {stock.score}点 / テーマ {stock.themeScore}点
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
