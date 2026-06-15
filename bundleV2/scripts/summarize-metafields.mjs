import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

function readJson(name) {
  const raw = fs.readFileSync(path.join(dir, name), "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function byteLen(value) {
  return value ? Buffer.byteLength(value, "utf8") : 0;
}

console.log("=== ciwishop.myshopify.com — Shop metafields (ciwi_bundle) ===\n");

const shop = readJson(".tmp-shop.json");
const edges = shop?.shop?.metafields?.edges ?? [];

const pick = (key) => edges.find((e) => e.node.key === key)?.node;

for (const key of [
  "ciwi-bundle-offer-sync-at",
  "ciwi-bundle-offers",
  "ciwi-bundle-offers-fn",
]) {
  const node = pick(key);
  console.log(`【${key}】`);
  if (!node) {
    console.log("  (不存在)\n");
    continue;
  }
  console.log(`  updatedAt: ${node.updatedAt}`);
  console.log(`  valueBytes: ${byteLen(node.value)}`);
  if (key === "ciwi-bundle-offer-sync-at") {
    console.log(`  value: ${node.value}`);
  } else {
    const payload = JSON.parse(node.value);
    console.log(`  payload.updatedAt: ${payload.updatedAt}`);
    console.log(`  offerCount: ${(payload.offers ?? []).length}`);
    for (const o of payload.offers ?? []) {
      console.log(
        `    · ${o.name} | ${o.cartTitle} | status=${o.status} | ${o.offerType}`,
      );
    }
  }
  console.log("");
}

const other = edges.filter(
  (e) =>
    ![
      "ciwi-bundle-offer-sync-at",
      "ciwi-bundle-offers",
      "ciwi-bundle-offers-fn",
    ].includes(e.node.key),
);
if (other.length) {
  console.log("【同 namespace 其他 key】");
  for (const { node } of other) {
    console.log(`  · ${node.key} (${node.type}) updated ${node.updatedAt}, ${byteLen(node.value)} bytes`);
  }
  console.log("");
}

console.log("=== Discount 节点 metafields (Function) ===\n");

const discount = readJson(".tmp-discount.json");
for (const n of discount?.discountNodes?.nodes ?? []) {
  const title = n.discount?.title ?? "?";
  const cls = (n.discount?.discountClasses ?? []).join(", ");
  console.log(`【${title}】 [${cls}]`);
  console.log(`  id: ${n.id}`);
  for (const [label, field] of [
    ["$app:ciwi_bundle/offers", n.appOwnedOffers],
    ["$app:ciwi_bundle/offers-1", n.appOwnedOffersShard1],
    ["$app/offers", n.defaultAppOffers],
    ["$app/offers-1", n.defaultAppOffersShard1],
  ]) {
    const v = field?.value;
    console.log(
      `  ${label}: ${v ? `${byteLen(v)} bytes @ ${field.updatedAt}` : "null"}`,
    );
  }
  console.log("");
}
