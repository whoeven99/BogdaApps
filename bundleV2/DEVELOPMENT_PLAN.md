# Bundle V2 Development Plan

## Goal

Turn `NextTodo.md` into an executable roadmap that can be delivered in batches without repeatedly reworking the same builder, theme-extension, and discount plumbing.

## Delivery Rules

- Prioritize shared foundations before new template expansion.
- Each batch must end in a working config -> preview -> save -> reload loop.
- UI changes follow `DESIGN.md`: compact, admin-first, low-noise.
- When a task touches `extensions/`, `offerParsing`, and builder UI together, land data-model changes first.

## Batch 1: Builder Foundation

| ID | Task | Scope | Main files | Acceptance | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B1-1 | Audit all Components config loops | Ensure `Components` can configure, preview, save, and reload consistently | `app/routes/component/CreateNewOffer/CreateNewOffer.tsx`, `StepTwoCompositionBuilder.tsx`, `campaignCompositionAdapter.ts`, `offerParsing.ts` | No component silently drops state between preview and saved payload | P0 | In progress |
| B1-2 | Free gift reward flow | Support explicit reward-product selection per rule and keep trigger/reward pools separate | `FreeGiftLogicEditor.tsx`, `LogicEditorsRenderer.tsx`, `CreateNewOffer.tsx`, `offerParsing.ts` | Merchant can see and edit trigger products and reward products independently | P0 | In progress |
| B1-3 | Different-products rule UX | Make `quantity-breaks-different` feel distinct from same-product bars and clarify cross-product scope | `DifferentProductsLogicEditor.tsx`, `StepTwoCompositionBuilder.tsx`, preview-related files | Cross-product rules no longer feel like a reused same-product editor | P0 | Planned |
| B1-4 | Money-based triggers | Extend bars from quantity-only to quantity-or-amount conditions | `UnifiedRulesEditor.tsx`, `unifiedRuleModel.ts`, `offerParsing.ts`, function mapping | Rules can be configured with cart amount where supported | P0 | Planned |
| B1-5 | Smart product selection | Add bulk selection helpers and filtered selection workflows | `CreateNewOffer.tsx`, product-picker helpers, related shared UI | Merchants can select, reverse, and refine product sets faster | P0 | Planned |
| B1-6 | Long-running schedule | Default offers to long-term active, with optional end date | `ScheduleTargetingEditor.tsx`, `CreateNewOffer.tsx`, `app/routes/_index/route.tsx` | Offer can be saved without an end date and reload correctly as long-term | P0 | In progress |
| B1-7 | Unified tips and warnings | Normalize warning, error, and draft-only message styles | `OfferRulesShared.tsx`, `UnifiedRulesAuditPanel.tsx`, builder step surfaces | Alerts share one calm Shopify-aligned language | P1 | Planned |

## Batch 2: Display And Polish

| ID | Task | Scope | Main files | Acceptance | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B2-1 | Step 3 UI pass | Tighten layout, spacing, and grouping in `Display` | `OfferComponentsDisplayCustomizer.tsx`, `CreateNewOffer.css`, `ProgressiveGiftsSection.tsx` | Display step is visually consistent with Step 2 and preview | P1 | Planned |
| B2-2 | Preview consistency | Reduce fallback or hardcoded preview copy when state exists | preview builders and display mappers | Preview reflects saved state more faithfully | P1 | Planned |

## Batch 3: Theme Extension Core

| ID | Task | Scope | Main files | Acceptance | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B3-1 | App block support | Make the theme extension addable as a theme block | `extensions/bundle-theme-product-custom/blocks/product_detail_message.liquid`, theme assets | Merchant can add the block directly in theme editor | P0 | Planned |
| B3-2 | Draft-theme activation | Stop limiting activation checks to online theme only | `app/routes/_index/route.tsx` and theme status helpers | Draft themes can be configured and treated as valid targets | P0 | Planned |
| B3-3 | Draft-theme config view | Allow config page to target draft themes | route loader/action + theme settings flows | Merchant can choose and configure a draft theme | P0 | Planned |
| B3-4 | Theme-aware preview | Reuse current theme CSS/structure where possible | theme assets + app preview surfaces | Preview looks closer to storefront with less custom CSS drift | P1 | Planned |

## Batch 4: Template Expansion

| ID | Task | Scope | Main files | Acceptance | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B4-1 | Shipping discount templates | Add delivery discount template entry and mapping | builder template registry + `bundle-delivery-discount-function` | Merchant can create shipping-offer flows from templates | P0 | Planned |
| B4-2 | Order discount templates | Add order-level template path in unified rules and persistence | builder + rule capability files + parsing | Merchant can create order-discount offers | P0 | Planned |
| B4-3 | Coupon templates | Introduce coupon issuance/config templates | new server flow + template picker | Coupon-based campaigns are configurable as first-class templates | P1 | Planned |
| B4-4 | Advanced targeting | Expand targeting with customer segment first, then profile/IP criteria | targeting UI + persistence + storefront/runtime checks | Segment-based targeting is configurable and persists | P1 | Planned |

## Batch 5: Cart, Checkout, Retention

| ID | Task | Scope | Main files | Acceptance | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B5-1 | Cart upsell reinforcement | Add stronger cart/checkout progress and secondary upsell prompts | storefront/theme assets + preview | Shoppers see clearer progress toward unlock states | P1 | Planned |
| B5-2 | Email and win-back | Define recovery and email marketing hooks around offer outcomes | server/domain layer, possible new modules | Retention workflows are isolated from builder core | P2 | Planned |

## Current Execution Order

1. Finish `B1-6` long-running schedule.
2. Finish `B1-2` free gift reward selection loop.
3. Tighten `B1-3` different-products rule UX.
4. Start `B1-7` shared warnings/tips.
5. Reassess `B1-4` money-based triggers after the first three land cleanly.

## Notes

- `theme extension` work should not begin until Batch 1 stops changing the saved campaign shape.
- `coupon`, `email`, and profile/IP targeting should remain separate from core builder stabilization.
- After each batch, run the smallest sensible validation set: diagnostics first, then typecheck if TypeScript surfaces changed broadly.
