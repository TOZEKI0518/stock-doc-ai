追加ファイル:
- lib/learning.ts
- app/api/learning-summary/route.ts
- app/learning/page.tsx

トップページにリンクを追加する場合は app/page.tsx のリンク欄に以下を追加してください。

<Link href="/learning" className="text-blue-300 underline">
  🧠 AI学習レポートを見る
</Link>

反映:
git add .
git commit -m "add ai learning report"
git push
