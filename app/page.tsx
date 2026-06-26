"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { searchStocks } from "@/lib/stockMaster";
import {
  addFavorite,
  FavoriteStock,
  getFavorites,
  isFavorite,
  removeFavorite,
} from "@/lib/favorites";

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
    profitability?: number;
    growth?: number;
    safety?: number;
    overheat?: number;
    sixMonthSuitability?: number;
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
  reasons?: string[];
};

type FutureStar = {
  code: string;
  name: string;
  score: number;
  themes: string[];
  growth: number;
  theme: number;
  profitability: number;
  safety: number;
  reasons: string[];
};

export default function Home() {
  const [ticker, setTicker] = useState("5801");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ReturnType<typeof searchStocks>>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const [favorites, setFavorites] = useState<FavoriteStock[]>([]);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState("");

  const [futureStars, setFutureStars] = useState<FutureStar[]>([]);
  const [futureStarsLoading, setFutureStarsLoading] = useState(false);
  const [futureStarsError, setFutureStarsError] = useState("");

  useEffect(() => {
    setFavorites(getFavorites());

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

  const loadFutureStars = async () => {
    try {
      setFutureStarsLoading(true);
      setFutureStarsError("");

      const res = await fetch("/api/future-stars", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("future stars api failed");
      }

      const data = await res.json();
      setFutureStars(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setFutureStarsError("テンバガー候補の取得に失敗しました。");
    } finally {
      setFutureStarsLoading(false);
    }
  };

  const analyzeByCode = (code: string, name: string) => {
    setTicker(code);
    setQuery(`${code} ${name}`);
    setSuggestions([]);
    analyze(code);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleFavorite = () => {
    if (!result) return;

    const code = result.ticker;
    const name = result.companyName;

    if (isFavorite(code, favorites)) {
      setFavorites(removeFavorite(code));
    } else {
      setFavorites(addFavorite({ code, name }));
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
      <div className="max-w-md mx-auto p-5 pb-10">
        <div className="mb-5">
          <p className="text-xs font-bold text-emerald-300 mb-1">StockDoc AI Pro</p>
          <h1 className="text-3xl font-bold mb-2">株ドックAI</h1>
          <p className="text-sm text-slate-300">
            銘柄分析、推奨銘柄、テンバガー候補、AI学習レポートをスマホで確認できます。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link
            href="/learning"
            className="rounded-2xl border border-emerald-700 bg-emerald-950 p-4"
          >
            <div className="text-2xl mb-1">📈</div>
            <div className="font-bold text-white">AI学習</div>
            <div className="text-xs text-emerald-100 mt-1">勝率・成績確認</div>
          </Link>

          <Link
            href="/historical-backtest"
            className="rounded-2xl border border-purple-700 bg-purple-950 p-4"
          >
            <div className="text-2xl mb-1">🧪</div>
            <div className="font-bold text-white">バックテスト</div>
            <div className="text-xs text-purple-100 mt-1">過去データ検証</div>
          </Link>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-blue-700 bg-blue-950 p-4"
          >
            <div className="text-2xl mb-1">📊</div>
            <div className="font-bold text-white">ダッシュボード</div>
            <div className="text-xs text-blue-100 mt-1">メニュー一覧</div>
          </Link>

          <Link
            href="/glossary"
            className="rounded-2xl border border-slate-700 bg-slate-900 p-4"
          >
            <div className="text-2xl mb-1">📚</div>
            <div className="font-bold text-white">用語辞典</div>
            <div className="text-xs text-slate-300 mt-1">指標の意味</div>
          </Link>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="コード・会社名・テーマで検索"
            value={query}
            onFocus={() => {
              if (query.trim()) setSuggestions(searchStocks(query));
            }}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              setSuggestions(value.trim() ? searchStocks(value) : []);

              if (/^[0-9A-Za-z]{4}$/.test(value)) {
                setTicker(value.toUpperCase());
              }
            }}
            className="border border-slate-600 bg-slate-900 text-white placeholder:text-slate-400 p-3 w-full rounded"
          />

          {suggestions.length > 0 && (
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

        {favorites.length > 0 && (
          <div className="mt-6 p-4 border border-yellow-700 bg-yellow-950 rounded">
            <h2 className="font-bold text-lg mb-3 text-white">⭐ お気に入り</h2>
            <div className="space-y-2">
              {favorites.map((stock) => (
                <div
                  key={stock.code}
                  className="flex items-center justify-between gap-2 border border-yellow-800 bg-slate-900 rounded p-2"
                >
                  <button
                    onClick={() => analyzeByCode(stock.code, stock.name)}
                    className="text-left flex-1"
                  >
                    <div className="font-bold text-white">
                      {stock.code} {stock.name}
                    </div>
                  </button>

                  <button
                    onClick={() => setFavorites(removeFavorite(stock.code))}
                    className="text-xs text-red-300 border border-red-800 rounded px-2 py-1"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 border border-slate-700 bg-slate-900 rounded space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-white">{result.companyName}</h2>

              <button
                onClick={handleToggleFavorite}
                className="shrink-0 rounded border border-yellow-600 px-3 py-1 text-sm text-yellow-200"
              >
                {isFavorite(result.ticker, favorites) ? "★ 登録済" : "☆ お気に入り"}
              </button>
            </div>

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
                {result.breakdown.profitability !== undefined &&
                  renderScoreRow("収益性", result.breakdown.profitability)}
                {result.breakdown.growth !== undefined &&
                  renderScoreRow("成長性", result.breakdown.growth)}
                {result.breakdown.safety !== undefined &&
                  renderScoreRow("財務健全性", result.breakdown.safety)}
                {result.breakdown.overheat !== undefined &&
                  renderScoreRow("過熱感", result.breakdown.overheat)}
                {result.breakdown.sixMonthSuitability !== undefined &&
                  renderScoreRow("半年保有適性", result.breakdown.sixMonthSuitability)}
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
            <p className="text-sm text-slate-300">
              本日はBuy以上の推奨銘柄が見つかりませんでした。
            </p>
          )}

          <div className="space-y-3">
            {recommendations.map((stock, index) => (
              <button
                key={stock.code}
                onClick={() => analyzeByCode(stock.code, stock.name)}
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
                    <div className="text-xs text-slate-300">Buy候補</div>
                  </div>
                </div>
                <div className="text-xs text-emerald-300 mt-2">
                  {stock.themes.join(" / ")}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 p-4 border border-purple-700 bg-purple-950 rounded">
          <div className="mb-3">
            <h2 className="font-bold text-lg text-white">テンバガー候補</h2>
            <p className="text-xs text-purple-100 mt-1">
              成長性・テーマ性・収益性から将来有望候補を抽出します。
            </p>
          </div>

          <button
            onClick={loadFutureStars}
            disabled={futureStarsLoading}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold w-full p-3 rounded disabled:opacity-50"
          >
            {futureStarsLoading ? "探索中..." : "テンバガー候補を探す"}
          </button>

          {futureStarsError && (
            <p className="text-sm text-red-200 mt-3">{futureStarsError}</p>
          )}

          <div className="space-y-3 mt-4">
            {futureStars.map((stock, index) => (
              <button
                key={stock.code}
                onClick={() => analyzeByCode(stock.code, stock.name)}
                className="w-full text-left border border-purple-700 rounded p-3 bg-slate-900 hover:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">
                      {index + 1}位 {stock.name}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      {stock.code}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-200">
                      {stock.score}点
                    </div>
                    <div className="text-xs text-purple-200">未来候補</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-200 mt-3">
                  <div>成長性: {stock.growth}点</div>
                  <div>テーマ: {stock.theme}点</div>
                  <div>収益性: {stock.profitability}点</div>
                  <div>安全性: {stock.safety}点</div>
                </div>

                <ul className="text-xs text-purple-100 mt-3 leading-5">
                  {stock.reasons.map((reason, i) => (
                    <li key={i}>• {reason}</li>
                  ))}
                </ul>

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
