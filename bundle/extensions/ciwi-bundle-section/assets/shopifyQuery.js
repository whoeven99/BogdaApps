export const queryShoopMetafields = async (
  keys,
  storefrontAccessToken,
  shopDomain,
) => {
  if (!Array.isArray(keys) || keys.length === 0) {
    console.error("Invalid keys array");
    return null;
  }

  if (!storefrontAccessToken || !shopDomain) {
    console.error("Missing storefrontAccessToken or shopDomain");
    return null;
  }

  const metafieldQueries = keys
    .map((key) => {
      // GraphQL alias 必须是合法标识符
      const alias = key.replace(/[^a-zA-Z0-9_]/g, "_");

      return `
        ${alias}: metafield(
          key: "${key}"
          namespace: "ciwi_bundles_config"
        ) {
          value
          type
        }
      `;
    })
    .join("\n");

  const query = `
    query ShopMetafields {
      shop {
        ${metafieldQueries}
      }
    }
  `;

  const endpoint = `https://${shopDomain}/api/2025-10/graphql.json?operation_name=ShopMetafields`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
    },
    body: JSON.stringify({ query }),
  });

  const res = await response.json();

  console.log("res: ", res);

  if (res.errors) {
    console.error("Shopify Storefront API errors:", res.errors);
    return null;
  }

  /**
   * result.data.shop 结构：
   * {
   *   alias1: { value, type },
   *   alias2: { value, type }
   * }
   */

  return res.data?.shop ?? null;
};
