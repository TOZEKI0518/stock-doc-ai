import type { EtfAnalysis } from "./etfTypes";

export type EtfTradeAction =
  | "BUY"
  | "WAIT"
  | "HOLD"
  | "REDUCE"
  | "SELL"
  | "PRE_APPROVAL"
  | "CHECK_REQUIRED"
  | "BLOCKED";

export type EtfPositionInput = {
  isHeld: boolean;
  quantity?: number;
  averagePrice?: number;
};

export type EtfTradeDecision = {
  action: EtfTradeAction;
  confidence: number;
  allocationRate: number;
  recommendedAmount: number;
  recommendedUnits: number;
  positionValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  reasons: string[];
};

type DecisionInput = {
  analysis: EtfAnalysis;
  surplusCash: number;
  position?: EtfPositionInput;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 0) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function buyConfidence(a: EtfAnalysis) {
  const reboundBonus = a.rebound.status === "CONFIRMED" ? 90 : a.rebound.status === "PREPARING" ? 75 : a.rebound.score;
  return round(
    clamp(
      a.shortTermScore * 0.45 +
        a.score * 0.3 +
        reboundBonus * 0.1 +
        a.shortTermBreakdown.regimeFit * 0.1 +
        a.shortTermBreakdown.risk * 0.05,
      0,
      100
    ),
    0
  );
}

function allocationRateFrom(a: EtfAnalysis, confidence: number) {
  let base = confidence >= 88 ? 0.25 : confidence >= 80 ? 0.2 : 0.15;
  const regimeMultiplier =
    a.marketRegime === "STRONG_RISK_ON"
      ? 1
      : a.marketRegime === "RISK_ON"
        ? 0.95
        : a.marketRegime === "NEUTRAL"
          ? 0.9
          : a.marketRegime === "RISK_OFF"
            ? 0.6
            : 0;
  const riskMultiplier = clamp(a.shortTermBreakdown.risk / 75, 0.7, 1);
  base *= regimeMultiplier * riskMultiplier;
  return round(clamp(base, 0, 0.25), 3);
}

function positionStats(a: EtfAnalysis, position?: EtfPositionInput) {
  const quantity = Math.max(0, Math.floor(position?.quantity ?? 0));
  const averagePrice = Math.max(0, position?.averagePrice ?? 0);
  const positionValue = quantity * Math.max(0, a.metrics.price);
  const cost = quantity * averagePrice;
  const unrealizedPnl = averagePrice > 0 ? positionValue - cost : 0;
  const unrealizedPnlPercent = averagePrice > 0 ? ((a.metrics.price - averagePrice) / averagePrice) * 100 : 0;
  return {
    quantity,
    positionValue: Math.round(positionValue),
    unrealizedPnl: Math.round(unrealizedPnl),
    unrealizedPnlPercent: round(unrealizedPnlPercent, 1),
  };
}

function blockedDecision(action: EtfTradeAction, reason: string): EtfTradeDecision {
  return {
    action,
    confidence: 0,
    allocationRate: 0,
    recommendedAmount: 0,
    recommendedUnits: 0,
    positionValue: 0,
    unrealizedPnl: 0,
    unrealizedPnlPercent: 0,
    reasons: [reason],
  };
}

