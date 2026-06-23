"use client";

import { useState } from "react";
import Link from "next/link";
import { searchStocks } from "@/lib/stockMaster";

type ScoreBreakdown = {
  valuation: number;
  dividend: number;
  momentum: number;
  theme: number;
};

type AnalysisResult = {
  ticker?: string;
  symbol?: string;
  companyName?: string;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  volume: number | null;
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  score?: number;
  rating?: string;
  breakdown?: ScoreBreakdown;
  error?: string;
  detail?: string;
  ai?: {
    summary: string;
    whyUp: string[];
    risks: string[];
  } | null;
};

function ScoreRow({ label, score }: { label: string; score: number }) {
  const stars = Math.round(score / 20);

  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-gray-500">
          {"★".repeat(stars)}
          {"☆".repeat(5 - stars)}
        </p>
      </div>
      <p className="font-bold">{score}点</p>
    </div>
  );
}

export default function Home() {
  const [ticker, setTicker] = useState("5801");
  const [query, setQuery] = useState("5801 古河電気工業");
  const [suggestions, setSuggestions] = useState(searchStocks(""));
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker }),
      });

      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        price: null,
        changePercent: null,
        marketCap: null,
        volume: null,
        per: null,
        pbr: null,
        dividendYield: null,
        error: "分析に失敗しました。",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return value.toLocaleString();
  };

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return `${value.toFixed(2)}%`;
  };

  const formatDividendYield = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">株ドックAI</h1>

      <div className="mb-4">
        <Link href="/glossary" className="text-green-700 underline">
          📚 用語辞典を見る
        </Link>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="コード・会社名・テーマで検索"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            setSuggestions(searchStocks(value));

            if (/^\d{4}$/.test(value)) {
              setTicker(value);
            }
          }}
          className="border p-2 w-full rounded"
        />

        {query && suggestions.length > 0 && (
          <div className="border rounded mt-1 bg-white max-h-60 overflow-y-auto">
            {suggestions.map((stock) => (
              <button
                key={stock.code}
                onClick={() => {
                  setTicker(stock.code);
                  setQuery(`${stock.code} ${stock.name}`);
                  setSuggestions([]);
                }}
                className="block w-full text-left p-2 hover:bg-gray-100"
              >
                <div className="font-bold">
                  {stock.code} {stock.name}
                </div>
                <div className="text-xs text-gray-500">
                  {stock.market}｜{stock.sector}
                </div>
                <div className="text-xs text-gray-500">
                  {stock.themes.join(" / ")}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={analyze}
        disabled={loading}
        className="bg-green-600 text-white w-full p-2 mt-4 rounded disabled:opacity-50"
      >
        {loading ? "分析中..." : "分析開始"}
      </button>

      {result?.error && (
        <div className="mt-6 p-4 border rounded bg-red-50">
          <p className="font-bold">エラー</p>
          <p className="text-sm mt-2">{result.error}</p>
          {result.detail && (
            <p className="text-xs mt-2 text-gray-600">{result.detail}</p>
          )}
        </div>
      )}

      {result && !result.error && (
        <div className="mt-6 p-4 border rounded space-y-2">
          <h2 className="text-xl font-bold">{result.companyName}</h2>

          <p>コード: {result.symbol}</p>
          <p>株価: {formatNumber(result.price)} 円</p>
          <p>前日比: {formatPercent(result.changePercent)}</p>
          <p>PER: {result.per?.toFixed(2) ?? "-"}</p>
          <p>PBR: {result.pbr?.toFixed(2) ?? "-"}</p>
          <p>配当利回り: {formatDividendYield(result.dividendYield)}</p>
          <p>出来高: {formatNumber(result.volume)}</p>

          <div className="mt-4 p-4 bg-green-50 rounded">
            <p className="text-lg font-bold">総合スコア: {result.score}点</p>
            <p className="text-lg font-bold">判定: {result.rating}</p>
          </div>

          {result.breakdown && (
            <div className="mt-4 border rounded p-4">
              <h3 className="font-bold mb-3">スコア内訳</h3>
              <ScoreRow label="割安性" score={result.breakdown.valuation} />
              <ScoreRow label="配当" score={result.breakdown.dividend} />
              <ScoreRow label="需給" score={result.breakdown.momentum} />
              <ScoreRow label="テーマ性" score={result.breakdown.theme} />
            </div>
          )}

          {result.ai && (
            <div className="mt-6 space-y-4">
              <div className="border rounded p-4 bg-blue-50">
                <h3 className="font-bold mb-2">AI総評</h3>
                <p className="text-sm leading-6">{result.ai.summary}</p>
              </div>

              <div className="border rounded p-4 bg-green-50">
                <h3 className="font-bold mb-2">注目される理由</h3>
                <ul className="text-sm leading-6">
                  {result.ai.whyUp.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="border rounded p-4 bg-red-50">
                <h3 className="font-bold mb-2">主なリスク</h3>
                <ul className="text-sm leading-6">
                  {result.ai.risks.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 p-4 border rounded">
        <h2 className="font-bold">今日の推奨銘柄</h2>
        <ul className="mt-2">
          <li>① 古河電工</li>
          <li>② JX金属</li>
          <li>③ SWCC</li>
        </ul>
      </div>
    </main>
  );
}
