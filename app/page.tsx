"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { searchStocks } from "@/lib/stockMaster";

type AnalysisResult = {
  ticker: string;
  symbol: string;
  companyName: string;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  volume: number | null;
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  score: number;
  rating: string;
  breakdown?: {
    valuation: number;
    dividend: number;
    momentum: number;
    theme: number;
  };
  ai?: {
    summary: string;
    whyUp: string[];
    risks: string[];
  } | null;
};

type Recommendation = {
  code: string;
  name: string;
  score: number;
  themes: string[];
};

export default function Home() {
  const [ticker, setTicker] = useState("5801");
  const [query, setQuery] = useState("5801 古河電気工業");
  const [suggestions, setSuggestions] = useState(searchStocks(""));
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState("");

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setRecommendationsLoading(true);
        setRecommendationsError("");

        const res = await fetch("/api/recommendations", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("recommendations api failed");
        }

        const data = await res.json();
        setRecommendations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setRecommendationsError("推奨銘柄の取得に失敗しました。");
      } finally {
        setRecommendationsLoading(false);
      }
    };

    loadRecommendations();
  }, []);

  const analyze = async (targetTicker = ticker) => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker: targetTicker }),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
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

  const scoreBarClass = (score: number) => {
    if (score >= 85) return "bg-emerald-500";
    if (score >= 70) return "bg-green-500";
    if (score >= 55) return "bg-yellow-500";
    return "bg-red-500";
  };

  const renderScoreRow = (label: string, score: number) => (
    <div>
      <div className="flex justify-between text-sm text-slate-100 mb-1">
        <span>{label}</span>
        <span className="font-bold">{score}点</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${scoreBarClass(score)}`}
          style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
        />
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">株ドックAI</h1>
        <p className="text-sm text-slate-300 mb-5">
          銘柄検索、AI総評、リスク、今日の推奨銘柄をまとめて確認できます。
        </p>

        <div className="mb-4">
          <Link href="/glossary" className="text-emerald-300 underline">
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
            className="border border-slate-600 bg-slate-900 text-white placeholder:text-slate-400 p-3 w-full rounded"
          />

          {query && suggestions.length > 0 && (
            <div className="absolute z-10 w-full border border-slate-700 rounded mt-1 bg-slate-900 max-h-72 overflow-y-auto shadow-lg">
              {suggestions.map((stock) => (
                <button
                  key={stock.code}
                  onClick={() => {
                    setTicker(stock.code);
                    setQuery(`${stock.code} ${stock.name}`);
                    setSuggestions([]);
                  }}
                  className="block w-full text-left p-3 hover:bg-slate-800 border-b border-slate-800 last:border-b-0"
                >
                  <div className="font-bold text-white">
                    {stock.code} {stock.name}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    {stock.market}｜{stock.sector}
                  </div>
                  <div className="text-xs text-emerald-300 mt-1">
                    {stock.themes.join(" / ")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => analyze()}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full p-3 mt-4 rounded disabled:opacity-50"
        >
          {loading ? "分析中..." : "分析開始"}
        </button>

        {result && (
          <div className="mt-6 p-4 border border-slate-700 bg-slate-900 rounded space-y-3">
            <h2 className="text-xl font-bold text-white">{result.companyName}</h2>

            <div className="grid grid-cols-2 gap-2 text-sm text-slate-100">
              <p>コード: {result.symbol}</p>
              <p>株価: {formatNumber(result.price)} 円</p>
              <p>前日比: {formatPercent(result.changePercent)}</p>
              <p>PER: {result.per?.toFixed(2) ?? "-"}</p>
              <p>PBR: {result.pbr?.toFixed(2) ?? "-"}</p>
              <p>
                配当利回り:{" "}
                {result.dividendYield
                  ? `${(result.dividendYield * 100).toFixed(2)}%`
                  : "-"}
              </p>
              <p className="col-span-2">出来高: {formatNumber(result.volume)}</p>
            </div>

            <div className="mt-4 p-4 bg-emerald-950 border border-emerald-700 rounded">
              <p className="text-lg font-bold text-white">
                総合スコア: {result.score}点
              </p>
              <p className="text-lg font-bold text-emerald-300">
                判定: {result.rating}
              </p>
            </div>

            {result.breakdown && (
              <div className="mt-4 p-4 bg-slate-800 border border-slate-700 rounded space-y-3">
                <h3 className="font-bold text-white">スコア内訳</h3>
                {renderScoreRow("割安性", result.breakdown.valuation)}
                {renderScoreRow("配当", result.breakdown.dividend)}
                {renderScoreRow("需給", result.breakdown.momentum)}
                {renderScoreRow("テーマ性", result.breakdown.theme)}
              </div>
            )}

            {result.ai && (
              <div className="mt-6 space-y-4">
                <div className="border border-blue-700 rounded p-4 bg-blue-950">
                  <h3 className="font-bold mb-2 text-white">AI総評</h3>
                  <p className="text-sm leading-6 text-blue-50">
                    {result.ai.summary}
                  </p>
                </div>

                <div className="border border-emerald-700 rounded p-4 bg-emerald-950">
                  <h3 className="font-bold mb-2 text-white">注目される理由</h3>
                  <ul className="text-sm leading-6 text-emerald-50">
                    {result.ai.whyUp.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="border border-red-700 rounded p-4 bg-red-950">
                  <h3 className="font-bold mb-2 text-white">主なリスク</h3>
                  <ul className="text-sm leading-6 text-red-50">
                    {result.ai.risks.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 border border-slate-700 bg-slate-900 rounded">
          <h2 className="font-bold text-lg mb-3 text-white">今日の推奨銘柄</h2>

          {recommendationsLoading && (
            <p className="text-sm text-slate-300">計算中...</p>
          )}

          {recommendationsError && (
            <p className="text-sm text-red-300">{recommendationsError}</p>
          )}

          {!recommendationsLoading && recommendations.length === 0 && !recommendationsError && (
            <p className="text-sm text-slate-300">推奨銘柄が見つかりませんでした。</p>
          )}

          <div className="space-y-3">
            {recommendations.map((stock, index) => (
              <button
                key={stock.code}
                onClick={() => {
                  setTicker(stock.code);
                  setQuery(`${stock.code} ${stock.name}`);
                  analyze(stock.code);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full text-left border border-slate-700 rounded p-3 bg-slate-800 hover:bg-slate-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">
                      {index + 1}位 {stock.name}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      {stock.code}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-300">
                      {stock.score}点
                    </div>
                    <div className="text-xs text-slate-300">AI候補</div>
                  </div>
                </div>
                <div className="text-xs text-emerald-300 mt-2">
                  {stock.themes.join(" / ")}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
