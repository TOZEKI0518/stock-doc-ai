export function calculateScore(params: {
  per?: number | null;
  pbr?: number | null;
  dividendYield?: number | null;
  changePercent?: number | null;
  volume?: number | null;
}) {
  let score = 50;

  const per = params.per ?? 0;
  const pbr = params.pbr ?? 0;
  const dividendYield = params.dividendYield ?? 0;
  const changePercent = params.changePercent ?? 0;
  const volume = params.volume ?? 0;

  if (per > 0 && per < 15) score += 12;
  if (pbr > 0 && pbr < 2) score += 10;
  if (dividendYield > 0.03) score += 8;
  if (changePercent > 0) score += 10;
  if (volume > 1000000) score += 10;

  return Math.min(Math.max(score, 0), 100);
}

export function getRating(score: number) {
  if (score >= 85) return "Strong Buy";
  if (score >= 70) return "Buy";
  if (score >= 55) return "Hold";
  if (score >= 40) return "Watch";
  return "Avoid";
}