"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { EtfAnalysis, EtfCategory } from "@/lib/etf";

type Payload = {
  marketRegime: string;
  marketScore: number;
  analyses: EtfAnalysis[];
  warnings: string[];
};

const categories: Array<{
  value: "ALL" | EtfCategory;
  label: string;
}> = [
  { value: "ALL", label: "総合" },
  { value: "CORE", label: "インデックス" },
  { value: "GROWTH", label: "グロース" },
  { value: "TECH", label: "テクノロジー" },
  { value: "DIVIDEND", label: "高配当" },
  { value: "SECTOR", label: "セクター" },
];

function signed(value: number | null) {
  return value === null
    ? "-"
    : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function signalClass(signal: string) {
  return signal === "ACCUMULATE"
    ? "text-emerald-300"
    : signal === "HOLD"
      ? "text-sky-300"
      : signal === "WATCH"
        ? "text-amber-300"
        : "text-red-300";
}

export default function EtfPage() {
  const [category, setCategory] =
    useState<"ALL" | EtfCategory>("ALL");

  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");

    fetch(
      `/api/etf-ranking${
        category === "ALL" ? "" : `?category=${category}`
      }`,
      { cache: "no-store" }
    )
      .then(async (r) => {
        if (!r.ok) {
          throw new Error("ETF API failed");
        }

        return r.json();
      })
      .then(setData)
      .catch(() => {
        setError("ETFデータを取得できませんでした。");
      });
  }, [category]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold text-emerald-400">
            StockDoc AI Pro
          </p>

          <h1 className="text-3xl font-bold">
            日本株ETFランキング
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            現物の国内株式ETFを専用ロジックで分析
          </p>

          {/* Navigation */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              href="/"
              className="text-sm text-slate-400 transition hover:text-white"
            >
              ← ホーム
            </Link>

            <Link
              href="/etf-learning"
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              ETF Learning Report →
            </Link>
          </div>
        </div>

        {/* Category buttons */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {categories.map((item) => (
            <button
              key={item.value}
              onClick={() => setCategory(item.value)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                category === item.value
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {!data && !error && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            ETFを分析中...
          </div>
        )}

        {data && (
          <>
            {/* Market information */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-400">
                  Market Regime
                </p>

                <p className="mt-1 text-lg font-bold">
                  {data.marketRegime.replaceAll("_", " ")}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-400">
                  Market Score
                </p>

                <p className="mt-1 text-lg font-bold">
                  {data.marketScore.toFixed(1)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-400">
                  分析ETF
                </p>

                <p className="mt-1 text-lg font-bold">
                  {data.analyses.length}
                </p>
              </div>
            </div>

            {/* ETF Ranking */}
            <div className="space-y-3">
              {data.analyses.map((item, index) => (
                <div
                  key={item.master.symbol}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    {/* ETF name */}
                    <div className="min-w-0 lg:w-1/3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-500">
                          {index + 1}
                        </span>

                        <div>
                          <p className="font-bold">
                            {item.master.symbol}{" "}
                            {item.master.shortName}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.master.strategy} ·{" "}
                            {item.master.issuer}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-5">
                      <div>
                        <p className="text-xs text-slate-500">
                          Score
                        </p>

                        <p className="text-2xl font-bold">
                          {item.score.toFixed(1)}
                        </p>
                      </div>

                      <div
                        className={`text-xs font-bold ${signalClass(
                          item.signal
                        )}`}
                      >
                        {item.signal}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-5 gap-4 text-right">
                      <div>
                        <p className="text-xs text-slate-500">
                          価格
                        </p>

                        <p className="text-sm font-semibold">
                          ¥{item.metrics.price.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          7日
                        </p>

                        <p className="text-sm font-semibold">
                          {signed(item.metrics.return7d)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          20日
                        </p>

                        <p className="text-sm font-semibold">
                          {signed(item.metrics.return20d)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          60日
                        </p>

                        <p className="text-sm font-semibold">
                          {signed(item.metrics.return60d)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Exit
                        </p>

                        <p className="text-sm font-semibold">
                          {item.exitScore.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reasons */}
                  {item.reasons.length > 0 && (
                    <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
                      {item.reasons.join(" / ")}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Warnings */}
            {data.warnings?.length > 0 && (
              <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
                {data.warnings.join(" / ")}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}