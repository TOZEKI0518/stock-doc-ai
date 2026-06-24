"use client";

import { useState } from "react";
import Link from "next/link";

type BacktestStock = {
  code: string;
  name: string;
  score: number;
  buyPrice: number;
  sellPrice: number;
  returnPercent: number;
  momentumScore: number;
  volumeScore: number;
  trendScore: number;
  themeScore: number;
  reasons: string[];
};

type BacktestResult = {
  baseDate: string;
  sellDate: string;
  universeSize: number;
  topN: number;
  selectedAverage: number;
  allAverage: number;
  winRate: number;
  selected: BacktestStock[];
};

export default function HistoricalBacktestPage() {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [monthsAgo, setMonthsAgo] = useState(12);
  const [holdingMonths, setHoldingMonths] = useState(6);
  const [topN, setTopN] = useState(10);
  const [universeSize, setUniverseSize] = useState(120);
  const [error, setError] = useState("");

  const runBacktest = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);

      const params = new URLSearchParams({
        monthsAgo: String(monthsAgo),
        holdingMonths: String(holdingMonths),
        topN: String(topN),
        universeSize: String(universeSize),
      });

      const res = await fetch(`/api/historical-backtest?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail ?? "backtest failed");
      }

      setResult(data);
    } catch (error) {
      console.error(error);
      setError("バックテストに失敗しました。対象銘柄数を減らして再実行してください。");
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;
  const formatNumber = (value: number) => value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-md mx-auto p-6">
        <Link href="/" className="text-emerald-300 underline">
          ← ホームへ戻る
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-2">過去データバックテスト</h1>
        <p className="text-sm text-slate-300 mb-5">
          過去時点の株価・出来高・移動平均・テーマ性だけでランキングを作り、
          その後のリターンを検証します。
        </p>

        <div className="p-4 border border-slate-700 bg-slate-900 rounded space-y-4">
          <label className="block">
            <span className="text-sm text-slate-200">何ヶ月前を基準日にするか</span>
            <select
              value={monthsAgo}
              onChange={(e) => setMonthsAgo(Number(e.target.value))}
              className="mt-1 w-full p-3 rounded bg-slate-800 border border-slate-600 text-white"
            >
              <option value={6}>6ヶ月前</option>
              <option value={12}>1年前</option>
              <option value={18}>1年半前</option>
              <option value={24}>2年前</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-slate-200">保有期間</span>
            <select
              value={holdingMonths}
              onChange={(e) => setHoldingMonths(Number(e.target.value))}
              className="mt-1 w-full p-3 rounded bg-slate-800 border border-slate-600 text-white"
            >
              <option value={3}>3ヶ月</option>
              <option value={6}>6ヶ月</option>
              <option value={12}>1年</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-slate-200">上位何銘柄を買うか</span>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="mt-1 w-full p-3 rounded bg-slate-800 border border-slate-600 text-white"
            >
              <option value={3}>上位3銘柄</option>
              <option value={5}>上位5銘柄</option>
              <option value={10}>上位10銘柄</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-slate-200">検証対象銘柄数</span>
            <select
              value={universeSize}
              onChange={(e) => setUniverseSize(Number(e.target.value))}
              className="mt-1 w-full p-3 rounded bg-slate-800 border border-slate-600 text-white"
            >
              <option value={50}>50銘柄</option>
              <option value={80}>80銘柄</option>
              <option value={120}>120銘柄</option>
              <option value={180}>180銘柄</option>
            </select>
          </label>

          <button
            onClick={runBacktest}
            disabled={loading}
            className="w-full p-3 rounded bg-emerald-600 hover:bg-emerald-500 font-bold disabled:opacity-50"
          >
            {loading ? "検証中..." : "バックテスト実行"}
          </button>
        </div>

        {error && (
          <p className="mt-4 p-3 rounded bg-red-950 border border-red-700 text-red-100 text-sm">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded border border-emerald-700 bg-emerald-950">
              <h2 className="font-bold text-lg">検証結果</h2>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <p>基準日: {result.baseDate}</p>
                <p>売却日: {result.sellDate}</p>
                <p>対象数: {result.universeSize}</p>
                <p>購入数: {result.topN}</p>
                <p>上位平均: {formatPercent(result.selectedAverage)}</p>
                <p>全体平均: {formatPercent(result.allAverage)}</p>
                <p>勝率: {formatPercent(result.winRate)}</p>
              </div>
            </div>

            <div className="p-4 rounded border border-slate-700 bg-slate-900">
              <h2 className="font-bold text-lg mb-3">当時の推奨銘柄</h2>
              <div className="space-y-3">
                {result.selected.map((stock, index) => (
                  <div
                    key={stock.code}
                    className="p-3 rounded border border-slate-700 bg-slate-800"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-bold">
                          {index + 1}位 {stock.name}
                        </p>
                        <p className="text-xs text-slate-300">{stock.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-300">
                          {stock.score}点
                        </p>
                        <p
                          className={
                            stock.returnPercent >= 0
                              ? "text-sm text-emerald-300"
                              : "text-sm text-red-300"
                          }
                        >
                          {formatPercent(stock.returnPercent)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-200 mt-3">
                      <p>買値: {formatNumber(stock.buyPrice)}</p>
                      <p>売値: {formatNumber(stock.sellPrice)}</p>
                      <p>勢い: {stock.momentumScore}点</p>
                      <p>トレンド: {stock.trendScore}点</p>
                      <p>出来高: {stock.volumeScore}点</p>
                      <p>テーマ: {stock.themeScore}点</p>
                    </div>

                    <ul className="text-xs text-slate-200 leading-5 mt-3">
                      {stock.reasons.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-5">
              注意：これは過去株価・出来高・テーマ分類だけを使った簡易的な過去時点バックテストです。
              過去時点のPER、PBR、ROE、決算予想は無料データでは完全再現していません。
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
