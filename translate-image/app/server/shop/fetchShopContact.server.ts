import { postShopGraphql } from "~/server/shop/shopAdminToken.server";

export type ShopContact = { email: string | null; ownerName: string | null };

const QUERY = `#graphql
  query ShopContactEmail {
    shop { email contactEmail shopOwnerName }
  }
`;

export async function fetchShopContact(shop: string): Promise<ShopContact> {
  const normalizedShop = shop.trim();
  if (!normalizedShop) return { email: null, ownerName: null };
  try {
    const body = await postShopGraphql({
      shop: normalizedShop,
      path: "shop_contact",
      timeoutMs: 2500,
      query: QUERY,
    });
    const node = body?.data?.shop;
    const email =
      (typeof node?.email === "string" && node.email.trim()) ||
      (typeof node?.contactEmail === "string" && node.contactEmail.trim()) ||
      null;
    const ownerName =
      typeof node?.shopOwnerName === "string" && node.shopOwnerName.trim()
        ? node.shopOwnerName.trim()
        : null;
    return { email, ownerName };
  } catch (err) {
    console.warn(
      `[fetchShopContact] failed shop=${normalizedShop}`,
      err instanceof Error ? err.message : err,
    );
    return { email: null, ownerName: null };
  }
}
