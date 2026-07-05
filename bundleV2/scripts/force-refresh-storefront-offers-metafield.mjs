/**
 * 删除并重建 ciwi-bundle-offers，清除 Liquid 店面层缓存的旧 6-3 字符串 blob。
 * 用法: node scripts/force-refresh-storefront-offers-metafield.mjs
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
const KEY = "ciwi-bundle-offers";

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

const before = await gql(
  accessToken,
  `query($ns: String!, $key: String!) {
    shop {
      id
      metafield(namespace: $ns, key: $key) { id updatedAt type value }
    }
  }`,
  { ns: NS, key: KEY },
);

const shopId = before.shop.id;
const oldValue = before.shop.metafield?.value;
if (!oldValue) throw new Error("missing ciwi-bundle-offers before delete");

const parsed = JSON.parse(oldValue);
console.log("before delete:", {
  id: before.shop.metafield.id,
  updatedAt: before.shop.metafield.updatedAt,
  payloadUpdatedAt: parsed.updatedAt,
  offerCount: parsed.offers?.length,
  bytes: Buffer.byteLength(oldValue, "utf8"),
});

const del = await gql(
  accessToken,
  `mutation($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields { key namespace }
      userErrors { message }
    }
  }`,
  {
    metafields: [{ ownerId: shopId, namespace: NS, key: KEY }],
  },
);
const delErrs = del.metafieldsDelete.userErrors;
if (delErrs?.length) throw new Error(delErrs.map((e) => e.message).join("; "));
console.log("deleted:", del.metafieldsDelete.deletedMetafields);

const set = await gql(
  accessToken,
  `mutation($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id key updatedAt }
      userErrors { message }
    }
  }`,
  {
    metafields: [
      {
        ownerId: shopId,
        namespace: NS,
        key: KEY,
        type: "json",
        value: oldValue,
      },
    ],
  },
);
const setErrs = set.metafieldsSet.userErrors;
if (setErrs?.length) throw new Error(setErrs.map((e) => e.message).join("; "));
console.log("recreated:", set.metafieldsSet.metafields?.[0]);

const after = await gql(
  accessToken,
  `query($ns: String!, $key: String!) {
    shop { metafield(namespace: $ns, key: $key) { id updatedAt type value } }
  }`,
  { ns: NS, key: KEY },
);
const afterParsed = JSON.parse(after.shop.metafield.value);
console.log("after recreate:", {
  id: after.shop.metafield.id,
  updatedAt: after.shop.metafield.updatedAt,
  payloadUpdatedAt: afterParsed.updatedAt,
  offerCount: afterParsed.offers?.length,
  bytes: Buffer.byteLength(after.shop.metafield.value, "utf8"),
});
