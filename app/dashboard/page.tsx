import Link from "next/link";

const menuItems = [
  {
    href: "/",
    icon: "🔍",
    title: "銘柄分析",
    description: "コード・会社名・テーマで検索してAI分析します。",
    className: "border-emerald-700 bg-emerald-950",
  },
  {
    href: "/learning",
    icon: "📈",
    title: "AI学習レポート",
    description: "保存したスコアと将来リターンを比較します。",
    className: "border-blue-700 bg-blue-950",
  },
  {
    href: "/historical-backtest",
    icon: "🧪",
    title: "過去データバックテスト",
    description: "過去株価データだけで検証します。",
    className: "border-purple-700 bg-purple-950",
  },
  {
    href: "/backtest",
    icon: "📊",
    title: "簡易バックテスト",
    description: "現在スコアと過去リターンを簡易比較します。",
    className: "border-slate-700 bg-slate-900",
  },
  {
    href: "/glossary",
    icon: "📚",
    title: "用語辞典",
    description: "PER・PBR・ROEなどの意味を確認します。",
    className: "border-yellow-700 bg-yellow-950",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-md mx-auto p-5 pb-10">
        <div className="mb-5">
          <Link href="/" className="text-sm text-emerald-300 underline">
            ← トップへ戻る
          </Link>
          <h1 className="text-3xl font-bold mt-4">AIダッシュボード</h1>
          <p className="text-sm text-slate-300 mt-2">
            株ドックAIの主要機能をここから開けます。
          </p>
        </div>

        <div className="space-y-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-2xl border p-4 ${item.className}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{item.icon}</div>
                <div>
                  <div className="font-bold text-lg text-white">{item.title}</div>
                  <div className="text-sm text-slate-100 mt-1 leading-6">
                    {item.description}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="font-bold text-white mb-2">Version 1.0 状態</h2>
          <ul className="text-sm text-slate-200 leading-7">
            <li>• 毎日23時にSupabaseへ自動保存</li>
            <li>• データ蓄積後、AI学習レポートで成績確認</li>
            <li>• 7日後以降から少しずつ比較可能</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
