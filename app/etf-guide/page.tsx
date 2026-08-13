"use client";

import Link from "next/link";

const sections = [
  {
    title: "まず何を見る？",
    body: [
      "短期売買では、①短期Score → ②短期シグナル → ③7日リターン → ④Exit → ⑤Market Regime → ⑥中期Score の順で見るのがおすすめです。",
      "中期Scoreと短期Scoreは役割が違います。中期Scoreは『今どれだけ強いか』、短期Scoreは『今から5〜10営業日程度で入りやすいか』を表します。",
    ],
  },
  {
    title: "中期Score",
    body: [
      "100点満点で、中期的な強さを評価します。",
      "配点は Trend 30% / Momentum 25% / Risk 20% / Liquidity 15% / Market Regime Fit 10% です。",
      "基本判定は Score 78以上かつ Exit 40未満で ACCUMULATE、Score 58以上かつ Exit 55未満で HOLD。それ以外は WATCH です。Exitが60以上なら REDUCE、75以上なら EXIT が優先されます。",
    ],
  },
  {
    title: "短期Score",
    body: [
      "5〜10営業日程度の短期エントリー向けの100点満点スコアです。",
      "7日モメンタム、20日トレンド、上昇加速、リスク、Market Regime、流動性などを使い、短期的な入りやすさを評価します。",
      "7日リターンが高すぎる場合は『すでに上がり過ぎている』可能性があるため、過熱ペナルティを入れています。",
      "中期Scoreが高くても短期Scoreが低い場合は、『中期では強いが短期では高値追い注意』という読み方になります。",
    ],
  },
  {
    title: "7日 / 20日 / 60日",
    body: [
      "現在価格が、それぞれ7営業日前・20営業日前・60営業日前と比べて何%変化したかを示します。",
      "これは過去の実績であり、将来リターンの予測値ではありません。",
      "短期戦略では特に7日リターンを見ますが、プラスが大きければ良いとは限らず、過熱の可能性にも注意します。",
    ],
  },
  {
    title: "Exit",
    body: [
      "Exit Scoreは撤退リスクです。中期Score・短期Scoreとは逆で、低いほど良い指標です。",
      "目安は 0〜39: 継続しやすい / 40〜59: 注意 / 60〜74: REDUCE / 75以上: EXIT です。",
      "移動平均割れ、モメンタム悪化、高値からの下落、Market Regime悪化などで上昇します。",
    ],
  },
  {
    title: "Market Regime",
    body: [
      "市場全体の環境を STRONG RISK ON / RISK ON / NEUTRAL / RISK OFF / PANIC で表します。",
      "成長・テクノロジー系ETFはRisk Onで評価されやすく、Core・高配当・Defensive系はNeutralやRisk Offで相対的に評価されやすい設計です。",
    ],
  },
];

export default function EtfGuidePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold text-emerald-400">StockDoc AI Pro</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">ETFスコアの見方</h1>
              <p className="mt-2 text-sm text-slate-400">
                中期Score・短期Score・Exit・各リターンの意味を整理します。
              </p>
            </div>
            <Link
              href="/etf"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
            >
              ← ETFランキング
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
          <p className="text-sm font-bold text-cyan-300">短期売買の見る順番</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
            <p>① 短期Score</p>
            <p>② 短期シグナル</p>
            <p>③ 7日リターンの過熱確認</p>
            <p>④ Exit Score</p>
            <p>⑤ Market Regime</p>
            <p>⑥ 中期Score</p>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <h2 className="text-xl font-bold">{section.title}</h2>
              <div className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {section.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
          <p className="font-bold">重要</p>
          <p className="mt-2">
            Scoreは将来の利益を保証するものではありません。特に短期Scoreは今後のETF Learningで、
            7日以内+2%到達率や最大下落率と比較しながら改善していく前提のv1ロジックです。
          </p>
        </div>
      </div>
    </main>
  );
}
