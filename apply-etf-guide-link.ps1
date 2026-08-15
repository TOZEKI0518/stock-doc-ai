$path = "app\etf\page.tsx"

if (!(Test-Path $path)) {
  Write-Error "app\etf\page.tsx が見つかりません。プロジェクト直下で実行してください。"
  exit 1
}

$content = Get-Content $path -Raw -Encoding UTF8

if ($content -match 'href="/etf-guide"') {
  Write-Host "ETF Guide link already exists. No change needed."
  exit 0
}

$needle = @'
            <Link
              href="/etf-learning"
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              ETF Learning Report →
            </Link>
'@

$replacement = $needle + @'

            <Link
              href="/etf-guide"
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/20"
            >
              ？ スコアの見方
            </Link>
'@

if (!$content.Contains($needle)) {
  Write-Error "ETF Learning Reportリンク部分が見つかりませんでした。page.tsxの構造が想定と異なります。"
  exit 1
}

$content = $content.Replace($needle, $replacement)
Set-Content $path $content -Encoding UTF8
Write-Host "Added ETF Guide link successfully."
