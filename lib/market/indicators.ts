export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function percentChange(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function scoreTrend(
  return20d: number | null,
  distanceFromMa50: number | null
): number {
  if (return20d === null && distanceFromMa50 === null) return 50;

  const momentumScore =
    return20d === null ? 50 : clamp(50 + return20d * 3.5);
  const trendScore =
    distanceFromMa50 === null ? 50 : clamp(50 + distanceFromMa50 * 4);

  return round(momentumScore * 0.55 + trendScore * 0.45);
}

export function scoreVix(
  price: number,
  changePercent1d: number | null
): number {
  let levelScore: number;

  if (price <= 13) levelScore = 95;
  else if (price <= 17) levelScore = 82;
  else if (price <= 22) levelScore = 62;
  else if (price <= 28) levelScore = 38;
  else if (price <= 35) levelScore = 18;
  else levelScore = 5;

  const dailyAdjustment =
    changePercent1d === null ? 0 : clamp(-changePercent1d * 0.8, -15, 15);

  return round(clamp(levelScore + dailyAdjustment));
}

export function scoreUsdJpy(
  return20d: number | null,
  distanceFromMa50: number | null
): number {
  // Initial neutral design: rapid FX moves are treated as risk, while stability scores higher.
  const move = Math.max(
    Math.abs(return20d ?? 0),
    Math.abs(distanceFromMa50 ?? 0)
  );

  if (move <= 1.5) return 75;
  if (move <= 3) return 62;
  if (move <= 5) return 48;
  if (move <= 8) return 30;
  return 15;
}

export function scoreUs10y(
  price: number,
  return20d: number | null
): number {
  let levelScore: number;

  if (price <= 2.5) levelScore = 78;
  else if (price <= 3.5) levelScore = 72;
  else if (price <= 4.25) levelScore = 58;
  else if (price <= 5) levelScore = 38;
  else levelScore = 18;

  const momentumAdjustment =
    return20d === null ? 0 : clamp(-return20d * 1.2, -15, 15);

  return round(clamp(levelScore + momentumAdjustment));
}
