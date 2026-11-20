import prisma from "../../db.server";

/**
 * Installed = an offline Session row exists.
 * Session.accessToken is owned by the Remix SDK; Admin GraphQL uses app-only tokens.
 */
export async function isShopInstalled(shop: string): Promise<boolean> {
  if (!shop) return false;
  const row = await prisma.session.findFirst({
    where: { shop, isOnline: false },
    select: { id: true },
  });
  return Boolean(row);
}
