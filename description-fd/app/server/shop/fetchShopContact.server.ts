import prisma from "../../db.server";
import { getShopAdminGraphql } from "../shopify/shopAdminToken.server";

export type ShopContact = {
  email: string | null;
  ownerName: string | null;
};

const SHOP_CONTACT_QUERY = `#graphql
  query ShopContactEmail {
    shop {
      email
      contactEmail
      shopOwnerName
    }
  }
`;

function pickEmail(shop: { email?: string | null; contactEmail?: string | null } | null): string | null {
  return shop?.email?.trim() || shop?.contactEmail?.trim() || null;
}

export async function fetchShopContact(shop: string): Promise<ShopContact> {
  const normalized = shop.trim();
  if (!normalized) return { email: null, ownerName: null };

  const session = await prisma.session.findFirst({
    where: { shop: normalized, isOnline: false },
    select: { email: true, firstName: true, lastName: true },
  });
  if (session?.email?.trim()) {
    const ownerName = [session.firstName, session.lastName].filter(Boolean).join(" ").trim();
    return { email: session.email.trim(), ownerName: ownerName || null };
  }

  try {
    const graphql = await getShopAdminGraphql(normalized);
    const response = await graphql(SHOP_CONTACT_QUERY);
    const json = (await response.json()) as {
      data?: {
        shop?: { email?: string | null; contactEmail?: string | null; shopOwnerName?: string | null };
      };
    };
    const remote = json.data?.shop;
    return {
      email: pickEmail(remote ?? null),
      ownerName: remote?.shopOwnerName?.trim() || null,
    };
  } catch (error) {
    console.warn(`[fetchShopContact] failed shop=${normalized}`, error);
    return { email: null, ownerName: null };
  }
}
