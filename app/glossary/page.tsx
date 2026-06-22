import Link from "next/link";

const TERMS = [
  {
    title: "株価",
    subtitle: "その会社の株を1株買うための価格",
    detail:
      "株価が高い・安いだけでは割高割安は判断できません。PER、PBR、利益成長、配当などとセットで見ます。",
    example: "例：古河電工 58,000円",
  },
  {
    title: "前日比",
    subtitle: "前日の終値と比べた株価の変化率",
    detail:
      "プラスなら上昇、マイナスなら下落です。短期的な勢いを見る指標ですが、1日だけで判断しない方が安全です。",
    example: "例：+8.70% → かなり強い上昇",
  },
  {
    title: "PER",
    subtitle: "株価収益率。株価が利益の何倍まで買われているか",
    detail:
      "PER = 株価 ÷ 1株利益。低いほど割安に見えますが、成長期待が低い会社も低PERになります。高PERは成長期待が大きい反面、期待外れで下がりやすいです。",
    example: "目安：10〜15倍は標準、20倍超は期待高め、50倍超はかなり期待先行",
  },
  {
    title: "PBR",
    subtitle: "株価純資産倍率。株価が純資産の何倍か",
    detail:
      "PBR = 株価 ÷ 1株純資産。1倍以下なら資産価値より安く見えることがあります。ただし、成長企業は高PBRになりやすいです。",
    example: "目安：1倍以下は割安候補、3倍超は成長期待高め",
  },
  {
    title: "配当利回り",
    subtitle: "株価に対して年間配当が何％あるか",
    detail:
      "配当利回り = 年間配当 ÷ 株価。高いほど魅力的に見えますが、業績悪化で減配されるリスクもあります。",
    example: "目安：3%以上は高配当寄り",
  },
  {
    title: "出来高",
    subtitle: "その日に売買された株数",
    detail:
      "出来高が急増している銘柄は注目されています。株価上昇と出来高増加がセットなら、資金流入の可能性があります。",
    example: "例：普段の2倍以上なら注目度上昇",
  },
  {
    title: "時価総額",
    subtitle: "会社全体の市場価値",
    detail:
      "時価総額 = 株価 × 発行済株式数。大型株は安定、小型株は値動きが大きくなりやすいです。",
    example: "大型株ほど倒産リスクは低めだが、爆発力はやや落ちる",
  },
  {
    title: "総合スコア",
    subtitle: "株ドックAI独自の点数",
    detail:
      "PER、PBR、配当利回り、株価モメンタム、出来高などを簡易的に点数化したものです。今後、成長性・テーマ性・安全性も追加します。",
    example: "70点以上：Buy候補、55点以上：Hold候補",
  },
  {
    title: "Buy / Hold / Watch / Avoid",
    subtitle: "株ドックAIの簡易判定",
    detail:
      "Buyは強め、Holdは様子見、Watchは監視、Avoidは見送り候補です。最終判断ではなく、分析の入口として使います。",
    example: "BuyでもPERが高すぎる場合は押し目待ちも検討",
  },
];

export default function GlossaryPage() {
  return (
    <main className="max-w-md mx-auto p-6">
      <div className="mb-6">
        <Link href="/" className="text-green-700 underline">
          ← ホームへ戻る
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">用語辞典</h1>
      <p className="text-sm text-gray-600 mb-6">
        株ドックAIで表示される指標の意味を簡単に確認できます。
      </p>

      <div className="space-y-4">
        {TERMS.map((term) => (
          <section key={term.title} className="border rounded p-4">
            <h2 className="text-xl font-bold">{term.title}</h2>
            <p className="mt-1 font-semibold text-green-700">
              {term.subtitle}
            </p>
            <p className="mt-3 text-sm leading-6">{term.detail}</p>
            <p className="mt-3 text-sm bg-green-50 p-3 rounded">
              {term.example}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}