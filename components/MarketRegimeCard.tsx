"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { MarketRegimeResult } from "@/lib/market";

const regimeStyle: Record<string, { icon: string; className: string }> = {
  STRONG_RISK_ON: {
    icon: "🚀",
    className: "border-emerald-500/50 bg-emerald-950/70 text-emerald-100",
  },
  RISK_ON: {
    icon: "🟢",
    className: "border-green-500/50 bg-green-950/70 text-green-100",
  },
  NEUTRAL: {
    icon: "🟡",
    className: "border-amber-500/50 bg-amber-950/70 text-amber-100",
  },
  RISK_OFF: {
    icon: "🟠",
    className: "border-orange-500/50 bg-orange-950/70 text-orange-100",
  },
  PANIC: {
    icon: "🔴",
    className: "border-red-500/50 bg-red-950/70 text-red-100",
  },
};

function directionIcon(direction: string) {
  if (direction === "POSITIVE") return "↗";
  if (direction === "NEGATIVE") return "↘";
  return "→";
}

export default function MarketRegimeCard() {
  const [data, setData] = useState<MarketRegimeResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/market-regime", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("market regime api failed");
        return (await res.json()) as MarketRegimeResult;
      })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        console.error(err);
        if (active) setError("市場データを取得できませんでした。");
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="mb-5 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mb-5 animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-3 h-4 w-28 rounded bg-slate-700" />
        <div className="mb-4 h-8 w-40 rounded bg-slate-700" />
        <div className="h-16 rounded bg-slate-800" />
      </div>
    );
  }

  const style = regimeStyle[data.regime] ?? regimeStyle.NEUTRAL;

  return (
    <Link
      href="/market"
      className={`mb-5 block rounded-2xl border p-5 shadow-lg transition hover:-translate-y-0.5 ${style.className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">
            Today&apos;s Market
          </div>
          <div className="mt-1 text-2xl font-bold">
            {style.icon} {data.regimeLabel}
          </div>
          <div className="mt-1 text-xs opacity-75">基準日 {data.marketDate}</div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-75">Market Score</div>
          <div className="text-3xl font-black">{data.score.toFixed(1)}</div>
          <div className="text-xs opacity-75">信頼度 {data.confidence.toFixed(1)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {data.drivers.slice(0, 3).map((driver) => (
          <div key={driver.key} className="rounded-xl bg-black/20 p-2.5">
            <div className="truncate text-xs font-bold">
              {directionIcon(driver.direction)} {driver.label}
            </div>
            <div className="mt-1 line-clamp-2 text-[10px] leading-4 opacity-75">
              {driver.summary}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-right text-xs font-bold opacity-80">詳細を見る →</div>
    </Link>
  );
}
