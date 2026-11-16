/** Shopify Admin GraphQL version for this app. Keep aligned with existing queries. */
export const SHOPIFY_ADMIN_API_VERSION = "2025-04";

export function buildShopifyAdminGraphqlUrl(shopDomain: string): string {
  const shop = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${shop}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`;
}
