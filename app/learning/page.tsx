"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Bucket = {
  label: string;
  count: number;
  winRate: number;
  averageReturn: number;
  bestReturn: number;
  worstReturn: number;
};

type Trade = {
  code: string;
  name: string;
  baseDate: string;
  futureDate: string;
  basePrice: number;
  futurePrice: number;
  returnPercent: number;
  totalScore: number;
  recommendation: string;
  themeScore: number | null;
};

type LearningSummary = {
  ok: boolean;
  days: number;
  snapshotCount: number;
  tradeCount: number;
  overall: Bucket;
  highScore: Bucket;
  highTheme: Bucket;
  scoreBuckets: Bucket[];
  recommendationBuckets: Bucket[];
  topWinners: Trade[];
  topLosers: Trade[];
  error?: string;
};

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function SummaryCard({ title, bucket }: { title: string; bucket: Bucket }) {
  return (
    <div className="rounded border border-slate-700 bg-slate-900 p-4">
      <h2 className="font-bold text-white mb-2">{title}</h2>
      <div className="grid grid-cols-2 gap-2 text-sm text-slate-100">
        <div>件数: {bucket.count}</div>
        <div>勝率: {bucket.winRate.toFixed(1)}%</div>
        <div>平均: {formatPercent(bucket.averageReturn)}</div>
        <div>最大: {formatPercent(bucket.bestReturn)}</div>
        <div className="col-span-2">最悪: {formatPercent(bucket.worstReturn)}</div>
      </div>
    </div>
  );
}

function BucketTable({ title, buckets }: { title: string; buckets: Bucket[] }) {
  return (
    <div className="rounded border border-slate-700 bg-slate-900 p-4">
      <h2 className="font-bold text-white mb-3">{title}</h2>
      <div className="space-y-2">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="rounded bg-slate-800 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-bold text-white">{bucket.label}</span>
              <span className="text-slate-300">{bucket.count}件</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-slate-100">
              <div>勝率 {bucket.winRate.toFixed(1)}%</div>
              <div>平均 {formatPercent(bucket.averageReturn)}</div>
              <div>最大 {formatPercent(bucket.bestReturn)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradeList({ title, trades }: { title: string; trades: Trade[] }) {
  return (
    <div className="rounded border border-slate-700 bg-slate-900 p-4">
      <h2 className="font-bold text-white mb-3">{title}</h2>
      <div className="space-y-2">
        {trades.map((trade) => (
          <div key={`${trade.code}-${trade.baseDate}-${trade.futureDate}`} className="rounded bg-slate-800 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-bold text-white">{trade.code} {trade.name}</div>
                <div className="text-xs text-slate-300 mt-1">
                  {trade.baseDate} → {trade.futureDate}
                </div>
              </div>
              <div className={trade.returnPercent >= 0 ? "text-emerald-300 font-bold" : "text-red-300 font-bold"}>
                {formatPercent(trade.returnPercent)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-200">
              <div>スコア: {trade.totalScore}点</div>
              <div>判定: {trade.recommendation}</div>
              <div>基準価格: {trade.basePrice.toLocaleString()}</div>
              <div>将来価格: {trade.futurePrice.toLocaleString()}</div>
            </div>
          </div>
        ))}
        {trades.length === 0 && <p className="text-sm text-slate-300">データがありません。</p>}
      </div>
    </div>
  );
}

export default function LearningPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<LearningSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/learning-summary?days=${days}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "learning summary failed");
        }

        setData(json);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [days]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-md mx-auto p-6">
        <div className="mb-4">
          <Link href="/" className="text-emerald-300 underline">
            ← 株ドックAIへ戻る
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">AI学習レポート</h1>
        <p className="text-sm text-slate-300 mb-5">
          Supabaseに保存したスナップショットから、スコアと将来リターンの関係を確認します。
        </p>

        <div className="grid grid-cols-4 gap-2 mb-5">
          {[7, 30, 90, 180].map((value) => (
            <button
              key={value}
              onClick={() => setDays(value)}
              className={`rounded p-2 text-sm font-bold ${
                days === value
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-200 border border-slate-700"
              }`}
            >
              {value}日
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-slate-300">集計中...</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}

        {data && !loading && (
          <div className="space-y-4">
            <div className="rounded border border-blue-700 bg-blue-950 p-4 text-sm text-blue-50">
              <div>スナップショット件数: {data.snapshotCount}</div>
              <div>検証可能件数: {data.tradeCount}</div>
              <div>評価期間: {data.days}日後</div>
            </div>

            {data.tradeCount === 0 && (
              <div className="rounded border border-yellow-700 bg-yellow-950 p-4 text-sm text-yellow-50">
                まだ比較できる将来データがありません。毎日の自動保存が進むと、7日後・30日後・90日後・180日後の成績が表示されます。
              </div>
            )}

            <SummaryCard title="全体成績" bucket={data.overall} />
            <SummaryCard title="高スコア銘柄 80点以上" bucket={data.highScore} />
            <SummaryCard title="高テーマ銘柄 テーマ85点以上" bucket={data.highTheme} />

            <BucketTable title="スコア帯別成績" buckets={data.scoreBuckets} />
            <BucketTable title="判定別成績" buckets={data.recommendationBuckets} />

            <TradeList title="上昇率 上位" trades={data.topWinners} />
            <TradeList title="下落率 上位" trades={data.topLosers} />
          </div>
        )}
      </div>
    </main>
  );
}