export function decideEtfTrade({ analysis: a, surplusCash, position }: DecisionInput): EtfTradeDecision {
  const held = position?.isHeld ?? false;
  const reasons: string[] = [];
  const stats = positionStats(a, position);

  if (a.compliance.status === "NOT_ELIGIBLE") {
    return blockedDecision("BLOCKED", "Compliance対象外のため新規売買候補から除外します");
  }
  if (a.compliance.status === "UNKNOWN") {
    return blockedDecision("CHECK_REQUIRED", "Compliance情報が未確認のため判定を停止します");
  }
  if (a.compliance.status === "PRE_APPROVAL_REQUIRED" && !held) {
    return blockedDecision("PRE_APPROVAL", "事前承認が必要なETFです。承認前は新規BUYを出しません");
  }

  if (held) {
    const pnlReason = `含み損益 ${stats.unrealizedPnlPercent >= 0 ? "+" : ""}${stats.unrealizedPnlPercent.toFixed(1)}%`;
    if (a.exitScore >= 75 || a.signal === "EXIT") {
      return {
        action: "SELL",
        confidence: round(clamp(a.exitScore, 0, 100)),
        allocationRate: 0,
        recommendedAmount: Math.round(stats.quantity * a.metrics.price),
        recommendedUnits: stats.quantity,
        positionValue: stats.positionValue,
        unrealizedPnl: stats.unrealizedPnl,
        unrealizedPnlPercent: stats.unrealizedPnlPercent,
        reasons: ["Exit Scoreが売却基準に到達しています", pnlReason, ...a.reasons.slice(0, 1)],
      };
    }
    if (a.exitScore >= 60 || a.signal === "REDUCE") {
      const units = stats.quantity > 0 ? Math.max(1, Math.ceil(stats.quantity / 2)) : 0;
      return {
        action: "REDUCE",
        confidence: round(clamp(a.exitScore, 0, 100)),
        allocationRate: 0,
        recommendedAmount: Math.round(units * a.metrics.price),
        recommendedUnits: units,
        positionValue: stats.positionValue,
        unrealizedPnl: stats.unrealizedPnl,
        unrealizedPnlPercent: stats.unrealizedPnlPercent,
        reasons: ["Exit Scoreが縮小基準に入っています", pnlReason, ...a.reasons.slice(0, 1)],
      };
    }
    return {
      action: "HOLD",
      confidence: round(clamp(100 - a.exitScore, 0, 100)),
      allocationRate: 0,
      recommendedAmount: 0,
      recommendedUnits: 0,
      positionValue: stats.positionValue,
      unrealizedPnl: stats.unrealizedPnl,
      unrealizedPnlPercent: stats.unrealizedPnlPercent,
      reasons: ["現時点ではExit基準に達していません", pnlReason, ...a.shortTermReasons.slice(0, 1)],
    };
  }

  if (a.marketRegime === "PANIC") {
    return blockedDecision("WAIT", "Market RegimeがPANICのため新規BUYを停止します");
  }
  if (a.shortTermSignal === "OVERHEATED") {
    return blockedDecision("WAIT", "短期的に過熱しているため追いかけ買いを避けます");
  }
  if (a.shortTermSignal === "AVOID") {
    return blockedDecision("WAIT", "短期リスクが高いため新規BUYを見送ります");
  }

  const confidence = buyConfidence(a);
  const buySetup =
    a.shortTermSignal === "SHORT_BUY" &&
    a.shortTermScore >= 75 &&
    a.score >= 58 &&
    a.exitScore < 55 &&
    a.shortTermOverheatPenalty < 15;

  if (!buySetup) {
    if (a.shortTermSignal === "READY" && a.score >= 58) {
      reasons.push("短期Scoreは準備段階です。SHORT_BUYへの改善を待ちます");
    } else {
      reasons.push("短期・中期・Exit条件が同時にBUY基準を満たしていません");
    }
    if (a.shortTermReasons.length) reasons.push(a.shortTermReasons[0]);
    return {
      action: "WAIT",
      confidence,
      allocationRate: 0,
      recommendedAmount: 0,
      recommendedUnits: 0,
      positionValue: 0,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      reasons,
    };
  }

  if (!Number.isFinite(surplusCash) || surplusCash <= 0) {
    return {
      action: "BUY",
      confidence,
      allocationRate: 0,
      recommendedAmount: 0,
      recommendedUnits: 0,
      positionValue: 0,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      reasons: ["BUY条件です。余剰資金を設定すると推奨金額・口数を計算します", ...a.shortTermReasons.slice(0, 2)],
    };
  }

  const allocationRate = allocationRateFrom(a, confidence);
  const targetAmount = Math.floor((surplusCash * allocationRate) / 1000) * 1000;
  const units = a.metrics.price > 0 ? Math.floor(targetAmount / a.metrics.price) : 0;
  const recommendedAmount = units > 0 ? Math.round(units * a.metrics.price) : 0;

  if (units <= 0) {
    return {
      action: "WAIT",
      confidence,
      allocationRate,
      recommendedAmount: 0,
      recommendedUnits: 0,
      positionValue: 0,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      reasons: ["BUY条件ですが、設定した余剰資金では1口分の推奨枠に届きません"],
    };
  }

  reasons.push(`余剰資金の約${Math.round(allocationRate * 100)}%を今回の上限目安にします`);
  if (a.shortTermSignal === "SHORT_BUY") reasons.push("短期Score v2がSHORT_BUY条件です");
  if (a.score >= 70) reasons.push("中期Scoreも70点以上です");
  if (a.rebound.status === "CONFIRMED" || a.rebound.status === "PREPARING") reasons.push("Rebound Detectorも反発側です");

  return {
    action: "BUY",
    confidence,
    allocationRate,
    recommendedAmount,
    recommendedUnits: units,
    positionValue: 0,
    unrealizedPnl: 0,
    unrealizedPnlPercent: 0,
    reasons,
  };
}
