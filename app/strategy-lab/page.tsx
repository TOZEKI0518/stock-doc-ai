"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { StrategyMetric } from "@/lib/strategyLab";

type ResponseData = { ok: boolean; days: number; snapshotCount: number; tradeCount: number; latestSnapshotDate: string | null; scenarios: StrategyMetric[]; bestAverageReturn: string | null; bestProfitFactor: string | null; error?: string };
type Tab = "overview" | "performance" | "charts";

const percent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
const pf = (value: number | null) => value === null ? "∞" : value.toFixed(2);

function Bars({ scenarios, field, suffix }: { scenarios: StrategyMetric[]; field: "averageReturn" | "profitFactor"; suffix?: string }) {
  const values = scenarios.map((item) => field === "profitFactor" ? (item[field] ?? 0) : item[field]);
  const max = Math.max(...values.map(Math.abs), 1);
  return <div className="space-y-3">{scenarios.map((item) => {
    const value = field === "profitFactor" ? (item[field] ?? 0) : item[field];
    return <div key={item.id}>
      <div className="mb-1 flex justify-between text-xs"><span className="text-slate-200">{item.label}</span><span className="font-bold text-white">{field === "profitFactor" ? pf(item.profitFactor) : `${percent(value)}${suffix ?? ""}`}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${value >= 0 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${Math.max(2, Math.abs(value) / max * 100)}%` }} /></div>
    </div>;
  })}</div>;
}

function Curve({ scenario }: { scenario: StrategyMetric }) {
  const points = scenario.equityCurve;
  if (points.length < 2) return <p className="text-sm text-slate-400">グラフを描画できるだけのデータがありません。</p>;
  const values = points.map((point) => point.value); const min = Math.min(...values, 0); const max = Math.max(...values, 0); const range = Math.max(max - min, 1);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${(index / (points.length - 1)) * 100} ${100 - ((point.value - min) / range) * 100}`).join(" ");
  return <div><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-48 w-full overflow-visible"><line x1="0" x2="100" y1={100 - ((0 - min) / range) * 100} y2={100 - ((0 - min) / range) * 100} stroke="rgb(71 85 105)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke"/><path d={path} fill="none" stroke="rgb(16 185 129)" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg><div className="mt-2 flex justify-between text-xs text-slate-400"><span>{points[0].date}</span><span className={scenario.cumulativeReturn >= 0 ? "text-emerald-300" : "text-red-300"}>累積 {percent(scenario.cumulativeReturn)}</span><span>{points.at(-1)?.date}</span></div></div>;
}

export default function StrategyLabPage() {
  const [days, setDays] = useState(30); const [data, setData] = useState<ResponseData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [tab, setTab] = useState<Tab>("overview"); const [selectedId, setSelectedId] = useState("baseline");
  useEffect(() => { (async () => { try { setLoading(true); setError(""); const response = await fetch(`/api/strategy-lab?days=${days}`, { cache: "no-store" }); const json = await response.json(); if (!response.ok || !json.ok) throw new Error(json.error ?? "Strategy Labの取得に失敗しました"); setData(json); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); } })(); }, [days]);
  const selected = useMemo(() => data?.scenarios.find((item) => item.id === selectedId) ?? data?.scenarios[0], [data, selectedId]);
  const cards = data?.scenarios.slice(0, 4) ?? [];
  return <main className="min-h-screen bg-slate-950 text-white"><div className="mx-auto max-w-6xl p-4 pb-24 sm:p-6">
    <header className="mb-5"><Link href="/" className="text-sm text-emerald-300 underline">← 株ドックAIへ戻る</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">StockDoc AI Pro</p><h1 className="mt-1 text-3xl font-bold">Strategy Lab</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">保存済みSnapshotだけを使い、AI予測の投資戦略を比較・検証します。AIモデルとSnapshot保存処理は変更しません。</p></div><div className="text-right text-xs text-slate-400"><div>最新Snapshot: {data?.latestSnapshotDate ?? "-"}</div><div>分析対象: {data?.tradeCount.toLocaleString() ?? 0}件</div></div></div></header>
    <div className="mb-5 grid grid-cols-4 gap-2">{[7,30,90,180].map((value) => <button key={value} onClick={() => setDays(value)} className={`rounded-xl px-2 py-3 text-sm font-bold ${days === value ? "bg-emerald-600" : "border border-slate-700 bg-slate-900 text-slate-300"}`}>{value}日</button>)}</div>
    {loading && <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-slate-300">集計中...</div>}{error && <div className="rounded-xl border border-red-800 bg-red-950 p-5 text-red-200">{error}</div>}
    {data && !loading && <>
      <nav className="mb-5 grid grid-cols-3 gap-2 lg:hidden">{([['overview','概要'],['performance','成績'],['charts','グラフ']] as [Tab,string][]).map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-2 py-2 text-sm font-bold ${tab === id ? "bg-emerald-600" : "bg-slate-900 text-slate-300"}`}>{label}</button>)}</nav>
      <section className={`${tab !== "overview" ? "hidden lg:block" : ""}`}><div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`rounded-2xl border p-4 text-left ${selected?.id === item.id ? "border-emerald-500 bg-emerald-950/50" : "border-slate-700 bg-slate-900"}`}><div className="text-xs text-slate-400">{item.label}</div><div className={`mt-2 text-2xl font-bold ${item.averageReturn >= 0 ? "text-emerald-300" : "text-red-300"}`}>{percent(item.averageReturn)}</div><div className="mt-2 flex justify-between text-xs text-slate-300"><span>勝率 {item.winRate.toFixed(1)}%</span><span>PF {pf(item.profitFactor)}</span></div></button>)}</div></section>
      <section className={`grid gap-5 lg:grid-cols-[1fr_2fr] ${tab === "charts" ? "hidden lg:grid" : tab === "overview" ? "hidden lg:grid" : ""}`}><aside className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><h2 className="mb-3 font-bold">固定シナリオ</h2><div className="space-y-2">{data.scenarios.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl p-3 text-left ${selected?.id === item.id ? "bg-emerald-600" : "bg-slate-800 hover:bg-slate-700"}`}><div className="font-bold">{item.label}</div><div className="mt-1 text-xs opacity-80">{item.description}</div></button>)}</div></aside>
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-800 text-left text-xs text-slate-300"><tr>{["シナリオ","件数","勝率","平均リターン","平均利益","平均損失","PF","最大利益","最大損失"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{data.scenarios.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)} className={`cursor-pointer border-t border-slate-800 ${selected?.id === item.id ? "bg-emerald-950/40" : "hover:bg-slate-800/60"}`}><td className="px-4 py-3 font-bold">{item.label}</td><td className="px-4 py-3">{item.count}</td><td className="px-4 py-3">{item.winRate.toFixed(1)}%</td><td className={`px-4 py-3 font-bold ${item.averageReturn >= 0 ? "text-emerald-300" : "text-red-300"}`}>{percent(item.averageReturn)}</td><td className="px-4 py-3 text-emerald-300">{percent(item.averageWin)}</td><td className="px-4 py-3 text-red-300">{percent(item.averageLoss)}</td><td className="px-4 py-3">{pf(item.profitFactor)}</td><td className="px-4 py-3">{percent(item.bestReturn)}</td><td className="px-4 py-3">{percent(item.worstReturn)}</td></tr>)}</tbody></table></div></div></section>
      <section className={`mt-5 grid gap-5 lg:grid-cols-2 ${tab === "charts" || tab === "overview" ? "" : "hidden lg:grid"}`}><div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><h2 className="mb-4 font-bold">平均リターン比較</h2><Bars scenarios={data.scenarios} field="averageReturn" /></div><div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><h2 className="mb-4 font-bold">Profit Factor比較</h2><Bars scenarios={data.scenarios} field="profitFactor" /></div></section>
      {selected && <section className={`mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4 ${tab === "performance" ? "hidden lg:block" : ""}`}><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">{selected.label} 累積リターン</h2><p className="text-xs text-slate-400">各基準日の対象銘柄平均リターンを複利で接続</p></div><select value={selected.id} onChange={(e) => setSelectedId(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm">{data.scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div><Curve scenario={selected}/></section>}
    </>}
  </div></main>;
}
