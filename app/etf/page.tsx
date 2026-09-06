"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EtfAnalysis, EtfCategory, EtfComplianceResult } from "@/lib/etf";
import { decideEtfTrade } from "@/lib/etf/etfTradeDecision";



type ManualComplianceOverride = {
  holdingsCount: number | null;
  maxHoldingWeight: number | null;
  derivativeBased: boolean | null;
  checkedAt: string;
  sourceName: string;
  sourceUrl: string;
};


function effectiveDiversificationType(item: EtfAnalysis, manual?: ManualComplianceOverride) {
  const count = manual?.holdingsCount;
  if (typeof count !== "number") return item.diversificationType;
  if (count >= 100) return "BROAD";
  if (count >= 21) return "FOCUSED";
  return "NARROW";
}

function complianceAgeDays(dateText: string | null | undefined) {
  if (!dateText) return null;
  const d = new Date(`${dateText.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function effectiveCompliance(
  item: EtfAnalysis,
  manual?: ManualComplianceOverride
): EtfComplianceResult {
  if (!manual) return item.compliance;

  const holdingsCount = manual.holdingsCount;
  const maxHoldingWeight = manual.maxHoldingWeight;
  const derivativeBased = manual.derivativeBased;
  const sourceName = manual.sourceName?.trim() || null;
  const sourceUrl = manual.sourceUrl?.trim() || null;
  const checkedAt = manual.checkedAt || null;
  const age = complianceAgeDays(checkedAt);
  const stale = age !== null && age > 90;
  const provenanceVerified = Boolean(sourceName && checkedAt);
  const common = {
    holdingsCount,
    maxHoldingWeight,
    derivativeBased,
    sourceName,
    sourceUrl,
    sourceDate: checkedAt,
    verifiedAt: checkedAt,
    sourceNote: sourceName ? `手動確認: ${sourceName}` : "手動確認",
    provenanceVerified,
    stale,
  };

  if (derivativeBased === true) {
    return {
      status: "NOT_ELIGIBLE",
      reasons: ["手動確認: デリバティブ投資対象のため対象外"],
      ...common,
    };
  }

  const preApprovalReasons: string[] = [];
  if (holdingsCount !== null && holdingsCount < 21) {
    preApprovalReasons.push(`構成銘柄数 ${holdingsCount}（21銘柄未満）`);
  }
  if (maxHoldingWeight !== null && maxHoldingWeight >= 25) {
    preApprovalReasons.push(`最大構成比率 ${maxHoldingWeight.toFixed(1)}%（25%以上）`);
  }
  if (preApprovalReasons.length > 0) {
    return {
      status: "PRE_APPROVAL_REQUIRED",
      reasons: ["手動確認", ...preApprovalReasons],
      ...common,
    };
  }

  const missing: string[] = [];
  if (holdingsCount === null) missing.push("構成銘柄数");
  if (maxHoldingWeight === null) missing.push("最大構成比率");
  if (derivativeBased === null) missing.push("デリバティブ投資対象");
  if (!sourceName) missing.push("情報源");
  if (!checkedAt) missing.push("確認日");
  if (missing.length > 0) {
    return {
      status: "UNKNOWN",
      reasons: [`手動確認未完了: ${missing.join("・")}`],
      ...common,
    };
  }

  if (stale) {
    return {
      status: "UNKNOWN",
      reasons: ["手動Compliance情報が90日超のため再確認が必要です"],
      ...common,
    };
  }

  return {
    status: "ELIGIBLE",
    reasons: [
      `手動確認済み (${checkedAt})`,
      "21銘柄以上・最大構成比25%未満・デリバティブ型ではない",
    ],
    ...common,
  };
}



type EtfHolding = {
  quantity: number;
  averagePrice: number;
  acquiredAt?: string;
};

type EtfTradeRecord = {
  id: string;
  symbol: string;
  name: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  amount: number;
  executedAt: string;
  decisionAction: string;
  midScore: number;
  shortScore: number;
  exitScore: number;
  marketRegime: string;
  realizedPnl?: number;
};

type TradeDraft = { quantity: number; price: number };

function isJapanMarketOpenNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (["Sat", "Sun"].includes(value.weekday)) return false;
  const minutes = Number(value.hour) * 60 + Number(value.minute);
  return (minutes >= 9 * 60 && minutes <= 11 * 60 + 30) || (minutes >= 12 * 60 + 30 && minutes <= 15 * 60 + 30);
}

function formatJstTime(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

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
    ? "買い"
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
    ? "買い"
    : signal === "HOLD"
      ? "保有"
      : signal === "WATCH"
        ? "待機"
        : signal === "REDUCE"
          ? "縮小"
          : "売却";
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


function tradeActionLabel(action: string) {
  return action === "BUY"
    ? "BUY"
    : action === "HOLD"
      ? "HOLD"
      : action === "REDUCE"
        ? "REDUCE"
        : action === "SELL"
          ? "SELL"
          : action === "PRE_APPROVAL"
            ? "事前承認"
            : action === "CHECK_REQUIRED"
              ? "要確認"
              : action === "BLOCKED"
                ? "対象外"
                : "WAIT";
}

function tradeActionClass(action: string) {
  return action === "BUY"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : action === "HOLD"
      ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
      : action === "REDUCE"
        ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
        : action === "SELL" || action === "BLOCKED"
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : action === "PRE_APPROVAL"
            ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
            : "border-amber-500/40 bg-amber-500/10 text-amber-300";
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
  const [surplusCash, setSurplusCash] = useState(300000);
  const [heldSymbols, setHeldSymbols] = useState<Record<string, EtfHolding>>({});
  const [manualCompliance, setManualCompliance] = useState<Record<string, ManualComplianceOverride>>({});
  const [tradeLog, setTradeLog] = useState<EtfTradeRecord[]>([]);
  const [tradeDrafts, setTradeDrafts] = useState<Record<string, TradeDraft>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [signalAlerts, setSignalAlerts] = useState<string[]>([]);
  const lastActionsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    try {
      const savedCash = window.localStorage.getItem("stockdoc.etf.surplusCash");
      const savedHoldings = window.localStorage.getItem("stockdoc.etf.holdings");
      const savedCompliance = window.localStorage.getItem("stockdoc.etf.manualCompliance");
      const savedTradeLog = window.localStorage.getItem("stockdoc.etf.tradeLog");
      if (savedCash) setSurplusCash(Number(savedCash) || 0);
      if (savedHoldings) setHeldSymbols(JSON.parse(savedHoldings));
      if (savedCompliance) setManualCompliance(JSON.parse(savedCompliance));
      if (savedTradeLog) setTradeLog(JSON.parse(savedTradeLog));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("stockdoc.etf.surplusCash", String(surplusCash));
    } catch {}
  }, [surplusCash]);

  useEffect(() => {
    try {
      window.localStorage.setItem("stockdoc.etf.holdings", JSON.stringify(heldSymbols));
    } catch {}
  }, [heldSymbols]);

  useEffect(() => {
    try {
      window.localStorage.setItem("stockdoc.etf.manualCompliance", JSON.stringify(manualCompliance));
    } catch {}
  }, [manualCompliance]);

  useEffect(() => {
    try {
      window.localStorage.setItem("stockdoc.etf.tradeLog", JSON.stringify(tradeLog));
    } catch {}
  }, [tradeLog]);

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setData(null);
    setError("");
    setRefreshing(true);
    try {
      const r = await fetch(`/api/etf-ranking${category === "ALL" ? "" : `?category=${category}`}`, { cache: "no-store" });
      if (!r.ok) throw new Error("ETF API failed");
      const payload = (await r.json()) as Payload;
      setData(payload);
      setLastRefreshAt(new Date().toISOString());
    } catch {
      setError("ETFデータを取得できませんでした。");
    } finally {
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      if (isJapanMarketOpenNow()) loadData(false);
    }, 15 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, loadData]);

  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = {};
    const alerts: string[] = [];
    for (const item of data.analyses) {
      const manual = manualCompliance[item.master.symbol];
      const compliance = effectiveCompliance(item, manual);
      const holding = heldSymbols[item.master.symbol];
      const decision = decideEtfTrade({
        analysis: { ...item, compliance },
        surplusCash,
        position: {
          isHeld: Boolean(holding),
          quantity: holding?.quantity ?? 0,
          averagePrice: holding?.averagePrice ?? 0,
        },
      });
      next[item.master.symbol] = decision.action;
      const prev = lastActionsRef.current[item.master.symbol];
      if (prev && prev !== decision.action && ["BUY", "SELL", "REDUCE"].includes(decision.action)) {
        alerts.push(`${item.master.symbol} ${item.master.shortName}: ${prev} → ${decision.action}`);
      }
    }
    lastActionsRef.current = next;
    if (alerts.length) setSignalAlerts((prev) => [...alerts, ...prev].slice(0, 5));
  }, [data, heldSymbols, manualCompliance, surplusCash]);

  const recordTrade = (item: EtfAnalysis, decisionAction: string, side: "BUY" | "SELL") => {
    const draft = tradeDrafts[item.master.symbol] ?? { quantity: 1, price: item.metrics.price };
    const quantity = Math.max(0, Math.floor(draft.quantity));
    const price = Math.max(0, Number(draft.price));
    if (!quantity || !price) return;

    const current = heldSymbols[item.master.symbol];
    let realizedPnl: number | undefined;
    let recordQuantity = quantity;
    if (side === "BUY") {
      const oldQty = current?.quantity ?? 0;
      const oldAvg = current?.averagePrice ?? 0;
      const newQty = oldQty + quantity;
      const newAvg = newQty > 0 ? ((oldQty * oldAvg) + (quantity * price)) / newQty : price;
      setHeldSymbols((prev) => ({
        ...prev,
        [item.master.symbol]: { quantity: newQty, averagePrice: Math.round(newAvg * 100) / 100, acquiredAt: current?.acquiredAt ?? new Date().toISOString() },
      }));
      setSurplusCash((prev) => Math.max(0, Math.round(prev - quantity * price)));
    } else {
      const available = current?.quantity ?? 0;
      if (!available) return;
      const sellQty = Math.min(quantity, available);
      realizedPnl = Math.round((price - (current?.averagePrice ?? 0)) * sellQty);
      const remaining = available - sellQty;
      setHeldSymbols((prev) => {
        const next = { ...prev };
        if (remaining <= 0) delete next[item.master.symbol];
        else next[item.master.symbol] = { ...current, quantity: remaining };
        return next;
      });
      setSurplusCash((prev) => Math.round(prev + sellQty * price));
      recordQuantity = sellQty;
    }

    const record: EtfTradeRecord = {
      id: `${Date.now()}-${item.master.symbol}-${side}`,
      symbol: item.master.symbol,
      name: item.master.shortName,
      side,
      quantity: recordQuantity,
      price,
      amount: Math.round(recordQuantity * price),
      executedAt: new Date().toISOString(),
      decisionAction,
      midScore: Math.round(item.score * 10) / 10,
      shortScore: Math.round(item.shortTermScore * 10) / 10,
      exitScore: Math.round(item.exitScore * 10) / 10,
      marketRegime: item.marketRegime,
      realizedPnl,
    };
    setTradeLog((prev) => [record, ...prev].slice(0, 500));
    setTradeDrafts((prev) => ({ ...prev, [item.master.symbol]: { quantity: 1, price: item.metrics.price } }));
  };

  const visible = useMemo(() => {
    if (!data) return [];
    return [...data.analyses]
      .filter(
        (item) =>
          complianceFilter === "ALL" ||
          effectiveCompliance(item, manualCompliance[item.master.symbol]).status === complianceFilter
      )
      .sort((a, b) =>
        rankingMode === "SHORT"
          ? b.shortTermScore - a.shortTermScore
          : b.score - a.score
      );
  }, [data, complianceFilter, rankingMode, manualCompliance]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-md p-5 pb-10">
        <div className="mb-5">
          <p className="mb-1 text-xs font-bold text-emerald-300">StockDoc AI Pro</p>
          <h1 className="mb-2 text-3xl font-bold">日本株ETFランキング</h1>
          <p className="text-sm text-slate-300">
            ETF専用ロジックで、中期・短期・反発・Complianceを確認できます。
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="rounded-2xl border border-slate-700 bg-slate-900 p-4"
          >
            <div className="text-xl">←</div>
            <div className="mt-1 font-bold">ホーム</div>
            <div className="mt-1 text-xs text-slate-400">トップへ戻る</div>
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
          <Link
            href="/etf-trade-log"
            className="rounded-2xl border border-violet-700 bg-violet-950 p-4"
          >
            <div className="text-xl">🧾</div>
            <div className="mt-1 font-bold">売買履歴</div>
            <div className="mt-1 text-xs text-violet-100">保有・実績・学習</div>
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

        <div className="mb-5 rounded-2xl border border-emerald-700/60 bg-emerald-950/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-300">ETF TRADE SUPPORT</p>
              <h2 className="mt-1 text-lg font-bold">BUY / WAIT / SELL 判定</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                V2短期・中期・Exit・Market Regime・Complianceを統合して売買判断を表示します。
              </p>
            </div>
          </div>
          <label className="mt-4 block text-xs font-bold text-slate-300">余剰資金</label>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-slate-400">¥</span>
            <input
              inputMode="numeric"
              value={surplusCash}
              onChange={(e) => setSurplusCash(Math.max(0, Number(e.target.value.replace(/[^0-9]/g, "")) || 0))}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-right font-bold text-white outline-none focus:border-emerald-500"
            />
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">
            BUY時は原則15〜25%を上限目安にし、Market Regimeとリスクで調整。Compliance未確認・対象外はBUYを止めます。
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-950/50 p-2 text-[10px] text-slate-400">
            <span>最終更新 {formatJstTime(lastRefreshAt)} / {isJapanMarketOpenNow() ? "東証時間内" : "東証時間外"}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setAutoRefresh((v) => !v)} className={`rounded border px-2 py-1 font-bold ${autoRefresh ? "border-emerald-600 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
                15分自動更新 {autoRefresh ? "ON" : "OFF"}
              </button>
              <button onClick={() => loadData(false)} disabled={refreshing} className="rounded border border-slate-700 px-2 py-1 font-bold text-slate-300 disabled:opacity-50">
                {refreshing ? "更新中" : "今すぐ更新"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-600">価格データは情報源の仕様により遅延する場合があります。自動更新はこの画面を開いている間だけ動作します。</p>
        </div>

        {signalAlerts.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            <div className="flex items-center justify-between gap-3">
              <b>シグナル変化</b>
              <button onClick={() => setSignalAlerts([])} className="text-[10px] text-amber-100/70">クリア</button>
            </div>
            <div className="mt-2 space-y-1">{signalAlerts.map((x, i) => <p key={`${x}-${i}`}>{x}</p>)}</div>
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
          <div className="flex flex-wrap gap-2 pb-2">
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

        <div className="mb-5 flex flex-wrap gap-2 pb-2">
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
            const manual = manualCompliance[item.master.symbol];
            const compliance = effectiveCompliance(item, manual);
            const diversificationType = effectiveDiversificationType(item, manual);
            const analysisForDecision = { ...item, compliance };
            const holding = heldSymbols[item.master.symbol];
            const decision = decideEtfTrade({
              analysis: analysisForDecision,
              surplusCash,
              position: {
                isHeld: Boolean(holding),
                quantity: holding?.quantity ?? 0,
                averagePrice: holding?.averagePrice ?? 0,
              },
            });
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
                      compliance.status
                    )}`}
                  >
                    {complianceLabel(compliance.status)}
                  </span>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                    {diversificationType}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${reboundClass(
                      item.rebound.status
                    )}`}
                  >
                    {reboundLabel(item.rebound.status)} {item.rebound.score.toFixed(0)}
                  </span>
                </div>

                <div className={`mt-4 rounded-xl border p-3 ${tradeActionClass(decision.action)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold opacity-70">TRADE DECISION</p>
                          <p className="mt-1 text-xl font-black">{tradeActionLabel(decision.action)}</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="opacity-70">確信度</p>
                          <p className="text-lg font-bold">{decision.confidence}%</p>
                        </div>
                      </div>
                      {decision.action === "BUY" && decision.recommendedUnits > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-slate-950/40 p-2">
                            推奨投資額<br/><b className="text-sm">¥{decision.recommendedAmount.toLocaleString()}</b>
                          </div>
                          <div className="rounded-lg bg-slate-950/40 p-2">
                            推奨口数<br/><b className="text-sm">{decision.recommendedUnits}口</b>
                          </div>
                        </div>
                      )}
                      {(decision.action === "SELL" || decision.action === "REDUCE") && decision.recommendedUnits > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-slate-950/40 p-2">売却目安<br/><b>{decision.recommendedUnits}口</b></div>
                          <div className="rounded-lg bg-slate-950/40 p-2">売却目安額<br/><b>¥{decision.recommendedAmount.toLocaleString()}</b></div>
                        </div>
                      )}
                      {holding && decision.positionValue > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-slate-950/40 p-2">評価額<br/><b>¥{decision.positionValue.toLocaleString()}</b></div>
                          <div className="rounded-lg bg-slate-950/40 p-2">含み損益<br/><b className={decision.unrealizedPnl >= 0 ? "text-emerald-300" : "text-red-300"}>{decision.unrealizedPnl >= 0 ? "+" : ""}¥{decision.unrealizedPnl.toLocaleString()} ({decision.unrealizedPnlPercent >= 0 ? "+" : ""}{decision.unrealizedPnlPercent.toFixed(1)}%)</b></div>
                        </div>
                      )}
                      <p className="mt-2 text-[11px] leading-5 opacity-80">{decision.reasons.slice(0, 2).join(" / ")}</p>
                    </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-800 bg-emerald-950/50 p-3">
                    <p className="text-xs text-emerald-200">中期Score</p>
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
                    <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-white">保有状況</h3>
                          <p className="mt-1 text-[11px] text-slate-400">保有中ならSELL / REDUCE / HOLD判定に切り替わります。</p>
                        </div>
                        <button
                          onClick={() =>
                            setHeldSymbols((prev) => {
                              const next = { ...prev };
                              if (next[item.master.symbol]) delete next[item.master.symbol];
                              else next[item.master.symbol] = { quantity: 1, averagePrice: item.metrics.price };
                              return next;
                            })
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                            heldSymbols[item.master.symbol]
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                              : "border-slate-700 bg-slate-900 text-slate-300"
                          }`}
                        >
                          {heldSymbols[item.master.symbol] ? "保有中" : "未保有"}
                        </button>
                      </div>
                      {heldSymbols[item.master.symbol] && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <label className="text-[11px] text-slate-400">
                            保有口数
                            <input
                              inputMode="numeric"
                              value={heldSymbols[item.master.symbol].quantity}
                              onChange={(e) =>
                                setHeldSymbols((prev) => ({
                                  ...prev,
                                  [item.master.symbol]: {
                                    ...prev[item.master.symbol],
                                    quantity: Math.max(0, Number(e.target.value.replace(/[^0-9]/g, "")) || 0),
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-right text-white"
                            />
                          </label>
                          <label className="text-[11px] text-slate-400">
                            平均取得価格
                            <input
                              inputMode="decimal"
                              value={heldSymbols[item.master.symbol].averagePrice}
                              onChange={(e) =>
                                setHeldSymbols((prev) => ({
                                  ...prev,
                                  [item.master.symbol]: {
                                    ...prev[item.master.symbol],
                                    averagePrice: Math.max(0, Number(e.target.value.replace(/[^0-9.]/g, "")) || 0),
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-right text-white"
                            />
                          </label>
                        </div>
                      )}

                      <div className="mt-4 border-t border-emerald-800/60 pt-3">
                        <p className="text-xs font-bold text-emerald-200">実際の売買を記録</p>
                        <p className="mt-1 text-[10px] text-slate-500">Monexで約定した後に記録してください。保有・余剰資金・売買履歴を連動します。</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <label className="text-[10px] text-slate-400">口数
                            <input inputMode="numeric" value={tradeDrafts[item.master.symbol]?.quantity ?? 1} onChange={(e) => setTradeDrafts((prev) => ({ ...prev, [item.master.symbol]: { quantity: Math.max(0, Number(e.target.value.replace(/[^0-9]/g, "")) || 0), price: prev[item.master.symbol]?.price ?? item.metrics.price } }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-right text-white" />
                          </label>
                          <label className="text-[10px] text-slate-400">約定価格
                            <input inputMode="decimal" value={tradeDrafts[item.master.symbol]?.price ?? item.metrics.price} onChange={(e) => setTradeDrafts((prev) => ({ ...prev, [item.master.symbol]: { quantity: prev[item.master.symbol]?.quantity ?? 1, price: Math.max(0, Number(e.target.value.replace(/[^0-9.]/g, "")) || 0) } }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-right text-white" />
                          </label>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button onClick={() => recordTrade(item, decision.action, "BUY")} className="rounded-lg border border-emerald-600 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">BUY約定を記録</button>
                          <button onClick={() => recordTrade(item, decision.action, "SELL")} disabled={!heldSymbols[item.master.symbol]} className="rounded-lg border border-red-700 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-40">SELL約定を記録</button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                      <div className="mb-4 rounded-lg bg-slate-900/70 p-3 text-xs">
                        <span className="text-slate-500">過熱Penalty</span><br/>
                        <b className="text-lg text-orange-300">-{item.overextensionPenalty.toFixed(1)}</b>
                      </div>
                      <h3 className="mb-3 font-bold text-white">中期スコア内訳</h3>
                      <div className="space-y-3">
                        <ScoreRow label="トレンド" score={item.breakdown.trend} />
                        <ScoreRow label="モメンタム" score={item.breakdown.momentum} />
                        <ScoreRow label="リスク" score={item.breakdown.risk} />
                        <ScoreRow label="流動性" score={item.breakdown.liquidity} />
                        <ScoreRow label="市場適合度" score={item.breakdown.regimeFit} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-800 bg-cyan-950/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-white">短期Score v2</h3>
                          <p className="mt-1 text-[11px] text-cyan-200/70">押し目・平均回帰・安定化を重視</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{item.shortTermScore.toFixed(1)}</p>
                          <p className={`text-xs font-bold ${shortSignalClass(item.shortTermSignal)}`}>
                            {shortSignalLabel(item.shortTermSignal)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <ScoreRow label="7日押し目" score={item.shortTermBreakdown.momentum7d} />
                        <ScoreRow label="20日線 平均回帰" score={item.shortTermBreakdown.momentum20d} />
                        <ScoreRow label="値動き安定化" score={item.shortTermBreakdown.acceleration} />
                        <ScoreRow label="中期トレンド環境" score={item.shortTermBreakdown.trend} />
                        <ScoreRow label="リスク" score={item.shortTermBreakdown.risk} />
                        <ScoreRow label="市場環境" score={item.shortTermBreakdown.regimeFit} />
                        <ScoreRow label="流動性" score={item.shortTermBreakdown.liquidity} />
                      </div>
                      <div className="mt-4 rounded-lg bg-slate-900/70 p-3 text-xs">
                        <span className="text-slate-500">Danger Penalty</span><br/>
                        <b className="text-lg text-orange-300">-{item.shortTermOverheatPenalty.toFixed(1)}</b>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-cyan-100/80">{item.shortTermReasons.join(" / ")}</p>
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
                        {complianceLabel(compliance.status)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-violet-100/80">
                        {compliance.reasons.join(" / ")}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-900/60 p-2">
                          構成銘柄数<br />
                          <b>{compliance.holdingsCount ?? "未確認"}</b>
                        </div>
                        <div className="rounded-lg bg-slate-900/60 p-2">
                          最大構成比<br />
                          <b>
                            {compliance.maxHoldingWeight !== null
                              ? `${compliance.maxHoldingWeight.toFixed(1)}%`
                              : "未確認"}
                          </b>
                        </div>
                      </div>

                      <div className={`mt-3 rounded-lg border p-3 text-[10px] leading-5 ${
                        compliance.provenanceVerified && !compliance.stale
                          ? "border-emerald-700/50 bg-emerald-950/20 text-emerald-100"
                          : "border-amber-700/50 bg-amber-950/20 text-amber-100"
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <b>Complianceデータ証跡</b>
                          <span className="font-bold">
                            {compliance.provenanceVerified && !compliance.stale ? "確認済み" : "要確認"}
                          </span>
                        </div>
                        <p>取得方法: {manual ? "手動確認" : "登録データ"}</p>
                        <p>情報源: {compliance.sourceName || compliance.sourceNote || "未登録"}</p>
                        <p>基準日/確認日: {compliance.verifiedAt || compliance.sourceDate || "未登録"}</p>
                        {compliance.sourceUrl && /^https?:\/\//.test(compliance.sourceUrl) && (
                          <a
                            href={compliance.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2"
                          >
                            参照元を開く ↗
                          </a>
                        )}
                        {!manual && compliance.sourceNote && compliance.sourceName && (
                          <p className="mt-1 text-slate-400">{compliance.sourceNote}</p>
                        )}
                        <p className="mt-1 opacity-80">
                          取引可の判定には、数値だけでなく情報源と日付の証跡が必要です。90日を超えた情報は再確認扱いにします。
                        </p>
                      </div>

                      <div className="mt-4 rounded-lg border border-violet-700/50 bg-slate-950/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-violet-200">手動Compliance確認</p>
                            <p className="mt-1 text-[10px] leading-4 text-slate-400">
                              自動取得できない場合のみ、直近ファクトシート等で確認した値を入力してください。
                            </p>
                          </div>
                          {manualCompliance[item.master.symbol] && (
                            <button
                              onClick={() =>
                                setManualCompliance((prev) => {
                                  const next = { ...prev };
                                  delete next[item.master.symbol];
                                  return next;
                                })
                              }
                              className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-300"
                            >
                              手入力を削除
                            </button>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <label className="text-[10px] text-slate-400">
                            構成銘柄数
                            <input
                              inputMode="numeric"
                              placeholder="例: 35"
                              value={manualCompliance[item.master.symbol]?.holdingsCount ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9]/g, "");
                                setManualCompliance((prev) => ({
                                  ...prev,
                                  [item.master.symbol]: {
                                    holdingsCount: raw ? Number(raw) : null,
                                    maxHoldingWeight: prev[item.master.symbol]?.maxHoldingWeight ?? null,
                                    derivativeBased: prev[item.master.symbol]?.derivativeBased ?? null,
                                    checkedAt: prev[item.master.symbol]?.checkedAt ?? new Date().toISOString().slice(0, 10),
                                    sourceName: prev[item.master.symbol]?.sourceName ?? "",
                                    sourceUrl: prev[item.master.symbol]?.sourceUrl ?? "",
                                  },
                                }));
                              }}
                              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-right text-xs text-white"
                            />
                          </label>
                          <label className="text-[10px] text-slate-400">
                            最大構成比率 (%)
                            <input
                              inputMode="decimal"
                              placeholder="例: 8.4"
                              value={manualCompliance[item.master.symbol]?.maxHoldingWeight ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9.]/g, "");
                                setManualCompliance((prev) => ({
                                  ...prev,
                                  [item.master.symbol]: {
                                    holdingsCount: prev[item.master.symbol]?.holdingsCount ?? null,
                                    maxHoldingWeight: raw ? Number(raw) : null,
                                    derivativeBased: prev[item.master.symbol]?.derivativeBased ?? null,
                                    checkedAt: prev[item.master.symbol]?.checkedAt ?? new Date().toISOString().slice(0, 10),
                                    sourceName: prev[item.master.symbol]?.sourceName ?? "",
                                    sourceUrl: prev[item.master.symbol]?.sourceUrl ?? "",
                                  },
                                }));
                              }}
                              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-right text-xs text-white"
                            />
                          </label>
                        </div>

                        <div className="mt-2">
                          <label className="text-[10px] text-slate-400">
                            情報源（必須）
                            <input
                              placeholder="例: Global X 公式ファクトシート"
                              value={manualCompliance[item.master.symbol]?.sourceName ?? ""}
                              onChange={(e) =>
                                setManualCompliance((prev) => ({
                                  ...prev,
                                  [item.master.symbol]: {
                                    holdingsCount: prev[item.master.symbol]?.holdingsCount ?? null,
                                    maxHoldingWeight: prev[item.master.symbol]?.maxHoldingWeight ?? null,
                                    derivativeBased: prev[item.master.symbol]?.derivativeBased ?? null,
                                    checkedAt: prev[item.master.symbol]?.checkedAt ?? new Date().toISOString().slice(0, 10),
                                    sourceName: e.target.value,
                                    sourceUrl: prev[item.master.symbol]?.sourceUrl ?? "",
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"
                            />
                          </label>
                        </div>

                        <div className="mt-2">
                          <label className="text-[10px] text-slate-400">
                            参照URL（任意）
                            <input
                              inputMode="url"
                              placeholder="https://..."
                              value={manualCompliance[item.master.symbol]?.sourceUrl ?? ""}
                              onChange={(e) =>
                                setManualCompliance((prev) => ({
                                  ...prev,
                                  [item.master.symbol]: {
                                    holdingsCount: prev[item.master.symbol]?.holdingsCount ?? null,
                                    maxHoldingWeight: prev[item.master.symbol]?.maxHoldingWeight ?? null,
                                    derivativeBased: prev[item.master.symbol]?.derivativeBased ?? null,
                                    checkedAt: prev[item.master.symbol]?.checkedAt ?? new Date().toISOString().slice(0, 10),
                                    sourceName: prev[item.master.symbol]?.sourceName ?? "",
                                    sourceUrl: e.target.value,
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"
                            />
                          </label>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <label className="text-[10px] text-slate-400">
                            デリバティブ投資対象
                            <select
                              value={
                                manualCompliance[item.master.symbol]?.derivativeBased === true
                                  ? "YES"
                                  : manualCompliance[item.master.symbol]?.derivativeBased === false
                                    ? "NO"
                                    : "UNKNOWN"
                              }
                              onChange={(e) =>
                                setManualCompliance((prev) => ({
                                  ...prev,
                                  [item.master.symbol]: {
                                    holdingsCount: prev[item.master.symbol]?.holdingsCount ?? null,
                                    maxHoldingWeight: prev[item.master.symbol]?.maxHoldingWeight ?? null,
                                    derivativeBased: e.target.value === "YES" ? true : e.target.value === "NO" ? false : null,
                                    checkedAt: prev[item.master.symbol]?.checkedAt ?? new Date().toISOString().slice(0, 10),
                                    sourceName: prev[item.master.symbol]?.sourceName ?? "",
                                    sourceUrl: prev[item.master.symbol]?.sourceUrl ?? "",
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"
                            >
                              <option value="UNKNOWN">未確認</option>
                              <option value="NO">いいえ</option>
                              <option value="YES">はい</option>
                            </select>
                          </label>
                          <label className="text-[10px] text-slate-400">
                            確認日
                            <input
                              type="date"
                              value={manualCompliance[item.master.symbol]?.checkedAt ?? ""}
                              onChange={(e) =>
                                setManualCompliance((prev) => ({
                                  ...prev,
                                  [item.master.symbol]: {
                                    holdingsCount: prev[item.master.symbol]?.holdingsCount ?? null,
                                    maxHoldingWeight: prev[item.master.symbol]?.maxHoldingWeight ?? null,
                                    derivativeBased: prev[item.master.symbol]?.derivativeBased ?? null,
                                    checkedAt: e.target.value,
                                    sourceName: prev[item.master.symbol]?.sourceName ?? "",
                                    sourceUrl: prev[item.master.symbol]?.sourceUrl ?? "",
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"
                            />
                          </label>
                        </div>

                        <p className="mt-3 text-[10px] leading-4 text-violet-100/70">
                          判定: 21銘柄以上かつ最大構成比率25%未満なら取引可。ただし取引可にするには情報源・確認日も必須です。25%以上または21銘柄未満は事前承認。
                        </p>
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
