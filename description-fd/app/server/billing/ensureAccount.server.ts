import prisma from "../../db.server";

export async function ensureAccount(shop: string) {
  const normalized = shop.trim().toLowerCase();
  if (!normalized) {
    throw new Error("shop is required");
  }
  return prisma.account.upsert({
    where: { shop: normalized },
    create: { shop: normalized },
    update: { deletedAt: null },
  });
}
