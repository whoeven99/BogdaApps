/**
 * A/B 转化率相关统计：Wald（正态近似）标准误与 95% 置信区间。
 * 供 Dashboard 等展示层复用，避免与 webpixerToAli 服务端实现散落重复。
 */

/** 95% 置信水平对应的双侧临界值（标准正态近似） */
export const WALD_Z_95 = 1.96;

/**
 * 标准误 SE = sqrt((p * (1 - p)) / n)
 * @param p 样本转化率，0~1
 * @param n 曝光用户数（样本量）
 */
export function waldProportionStandardError(p: number, n: number): number {
  const nSafe = Math.max(0, Math.floor(Number(n) || 0));
  if (nSafe <= 0) return 0;
  const pHat = clamp01(p);
  return Math.sqrt((pHat * (1 - pHat)) / nSafe);
}

/**
 * 单一比例 Wald 95% CI：CI = p ± z * SE，并截断到 [0, 1]。
 */
export function waldProportion95ConfidenceInterval(
  p: number,
  n: number,
): { lower: number; upper: number; se: number } {
  const se = waldProportionStandardError(p, n);
  const pHat = clamp01(p);
  const half = WALD_Z_95 * se;
  return {
    lower: Math.max(0, pHat - half),
    upper: Math.min(1, pHat + half),
    se,
  };
}

export type TwoProportionDiffCi = {
  /** p1 - p0 */
  diff: number;
  lower: number;
  upper: number;
  se: number;
};

/**
 * 两独立样本转化率之差 (p1 - p0) 的 Wald 95% 置信区间。
 * SE_diff = sqrt(p0(1-p0)/n0 + p1(1-p1)/n1)
 */
export function waldTwoProportionDifference95Ci(
  p0: number,
  n0: number,
  p1: number,
  n1: number,
): TwoProportionDiffCi | null {
  const n0s = Math.max(0, Math.floor(Number(n0) || 0));
  const n1s = Math.max(0, Math.floor(Number(n1) || 0));
  if (n0s <= 0 || n1s <= 0) return null;
  const ph0 = clamp01(p0);
  const ph1 = clamp01(p1);
  const diff = ph1 - ph0;
  const se = Math.sqrt(
    (ph0 * (1 - ph0)) / n0s + (ph1 * (1 - ph1)) / n1s,
  );
  const half = WALD_Z_95 * se;
  return {
    diff,
    lower: diff - half,
    upper: diff + half,
    se,
  };
}

/**
 * 单个分组转化率可信度：
 * 仅基于该分组自身样本计算 95% CI，若当前转化率落在该区间内则视为「可信」。
 */
export function isConversionDifferenceCredibleVsBaseline(sample: {
  conversionRate: number;
  exposureUsers: number;
}): boolean {
  const n = Math.max(0, Math.floor(Number(sample.exposureUsers) || 0));
  if (n <= 0) return false;

  const pHat = clamp01(sample.conversionRate);
  const ci = waldProportion95ConfidenceInterval(pHat, n);
  return pHat >= ci.lower && pHat <= ci.upper;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
