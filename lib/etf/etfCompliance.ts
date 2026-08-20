import type { EtfComplianceResult, EtfDiversificationType, EtfMasterItem } from "./etfTypes";

const PRE_APPROVAL_HOLDINGS_THRESHOLD = 21;
const PRE_APPROVAL_MAX_WEIGHT = 25;

export function classifyDiversification(item: EtfMasterItem): { type: EtfDiversificationType; score: number | null } {
  const explicitType = item.compliance?.diversificationType;
  const explicitScore = item.compliance?.diversificationScore ?? null;
  if (explicitType) return { type: explicitType, score: explicitScore };
  const count = item.compliance?.holdingsCount;
  if (typeof count === "number") {
    if (count >= 100) return { type: "BROAD", score: Math.min(100, 75 + Math.log10(count / 100 + 1) * 25) };
    if (count >= 21) return { type: "FOCUSED", score: Math.min(69, 40 + ((count - 21) / 79) * 29) };
    return { type: "NARROW", score: Math.max(0, (count / 20) * 39) };
  }
  return { type: "UNKNOWN", score: explicitScore };
}

export function evaluateEtfCompliance(item: EtfMasterItem): EtfComplianceResult {
  const profile = item.compliance;
  const holdingsCount = profile?.holdingsCount ?? null;
  const maxHoldingWeight = profile?.maxHoldingWeight ?? null;
  const derivativeBased = profile?.derivativeBased ?? null;
  const reasons: string[] = [];
  if (derivativeBased === true) return { status: "NOT_ELIGIBLE", reasons: [profile?.derivativeExposureType ? `デリバティブ投資対象: ${profile.derivativeExposureType}` : "デリバティブを投資対象とするETF"], holdingsCount, maxHoldingWeight, derivativeBased };
  if (holdingsCount !== null && holdingsCount < PRE_APPROVAL_HOLDINGS_THRESHOLD) reasons.push(`構成銘柄数 ${holdingsCount}（21銘柄未満）`);
  if (maxHoldingWeight !== null && maxHoldingWeight >= PRE_APPROVAL_MAX_WEIGHT) reasons.push(`最大構成比率 ${maxHoldingWeight.toFixed(1)}%（25%以上）`);
  if (reasons.length > 0) return { status: "PRE_APPROVAL_REQUIRED", reasons, holdingsCount, maxHoldingWeight, derivativeBased };
  if (holdingsCount === null || maxHoldingWeight === null || derivativeBased === null) {
    const missing: string[] = [];
    if (holdingsCount === null) missing.push("構成銘柄数");
    if (maxHoldingWeight === null) missing.push("最大構成比率");
    if (derivativeBased === null) missing.push("デリバティブ投資対象");
    return { status: "UNKNOWN", reasons: [`要確認: ${missing.join("・")}`], holdingsCount, maxHoldingWeight, derivativeBased };
  }
  return { status: "ELIGIBLE", reasons: ["社内ルール条件をクリア"], holdingsCount, maxHoldingWeight, derivativeBased };
}
