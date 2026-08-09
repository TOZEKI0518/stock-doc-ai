$ErrorActionPreference = 'Stop'

function Replace-Once {
  param(
    [string]$Path,
    [string]$Old,
    [string]$New,
    [string]$Label
  )
  $content = Get-Content -Raw -Path $Path
  if ($content.Contains($New)) {
    Write-Host "[SKIP] $Label already applied"
    return
  }
  if (-not $content.Contains($Old)) {
    throw "Pattern not found for $Label in $Path. No files were blindly overwritten."
  }
  $content = $content.Replace($Old, $New)
  Set-Content -Path $Path -Value $content -Encoding utf8
  Write-Host "[OK] $Label"
}

$root = (Get-Location).Path
Write-Host "Applying ETF 7-day return patch to $root"

Replace-Once `
  -Path (Join-Path $root 'lib\etf\etfTypes.ts') `
  -Old "  changePercent1d: number | null;`n  return20d: number | null;" `
  -New "  changePercent1d: number | null;`n  return7d: number | null;`n  return20d: number | null;" `
  -Label 'EtfPriceMetrics.return7d'

Replace-Once `
  -Path (Join-Path $root 'lib\etf\etfData.ts') `
  -Old "    changePercent1d: pct(latest.close, closes.at(-2) ?? null),`n    return20d: pct(latest.close, closes.at(-21) ?? null)," `
  -New "    changePercent1d: pct(latest.close, closes.at(-2) ?? null),`n    return7d: pct(latest.close, closes.at(-8) ?? null),`n    return20d: pct(latest.close, closes.at(-21) ?? null)," `
  -Label '7-trading-day return calculation'

Replace-Once `
  -Path (Join-Path $root 'lib\etf\etfSnapshot.ts') `
  -Old "    etf_score: item.score, exit_score: item.exitScore, signal: item.signal, market_regime: item.marketRegime,`n    return_20d:" `
  -New "    etf_score: item.score, exit_score: item.exitScore, signal: item.signal, market_regime: item.marketRegime,`n    return_7d: item.metrics.return7d, return_20d:" `
  -Label 'Snapshot return_7d persistence'

$page = Join-Path $root 'app\etf\page.tsx'
Replace-Once `
  -Path $page `
  -Old 'className="mt-4 grid grid-cols-4 gap-2 text-xs"' `
  -New 'className="mt-4 grid grid-cols-5 gap-2 text-xs"' `
  -Label 'ETF ranking metrics grid 5 columns'

Replace-Once `
  -Path $page `
  -Old '<div className="rounded-lg bg-slate-950 p-2"><div className="text-slate-500">20日</div>' `
  -New '<div className="rounded-lg bg-slate-950 p-2"><div className="text-slate-500">7日</div><div className="mt-1 font-bold">{signed(item.metrics.return7d)}</div></div><div className="rounded-lg bg-slate-950 p-2"><div className="text-slate-500">20日</div>' `
  -Label 'ETF ranking 7-day metric card'

Write-Host ''
Write-Host 'Patch complete. Next: run the Supabase migration, then npm run build.'
