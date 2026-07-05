# BogdaApps bundleV2 — Agent Guide

This file gives AI agents a complete mental model of the project so you don't need to read every file cold.

---

## What This Project Does

A **Shopify Bundle App** (React Router + Remix, hosted on Shopify) that lets merchants create bundle discount offers shown on product pages and applied automatically at checkout via Shopify Functions.

Core loop:
1. Merchant configures offers in the admin UI
2. Offers are saved to a SQLite DB (Prisma)
3. On every offer save, the app syncs offer data into Shopify metafields
4. A Shopify Function (`cart.lines.discounts.generate.run`) reads those metafields at checkout and applies discounts
5. The storefront theme reads a separate (hydrated) shop metafield to render bundle UI on product pages

---

## Architecture

```
Admin UI  (app/routes/)
  React Router / Remix / Polaris
      |
      | offer CRUD
      v
Prisma / SQLite  (prisma/schema.prisma)
Models: Session, Offer
      |
      | offer sync (on every save)
      v
Offer Sync  (app/server/offers/)
buildCompactOffersPayload      -> function metafield (on Automatic Discount node)
buildStorefrontOffersStructured -> theme metafield (on Shop node)
      |                               |
      v                               v
Automatic Discount metafield    Shop metafield
$app:ciwi_bundle / offers       ciwi_bundle / ciwi-bundle-offers
(compact, for function)         (hydrated with product data, for theme)
      |
      | read at checkout via input query
      v
Shopify Function
extensions/bundle-cart-discount-function/src/bundle_cart_discount_generate_run.ts
  -> computes ProductDiscountCandidate / OrderDiscountCandidate
  -> Shopify applies discounts to cart lines
```

---

## Offer Types (Complete Reference)

| offerType | Processing step | Discount class | What it targets |
|-----------|----------------|----------------|-----------------|
| `bxgy` | Step 1 BXGY | Product | Same-product free items (get side, 100% off) |
| `quantity-breaks-different` | Step 1 BXGY | Product | Cross-product: buy A, get B discounted |
| `quantity-breaks-same` (with BXGY tier) | Step 1 BXGY | Product | Same-product free items (unified BXGY tier) |
| `quantity-breaks-same` (standard tiers) | Step 2 Regular | Product | Available qty after BXGY/bundle reservation |
| `complete-bundle` | Step 3 (runs before 2) | Product | Trigger item + bundle items, fixed amount off |
| `free-gift` | Step 4 | Order | orderSubtotal excluding non-gift lines |
| Any with `discountClass === "order"` rules | Step 4 | Order | orderSubtotal, percentage |

### Multi-discount coexistence (logic added June 2025)

Processing order: **Step 1 BXGY -> Step 3 complete-bundle -> Step 2 quantity-break -> Step 4 order-level**

Steps 1 and 3 each build a reservation map (`bxgyReservedQtyByLineId`, `completeBundleReservedQtyByLineId`).
Step 2 uses `availableQty = totalQty - reserved` so multiple offer types can apply to different units of the same cart line simultaneously.

`resolveExclusiveProductCandidates` is the final safety net: if candidates still overlap on a line (same unit), it keeps the higher-savings one.

**Known edge cases:**
- Multiple Order-level discounts: `OrderDiscountSelectionStrategy.Maximum` means only the biggest one applies (Shopify platform limit, cannot be changed).
- `quantity-breaks-same` with both BXGY and standard tiers in the same offer: both may apply simultaneously (BXGY for free units + standard for remaining units). Likely harmless if admin UI prevents this configuration.
- `complete-bundle` vs `bxgy` competing for the exact same product units: falls back to the savings-winner logic in `resolveExclusiveProductCandidates`.

---

## Key Files

### Server / App

| File | Purpose |
|------|---------|
| `app/shopify.server.ts` | Shopify auth, `syncCartLinesAutomaticDiscountMetafield`, `reconcileBundleAutomaticDiscounts` |
| `app/server/offers/offerSync.server.ts` | `syncShopOffersMetafield` - main sync entry point called after every offer write |
| `app/server/offers/offerPayload.server.ts` | `buildCompactOffersPayload` (for function), `buildStorefrontOffersStructured` (for theme) |
| `app/utils/bundleShopOfferMetafields.server.ts` | `reconcileShopOfferShardedMetafields` - writes shop-level metafields, cleans up legacy keys |
| `app/utils/bundleShopMetafieldKeys.ts` | Metafield namespace / key constants |
| `app/utils/offerParsing.ts` | Offer parsing helpers shared between server and storefront |
| `app/routes/_index/` | Main offer list page, CRUD actions, offer sync scheduler |
| `prisma/schema.prisma` | `Offer` model (id, shopName, status, offerType, discountRulesJson, selectedProductsJson, offerSettingsJson, campaignConfigJson, startTime, endTime) |

### Shopify Function

| File | Purpose |
|------|---------|
| `extensions/bundle-cart-discount-function/src/bundle_cart_discount_generate_run.ts` | Entire discount logic (~3200 lines). All offer matching, candidate generation, conflict resolution. |
| `extensions/bundle-cart-discount-function/src/bundle_cart_discount_generate_run.graphql` | Function input query - reads cart lines + `discount.metafield($app:ciwi_bundle, offers)` |
| `extensions/bundle-cart-discount-function/schema.graphql` | Full Shopify Function API schema for this target |
| `extensions/bundle-cart-discount-function/shopify.extension.toml` | Extension config, target: `cart.lines.discounts.generate.run` |

