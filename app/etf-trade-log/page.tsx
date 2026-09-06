"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function EtfTradeLogPage() {
  const [records, setRecords] = useState<EtfTradeRecord[]>([]);
  const [holdings, setHoldings] = useState<Record<string, EtfHolding>>({});
  const [surplusCash, setSurplusCash] = useState(0);

  useEffect(() => {
    try {
      const rawRecords = window.localStorage.getItem("stockdoc.etf.tradeLog");
      const rawHoldings = window.localStorage.getItem("stockdoc.etf.holdings");
      const rawCash = window.localStorage.getItem("stockdoc.etf.surplusCash");
      if (rawRecords) setRecords(JSON.parse(rawRecords));
      if (rawHoldings) setHoldings(JSON.parse(rawHoldings));
      if (rawCash) setSurplusCash(Number(rawCash) || 0);
    } catch {}
  }, []);

  const stats = useMemo(() => {
    const sells = records.filter((r) => r.side === "SELL" && typeof r.realizedPnl === "number");
    const wins = sells.filter((r) => (r.realizedPnl ?? 0) > 0);
    const realized = sells.reduce((sum, r) => sum + (r.realizedPnl ?? 0), 0);
    return {
      trades: records.length,
      closes: sells.length,
      winRate: sells.length ? Math.round((wins.length / sells.length) * 100) : 0,
      realized,
    };
  }, [records]);

  const clearHistory = () => {
    if (!window.confirm("売買履歴だけを削除します。保有状況と余剰資金は残します。よろしいですか？")) return;
    window.localStorage.removeItem("stockdoc.etf.tradeLog");
    setRecords([]);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-md p-5 pb-10">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-violet-300">ETF TRADE SUPPORT</p>
            <h1 className="mt-1 text-3xl font-bold">売買履歴・実績</h1>
            <p className="mt-2 text-sm text-slate-400">実際に記録した約定と、判定時のScoreを振り返ります。</p>
          </div>
          <Link href="/etf" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold">ETFへ</Link>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
            <p className="text-[10px] text-slate-500">余剰資金</p>
            <p className="mt-1 text-xl font-bold">¥{surplusCash.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
            <p className="text-[10px] text-slate-500">保有ETF</p>
            <p className="mt-1 text-xl font-bold">{Object.keys(holdings).length}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
            <p className="text-[10px] text-slate-500">確定損益</p>
            <p className={`mt-1 text-xl font-bold ${stats.realized >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {stats.realized >= 0 ? "+" : ""}¥{stats.realized.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
            <p className="text-[10px] text-slate-500">売却勝率</p>
            <p className="mt-1 text-xl font-bold">{stats.closes ? `${stats.winRate}%` : "-"}</p>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">現在の保有</h2>
            <span className="text-[10px] text-slate-500">平均取得価格ベース</span>
          </div>
          {Object.keys(holdings).length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">保有記録はありません。</p>
          ) : (
            <div className="mt-3 space-y-2">
              {Object.entries(holdings).map(([symbol, h]) => (
                <div key={symbol} className="flex items-center justify-between rounded-lg bg-slate-950/60 p-3 text-xs">
                  <div><b>{symbol}</b><p className="mt-1 text-slate-500">{h.quantity}口</p></div>
                  <div className="text-right"><span className="text-slate-500">平均</span><br/><b>¥{h.averagePrice.toLocaleString()}</b></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-bold">約定履歴</h2>
            <p className="text-[10px] text-slate-500">最大500件を端末内に保存</p>
          </div>
          {records.length > 0 && <button onClick={clearHistory} className="text-[10px] text-red-300">履歴を削除</button>}
        </div>

        {records.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-500">まだ売買記録がありません。</div>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${r.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{r.side}</span>
                      <b>{r.symbol}</b>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{r.name}</p>
                  </div>
                  <p className="text-[10px] text-slate-500">{formatDate(r.executedAt)}</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-slate-950/60 p-2"><span className="text-slate-500">口数</span><br/><b>{r.quantity}</b></div>
                  <div className="rounded-lg bg-slate-950/60 p-2"><span className="text-slate-500">価格</span><br/><b>¥{r.price.toLocaleString()}</b></div>
                  <div className="rounded-lg bg-slate-950/60 p-2"><span className="text-slate-500">金額</span><br/><b>¥{r.amount.toLocaleString()}</b></div>
                </div>
                {r.side === "SELL" && typeof r.realizedPnl === "number" && (
                  <p className={`mt-3 text-sm font-bold ${r.realizedPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    確定損益 {r.realizedPnl >= 0 ? "+" : ""}¥{r.realizedPnl.toLocaleString()}
                  </p>
                )}
                <div className="mt-3 rounded-lg bg-slate-950/50 p-2 text-[10px] leading-5 text-slate-400">
                  判定時: {r.decisionAction} / Short {r.shortScore} / Mid {r.midScore} / Exit {r.exitScore} / {r.marketRegime.replaceAll("_", " ")}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 rounded-xl border border-amber-700/40 bg-amber-950/20 p-3 text-[10px] leading-5 text-amber-100/70">
          この履歴はブラウザのlocalStorageに保存されます。端末・ブラウザを変えると共有されません。売買履歴は実際の約定後に手動記録し、証券会社の正式な取引履歴を正本として扱ってください。
        </div>
      </div>
    </main>
  );
}
