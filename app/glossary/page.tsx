import Link from "next/link";

const TERMS = [
  {
    title: "株価",
    subtitle: "その会社の株を1株買うための価格",
    detail: "株価が高い・安いだけでは割高割安は判断できません。PER、PBR、利益成長、配当などとセットで見ます。",
    example: "例：古河電工 58,000円",
  },
  {
    title: "前日比",
    subtitle: "前日の終値と比べた株価の変化率",
    detail: "プラスなら上昇、マイナスなら下落です。短期的な勢いを見る指標ですが、1日だけで判断しない方が安全です。",
    example: "例：+8.70% → かなり強い上昇",
  },
  {
    title: "PER",
    subtitle: "株価収益率。株価が利益の何倍まで買われているか",
    detail: "PER = 株価 ÷ 1株利益。低いほど割安に見えますが、成長期待が低い会社も低PERになります。高PERは成長期待が大きい反面、期待外れで下がりやすいです。",
    example: "目安：10〜15倍は標準、20倍超は期待高め、50倍超は割高リスクあり",
  },
  {
    title: "PBR",
    subtitle: "株価純資産倍率。会社の純資産と比べた株価の割高度",
    detail: "PBR = 株価 ÷ 1株純資産。1倍なら会社の解散価値と同等、1倍未満は割安の可能性、1倍超は成長期待が反映されていると考えられます。",
    example: "目安：1倍未満は割安圏、1〜2倍は標準、3倍超は成長期待が強い",
  },
  {
    title: "配当利回り",
    subtitle: "株価に対して年間配当が何％あるか",
    detail: "配当利回り = 年間配当 ÷ 株価。高いほど魅力的に見えますが、業績悪化で減配されるリスクもあります。",
    example: "目安：3%以上は高配当寄り",
  },
  {
    title: "出来高",
    subtitle: "その日に売買された株数",
    detail: "出来高が急増している銘柄は注目されています。株価上昇と出来高増加がセットなら、資金流入の可能性があります。",
    example: "例：普段の2倍以上なら注目度上昇",
  },
  {
    title: "総合スコア",
    subtitle: "株ドックAI独自の点数",
    detail: "割安性、配当、需給、テーマ性などを簡易的に点数化したものです。最終判断ではなく、分析の入口として使います。",
    example: "70点以上：注目候補、55点以上：様子見候補",
  },
  {
    title: "Strong Buy / Buy / Hold / Watch / Avoid",
    subtitle: "株ドックAIの簡易判定",
    detail: "Strong Buyは強め、Buyは注目、Holdは様子見、Watchは監視、Avoidは見送り候補です。実際の売買判断ではなく、分析を始めるための目安です。",
    example: "Strong Buyでも主なリスクは必ず確認します",
  },
];

export default function GlossaryPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-5 py-8">
        <div className="mb-6">
          <Link href="/" className="text-green-400 underline underline-offset-4">
            ← ホームへ戻る
          </Link>
        </div>

        <h1 className="mb-2 text-4xl font-extrabold">用語辞典</h1>
        <p className="mb-7 text-sm leading-6 text-gray-300">
          株ドックAIで表示される指標の意味を簡単に確認できます。
        </p>

        <div className="space-y-5">
          {TERMS.map((term) => (
            <section key={term.title} className="rounded-md border border-gray-300 p-4">
              <h2 className="text-2xl font-bold text-white">{term.title}</h2>
              <p className="mt-2 font-bold leading-7 text-green-400">{term.subtitle}</p>
              <p className="mt-4 text-sm leading-7 text-gray-100">{term.detail}</p>
              <p className="mt-4 rounded-md bg-green-50 p-3 text-sm font-medium leading-6 text-black">
                {term.example}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
