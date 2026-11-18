import { getImageRedisClient } from "~/server/redis.server";
import { sendFeishuTextMessage } from "~/server/feishu/sendFeishuTextMessage.server";
import {
  FAILURE_FEISHU_TTL_SEC,
  failureFeishuBucket,
  failureFeishuLogReference,
  failureFeishuRedisKey,
  failureFeishuUsesDebounce,
  formatAnnualCreditFeishuMessage,
  formatBillingFailureFeishuMessage,
  formatCancelFeishuMessage,
  formatChargeGuardFeishuMessage,
  formatFirstSubscribeFeishuMessage,
  formatInstallFeishuMessage,
  formatPurchaseFeishuMessage,
  formatRenewalFeishuMessage,
  formatSubscribeFeishuMessage,
  formatUninstallFeishuMessage,
  sanitizeFeishuErrorDetail,
  type BillingFeishuFailReason,
  type BillingFeishuStage,
  type ChargeGuardFeishuParams,
  type ShopBillingFeishuSnapshot,
} from "./billingFeishuFormat";
import {
  appendBillingLog,
  claimBillingLogFlag,
  hasBillingLog,
} from "./billingLog.server";
import { snapshotShopBilling } from "./snapshotShopBilling.server";
import { BILLING_LOG_EVENT } from "./types.server";

const LOG_INSTALL = "[lifecycleFeishu:install]";
const LOG_SUBSCRIBE = "[lifecycleFeishu:subscribe]";
const LOG_PURCHASE = "[lifecycleFeishu:purchase]";
const LOG_RENEWAL = "[lifecycleFeishu:renewal]";
const LOG_ANNUAL = "[lifecycleFeishu:annual-credit]";
const LOG_CANCEL = "[lifecycleFeishu:cancel]";
const LOG_UNINSTALL = "[lifecycleFeishu:uninstall]";
const LOG_FAILURE = "[lifecycleFeishu:failure]";
const LOG_CHARGE_GUARD = "[lifecycleFeishu:charge-guard]";

async function sendLifecycle(
  log: string,
  shop: string,
  text: string,
): Promise<void> {
  const result = await sendFeishuTextMessage(text);
  if (!result.ok && !("skipped" in result && result.skipped)) {
    console.warn(`${log} send failed shop=${shop}`, result);
  }
}

function fire(log: string, shop: string, work: () => Promise<void>): void {
  void work().catch((err) => {
    console.warn(`${log} shop=`, shop, err);
  });
}

async function claimFailureFeishuSlot(params: {
  shop: string;
  stage: BillingFeishuStage;
  reason: BillingFeishuFailReason;
}): Promise<boolean> {
  if (!failureFeishuUsesDebounce(params.reason)) return true;

  const redis = getImageRedisClient();
  if (redis) {
    try {
      const ok = await redis.set(
        failureFeishuRedisKey(params.shop, params.stage, params.reason),
        "1",
        "EX",
        FAILURE_FEISHU_TTL_SEC,
        "NX",
      );
      return ok === "OK";
    } catch (err) {
      console.warn(`${LOG_FAILURE} redis claim failed shop=${params.shop}`, err);
    }
  }

  const referenceId = failureFeishuLogReference(
    params.stage,
    params.reason,
    failureFeishuBucket(),
  );
  try {
    if (
      await hasBillingLog(
        params.shop,
        BILLING_LOG_EVENT.FEISHU_FAILURE_NOTIFIED,
        referenceId,
      )
    ) {
      return false;
    }
    await appendBillingLog({
      shop: params.shop,
      eventType: BILLING_LOG_EVENT.FEISHU_FAILURE_NOTIFIED,
      referenceId,
      creditsDelta: 0,
      metadata: { stage: params.stage, reason: params.reason },
    });
    return true;
  } catch (err) {
    console.warn(`${LOG_FAILURE} log claim failed shop=${params.shop}`, err);
    return true;
  }
}

export function scheduleInstallFeishu(shop: string): void {
  fire(LOG_INSTALL, shop, async () => {
    const snap = await snapshotShopBilling(shop);
    await sendLifecycle(LOG_INSTALL, shop, formatInstallFeishuMessage(snap));
  });
}

