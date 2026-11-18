export type ShopBillingFeishuSnapshot = {
  shop: string;
  subscribed: boolean;
  planName: string;
  status: string | null;
  billingInterval: string | null;
  billingIntervalLabel: string;
  remainingCredits: number | null;
  totalCredits: number | null;
  usedCredits: number | null;
  subscriptionCredits: number | null;
  purchasedCredits: number | null;
  trialCredits: number | null;
};

export type BillingFeishuStage =
  | "install_grant"
  | "subscribe"
  | "renewal"
  | "annual_credit"
  | "purchase";

export type BillingFeishuFailReason =
  | "charge_guard"
  | "plan_not_found"
  | "reconcile_skip"
  | "exception";

export type ChargeGuardFeishuParams = {
  action: "grant" | "deny";
  env: "test" | "prod";
  shop: string;
  shopEmail?: string | null;
  test: boolean | null;
  shopifyPlanName?: string | null;
  amountCents: number | null;
  currencyCode?: string | null;
  gid: string;
  reason: string;
};

export function emptyShopBillingSnapshot(shop: string): ShopBillingFeishuSnapshot {
  return {
    shop,
    subscribed: false,
    planName: "Free",
    status: null,
    billingInterval: null,
    billingIntervalLabel: "—",
    remainingCredits: null,
    totalCredits: null,
    usedCredits: null,
    subscriptionCredits: null,
    purchasedCredits: null,
    trialCredits: null,
  };
}

