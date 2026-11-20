import prisma from "../../db.server";

export const CREDIT_MULTIPLIER = 1.5;

export const QUOTA_INSUFFICIENT = "QUOTA_INSUFFICIENT";

export const CREDIT_PACKS: Record<string, { credits: number; price: number }> = {
  "500,000 Credits": { credits: 500000, price: 3.99 },
  "1,000,000 Credits": { credits: 1000000, price: 7.99 },
  "2,000,000 Credits": { credits: 2000000, price: 15.99 },
  "3,000,000 Credits": { credits: 3000000, price: 23.99 },
  "5,000,000 Credits": { credits: 5000000, price: 39.99 },
  "10,000,000 Credits": { credits: 10000000, price: 79.99 },
  "20,000,000 Credits": { credits: 20000000, price: 159.99 },
  "30,000,000 Credits": { credits: 30000000, price: 239.99 },
};

export type CreditPools = {
  subscriptionCredits: number;
  purchasedCredits: number;
  trialCredits: number;
  usedCredits: number;
  trialCreditsExpiresAt?: Date | null;
};

export function effectiveTrialCredits(account: CreditPools, now = new Date()): number {
  if (account.trialCredits <= 0) return 0;
  if (account.trialCreditsExpiresAt && account.trialCreditsExpiresAt.getTime() <= now.getTime()) {
    return 0;
  }
  return account.trialCredits;
}

export function remainingCredits(account: CreditPools, now = new Date()): number {
  return (
    account.subscriptionCredits +
    account.purchasedCredits +
    effectiveTrialCredits(account, now) -
    account.usedCredits
  );
}

export function billableCredits(promptTokens: number, completionTokens: number): number {
  return Math.ceil((promptTokens + completionTokens) * CREDIT_MULTIPLIER);
}

export function toCounterDto(account: CreditPools, now = new Date()): { allToken: number; userToken: number } {
  return {
    allToken:
      account.subscriptionCredits +
      account.purchasedCredits +
      effectiveTrialCredits(account, now),
    userToken: account.usedCredits,
  };
}

export class QuotaError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "QuotaError";
  }
}

export async function deductShopCredits(input: {
  shop: string;
  amount: number;
  uniqueKey: string;
}): Promise<void> {
  const amount = Math.max(0, Math.floor(input.amount));
  if (amount <= 0) return;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.billingLog.findUnique({
      where: { shop_uniqueKey: { shop: input.shop, uniqueKey: input.uniqueKey } },
      select: { id: true },
    });
    if (existing) return;
    await tx.account.updateMany({
      where: {
        shop: input.shop,
        trialCredits: { gt: 0 },
        trialCreditsExpiresAt: { lte: new Date() },
      },
      data: { trialCredits: 0, trialInstallCredits: 0, trialBonusCredits: 0 },
    });
    const account = await tx.account.findUnique({ where: { shop: input.shop } });
    if (!account || account.deletedAt) {
      throw new QuotaError("Account not found", QUOTA_INSUFFICIENT);
    }
    if (remainingCredits(account) < amount) {
      throw new QuotaError("Insufficient credits", QUOTA_INSUFFICIENT);
    }
    await tx.account.update({
      where: { shop: input.shop },
      data: { usedCredits: { increment: amount } },
    });
    await tx.billingLog.create({
      data: {
        shop: input.shop,
        kind: "DEDUCT",
        amount,
        uniqueKey: input.uniqueKey,
      },
    });
  });
}

export async function grantPurchasedCredits(input: {
  shop: string;
  amount: number;
  uniqueKey: string;
  metadata?: string;
}): Promise<boolean> {
  const amount = Math.max(0, Math.floor(input.amount));
  if (amount <= 0) return false;
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.billingLog.findUnique({
      where: { shop_uniqueKey: { shop: input.shop, uniqueKey: input.uniqueKey } },
      select: { id: true },
    });
    if (existing) return false;
    await tx.account.upsert({
      where: { shop: input.shop },
      create: { shop: input.shop, purchasedCredits: amount },
      update: { purchasedCredits: { increment: amount }, deletedAt: null },
    });
    await tx.billingLog.create({
      data: {
        shop: input.shop,
        kind: "PURCHASE",
        amount,
        uniqueKey: input.uniqueKey,
        metadata: input.metadata ?? null,
      },
    });
    return true;
  });
  return result;
}
