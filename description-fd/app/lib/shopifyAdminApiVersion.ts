/** GraphQL Admin API version used by app-only fetch wrappers. */
export const SHOPIFY_ADMIN_API_VERSION = "2026-07";

export function buildShopifyAdminGraphqlUrl(shopDomain: string): string {
  const shop = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${shop}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`;
}
