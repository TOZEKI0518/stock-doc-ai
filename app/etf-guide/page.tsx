"use client";

import Link from "next/link";

const sections = [
  {
    title: "まず何を見る？",
    body: [
      "最初にComplianceを確認します。取引可なら通常分析へ、事前承認なら承認前提、対象外ならスコアが高くても売買候補にはしません。要確認は社内ルール判定に必要なデータが未確認の状態です。",
      "短期売買では、①Compliance → ②短期Score / 短期シグナル → ③Rebound → ④7日・20日リターン → ⑤Exit → ⑥Market Regime → ⑦中期Score の順で見るのがおすすめです。",
      "中期Scoreは『現在の中期的な強さ』、短期Scoreは『今から5〜10営業日程度で入りやすいか』、Reboundは『下落後の反発局面がどこまで進んだか』を別々に評価します。",
    ],
  },
  {
    title: "Compliance",
    body: [
      "投資判断とは独立した社内ルール判定です。分析Scoreが高くてもCompliance判定を上書きしません。",
      "取引可: 確認済み条件では社内ルールに抵触しない / 事前承認: 21銘柄未満または1銘柄の保有比率25%以上 / 対象外: デリバティブを主な投資対象とするETF / 要確認: 必要データの一部が未確認、という扱いです。",
      "『要確認』を自動的に『取引可』とは扱わず、安全側に判定します。",
    ],
  },
  {
    title: "BROAD / FOCUSED / NARROW",
    body: [
      "ETFの分散度を表す分類で、Complianceとは別の概念です。",
      "BROADは市場全体に近い広い分散、FOCUSEDは特定指数・セクターなど中程度の集中、NARROWは少数銘柄やテーマに集中したETFを表します。",
      "NARROWだから自動的に売買不可という意味ではありません。社内ルール判定はComplianceで別途確認します。",
    ],
  },
  {
    title: "中期Score",
    body: [
      "100点満点で、中期的な強さを評価します。",
      "配点は Trend 30% / Momentum 25% / Risk 20% / Liquidity 15% / Market Regime Fit 10% です。",
      "基本判定は Score 78以上かつ Exit 40未満で ACCUMULATE、Score 58以上かつ Exit 55未満で HOLD。それ以外は WATCH です。Exitが60以上なら REDUCE、75以上なら EXIT が優先されます。",
      "Rebound Scoreは中期Scoreとは独立しています。中期Scoreが低くても、急落後の反発だけを狙えるケースがあります。",
    ],
  },
  {
    title: "短期Score",
    body: [
      "5〜10営業日程度の短期エントリー向けの100点満点スコアです。",
      "7日モメンタム、20日トレンド、上昇加速、リスク、Market Regime、流動性などを使い、短期的な入りやすさを評価します。",
      "7日リターンが高すぎる場合は、すでに上がり過ぎている可能性があるため過熱ペナルティを入れています。",
      "中期Scoreが高くても短期Scoreが低い場合は『中期では強いが短期では高値追い注意』、逆なら『中期トレンドは弱いが短期反発候補』という読み方ができます。",
    ],
  },
  {
    title: "Rebound Score",
    body: [
      "下落局面からの反発を0〜100で評価します。底値そのものを当てるのではなく、反発の準備と確認を段階的に判定するための指標です。",
      "v1の配点は Oversold 25% / Reversal 30% / Trend Repair 30% / Market Regime 15% です。売られ過ぎだけでは買いシグナルにせず、反転とトレンド修復を重くしています。",
      "FALLING: まだ下落優勢 / OVERSOLD: 売られ過ぎ候補 / PREPARING: 反発準備 / CONFIRMED: 反発確認 / EXTENDED: 反発後に上がり過ぎ、という順に読みます。",
      "実戦では短期Scoreが高く、かつReboundがPREPARINGからCONFIRMEDへ改善する局面を特に注目します。OVERSOLDだけでの買いは避けます。",
    ],
  },
  {
    title: "Reboundの4つの内訳",
    body: [
      "売られ過ぎ: 20日移動平均からの乖離、20日リターン、高値からの下落などから反発余地を見ます。高いほど『下げ過ぎ』の可能性があります。",
      "反転: 前日変化率や7日モメンタムの改善から、実際に価格が上向き始めているかを見ます。",
      "Trend Repair: 20日・50日移動平均の回復などから、壊れた短期トレンドが修復されているかを見ます。",
      "Regime: 市場全体が反発を後押しできる環境かをMarket Regimeから評価します。",
    ],
  },
  {
    title: "7日 / 20日 / 60日",
    body: [
      "現在価格が、それぞれ7営業日前・20営業日前・60営業日前と比べて何%変化したかを示します。",
      "これは過去の実績であり、将来リターンの予測値ではありません。",
      "短期では7日リターンを重視しますが、急上昇後はReboundがEXTENDEDになることもあるため、プラスが大きいほど良いとは限りません。",
    ],
  },
  {
    title: "Exit",
    body: [
      "Exit Scoreは撤退リスクです。中期Score・短期Score・Rebound Scoreとは逆で、低いほど良い指標です。",
      "目安は 0〜39: 継続しやすい / 40〜59: 注意 / 60〜74: REDUCE / 75以上: EXIT です。",
      "移動平均割れ、モメンタム悪化、高値からの下落、Market Regime悪化などで上昇します。Reboundが高くてもExitが高い場合は慎重に見ます。",
    ],
  },
  {
    title: "Market Regime",
    body: [
      "市場全体の環境を STRONG RISK ON / RISK ON / NEUTRAL / RISK OFF / PANIC で表します。",
      "成長・テクノロジー系ETFはRisk Onで評価されやすく、Core・高配当・Defensive系はNeutralやRisk Offで相対的に評価されやすい設計です。",
      "Rebound DetectorでもRegimeを15%使用し、市場全体が弱いと反発判定の信頼度を抑えます。",
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
                Compliance・分散分類・中期/短期Score・Rebound・Exitの役割を整理します。
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
            <p>① Compliance</p>
            <p>② 短期Score / 短期シグナル</p>
            <p>③ Rebound Score / Status</p>
            <p>④ 7日・20日リターン</p>
            <p>⑤ Exit Score</p>
            <p>⑥ Market Regime</p>
            <p>⑦ 中期Score</p>
            <p>⑧ BROAD / FOCUSED / NARROW</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm leading-7 text-emerald-100">
          <p className="font-bold text-emerald-300">反発狙いで特に見る組み合わせ</p>
          <p className="mt-2">
            短期Scoreが高い + ReboundがPREPARING → CONFIRMEDへ改善 + Exitが低い、
            という組み合わせを優先します。OVERSOLDは「下げ過ぎ」のサインであり、単独では買い判定にしません。
          </p>
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
            Scoreは将来の利益を保証するものではありません。Rebound v1は既存の価格指標とMarket Regimeを使った初期ロジックです。
            今後、RSI・Market Breadth・金利・為替を追加し、ETF Learningで実際の7日/10日リターンや最大下落率と比較しながら改善します。
          </p>
        </div>
      </div>
    </main>
  );
}
