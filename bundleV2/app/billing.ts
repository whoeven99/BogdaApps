/**
 * 客户端与服务器共用的计费常量（勿放在 *.server.ts，否则无法被路由组件引用）。
 */

export type BillingPlanId = "starter" | "professional" | "enterprise";

export type BillingCycle = "monthly" | "yearly";

export const BILLING_PLANS: Record<
  BillingPlanId,
  { label: string; monthlyUsd: number; yearlyUsd: number }
> = {
  starter: { label: "Starter", monthlyUsd: 29, yearlyUsd: 290 },
  professional: { label: "Professional", monthlyUsd: 79, yearlyUsd: 790 },
  enterprise: { label: "Enterprise", monthlyUsd: 199, yearlyUsd: 1990 },
};

const APP_BILLING_PREFIX = "Ciwi Bundle";

export function subscriptionDisplayName(
  planId: BillingPlanId,
  cycle: BillingCycle,
): string {
  const { label } = BILLING_PLANS[planId];
  const cycleLabel = cycle === "monthly" ? "Monthly" : "Yearly";
  return `${APP_BILLING_PREFIX} — ${label} (${cycleLabel})`;
}

export function isBillingPlanId(value: string): value is BillingPlanId {
  return value === "starter" || value === "professional" || value === "enterprise";
}

export function isBillingCycle(value: string): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

/** 非 production 时为测试计费（与 billing.server 中 appSubscriptionCreate 的 test 一致）。 */
export function billingIsTestCharge(): boolean {
  return process.env.NODE_ENV !== "production";
}

const BILLING_RETURN_QS = "billing_return=1";

/**
 * Shopify `appSubscriptionCreate.returnUrl` 最长 255 字符。
 * 不能用完整 `request.url`（嵌入应用会带很长的 host、session 等 query）。
 *
 * 优先用 `SHOPIFY_APP_URL`（与 Partner 里应用 URL 一致）；否则用 `origin + pathname`，仍不带原 query。
 */
export function buildBillingReturnUrl(request: Request): string {
  const reqUrl = new URL(request.url);
  const envRoot = process.env.SHOPIFY_APP_URL?.trim();

  const withRoot = (root: string) => {
    const r = root.replace(/\/$/, "");
    return `${r}/?${BILLING_RETURN_QS}`;
  };

  if (envRoot) {
    const u = withRoot(envRoot);
    if (u.length <= 255) return u;
  }

  const originPath = `${reqUrl.origin}${reqUrl.pathname}?${BILLING_RETURN_QS}`;
  if (originPath.length <= 255) return originPath;

  return withRoot(reqUrl.origin);
}
