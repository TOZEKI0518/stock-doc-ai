"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { EtfAnalysis, EtfCategory } from "@/lib/etf";

type Payload = { marketRegime: string; marketScore: number; analyses: EtfAnalysis[]; warnings: string[] };
const categories: Array<{ value: "ALL" | EtfCategory; label: string }> = [
  { value: "ALL", label: "総合" }, { value: "CORE", label: "インデックス" }, { value: "GROWTH", label: "グロース" },
  { value: "TECH", label: "テクノロジー" }, { value: "DIVIDEND", label: "高配当" }, { value: "SECTOR", label: "セクター" },
];
function signed(value: number | null) { return value === null ? "-" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`; }
function signalClass(signal: string) { return signal === "ACCUMULATE" ? "text-emerald-300" : signal === "HOLD" ? "text-sky-300" : signal === "WATCH" ? "text-amber-300" : "text-red-300"; }

export default function EtfPage() {
  const [category, setCategory] = useState<"ALL" | EtfCategory>("ALL");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null); setError("");
    fetch(`/api/etf-ranking${category === "ALL" ? "" : `?category=${category}`}`, { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error("ETF API failed"); return r.json(); }).then(setData).catch(() => setError("ETFデータを取得できませんでした。"));
  }, [category]);
  return <main className="min-h-screen bg-slate-950 text-white"><div className="mx-auto max-w-6xl p-5 pb-12">
    <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-emerald-300">StockDoc AI Pro</p><h1 className="text-3xl font-bold">日本株ETFランキング</h1><p className="mt-1 text-sm text-slate-400">現物の国内株式ETFを専用ロジックで分析</p><Link href="/etf-learning" className="mt-2 inline-block text-sm font-bold text-emerald-300 underline">ETF Learning Report →</Link></div><Link href="/" className="rounded-xl border border-slate-700 px-3 py-2 text-sm">← ホーム</Link></div>
    <div className="mb-5 flex gap-2 overflow-x-auto pb-2">{categories.map((item) => <button key={item.value} onClick={() => setCategory(item.value)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${category === item.value ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}>{item.label}</button>)}</div>
    {error && <div className="rounded-2xl border border-red-800 bg-red-950 p-4">{error}</div>}
    {!data && !error && <div className="rounded-2xl bg-slate-900 p-6">ETFを分析中...</div>}
    {data && <><section className="mb-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><div className="text-xs text-slate-400">Market Regime</div><div className="mt-1 text-xl font-black">{data.marketRegime.replaceAll("_", " ")}</div></div><div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><div className="text-xs text-slate-400">Market Score</div><div className="mt-1 text-3xl font-black">{data.marketScore.toFixed(1)}</div></div><div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><div className="text-xs text-slate-400">分析ETF</div><div className="mt-1 text-3xl font-black">{data.analyses.length}</div></div></section>
    <div className="grid gap-3">{data.analyses.map((item, index) => <article key={item.master.symbol} className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 font-black">{index + 1}</div><div><div className="font-bold">{item.master.symbol} {item.master.shortName}</div><div className="mt-1 text-xs text-slate-500">{item.master.strategy} · {item.master.issuer}</div></div></div><div className="text-right"><div className="text-3xl font-black text-emerald-300">{item.score.toFixed(1)}</div><div className={`text-xs font-bold ${signalClass(item.signal)}`}>{item.signal}</div></div></div><div className="mt-4 grid grid-cols-4 gap-2 text-xs"><div className="rounded-lg bg-slate-950 p-2"><div className="text-slate-500">価格</div><div className="mt-1 font-bold">¥{item.metrics.price.toLocaleString()}</div></div><div className="rounded-lg bg-slate-950 p-2"><div className="text-slate-500">20日</div><div className="mt-1 font-bold">{signed(item.metrics.return20d)}</div></div><div className="rounded-lg bg-slate-950 p-2"><div className="text-slate-500">60日</div><div className="mt-1 font-bold">{signed(item.metrics.return60d)}</div></div><div className="rounded-lg bg-slate-950 p-2"><div className="text-slate-500">Exit</div><div className="mt-1 font-bold">{item.exitScore.toFixed(1)}</div></div></div><div className="mt-3 text-xs text-slate-400">{item.reasons.join(" / ")}</div></article>)}</div>
    {data.warnings?.length > 0 && <div className="mt-5 rounded-2xl border border-amber-800 bg-amber-950/40 p-4 text-xs text-amber-200">{data.warnings.join(" / ")}</div>}</>}
  </div></main>;
}
