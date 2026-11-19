import prisma from "~/db.server";
import {
  earliestTrialLotExpiresAt,
  settleExpiredInstallTrialCredits,
  type SettleExpiredTrialOptions,
} from "../accountBalance";
import { appendBillingLog } from "../billingLog.server";
import { BILLING_LOG_EVENT } from "../types.server";

export const INSTALL_CREDITS_REFERENCE_ID = "install_credits";
/** 规格：安装 5 万积分（约 25 次译图）。 */
export const INSTALL_CREDITS = 50_000;
export const INSTALL_CREDITS_TTL_DAYS = 30;

export type GrantInstallCreditsResult =
  | { granted: true; credits: number }
  | { granted: false; reason: "already_granted" };

export function installCreditsExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + INSTALL_CREDITS_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function aliasPatch(account: {
  subscriptionCredits: number;
  purchasedCredits: number;
  trialCredits: number;
  usedCredits: number;
}) {
  return {
    purchasePoints:
      account.subscriptionCredits + account.purchasedCredits + account.trialCredits,
    usedPoints: account.usedCredits,
  };
}

export async function grantInstallCreditsIfEligible(
  shop: string,
): Promise<GrantInstallCreditsResult> {
  const prior = await prisma.billingLog.findFirst({
    where: {
      shop,
      eventType: BILLING_LOG_EVENT.TRIAL_GRANTED,
      referenceId: INSTALL_CREDITS_REFERENCE_ID,
    },
  });
  if (prior) return { granted: false, reason: "already_granted" };

  const now = new Date();
  const expiresAt = installCreditsExpiresAt(now);
  const account = await prisma.account.findUnique({ where: { shop } });
  if (!account || account.trialInstallExpiresAt) {
    return { granted: false, reason: "already_granted" };
  }

  const trialCredits = account.trialCredits + INSTALL_CREDITS;
  const trialInstallCredits = account.trialInstallCredits + INSTALL_CREDITS;
  await prisma.account.update({
    where: { shop },
    data: {
      trialCredits,
      trialInstallCredits,
      trialInstallExpiresAt: expiresAt,
      trialCreditsExpiresAt: earliestTrialLotExpiresAt(
        trialInstallCredits,
        expiresAt,
        account.trialBonusCredits,
        account.trialBonusExpiresAt,
      ),
      ...aliasPatch({ ...account, trialCredits }),
    },
  });
  await appendBillingLog({
    shop,
    eventType: BILLING_LOG_EVENT.TRIAL_GRANTED,
    referenceId: INSTALL_CREDITS_REFERENCE_ID,
    creditsDelta: INSTALL_CREDITS,
    metadata: {
      grantKind: "install_credits",
      installCredits: INSTALL_CREDITS,
      trialCreditsExpiresAt: expiresAt.toISOString(),
    },
  });
  return { granted: true, credits: INSTALL_CREDITS };
}

export async function expireInstallTrialCreditsIfDue(
  shop: string,
  now: Date = new Date(),
  options?: SettleExpiredTrialOptions,
): Promise<boolean> {
  const account = await prisma.account.findUnique({ where: { shop } });
  if (!account) return false;

  const settled = settleExpiredInstallTrialCredits(
    {
      usedCredits: account.usedCredits,
      trialInstallCredits: account.trialInstallCredits,
      trialInstallExpiresAt: account.trialInstallExpiresAt,
      trialBonusCredits: account.trialBonusCredits,
      trialBonusExpiresAt: account.trialBonusExpiresAt,
    },
    now,
    options,
  );
  if (!settled.settled) return false;

  const legacyExpiresAt = earliestTrialLotExpiresAt(
    settled.trialInstallCredits,
    settled.trialInstallExpiresAt,
    settled.trialBonusCredits,
    settled.trialBonusExpiresAt,
  );

  const settledNow = await prisma.$transaction(async (tx) => {
    const updated = await tx.account.updateMany({
      where: {
        shop,
        usedCredits: account.usedCredits,
        trialInstallCredits: account.trialInstallCredits,
        trialBonusCredits: account.trialBonusCredits,
      },
      data: {
        trialCredits: settled.trialCredits,
        usedCredits: settled.usedCredits,
        trialInstallCredits: settled.trialInstallCredits,
        trialInstallExpiresAt: settled.trialInstallExpiresAt
          ? new Date(settled.trialInstallExpiresAt)
          : null,
        trialBonusCredits: settled.trialBonusCredits,
        trialBonusExpiresAt: settled.trialBonusExpiresAt
          ? new Date(settled.trialBonusExpiresAt)
          : null,
        trialCreditsExpiresAt: legacyExpiresAt,
        ...aliasPatch({
          subscriptionCredits: account.subscriptionCredits,
          purchasedCredits: account.purchasedCredits,
          trialCredits: settled.trialCredits,
          usedCredits: settled.usedCredits,
        }),
      },
    });
    if (updated.count === 0) return false;

    for (const lot of settled.lots) {
      const prior = await tx.billingLog.findFirst({
        where: {
          shop,
          eventType: BILLING_LOG_EVENT.TRIAL_EXPIRED,
          referenceId: lot.referenceId,
        },
      });
      if (prior) continue;
      await tx.billingLog.create({
        data: {
          shop,
          eventType: BILLING_LOG_EVENT.TRIAL_EXPIRED,
          referenceId: lot.referenceId,
          creditsDelta: -lot.leftover,
          usedCredits: settled.usedCredits,
          metadata: {
            grantKind: lot.grantKind,
            leftover: lot.leftover,
            consumed: lot.consumed,
            trialCreditsExpiresAt: lot.expiresAt,
            lot: lot.kind,
          },
        },
      });
    }
    return true;
  });

  return settledNow;
}