export function scheduleSubscribeFeishu(params: {
  shop: string;
  inTrial: boolean;
  first: boolean;
}): void {
  fire(LOG_SUBSCRIBE, params.shop, async () => {
    const snap = await snapshotShopBilling(params.shop);
    const text = params.first
      ? formatFirstSubscribeFeishuMessage(snap)
      : formatSubscribeFeishuMessage(snap, { trial: params.inTrial });
    await sendLifecycle(LOG_SUBSCRIBE, params.shop, text);
  });
}

export function schedulePurchaseFeishu(params: {
  shop: string;
  credits: number;
  amountUsd: number;
}): void {
  fire(LOG_PURCHASE, params.shop, async () => {
    const snap = await snapshotShopBilling(params.shop);
    await sendLifecycle(
      LOG_PURCHASE,
      params.shop,
      formatPurchaseFeishuMessage(snap, {
        credits: params.credits,
        amountUsd: params.amountUsd,
      }),
    );
  });
}

export function scheduleRenewalFeishu(params: {
  shop: string;
  billingLogId: string;
}): void {
  fire(LOG_RENEWAL, params.shop, async () => {
    if (!(await claimBillingLogFlag(params.billingLogId, "renewalFeishuSent"))) {
      return;
    }
    const snap = await snapshotShopBilling(params.shop);
    await sendLifecycle(LOG_RENEWAL, params.shop, formatRenewalFeishuMessage(snap));
  });
}

export function scheduleAnnualCreditFeishu(params: {
  shop: string;
  billingLogId: string;
  creditCycleIndex?: number | null;
}): void {
  fire(LOG_ANNUAL, params.shop, async () => {
    if (!(await claimBillingLogFlag(params.billingLogId, "annualCreditFeishuSent"))) {
      return;
    }
    const snap = await snapshotShopBilling(params.shop);
    await sendLifecycle(
      LOG_ANNUAL,
      params.shop,
      formatAnnualCreditFeishuMessage(snap, {
        creditCycleIndex: params.creditCycleIndex,
      }),
    );
  });
}

export function scheduleCancelFeishu(snap: ShopBillingFeishuSnapshot): void {
  fire(LOG_CANCEL, snap.shop, async () => {
    await sendLifecycle(LOG_CANCEL, snap.shop, formatCancelFeishuMessage(snap));
  });
}

export function scheduleUninstallFeishu(snap: ShopBillingFeishuSnapshot): void {
  fire(LOG_UNINSTALL, snap.shop, async () => {
    await sendLifecycle(
      LOG_UNINSTALL,
      snap.shop,
      formatUninstallFeishuMessage(snap),
    );
  });
}

export function scheduleBillingFailureFeishu(params: {
  shop: string;
  stage: BillingFeishuStage;
  reason: BillingFeishuFailReason;
  chargeGuardReason?: string | null;
  gid?: string | null;
  shopifyPlanName?: string | null;
  amountCents?: number | null;
  currencyCode?: string | null;
  test?: boolean | null;
  env?: "test" | "prod" | null;
  detail?: unknown;
  snap?: ShopBillingFeishuSnapshot;
}): void {
  fire(LOG_FAILURE, params.shop, async () => {
    if (
      !(await claimFailureFeishuSlot({
        shop: params.shop,
        stage: params.stage,
        reason: params.reason,
      }))
    ) {
      return;
    }
    const snap = params.snap ?? (await snapshotShopBilling(params.shop));
    await sendLifecycle(
      LOG_FAILURE,
      params.shop,
      formatBillingFailureFeishuMessage({
        ...params,
        detail: sanitizeFeishuErrorDetail(params.detail),
        snap,
      }),
    );
  });
}

export function scheduleChargeGuardStaffFeishu(
  params: Omit<ChargeGuardFeishuParams, "action">,
): void {
  fire(LOG_CHARGE_GUARD, params.shop, async () => {
    await sendLifecycle(
      LOG_CHARGE_GUARD,
      params.shop,
      formatChargeGuardFeishuMessage({ ...params, action: "grant" }),
    );
  });
}