### Theme Extension

| File | Purpose |
|------|---------|
| `extensions/bundle-theme-product-custom/` | Storefront UI for bundle display on product page |
| `extensions/ciwi-bundle-web-pixer/src/index.ts` | Web pixel for analytics / conversion tracking |

---

## Metafield Architecture

Two separate metafield writes happen on every offer save:

**1. Shop metafields (for storefront theme)**
```
namespace: ciwi_bundle
key: ciwi-bundle-offers          <- hydrated (includes product title, image, variants)
key: ciwi-bundle-offers-fn       <- compact copy (for reference / debugging)
key: ciwi-bundle-offer-sync-at   <- ISO timestamp of last sync
```

**2. Automatic Discount metafields (what the Function actually reads)**
```
namespace: $app:ciwi_bundle      <- app-reserved namespace
keys: offers, offers-1           <- per-class payload split into N=2 shards (OFFER_SHARD_KEYS)
Written via discountAutomaticAppUpdate (+ metafieldsSet) on each discount owner node.
Each discount class (PRODUCT/ORDER/SHIPPING) lives on its own single-class owner node,
so its offers are already isolated to that owner's offers/offers-1 shards.
```

**Size constraint (verified, June 2026):** the real hard limit is **per metafield value: >10,000 bytes is silently NOT returned to the Function** (`FUNCTION_OFFERS_MAX_BYTES`). It is NOT a 64 KB aggregate budget. Mitigations actually in place:
- v2 compact format (`COMPACT_OFFERS_FORMAT_VERSION = 2`): inline objects (no JSON-in-JSON), single-char keys (`i/c/t/x/b/e/s/d/o`), Product/Variant GIDs stripped to bare numbers.
- Per-class sharding into `offers` + `offers-1` (each < 10 KB); both Functions read both keys and merge/dedupe by id at runtime (`mergeShardedOfferPayloads`).
- Write-time guard: `offersFitWithinShardLimits` rejects an offer save with HTTP 422 when a class would overflow its 2×10 KB budget (only blocks the *newly* overflowing case, so already-overflowing shops can still shrink). The sync path also logs a `shard-overflow` error if any class drops offers.
- Function input total budget (128 KB) and input-query cost (≤30; each metafield field costs 3) are the secondary ceilings. N=2 shards is the query-cost-safe value; raise only after measuring real cost in the Dev Dashboard.

⚠️ The Function reads ONLY `$app:ciwi_bundle`; the old default-`$app` fallback double-write was removed.

---

## Offer Data Flow (Prisma -> Function)

Each `Offer` row is transformed to a compact runtime object for the function:

```ts
{
  id: string
  name: string
  cartTitle: string
  status: boolean
  startTime: string          // ISO string
  endTime: string            // ISO string
  selectedProductsJson: string | null   // trimmed for function (product IDs only)
  discountRulesJson: string | null      // tier rules
  offerSettingsJson: string | null      // markets, coupon, customer segments
  offerType: string
}
```

`campaignConfigJson` (newer unified format used by the builder UI) is normalized to the above shape via `buildPersistedOfferFieldsFromCampaignConfig` in `offerParsing.ts` before syncing.

---

## Extensions Summary

| Extension | Type | Purpose |
|-----------|------|---------|
| `bundle-cart-discount-function` | Shopify Function | Product/order discounts at checkout |
| `bundle-delivery-discount-function` | Shopify Function | Shipping discounts (separate discount class) |
| `bundle-theme-product-custom` | Theme App Extension | Product page bundle UI |
| `ciwi-bundle-web-pixer` | Web Pixel | Analytics / conversion tracking |

---

## Development Notes

- **Stack**: React Router v7 (Remix), TypeScript, Polaris, Prisma/SQLite, Shopify Functions (WASM/TypeScript compiled)
- **TypeScript**: Root `tsconfig.json` targets ES2022, covers `extensions/` too. Function has no separate tsconfig.
- **Chinese comments in function file**: The Edit tool may corrupt Chinese comments into smart/curly quotes (`""`). If TS errors appear saying "Invalid character", fix with PowerShell: `$content -replace [char]0x201C, '"' -replace [char]0x201D, '"'`
- **Offer sync**: Triggered by `runOfferPostWriteSync` after any offer write. Has an 8-second timeout to avoid blocking the save response. Sync is debounced per shop via `offerSyncScheduler`.
- **Database**: SQLite in dev. `startTime`/`endTime` are stored as `DateTime` in Prisma but serialized as ISO strings in metafields and in the function.
- **Testing**: Vitest. Key test files: `offerParsing.test.ts`, `offerActionHelpers.test.ts`, `offerSyncScheduler.test.ts`.

---

## Open / Known Issues

1. **Metafield size limit** — the hard limit is **per metafield value >10 KB is dropped by the Function**, not a 64 KB aggregate. Mitigated by v2 compaction + per-class 2-shard split (offers/offers-1) + a write-time 422 guard + a `shard-overflow` sync log. If a single class still exceeds 2×10 KB, offers are dropped at checkout — next step would be raising the shard count (watch input-query cost) or fetching offers at runtime via a fetch target.

2. **Order-level discount stacking** — `OrderDiscountSelectionStrategy.Maximum` means only one order-level discount applies per checkout. Multiple `free-gift` or order-class offers cannot stack. This is a Shopify platform constraint.

3. **complete-bundle + bxgy on same product units** — If both target the exact same line/quantity, `resolveExclusiveProductCandidates` picks the higher-savings one. They cannot both apply to the same unit.
