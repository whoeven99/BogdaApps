import { buildShopifyAdminGraphqlUrl } from "~/lib/shopifyAdminApiVersion";
import { createAppOnlyAdmin, type ShopAdminInput } from "./appOnlyAdmin";
import {
  getAppOnlyTokenProvider,
  invalidateAppOnlyTokenCache,
} from "./offlineSessionToken.server";

export type { ShopGraphqlClient } from "./appOnlyAdmin";

const appOnlyAdmin = createAppOnlyAdmin({
  getToken: async (shop) => (await getAppOnlyTokenProvider().getToken(shop)).accessToken,
  invalidate: invalidateAppOnlyTokenCache,
  reportFailure: (failure) => {
    console.error(
      `[app-only-token] fail shop=${failure.shop} path=${failure.path} code=${failure.code} ${failure.message}`,
    );
  },
  graphqlUrl: buildShopifyAdminGraphqlUrl,
});

/** Embedded and action paths: always application-only token. */
export function getShopAdmin(input: ShopAdminInput) {
  return appOnlyAdmin.getShopAdmin(input);
}

export function postShopGraphql(
  input: ShopAdminInput & { query: string; variables?: Record<string, unknown>; timeoutMs?: number },
): Promise<any> {
  return appOnlyAdmin.postShopGraphql(input);
}
