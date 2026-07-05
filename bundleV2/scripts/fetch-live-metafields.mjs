import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const tmpDir = path.join(__dirname, "tmp");

const SHOP = process.env.SHOPIFY_SHOP ?? "ciwishop.myshopify.com";
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-10";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function byteLen(value) {
  return value ? Buffer.byteLength(String(value), "utf8") : 0;
}

function parseJsonField(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { _parseError: true, _rawPreview: raw.slice(0, 500) };
  }
}

async function getAccessToken(clientId, clientSecret, shop) {
  const url = `https://${shop}/admin/oauth/access_token`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Client credentials failed (${response.status}): ${text.slice(0, 500)}`,
    );
  }
  const json = JSON.parse(text);
  if (!json.access_token) {
    throw new Error(`No access_token in response: ${text.slice(0, 500)}`);
  }
  return json.access_token;
}

async function adminGraphql(accessToken, shop, query, variables) {
  const url = `https://${shop}/admin/api/${API_VERSION}/graphql.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(
      `GraphQL HTTP ${response.status}: ${JSON.stringify(json).slice(0, 800)}`,
    );
  }
  if (Array.isArray(json.errors) && json.errors.length) {
    throw new Error(
      `GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }
  return json.data;
}

const SHOP_QUERY = `#graphql
  query BundleShopMetafields {
    shop {
      id
      name
      myshopifyDomain
      metafields(first: 50, namespace: "ciwi_bundle") {
        edges {
          node {
            id
            key
            namespace
            type
            updatedAt
            value
          }
        }
      }
    }
  }
`;

const DISCOUNT_QUERY = `#graphql
  query BundleDiscountMetafields {
    discountNodes(first: 20, query: "method:automatic AND status:active") {
      nodes {
        id
        discount {
          __typename
          ... on DiscountAutomaticApp {
            discountId
            title
            status
            discountClasses
            appDiscountType {
              functionId
            }
          }
        }
        appOwnedOffers: metafield(namespace: "$app:ciwi_bundle", key: "offers") {
          id
          namespace
          key
          type
          updatedAt
          value
        }
        appOwnedOffersShard1: metafield(namespace: "$app:ciwi_bundle", key: "offers-1") {
          id
          namespace
          key
          type
          updatedAt
          value
        }
        defaultAppOffers: metafield(namespace: "$app", key: "offers") {
          id
          namespace
          key
          type
          updatedAt
          value
        }
        defaultAppOffersShard1: metafield(namespace: "$app", key: "offers-1") {
          id
          namespace
          key
          type
          updatedAt
          value
        }
      }
    }
  }
`;

function enrichShopPayload(shopData) {
  const edges = shopData?.shop?.metafields?.edges ?? [];
  const byKey = {};
  for (const { node } of edges) {
    byKey[node.key] = {
      ...node,
      valueBytes: byteLen(node.value),
      parsedValue:
        node.key === "ciwi-bundle-offer-sync-at"
          ? node.value
          : parseJsonField(node.value),
    };
  }
  return {
    fetchedAt: new Date().toISOString(),
    shop: shopData.shop,
    metafieldsByKey: byKey,
    offerKeys: {
      syncAt: byKey["ciwi-bundle-offer-sync-at"] ?? null,
      storefront: byKey["ciwi-bundle-offers"] ?? null,
      functionCopy: byKey["ciwi-bundle-offers-fn"] ?? null,
    },
  };
}

function expandOfferDetails(offer, label) {
  const expanded = { ...offer };
  for (const field of [
    "selectedProductsJson",
    "discountRulesJson",
    "offerSettingsJson",
  ]) {
    if (typeof offer[field] === "string" && offer[field].trim()) {
      expanded[`${field}Parsed`] = parseJsonField(offer[field]);
    }
  }
  return { label, ...expanded };
}

function enrichDiscountPayload(discountData) {
  const nodes = discountData?.discountNodes?.nodes ?? [];
  return {
    fetchedAt: new Date().toISOString(),
    nodes: nodes.map((node) => {
      const shards = {};
      for (const [label, field] of [
        ["$app:ciwi_bundle/offers", node.appOwnedOffers],
        ["$app:ciwi_bundle/offers-1", node.appOwnedOffersShard1],
        ["$app/offers", node.defaultAppOffers],
        ["$app/offers-1", node.defaultAppOffersShard1],
      ]) {
        shards[label] = field
          ? {
              ...field,
              valueBytes: byteLen(field.value),
              parsedValue: parseJsonField(field.value),
            }
          : null;
      }
      return {
        id: node.id,
        discount: node.discount,
        shards,
      };
    }),
  };
}

function buildSummary(shopEnriched, discountEnriched) {
  const storefront = shopEnriched.offerKeys.storefront?.parsedValue;
  const fnCopy = shopEnriched.offerKeys.functionCopy?.parsedValue;
  const lines = [];
  lines.push(`shop: ${shopEnriched.shop?.myshopifyDomain}`);
  lines.push(`fetchedAt: ${shopEnriched.fetchedAt}`);
  lines.push("");
  lines.push("=== Shop metafields (ciwi_bundle) ===");
  for (const key of [
    "ciwi-bundle-offer-sync-at",
    "ciwi-bundle-offers",
    "ciwi-bundle-offers-fn",
  ]) {
    const node = shopEnriched.metafieldsByKey[key];
    if (!node) {
      lines.push(`${key}: (missing)`);
      continue;
    }
    lines.push(
      `${key}: ${node.valueBytes} bytes, updated ${node.updatedAt}, type ${node.type}`,
    );
  }
  if (storefront?.offers) {
    lines.push("");
    lines.push(`storefront offers (${storefront.offers.length}):`);
    for (const o of storefront.offers) {
      lines.push(
        `  - ${o.id} | ${o.offerType} | ${o.name} | cartTitle=${o.cartTitle} | status=${o.status}`,
      );
    }
  }
  if (fnCopy?.offers) {
    lines.push("");
    lines.push(`function-copy offers (${fnCopy.offers.length}, v=${fnCopy.v ?? "?"})`);
    for (const o of fnCopy.offers) {
      const id = o.id ?? o.i;
      const type = o.offerType ?? o.t;
      const name = o.name ?? o.c;
      lines.push(`  - ${id} | ${type} | ${name}`);
    }
  }
  lines.push("");
  lines.push("=== Active discount nodes ===");
  for (const node of discountEnriched.nodes) {
    const title = node.discount?.title ?? "?";
    const classes = (node.discount?.discountClasses ?? []).join(",");
    lines.push(`${title} [${classes}]`);
    lines.push(`  id: ${node.id}`);
    for (const [label, shard] of Object.entries(node.shards)) {
      if (!shard?.value) {
        lines.push(`  ${label}: null`);
        continue;
      }
      const offerCount = Array.isArray(shard.parsedValue?.offers)
        ? shard.parsedValue.offers.length
        : Array.isArray(shard.parsedValue?.o)
          ? shard.parsedValue.o.length
          : "?";
      lines.push(
        `  ${label}: ${shard.valueBytes} bytes @ ${shard.updatedAt}, offers~${offerCount}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const env = {
    ...loadDotEnv(path.join(rootDir, ".env")),
    ...process.env,
  };
  const clientId = env.apikey || env.SHOPIFY_API_KEY;
  const clientSecret = env.apisecret || env.SHOPIFY_API_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing apikey/apisecret (or SHOPIFY_API_KEY/SECRET) in .env");
  }

  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`Authenticating for ${SHOP} via client credentials...`);
  const accessToken = await getAccessToken(clientId, clientSecret, SHOP);

  console.log("Fetching shop metafields...");
  const shopData = await adminGraphql(accessToken, SHOP, SHOP_QUERY);
  const shopEnriched = enrichShopPayload(shopData);

  console.log("Fetching discount metafields...");
  const discountData = await adminGraphql(accessToken, SHOP, DISCOUNT_QUERY);
  const discountEnriched = enrichDiscountPayload(discountData);

  fs.writeFileSync(
    path.join(tmpDir, "shop-metafields-raw.json"),
    JSON.stringify(shopData, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(tmpDir, "shop-metafields-full.json"),
    JSON.stringify(shopEnriched, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(tmpDir, "discount-metafields-raw.json"),
    JSON.stringify(discountData, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(tmpDir, "discount-metafields-full.json"),
    JSON.stringify(discountEnriched, null, 2),
    "utf8",
  );

  const storefrontOffers = shopEnriched.offerKeys.storefront?.parsedValue?.offers ?? [];
  const fnOffers = shopEnriched.offerKeys.functionCopy?.parsedValue?.offers ?? [];

  fs.writeFileSync(
    path.join(tmpDir, "offers-storefront-expanded.json"),
    JSON.stringify(
      storefrontOffers.map((o, i) =>
        expandOfferDetails(o, `storefront-offer-${i + 1}`),
      ),
      null,
      2,
    ),
    "utf8",
  );
  fs.writeFileSync(
    path.join(tmpDir, "offers-fn-expanded.json"),
    JSON.stringify(
      fnOffers.map((o, i) => expandOfferDetails(o, `fn-offer-${i + 1}`)),
      null,
      2,
    ),
    "utf8",
  );

  for (let i = 0; i < storefrontOffers.length; i += 1) {
    const offer = storefrontOffers[i];
    const safeId = String(offer.id || `offer-${i + 1}`).replace(/[^\w-]/g, "_");
    fs.writeFileSync(
      path.join(tmpDir, `offer-storefront-${safeId}.json`),
      JSON.stringify(expandOfferDetails(offer, offer.id), null, 2),
      "utf8",
    );
  }

  for (const node of discountEnriched.nodes) {
    const titleSlug = String(node.discount?.title || "discount")
      .replace(/[^\w-]+/g, "_")
      .slice(0, 60);
    for (const [label, shard] of Object.entries(node.shards)) {
      if (!shard?.parsedValue) continue;
      const keySlug = label.replace(/[^\w-]+/g, "_");
      fs.writeFileSync(
        path.join(tmpDir, `discount-${titleSlug}-${keySlug}.json`),
        JSON.stringify(shard.parsedValue, null, 2),
        "utf8",
      );
    }
  }

  const summary = buildSummary(shopEnriched, discountEnriched);
  fs.writeFileSync(path.join(tmpDir, "metafields-summary.txt"), summary, "utf8");

  console.log(summary);
  console.log(`\nWrote detailed files under ${tmpDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
