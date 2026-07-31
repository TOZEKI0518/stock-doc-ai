"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { MarketRegimeResult } from "@/lib/market";

function signed(value: number | null, digits = 1) {
  if (value === null) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function scoreTextClass(score: number) {
  if (score >= 60) return "text-emerald-300";
  if (score <= 40) return "text-red-300";
  return "text-amber-300";
}

export default function MarketPage() {
  const [data, setData] = useState<MarketRegimeResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/market-regime", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("market regime api failed");
        return (await res.json()) as MarketRegimeResult;
      })
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError("市場データを取得できませんでした。");
      });
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl p-5 pb-12">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-300">StockDoc AI Pro</p>
            <h1 className="text-3xl font-bold">Market Regime</h1>
            <p className="mt-1 text-sm text-slate-400">市場環境を7指標で定量評価</p>
          </div>
          <Link href="/" className="rounded-xl border border-slate-700 px-3 py-2 text-sm">
            ← ホーム
          </Link>
        </div>

        {error && <div className="rounded-2xl border border-red-800 bg-red-950 p-4">{error}</div>}
        {!data && !error && <div className="rounded-2xl bg-slate-900 p-6">読み込み中...</div>}

        {data && (
          <>
            <section className="mb-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 md:col-span-2">
                <div className="text-sm text-slate-400">Current Regime</div>
                <div className="mt-1 text-4xl font-black">{data.regimeLabel}</div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full bg-emerald-500" style={{ width: `${data.score}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>Panic</span><span>Neutral</span><span>Strong Risk ON</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Market Score</div>
                <div className="mt-1 text-5xl font-black">{data.score.toFixed(1)}</div>
                <div className="mt-3 text-sm text-slate-300">Confidence {data.confidence.toFixed(1)}%</div>
                <div className="mt-1 text-xs text-slate-500">基準日 {data.marketDate}</div>
              </div>
            </section>

            <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-3 text-lg font-bold">Market Drivers</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {data.drivers.map((driver) => (
                  <div key={driver.key} className="rounded-xl bg-slate-800 p-4">
                    <div className="font-bold">{driver.label}</div>
                    <div className={`mt-1 text-sm ${driver.direction === "POSITIVE" ? "text-emerald-300" : driver.direction === "NEGATIVE" ? "text-red-300" : "text-amber-300"}`}>
                      {driver.direction}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">{driver.summary}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-lg font-bold">Indicator Details</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {data.indicatorScores.map((item) => {
                  const indicator = data.indicators.find((row) => row.key === item.key);
                  return (
                    <div key={item.key} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold">{item.label}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.summary}</div>
                        </div>
                        <div className={`text-2xl font-black ${scoreTextClass(item.score)}`}>
                          {item.available ? item.score.toFixed(0) : "-"}
                        </div>
                      </div>
                      {indicator && (
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-lg bg-slate-800 p-2"><div className="text-slate-500">Price</div><div className="mt-1 font-bold">{indicator.price.toLocaleString()}</div></div>
                          <div className="rounded-lg bg-slate-800 p-2"><div className="text-slate-500">1 Day</div><div className="mt-1 font-bold">{signed(indicator.changePercent1d)}</div></div>
                          <div className="rounded-lg bg-slate-800 p-2"><div className="text-slate-500">20 Days</div><div className="mt-1 font-bold">{signed(indicator.return20d)}</div></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {data.warnings.length > 0 && (
              <div className="mt-5 rounded-2xl border border-amber-800 bg-amber-950/50 p-4 text-sm text-amber-200">
                <div className="mb-1 font-bold">Data warnings</div>
                {data.warnings.map((warning) => <div key={warning}>{warning}</div>)}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
