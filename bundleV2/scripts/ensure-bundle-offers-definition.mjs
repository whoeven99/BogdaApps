/**
 * 一次性修复：为 ciwi_bundle shop metafields 创建 storefront PUBLIC_READ definition，
 * 然后重新写入 offers（让 Liquid 拿到最新 json 对象，而非 6-3 双重编码缓存）。
 *
 * 用法: node scripts/ensure-bundle-offers-definition.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const shop = "ciwishop.myshopify.com";
const NS = "ciwi_bundle";

const DEFINITIONS = [
  { key: "ciwi-bundle-offers", type: "json", name: "Ciwi Bundle Storefront Offers" },
  { key: "ciwi-bundle-offers-fn", type: "json", name: "Ciwi Bundle Function Offers Copy" },
  { key: "ciwi-bundle-offer-sync-at", type: "single_line_text_field", name: "Ciwi Bundle Offer Sync At" },
];

async function token() {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.apikey,
      client_secret: env.apisecret,
      grant_type: "client_credentials",
    }),
  }).then((r) => r.json());
  if (!res.access_token) throw new Error(JSON.stringify(res));
  return res.access_token;
}

async function gql(accessToken, query, variables) {
  const res = await fetch(`https://${shop}/admin/api/2025-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  }).then((r) => r.json());
  if (res.errors?.length) throw new Error(JSON.stringify(res.errors));
  return res.data;
}

const accessToken = await token();

const existing = await gql(
  accessToken,
  `query { metafieldDefinitions(first:50, ownerType:SHOP, namespace:"${NS}") { nodes { id key access { storefront } } } }`,
);
const byKey = new Map(existing.metafieldDefinitions.nodes.map((n) => [n.key, n]));

for (const def of DEFINITIONS) {
  const cur = byKey.get(def.key);
  if (!cur) {
    const data = await gql(
      accessToken,
      `mutation($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition { id key }
          userErrors { message }
        }
      }`,
      {
        definition: {
          name: def.name,
          namespace: NS,
          key: def.key,
          ownerType: "SHOP",
          type: def.type,
          access: { storefront: "PUBLIC_READ" },
        },
      },
    );
    const errs = data.metafieldDefinitionCreate.userErrors;
    if (errs?.length) throw new Error(`${def.key}: ${errs.map((e) => e.message).join("; ")}`);
    console.log("created definition:", def.key, data.metafieldDefinitionCreate.createdDefinition?.id);
    continue;
  }
  if (cur.access?.storefront === "PUBLIC_READ") {
    console.log("definition ok:", def.key);
    continue;
  }
  const data = await gql(
    accessToken,
    `mutation($definition: MetafieldDefinitionUpdateInput!) {
      metafieldDefinitionUpdate(definition: $definition) {
        updatedDefinition { id key }
        userErrors { message }
      }
    }`,
    {
      definition: {
        namespace: NS,
        key: def.key,
        ownerType: "SHOP",
        access: { storefront: "PUBLIC_READ" },
      },
    },
  );
  const errs = data.metafieldDefinitionUpdate.userErrors;
  if (errs?.length) throw new Error(`${def.key}: ${errs.map((e) => e.message).join("; ")}`);
  console.log("updated definition:", def.key);
}

// Re-write current offers payload so storefront cache invalidates
const shopData = await gql(
  accessToken,
  `query {
    shop { id metafield(namespace:"${NS}", key:"ciwi-bundle-offers") { value } }
  }`,
);
const shopId = shopData.shop.id;
const offersValue = shopData.shop.metafield?.value;
if (!offersValue) throw new Error("ciwi-bundle-offers missing");

const setData = await gql(
  accessToken,
  `mutation($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key updatedAt }
      userErrors { message }
    }
  }`,
  {
    metafields: [
      {
        ownerId: shopId,
        namespace: NS,
        key: "ciwi-bundle-offers",
        type: "json",
        value: offersValue,
      },
    ],
  },
);
const setErrs = setData.metafieldsSet.userErrors;
if (setErrs?.length) throw new Error(setErrs.map((e) => e.message).join("; "));
console.log(
  "re-written ciwi-bundle-offers",
  setData.metafieldsSet.metafields?.[0]?.updatedAt,
  "bytes",
  Buffer.byteLength(offersValue, "utf8"),
);

const parsed = JSON.parse(offersValue);
console.log("payload updatedAt:", parsed.updatedAt, "offers:", parsed.offers?.length);
