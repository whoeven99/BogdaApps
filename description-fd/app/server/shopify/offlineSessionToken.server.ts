import prisma from "../../db.server";

/**
 * Installed = an offline Session row exists.
 * If Account exists, it must not be soft-deleted.
 * Session.accessToken is owned by the Remix SDK; Admin GraphQL uses app-only tokens.
 */
export async function isShopInstalled(shop: string): Promise<boolean> {
  if (!shop) return false;
  const session = await prisma.session.findFirst({
    where: { shop, isOnline: false },
    select: { id: true },
  });
  if (!session) return false;
  try {
    const account = await prisma.account.findUnique({
      where: { shop },
      select: { deletedAt: true },
    });
    if (account) return account.deletedAt === null;
  } catch {
    // Account table may not exist until the cutover migration runs.
  }
  return true;
}
