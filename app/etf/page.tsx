"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { EtfAnalysis, EtfCategory } from "@/lib/etf";

type Payload = {
  marketRegime: string;
  marketScore: number;
  analyses: EtfAnalysis[];
  warnings: string[];
};

const categories: Array<{ value: "ALL" | EtfCategory; label: string }> = [
  { value: "ALL", label: "総合" },
  { value: "CORE", label: "インデックス" },
  { value: "GROWTH", label: "グロース" },
  { value: "TECH", label: "テクノロジー" },
  { value: "DIVIDEND", label: "高配当" },
  { value: "SECTOR", label: "セクター" },
];

function signed(value: number | null) {
  return value === null ? "-" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function shortSignalLabel(signal: string) {
  return signal === "SHORT_BUY"
    ? "短期BUY"
    : signal === "READY"
      ? "準備"
      : signal === "OVERHEATED"
        ? "過熱"
        : signal === "AVOID"
          ? "回避"
          : "待機";
}

function signalLabel(signal: string) {
  return signal === "ACCUMULATE"
    ? "BUY"
    : signal === "HOLD"
      ? "HOLD"
      : signal === "WATCH"
        ? "WATCH"
        : signal === "REDUCE"
          ? "REDUCE"
          : "EXIT";
}

function scoreBarClass(score: number) {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-green-500";
  if (score >= 55) return "bg-yellow-500";
  return "bg-red-500";
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

function shortSignalClass(signal: string) {
  return signal === "SHORT_BUY"
    ? "text-emerald-300"
    : signal === "READY"
      ? "text-cyan-300"
      : signal === "OVERHEATED"
        ? "text-orange-300"
        : signal === "AVOID"
          ? "text-red-300"
          : "text-amber-300";
}

function complianceLabel(status: string) {
  return status === "ELIGIBLE"
    ? "取引可"
    : status === "PRE_APPROVAL_REQUIRED"
      ? "事前承認"
      : status === "NOT_ELIGIBLE"
        ? "対象外"
        : "要確認";
}

function complianceClass(status: string) {
  return status === "ELIGIBLE"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : status === "PRE_APPROVAL_REQUIRED"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : status === "NOT_ELIGIBLE"
        ? "border-red-500/40 bg-red-500/10 text-red-300"
        : "border-slate-600 bg-slate-800 text-slate-300";
}

function reboundLabel(status: string) {
  return status === "CONFIRMED"
    ? "反発確認"
    : status === "PREPARING"
      ? "反発準備"
      : status === "OVERSOLD"
        ? "売られ過ぎ"
        : status === "EXTENDED"
          ? "上昇過熱"
          : "下落継続";
}

function reboundClass(status: string) {
  return status === "CONFIRMED"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : status === "PREPARING"
      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
      : status === "OVERSOLD"
        ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
        : status === "EXTENDED"
          ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
          : "border-slate-600 bg-slate-800 text-slate-300";
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm text-slate-100">
        <span>{label}</span>
        <span className="font-bold">{score.toFixed(0)}点</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full ${scoreBarClass(score)}`}
          style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function EtfPage() {
  const [category, setCategory] = useState<"ALL" | EtfCategory>("ALL");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [rankingMode, setRankingMode] = useState<"SHORT" | "MID">("SHORT");
  const [complianceFilter, setComplianceFilter] = useState<
    "ALL" | "ELIGIBLE" | "PRE_APPROVAL_REQUIRED" | "NOT_ELIGIBLE" | "UNKNOWN"
  >("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError("");

    fetch(`/api/etf-ranking${category === "ALL" ? "" : `?category=${category}`}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("ETF API failed");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("ETFデータを取得できませんでした。"));
  }, [category]);

  const visible = useMemo(() => {
    if (!data) return [];
    return [...data.analyses]
      .filter(
        (item) =>
          complianceFilter === "ALL" ||
          item.compliance.status === complianceFilter
      )
      .sort((a, b) =>
        rankingMode === "SHORT"
          ? b.shortTermScore - a.shortTermScore
          : b.score - a.score
      );
  }, [data, complianceFilter, rankingMode]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-md p-5 pb-10">
        <div className="mb-5">
          <p className="mb-1 text-xs font-bold text-emerald-300">StockDoc AI Pro</p>
          <h1 className="mb-2 text-3xl font-bold">日本株ETFランキング</h1>
          <p className="text-sm text-slate-300">
            株式画面と同じ見方で、ETFの中期・短期・反発・Complianceを確認できます。
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="rounded-2xl border border-slate-700 bg-slate-900 p-4"
          >
            <div className="text-xl">←</div>
            <div className="mt-1 font-bold">株式分析</div>
            <div className="mt-1 text-xs text-slate-400">ホームへ戻る</div>
          </Link>
          <Link
            href="/etf-guide"
            className="rounded-2xl border border-cyan-700 bg-cyan-950 p-4"
          >
            <div className="text-xl">?</div>
            <div className="mt-1 font-bold">スコアの見方</div>
            <div className="mt-1 text-xs text-cyan-100">判定ルール確認</div>
          </Link>
          <Link
            href="/etf-learning"
            className="rounded-2xl border border-emerald-700 bg-emerald-950 p-4"
          >
            <div className="text-xl">📈</div>
            <div className="mt-1 font-bold">ETF Learning</div>
            <div className="mt-1 text-xs text-emerald-100">中期成績</div>
          </Link>
          <Link
            href="/etf-short-learning"
            className="rounded-2xl border border-cyan-700 bg-cyan-950 p-4"
          >
            <div className="text-xl">⚡</div>
            <div className="mt-1 font-bold">Short Learning</div>
            <div className="mt-1 text-xs text-cyan-100">短期成績</div>
          </Link>
        </div>

        {data && (
          <div className="mb-5 rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[11px] text-slate-400">Market Regime</p>
                <p className="mt-1 text-sm font-bold">
                  {data.marketRegime.replaceAll("_", " ")}
                </p>
              </div>
              <div className="border-x border-slate-700">
                <p className="text-[11px] text-slate-400">Market Score</p>
                <p className="mt-1 text-lg font-bold">{data.marketScore.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">分析ETF</p>
                <p className="mt-1 text-lg font-bold">{data.analyses.length}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setRankingMode("SHORT")}
            className={`rounded-lg p-3 text-sm font-bold ${
              rankingMode === "SHORT"
                ? "bg-cyan-500 text-slate-950"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            短期Score順
          </button>
          <button
            onClick={() => setRankingMode("MID")}
            className={`rounded-lg p-3 text-sm font-bold ${
              rankingMode === "MID"
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            中期Score順
          </button>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs font-bold text-slate-400">Compliance</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              ["ALL", "すべて"],
              ["ELIGIBLE", "取引可"],
              ["PRE_APPROVAL_REQUIRED", "事前承認"],
              ["NOT_ELIGIBLE", "対象外"],
              ["UNKNOWN", "要確認"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setComplianceFilter(value as typeof complianceFilter)
                }
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold ${
                  complianceFilter === value
                    ? "border-violet-400 bg-violet-500/20 text-violet-200"
                    : "border-slate-700 bg-slate-900 text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-slate-600">
            未確認データは安全側に「要確認」と表示します。
          </p>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {categories.map((item) => (
            <button
              key={item.value}
              onClick={() => setCategory(item.value)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${
                category === item.value
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            ETFを分析中...
          </div>
        )}

        <div className="space-y-4">
          {visible.map((item, index) => {
            const isOpen = expanded === item.master.symbol;
            return (
              <div
                key={item.master.symbol}
                className="rounded-2xl border border-slate-700 bg-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500">
                      #{index + 1} · {item.master.symbol}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-white">
                      {item.master.shortName}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.master.strategy}｜{item.master.issuer}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-bold">
                    ¥{item.metrics.price.toLocaleString()}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${complianceClass(
                      item.compliance.status
                    )}`}
                  >
                    {complianceLabel(item.compliance.status)}
                  </span>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                    {item.diversificationType}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${reboundClass(
                      item.rebound.status
                    )}`}
                  >
                    {reboundLabel(item.rebound.status)} {item.rebound.score.toFixed(0)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-800 bg-emerald-950/50 p-3">
                    <p className="text-xs text-emerald-200">中期Score v2</p>
                    <div className="mt-1 flex items-end justify-between">
                      <p className="text-2xl font-bold">{item.score.toFixed(1)}</p>
                      <p className={`text-sm font-bold ${signalClass(item.signal)}`}>
                        {signalLabel(item.signal)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-cyan-800 bg-cyan-950/50 p-3">
                    <p className="text-xs text-cyan-200">短期Score</p>
                    <div className="mt-1 flex items-end justify-between">
                      <p className="text-2xl font-bold">{item.shortTermScore.toFixed(1)}</p>
                      <p
                        className={`text-sm font-bold ${shortSignalClass(
                          item.shortTermSignal
                        )}`}
                      >
                        {shortSignalLabel(item.shortTermSignal)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-slate-800 p-2">
                    <p className="text-[10px] text-slate-500">7日</p>
                    <p className="mt-1 text-xs font-bold">{signed(item.metrics.return7d)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-800 p-2">
                    <p className="text-[10px] text-slate-500">20日</p>
                    <p className="mt-1 text-xs font-bold">{signed(item.metrics.return20d)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-800 p-2">
                    <p className="text-[10px] text-slate-500">60日</p>
                    <p className="mt-1 text-xs font-bold">{signed(item.metrics.return60d)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-800 p-2">
                    <p className="text-[10px] text-slate-500">Exit</p>
                    <p className="mt-1 text-xs font-bold">{item.exitScore.toFixed(1)}</p>
                  </div>
                </div>

                <button
                  onClick={() => setExpanded(isOpen ? null : item.master.symbol)}
                  className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs font-bold text-slate-200"
                >
                  {isOpen ? "詳細を閉じる" : "スコア詳細を見る"}
                </button>

                {isOpen && (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-900/70 p-3">
                          <span className="text-slate-500">旧 v1 Score</span><br/>
                          <b className="text-lg">{item.legacyScore.toFixed(1)}</b>
                        </div>
                        <div className="rounded-lg bg-slate-900/70 p-3">
                          <span className="text-slate-500">過熱Penalty</span><br/>
                          <b className="text-lg text-orange-300">-{item.overextensionPenalty.toFixed(1)}</b>
                        </div>
                      </div>
                      <h3 className="mb-3 font-bold text-white">中期スコア v2 内訳</h3>
                      <div className="space-y-3">
                        <ScoreRow label="トレンド" score={item.breakdown.trend} />
                        <ScoreRow label="モメンタム" score={item.breakdown.momentum} />
                        <ScoreRow label="リスク" score={item.breakdown.risk} />
                        <ScoreRow label="流動性" score={item.breakdown.liquidity} />
                        <ScoreRow label="市場適合度" score={item.breakdown.regimeFit} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-800 bg-cyan-950/30 p-4">
                      <h3 className="font-bold text-white">
                        Rebound Detector
                      </h3>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <ScoreRow label="売られ過ぎ" score={item.rebound.oversoldScore} />
                        <ScoreRow label="反転" score={item.rebound.reversalScore} />
                        <ScoreRow label="Trend Repair" score={item.rebound.trendRepairScore} />
                        <ScoreRow label="Regime" score={item.rebound.regimeScore} />
                      </div>
                      <p className="mt-3 text-xs leading-5 text-cyan-100/80">
                        {item.rebound.reasons.join(" / ")}
                      </p>
                    </div>

                    <div className="rounded-xl border border-violet-800 bg-violet-950/30 p-4">
                      <h3 className="font-bold text-white">Compliance</h3>
                      <p className="mt-2 text-sm font-bold text-violet-200">
                        {complianceLabel(item.compliance.status)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-violet-100/80">
                        {item.compliance.reasons.join(" / ")}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-900/60 p-2">
                          構成銘柄数<br />
                          <b>{item.compliance.holdingsCount ?? "未確認"}</b>
                        </div>
                        <div className="rounded-lg bg-slate-900/60 p-2">
                          最大構成比<br />
                          <b>
                            {item.compliance.maxHoldingWeight !== null
                              ? `${item.compliance.maxHoldingWeight.toFixed(1)}%`
                              : "未確認"}
                          </b>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-800 bg-blue-950/30 p-4">
                      <h3 className="font-bold text-white">分析コメント</h3>
                      <p className="mt-2 text-xs leading-5 text-blue-100/80">
                        {item.reasons.join(" / ")}
                      </p>
                      {item.shortTermReasons.length > 0 && (
                        <p className="mt-2 text-xs leading-5 text-cyan-100/80">
                          短期: {item.shortTermReasons.join(" / ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {data?.warnings?.length ? (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
            {data.warnings.join(" / ")}
          </div>
        ) : null}
      </div>
    </main>
  );
}
