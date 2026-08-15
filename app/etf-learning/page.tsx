"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Bucket = {
  label: string;
  count: number;
  winRate: number;
  averageReturn: number;
  medianReturn: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number | null;
  bestReturn: number;
  worstReturn: number;
};

type Trade = {
  symbol: string;
  name: string;
  baseDate: string;
  futureDate: string;
  returnPercent: number;
  etfScore: number;
  signal: string;
};

type Factor = {
  key: string;
  label: string;
  high: Bucket;
  low: Bucket;
  spread: number;
};

type Payload = {
  ok: boolean;
  days: number;
  snapshotCount: number;
  tradeCount: number;
  latestSnapshotDate: string | null;
  latestSnapshotCount: number;
  dataStatus: { status: "normal" | "warning" | "empty"; label: string; daysBehind: number | null };
  overall: Bucket;
  highScore: Bucket;
  scoreBuckets: Bucket[];
  signalBuckets: Bucket[];
  categoryBuckets: Bucket[];
  regimeBuckets: Bucket[];
  etfBuckets: Bucket[];
  factorAnalysis: Factor[];
  insights: string[];
  topWinners: Trade[];
  topLosers: Trade[];
  error?: string;
};

function percent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function pf(value: number | null) {
  return value === null ? "∞" : value.toFixed(2);
}

function SummaryCard({ title, bucket }: { title: string; bucket: Bucket }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        <span className="text-xs text-slate-400">{bucket.count}件</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-slate-500">勝率</span><div className="font-bold">{bucket.winRate.toFixed(1)}%</div></div>
        <div><span className="text-slate-500">平均</span><div className="font-bold">{percent(bucket.averageReturn)}</div></div>
        <div><span className="text-slate-500">中央値</span><div className="font-bold">{percent(bucket.medianReturn)}</div></div>
        <div><span className="text-slate-500">PF</span><div className="font-bold">{pf(bucket.profitFactor)}</div></div>
        <div><span className="text-slate-500">最大</span><div className="font-bold text-emerald-300">{percent(bucket.bestReturn)}</div></div>
        <div><span className="text-slate-500">最悪</span><div className="font-bold text-red-300">{percent(bucket.worstReturn)}</div></div>
      </div>
    </section>
  );
}

function BucketList({ title, buckets }: { title: string; buckets: Bucket[] }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 font-bold">{title}</h2>
      <div className="space-y-2">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="rounded-xl bg-slate-950 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">{bucket.label}</span>
              <span className="text-xs text-slate-400">{bucket.count}件</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-300">
              <div>勝率 <b className="text-white">{bucket.winRate.toFixed(1)}%</b></div>
              <div>平均 <b className="text-white">{percent(bucket.averageReturn)}</b></div>
              <div>PF <b className="text-white">{pf(bucket.profitFactor)}</b></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function EtfLearningPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/etf-learning-summary?days=${days}`, { cache: "no-store" });
        const json = await response.json();
        if (!response.ok || !json.ok) throw new Error(json.error ?? "ETF Learning API failed");
        setData(json);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [days]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl p-5 pb-12">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-emerald-300">StockDoc AI Pro</p>
            <h1 className="text-3xl font-bold">ETF Learning Report</h1>
            <p className="mt-1 text-sm text-slate-400">ETF Score・Signal・Market Regimeと将来リターンの関係を検証</p>
          </div>
          <div className="flex gap-2">
            <Link href="/etf-short-learning" className="rounded-xl border border-cyan-700 px-3 py-2 text-sm text-cyan-300">短期Learning →</Link>
            <Link href="/etf" className="rounded-xl border border-slate-700 px-3 py-2 text-sm">← ETF</Link>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-4 gap-2">
          {[7, 30, 90, 180].map((value) => (
            <button key={value} onClick={() => setDays(value)} className={`rounded-xl p-2 text-sm font-bold ${days === value ? "bg-emerald-500 text-slate-950" : "border border-slate-700 bg-slate-900 text-slate-300"}`}>
              {value}日
            </button>
          ))}
        </div>

        {loading && <div className="rounded-2xl bg-slate-900 p-5 text-slate-300">Learningデータを集計中...</div>}
        {error && <div className="rounded-2xl border border-red-800 bg-red-950 p-4 text-red-200">{error}</div>}

        {data && !loading && (
          <div className="space-y-4">
            <section className={`rounded-2xl border p-4 text-sm ${data.dataStatus.status === "normal" ? "border-emerald-800 bg-emerald-950/40" : data.dataStatus.status === "warning" ? "border-amber-800 bg-amber-950/40" : "border-slate-700 bg-slate-900"}`}>
              <div className="flex items-center justify-between"><b>データ更新状況</b><b>{data.dataStatus.label}</b></div>
              <div className="mt-2 grid gap-1 text-slate-300 sm:grid-cols-4">
                <div>最新日: {data.latestSnapshotDate ?? "なし"}</div>
                <div>最新日件数: {data.latestSnapshotCount}</div>
                <div>累計Snapshot: {data.snapshotCount}</div>
                <div>検証可能: {data.tradeCount}</div>
              </div>
            </section>

            {data.tradeCount === 0 && (
              <section className="rounded-2xl border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-100">
                {days}日後の価格がまだ存在しないため、検証結果は0件です。これは正常です。ETF Snapshotが蓄積されると自動的に集計されます。
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <SummaryCard title="全ETF" bucket={data.overall} />
              <SummaryCard title="Score 70以上" bucket={data.highScore} />
            </div>

            <section className="rounded-2xl border border-emerald-900 bg-emerald-950/30 p-4">
              <h2 className="mb-3 font-bold text-emerald-200">Learning Insight</h2>
              <div className="space-y-2 text-sm text-slate-200">{data.insights.map((insight) => <p key={insight}>• {insight}</p>)}</div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <BucketList title="Score帯別" buckets={data.scoreBuckets} />
              <BucketList title="Signal別" buckets={data.signalBuckets} />
              <BucketList title="カテゴリー別" buckets={data.categoryBuckets} />
              <BucketList title="Market Regime別" buckets={data.regimeBuckets} />
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="mb-3 font-bold">ファクター検証</h2>
              <p className="mb-3 text-xs text-slate-400">各ファクター70点以上と50点未満の平均リターン差を比較します。配点は変更しません。</p>
              <div className="space-y-2">
                {data.factorAnalysis.map((factor) => (
                  <div key={factor.key} className="rounded-xl bg-slate-950 p-3">
                    <div className="flex items-center justify-between gap-3"><b>{factor.label}</b><b className={factor.spread >= 0 ? "text-emerald-300" : "text-red-300"}>{factor.spread >= 0 ? "+" : ""}{factor.spread.toFixed(2)}pt</b></div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div>70以上: {factor.high.count}件 / {percent(factor.high.averageReturn)}</div>
                      <div>50未満: {factor.low.count}件 / {percent(factor.low.averageReturn)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <BucketList title="ETF別成績" buckets={data.etfBuckets} />
          </div>
        )}
      </div>
    </main>
  );
}