export function resolveAmountUsd(
  amountCents: number | null | undefined,
  priceAmount: string | null | undefined,
): number {
  if (amountCents != null && Number.isFinite(Number(amountCents))) {
    return Number(amountCents) / 100;
  }
  const n = Number.parseFloat(String(priceAmount ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatShopBillingFeishuLines(
  snap: ShopBillingFeishuSnapshot,
): string[] {
  const subscribeLine = snap.subscribed
    ? `订阅：是 · ${snap.planName}`
    : snap.status
      ? `订阅：否 · ${snap.planName}`
      : `订阅：否 · Free`;

  let quotaLine = "额度：未知";
  if (
    snap.remainingCredits != null &&
    snap.totalCredits != null &&
    snap.usedCredits != null
  ) {
    const pools = [
      snap.subscriptionCredits != null
        ? `订阅 ${formatNumber(snap.subscriptionCredits)}`
        : null,
      snap.purchasedCredits != null
        ? `加量 ${formatNumber(snap.purchasedCredits)}`
        : null,
      snap.trialCredits != null
        ? `试用 ${formatNumber(snap.trialCredits)}`
        : null,
    ]
      .filter(Boolean)
      .join(" + ");
    quotaLine =
      `额度：剩余 ${formatNumber(snap.remainingCredits)}` +
      `（总 ${formatNumber(snap.totalCredits)} / 已用 ${formatNumber(snap.usedCredits)}` +
      (pools ? `；${pools}` : "") +
      `）`;
  }

  return [subscribeLine, `计费周期：${snap.billingIntervalLabel}`, quotaLine];
}

function formatLifecycle(
  title: string,
  snap: ShopBillingFeishuSnapshot,
  extraLines: Array<string | null | undefined> = [],
): string {
  return [
    title,
    ...formatShopBillingFeishuLines(snap),
    ...extraLines.filter((line): line is string => Boolean(line)),
  ].join("\n");
}

export function formatInstallFeishuMessage(snap: ShopBillingFeishuSnapshot): string {
  return formatLifecycle(`✅ 图译店铺安装：${snap.shop}`, snap);
}

export function formatFirstSubscribeFeishuMessage(
  snap: ShopBillingFeishuSnapshot,
): string {
  return formatLifecycle(`💰 图译首次订阅：${snap.shop}`, snap);
}

export function formatSubscribeFeishuMessage(
  snap: ShopBillingFeishuSnapshot,
  params?: { trial?: boolean },
): string {
  const title = params?.trial
    ? `💰 图译试用订阅：${snap.shop}`
    : `💰 图译订阅：${snap.shop}`;
  return formatLifecycle(title, snap);
}

export function formatRenewalFeishuMessage(snap: ShopBillingFeishuSnapshot): string {
  return formatLifecycle(`💰 图译订阅续费：${snap.shop}`, snap);
}

export function formatAnnualCreditFeishuMessage(
  snap: ShopBillingFeishuSnapshot,
  params?: { creditCycleIndex?: number | null },
): string {
  const index = params?.creditCycleIndex;
  const extra =
    index != null && Number.isFinite(Number(index)) ? [`账期窗：${index}`] : [];
  return formatLifecycle(`📦 图译年付额度发放：${snap.shop}`, snap, extra);
}

export function formatPurchaseFeishuMessage(
  snap: ShopBillingFeishuSnapshot,
  params: { credits: number; amountUsd: number },
): string {
  const credits = Number.isFinite(params.credits) ? params.credits : 0;
  const amount = Number.isFinite(params.amountUsd) ? params.amountUsd : 0;
  const extra = `本次购买：${formatNumber(credits)} Credits · $${amount.toFixed(2)}`;
  return [`💳 图译购买积分：${snap.shop}`, extra, ...formatShopBillingFeishuLines(snap)].join(
    "\n",
  );
}

export function formatCancelFeishuMessage(snap: ShopBillingFeishuSnapshot): string {
  return formatLifecycle(`📉 图译订阅取消：${snap.shop}`, snap);
}

export function formatUninstallFeishuMessage(snap: ShopBillingFeishuSnapshot): string {
  return formatLifecycle(`🛑 图译店铺卸载：${snap.shop}`, snap);
}

const STAGE_LABEL: Record<BillingFeishuStage, string> = {
  install_grant: "安装赠分",
  subscribe: "订阅激活",
  renewal: "订阅续费",
  annual_credit: "年付额度发放",
  purchase: "购买积分",
};

const REASON_LABEL: Record<BillingFeishuFailReason, string> = {
  charge_guard: "入账闸拒绝",
  plan_not_found: "套餐未匹配",
  reconcile_skip: "对账跳过",
  exception: "入账异常",
};

function moneyLabel(
  amountCents: number | null | undefined,
  currencyCode?: string | null,
): string | null {
  if (amountCents == null || !Number.isFinite(Number(amountCents))) return null;
  return `${(Number(amountCents) / 100).toFixed(2)} ${currencyCode || "USD"}`;
}

export function formatBillingFailureFeishuMessage(params: {
  shop?: string;
  snap?: ShopBillingFeishuSnapshot;
  stage: BillingFeishuStage;
  reason: BillingFeishuFailReason;
  chargeGuardReason?: string | null;
  gid?: string | null;
  shopifyPlanName?: string | null;
  amountCents?: number | null;
  currencyCode?: string | null;
  test?: boolean | null;
  env?: "test" | "prod" | null;
  detail?: string | null;
}): string {
  const reasonLabel =
    params.reason === "charge_guard"
      ? `入账闸拒绝（${params.chargeGuardReason || "unknown"}）`
      : REASON_LABEL[params.reason] || params.reason;
  const snap = params.snap || emptyShopBillingSnapshot(params.shop || "");
  const extras = [
    `⚠️ 图译入账失败：${snap.shop}`,
    `阶段：${STAGE_LABEL[params.stage] || params.stage}`,
    `原因：${reasonLabel}`,
    params.gid ? `GID：${params.gid}` : null,
    params.shopifyPlanName ? `名称：${params.shopifyPlanName}` : null,
    moneyLabel(params.amountCents, params.currencyCode)
      ? `金额：${moneyLabel(params.amountCents, params.currencyCode)}`
      : null,
    params.test == null ? null : `test：${params.test ? "true" : "false"}`,
    params.env ? `环境：${params.env}` : null,
    params.detail ? `详情：${String(params.detail).slice(0, 300)}` : null,
    ...formatShopBillingFeishuLines(snap),
  ];
  return extras.filter((line): line is string => Boolean(line)).join("\n");
}

export function formatChargeGuardFeishuMessage(params: ChargeGuardFeishuParams): string {
  const actionLabel = params.action === "deny" ? "拒绝入账" : "员工店放行";
  const testLabel =
    params.test == null ? "未知" : params.test ? "true" : "false";
  const amount = moneyLabel(params.amountCents, params.currencyCode) || "未知";
  return [
    "图译入账校验",
    `动作：${actionLabel}`,
    `环境：${params.env}`,
    `店铺：${params.shop}`,
    `邮箱：${params.shopEmail?.trim() || "—"}`,
    `test：${testLabel}`,
    `名称：${params.shopifyPlanName || "—"}`,
    `金额：${amount}`,
    `GID：${params.gid}`,
    `原因：${params.reason}`,
  ].join("\n");
}
