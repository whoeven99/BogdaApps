import prisma from "../../db.server";
import { grantInstallTrialCredits } from "./trial.server";

export async function ensureAccount(shop: string) {
  const normalized = shop.trim().toLowerCase();
  if (!normalized) {
    throw new Error("shop is required");
  }
  await prisma.account.upsert({
    where: { shop: normalized },
    create: { shop: normalized },
    update: { deletedAt: null },
  });
  await grantInstallTrialCredits(normalized);
  return prisma.account.findUniqueOrThrow({ where: { shop: normalized } });
}
