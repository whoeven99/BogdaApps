# Offer Semantics

## Purpose

This document defines the target semantics for Bundle V2 offers.
Use it as the shared reference before changing the builder, storefront theme
extension, metafield sync, or Shopify Functions.

The product direction is a mixed storefront campaign: merchants should be able to
compose multiple offer modules into one frontend experience.

## Core Model

### Campaign

A campaign is the top-level storefront offer container.

It owns:

- targeting scope: products, markets, customers, schedule
- display order and module composition
- shared storefront state
- runtime compilation for theme and Shopify Functions

`campaignConfigJson` is the intended source of truth for this model.

The legacy fields still exist for compatibility and runtime consumption:

- `offerType`
- `selectedProductsJson`
- `discountRulesJson`
- `offerSettingsJson`

Until runtime paths read a compiled campaign payload directly, every campaign
change must preserve correct legacy-field output.

### Module

A module is one independent capability inside a campaign.

Examples:

- quantity breaks
- BXGY
- complete bundle
- free gift reward
- subscription messaging
- checkbox upsell
- sticky add to cart

Modules may render separate storefront UI blocks. They should not be forced into
one shared quantity-bar structure unless the module naturally uses bars.

### Template Type

`offerType` should be treated as a starter template or primary module type, not
as the complete campaign type.

Current values such as `quantity-breaks-same`, `bxgy`, and `complete-bundle`
remain useful for migration, list labels, and default builder setup. They should
not prevent a campaign from containing additional modules.

## Discount Classes

Shopify discount behavior is the key constraint:

- product discounts compete with product discounts
- order discounts can combine with product discounts
- shipping discounts are separate, but not part of the current formal scope

### Product Discount

Product discount modules directly reduce product line prices.

Current and target product discount modules:

- quantity breaks
- BXGY

Rule:

- If multiple product discount modules qualify, the discount that reduces the
  order by the largest amount should win.
- Product discount competition is scoped by overlapping cart-line targets, not
  by the entire cart. Candidates that touch the same cart line belong to the
  same competition group; candidates that target different cart lines should be
  emitted in separate product-discount operations so they do not block each
  other.
- Implementation should avoid hard-coded module priority such as "BXGY before
  quantity breaks" when both are valid product discount candidates.

### Order Discount

Order discount modules reduce the order subtotal or a scoped subtotal.

Current and target order discount modules:

- complete bundle
- free gift reward

Order discounts may stack with the winning product discount when Shopify
combination settings allow it.

### Shipping Discount

Shipping discount is not part of the currently formalized campaign semantics.
Existing delivery Function code can remain, but new campaign-model work should
not depend on shipping behavior until shipping discounts are intentionally
designed.

## Module Semantics

### Quantity Breaks

Quantity breaks are product discount modules.

They usually evaluate item quantity thresholds and generate product discount
candidates. They may be shown as quantity bars on the storefront.

Target behavior:

- generate product discount candidates
- compete with BXGY and other product discounts by maximum actual discount value
- stay independent from order reward modules

### BXGY

BXGY is a product discount module.

Target behavior:

- generate product discount candidates
- compete with quantity breaks by maximum actual discount value
- avoid relying on implicit `getQuantity > buyQuantity` semantics in new data

Recommended future field:

```ts
quantitySemantics: "free_items" | "total_items"
```

Legacy data may continue to infer this from quantity values for compatibility.

### Complete Bundle

Complete bundle is an order discount module.

It means a trigger product plus selected bundle items form a bundle, and that
bundle subtotal receives an order-level discount.

It should not depend on BXGY semantics.

Target fields:

- trigger product scope
- bundle item pool
- min/max bundle item selection
- bundle pricing mode

Supported pricing modes:

- `full_price`
- `percentage_off`
- `amount_off`
- `fixed_price`

Implementation note:

Complete bundle should continue using order discount candidates because product
discount targeting is too fragile for mixed-cart bundle behavior.

### Free Gift Reward

Free gift reward is an order reward module, not a product discount module.

It represents a reward unlocked by order-level or cart-level conditions.

Target conditions:

- order amount reaches threshold
- order item count reaches threshold
- specific product quantity reaches threshold

Target reward:

- customer receives one or more gift products
- storefront is responsible for presenting or adding gift lines
- Shopify Function discounts the gift value as an order discount where possible

Reasoning:

Treating free gift as product discount makes it compete with quantity breaks and
BXGY. The target semantics are different: free gift is a reward for reaching a
condition and should be able to combine with the winning product discount.

### Subscription

Subscription is primarily a storefront display and purchase-mode module.

It may affect storefront purchase state, but it is not currently a core Function
discount module.

### Checkbox Upsell

Checkbox upsell is a storefront interaction module.

It should be modeled separately from discount math unless a future module
explicitly attaches a discount reward to it.

### Sticky Add To Cart

Sticky add to cart is a storefront interaction module.

It does not define a discount by itself.

## Storefront Composition

Use independent module blocks for the mixed frontend campaign.

Preferred pattern:

- quantity break block
- complete bundle block
- free gift reward/progress block
- subscription block
- upsell and CTA blocks

Modules share the same campaign context, but each module controls its own UI
shape and state. Do not force complete bundle, free gift, and subscription into
the same quantity-bar list.

## Runtime Compilation

Target runtime pipeline:

1. Campaign config is the source model.
2. A compiler converts campaign modules into storefront payload and Function
   payload.
3. Theme extension consumes storefront payload.
4. Shopify Functions consume compact runtime payload.

Recommended compiler responsibilities:

- normalize module data
- produce product discount candidates
- produce order discount candidates
- preserve display ordering
- keep Function payload below Shopify metafield input limits

## Current Implementation Gap

The current cart Function still has ordering behavior that can short-circuit
some product discount evaluation paths.

Target migration:

- generate all qualifying product discount candidates
- select the maximum product discount outcome
- generate order discount candidates independently
- keep complete bundle as order discount
- migrate free gift from product discount behavior to order reward behavior
- leave shipping discount out of the main campaign rewrite for now

## Practical Rules For Future Changes

- Do not add new campaign behavior by only branching on `offerType`.
- Add or update the campaign/module model first.
- Then update legacy-field compilation while legacy runtime paths still exist.
- Keep product discount competition separate from order discount stacking.
- Do not make complete bundle depend on BXGY.
- Do not model free gift as a normal product discount in new work.
- Before changing Shopify Function logic, confirm which discount class the module
  should produce.
