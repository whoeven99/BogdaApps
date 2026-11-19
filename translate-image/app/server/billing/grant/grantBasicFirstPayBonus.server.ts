import prisma from "~/db.server";
import { earliestTrialLotExpiresAt } from "../accountBalance";
import { appendBillingLog } from "../billingLog.server";
import { BILLING_LOG_EVENT } from "../types.server";
import { expireInstallTrialCreditsIfDue } from "./grantInstallCredits.server";

export const BASIC_FIRST_PAY_BONUS_REFERENCE_ID = "basic_first_pay_bonus";
/** 规格：Basic 首订 10 万试用积分（约 50 次译图）。 */
export const BASIC_FIRST_PAY_EXPIRING_CREDITS = 100_000;
export const BASIC_FIRST_PAY_TTL_DAYS = 30;

export function isBasicPlanKey(planKey: string): boolean {
  return planKey.trim().toLowerCase().startsWith("basic");
}

export function isInTrialPeriod(
  trialEndsAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return trialEndsAt != null && trialEndsAt.getTime() > now.getTime();
}

export function basicFirstPayBonusExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + BASIC_FIRST_PAY_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export type GrantBasicFirstPayBonusResult =
  | { granted: true; expiringCredits: number }
  | { granted: false; reason: "already_granted" | "not_basic" | "in_trial" };

export async function grantBasicFirstPayBonusIfEligible(params: {
  shop: string;
  planKey: string;
  trialEndsAt?: Date | null;
  now?: Date;
}): Promise<GrantBasicFirstPayBonusResult> {
  const { shop, planKey } = params;
  const now = params.now ?? new Date();
  if (isInTrialPeriod(params.trialEndsAt, now)) {
    return { granted: false, reason: "in_trial" };
  }
  if (!isBasicPlanKey(planKey)) {
    return { granted: false, reason: "not_basic" };
  }

  const prior = await prisma.billingLog.findFirst({
    where: {
      shop,
      eventType: BILLING_LOG_EVENT.TRIAL_GRANTED,
      referenceId: BASIC_FIRST_PAY_BONUS_REFERENCE_ID,
    },
  });
  if (prior) return { granted: false, reason: "already_granted" };

  const expiresAt = basicFirstPayBonusExpiresAt(now);
  const account = await prisma.account.findUnique({ where: { shop } });
  if (!account) return { granted: false, reason: "already_granted" };

  const trialCredits = account.trialCredits + BASIC_FIRST_PAY_EXPIRING_CREDITS;
  const trialBonusCredits = account.trialBonusCredits + BASIC_FIRST_PAY_EXPIRING_CREDITS;
  await prisma.account.update({
    where: { shop },
    data: {
      trialCredits,
      trialBonusCredits,
      trialBonusExpiresAt: expiresAt,
      trialCreditsExpiresAt: earliestTrialLotExpiresAt(
        account.trialInstallCredits,
        account.trialInstallExpiresAt,
        trialBonusCredits,
        expiresAt,
      ),
      purchasePoints:
        account.subscriptionCredits + account.purchasedCredits + trialCredits,
      usedPoints: account.usedCredits,
    },
  });
  await appendBillingLog({
    shop,
    eventType: BILLING_LOG_EVENT.TRIAL_GRANTED,
    planKey,
    referenceId: BASIC_FIRST_PAY_BONUS_REFERENCE_ID,
    creditsDelta: BASIC_FIRST_PAY_EXPIRING_CREDITS,
    metadata: {
      grantKind: "basic_first_pay_bonus",
      expiringCredits: BASIC_FIRST_PAY_EXPIRING_CREDITS,
      trialCreditsExpiresAt: expiresAt.toISOString(),
    },
  });
  return { granted: true, expiringCredits: BASIC_FIRST_PAY_EXPIRING_CREDITS };
}

export async function revokeBasicFirstPayBonusNow(
  shop: string,
  now: Date = new Date(),
): Promise<boolean> {
  return expireInstallTrialCreditsIfDue(shop, now, { forceLots: ["bonus"] });
}

export async function revokeBasicFirstPayBonusIfLeftBasic(
  shop: string,
  planKey: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (isBasicPlanKey(planKey)) return false;
  return revokeBasicFirstPayBonusNow(shop, now);
}
