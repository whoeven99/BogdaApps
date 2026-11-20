import prisma from "../../db.server";

function envInt(name: string, fallback: number): number {
  const n = Number.parseInt(String(process.env[name] ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function trialInstallAmount(): number {
  return Math.max(0, envInt("APG_TRIAL_INSTALL_CREDITS", 0));
}

export function trialInstallDays(): number {
  return Math.max(1, envInt("APG_TRIAL_INSTALL_DAYS", 7));
}

/** 终身一次安装试用。数量由 APG_TRIAL_INSTALL_CREDITS 控制，默认 0。 */
export async function grantInstallTrialCredits(shop: string): Promise<boolean> {
  const amount = trialInstallAmount();
  if (amount <= 0) return false;
  const uniqueKey = `trial:install:${shop}`;
  const expiresAt = new Date(Date.now() + trialInstallDays() * 24 * 60 * 60 * 1000);
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.billingLog.findUnique({
      where: { shop_uniqueKey: { shop, uniqueKey } },
      select: { id: true },
    });
    if (existing) return false;
    await tx.account.upsert({
      where: { shop },
      create: {
        shop,
        trialCredits: amount,
        trialInstallCredits: amount,
        trialCreditsExpiresAt: expiresAt,
        trialInstallExpiresAt: expiresAt,
      },
      update: {
        trialCredits: { increment: amount },
        trialInstallCredits: { increment: amount },
        trialCreditsExpiresAt: expiresAt,
        trialInstallExpiresAt: expiresAt,
        deletedAt: null,
      },
    });
    await tx.billingLog.create({
      data: { shop, kind: "TRIAL", amount, uniqueKey },
    });
    return true;
  });
  return result;
}
