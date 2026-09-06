import type { EtfComplianceResult, EtfDiversificationType, EtfMasterItem } from "./etfTypes";

const PRE_APPROVAL_HOLDINGS_THRESHOLD = 21;
const PRE_APPROVAL_MAX_WEIGHT = 25;
export const COMPLIANCE_MAX_AGE_DAYS = 90;

function daysOld(dateText: string | null | undefined): number | null {
  if (!dateText) return null;
  const d = new Date(`${dateText.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function baseResult(item: EtfMasterItem) {
  const p = item.compliance;
  const sourceDate = p?.sourceDate ?? null;
  const verifiedAt = p?.verifiedAt ?? null;
  const age = daysOld(verifiedAt || sourceDate);
  const provenanceVerified = Boolean(
    p?.sourceName && (sourceDate || verifiedAt) && p?.sourceNote
  );
  const stale = age !== null && age > COMPLIANCE_MAX_AGE_DAYS;
  return {
    sourceName: p?.sourceName ?? null,
    sourceUrl: p?.sourceUrl ?? null,
    sourceDate,
    verifiedAt,
    sourceNote: p?.sourceNote ?? null,
    provenanceVerified,
    stale,
  };
}

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
  const provenance = baseResult(item);
  const common = { holdingsCount, maxHoldingWeight, derivativeBased, ...provenance };

  // Conservative blocks are honored even if provenance is incomplete.
  if (derivativeBased === true) {
    return {
      status: "NOT_ELIGIBLE",
      reasons: [profile?.derivativeExposureType ? `デリバティブ投資対象: ${profile.derivativeExposureType}` : "デリバティブを投資対象とするETF"],
      ...common,
    };
  }

  const preApprovalReasons: string[] = [];
  if (holdingsCount !== null && holdingsCount < PRE_APPROVAL_HOLDINGS_THRESHOLD) preApprovalReasons.push(`構成銘柄数 ${holdingsCount}（21銘柄未満）`);
  if (maxHoldingWeight !== null && maxHoldingWeight >= PRE_APPROVAL_MAX_WEIGHT) preApprovalReasons.push(`最大構成比率 ${maxHoldingWeight.toFixed(1)}%（25%以上）`);
  if (preApprovalReasons.length > 0) {
    return { status: "PRE_APPROVAL_REQUIRED", reasons: preApprovalReasons, ...common };
  }

  const missing: string[] = [];
  if (holdingsCount === null) missing.push("構成銘柄数");
  if (maxHoldingWeight === null) missing.push("最大構成比率");
  if (derivativeBased === null) missing.push("デリバティブ投資対象");
  if (missing.length > 0) {
    return { status: "UNKNOWN", reasons: [`要確認: ${missing.join("・")}`], ...common };
  }

  // A positive (eligible) result must have traceable, recent provenance.
  if (!provenance.provenanceVerified) {
    return {
      status: "UNKNOWN",
      reasons: ["数値は登録されていますが、情報源・基準日/確認日の証跡が不足しているため再確認が必要です"],
      ...common,
    };
  }
  if (provenance.stale) {
    return {
      status: "UNKNOWN",
      reasons: [`Compliance情報が${COMPLIANCE_MAX_AGE_DAYS}日超のため再確認が必要です`],
      ...common,
    };
  }

  return { status: "ELIGIBLE", reasons: ["社内ルール条件をクリア（出所・日付確認済み）"], ...common };
}
