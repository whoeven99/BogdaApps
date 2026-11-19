import prisma from "~/db.server";
import {
  createShopAppTokenProvider,
  type ShopAppTokenProvider,
} from "./shopAppToken";

const LOG = "[offline-session-token]";
const NOT_INSTALLED = "shop not installed";

let provider: ShopAppTokenProvider | null = null;

function envValue(raw: string | undefined): string {
  return (raw ?? "").trim();
}

async function isShopInstalled(shop: string): Promise<boolean> {
  const session = await prisma.session.findFirst({
    where: { shop, isOnline: false },
    select: { id: true },
  });
  return Boolean(session);
}

export function getAppOnlyTokenProvider(): ShopAppTokenProvider {
  if (provider) return provider;
  provider = createShopAppTokenProvider({
    clientId: envValue(process.env.SHOPIFY_API_KEY),
    keyId: envValue(process.env.SHOPIFY_APP_ONLY_KEY_ID),
    privateKeyPem: process.env.SHOPIFY_APP_ONLY_PRIVATE_KEY ?? "",
    beforeExchange: async (shop) => {
      if (!(await isShopInstalled(shop))) throw new Error(`${LOG} ${NOT_INSTALLED}`);
    },
  });
  return provider;
}

export function invalidateAppOnlyTokenCache(shop: string) {
  provider?.invalidate(shop);
}
