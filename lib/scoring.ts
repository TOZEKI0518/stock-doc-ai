export function calculateDetailedScore(params: {
  per?: number | null;
  pbr?: number | null;
  dividendYield?: number | null;
  changePercent?: number | null;
  volume?: number | null;
}) {
  const per = params.per ?? 0;
  const pbr = params.pbr ?? 0;
  const dividendYield = params.dividendYield ?? 0;
  const changePercent = params.changePercent ?? 0;
  const volume = params.volume ?? 0;

  let valuation = 50;

  if (per > 0 && per < 10) valuation = 90;
  else if (per > 0 && per < 15) valuation = 80;
  else if (per > 0 && per < 20) valuation = 70;
  else if (per > 0 && per < 30) valuation = 55;
  else if (per > 0) valuation = 40;

  if (pbr > 0 && pbr < 1) valuation += 10;
  else if (pbr > 0 && pbr < 2) valuation += 5;
  else if (pbr > 5) valuation -= 10;

  valuation = Math.min(Math.max(Math.round(valuation), 0), 100);

  let dividend = 40;

  if (dividendYield >= 0.05) dividend = 100;
  else if (dividendYield >= 0.04) dividend = 90;
  else if (dividendYield >= 0.03) dividend = 80;
  else if (dividendYield >= 0.02) dividend = 65;
  else if (dividendYield > 0) dividend = 50;

  let momentum = 50;

  if (changePercent > 5) momentum += 30;
  else if (changePercent > 2) momentum += 20;
  else if (changePercent > 0) momentum += 10;
  else if (changePercent < -5) momentum -= 20;
  else if (changePercent < -2) momentum -= 10;

  if (volume > 10000000) momentum += 20;
  else if (volume > 1000000) momentum += 10;
  else if (volume > 0 && volume < 100000) momentum -= 10;

  momentum = Math.min(Math.max(Math.round(momentum), 0), 100);

  const theme = 80;

  const total = Math.round(
    valuation * 0.35 +
      dividend * 0.2 +
      momentum * 0.2 +
      theme * 0.25
  );

  return {
    total: Math.min(Math.max(total, 0), 100),
    valuation,
    dividend,
    momentum,
    theme,
  };
}

export function calculateScore(params: {
  per?: number | null;
  pbr?: number | null;
  dividendYield?: number | null;
  changePercent?: number | null;
  volume?: number | null;
}) {
  return calculateDetailedScore(params).total;
}

export function getRating(score: number) {
  if (score >= 85) return "Strong Buy";
  if (score >= 70) return "Buy";
  if (score >= 55) return "Hold";
  if (score >= 40) return "Watch";
  return "Avoid";
}
