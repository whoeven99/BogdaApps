# Function Instruction Limit Refactor Plan

## Goal
- Eliminate `InstructionCountLimitExceededError` in the cart discount function by removing repeated offer parsing, repeated eligibility checks, and broad shared-path work before `PRODUCT` / `ORDER` branching.
- Preserve current discount semantics and keep the existing dual-node Shopify discount architecture (`PRODUCT` + `ORDER`).

## Root Causes
- The function repeatedly parses the same `selectedProductsJson`, `discountRulesJson`, and `offerSettingsJson`.
- Shared entry logic does too much work before invocation-class branching.
- Regular quantity matching still performs `line x offer` scanning via `findOffer()`.
- BXGY and regular quantity paths re-interpret overlapping raw offer data independently.
- Hot-path diagnostics amplify the cost, but logging alone is not the root cause.

## Scope
- Primary file: `extensions/bundle-cart-discount-function/src/bundle_cart_discount_generate_run.ts`
- Keep current business behavior for:
  - `quantity-breaks-same`
  - `quantity-breaks-different`
  - `bxgy`
  - `free-gift`
  - `complete-bundle`

## Phases

### Phase 1: Compile Offers Once
- Add invocation-level compiled offer runtime structures.
- Parse raw JSON fields once per offer:
  - selected ids
  - parsed settings
  - standard discount tiers
  - bxgy rules
- Centralize reusable eligibility metadata:
  - enabled flag
  - schedule eligibility
  - market gating inputs
  - quantity bar gating
  - coupon gating inputs
- Keep existing discount math unchanged where possible.

### Phase 2: Early PRODUCT / ORDER Split
- Split compiled offers into invocation-relevant collections as early as possible.
- Ensure `ORDER` invocation does not fully process product-only offers.
- Ensure `PRODUCT` invocation does not fully process order-only-only logic except where required for shared offer typing.
- Keep BXGY paths filtered by cart relevance before heavy evaluation.

### Phase 3: Replace Linear Quantity Matching
- Replace `findOffer()` full scans with product/variant keyed indexes for regular quantity offers.
- Reduce repeated schedule/settings/selected-id checks inside line-level loops.
- Keep fallback behavior for match-all offers.

### Phase 4: Rule Consumption Cleanup
- Remove duplicated rule interpretation between standard and BXGY branches where possible.
- Reuse compiled rule sets instead of reparsing raw JSON in multiple helpers.

## Validation
- `PRODUCT` invocation returns candidates for regular quantity offers without triggering instruction limit.
- `ORDER` invocation skips irrelevant product-only work.
- Existing BXGY / complete-bundle / free-gift behaviors remain intact.
- Diagnostics for the edited function remain clean.

## Progress
- [x] Planning document created
- [x] Phase 1 completed
- [x] Phase 2 completed
- [x] Phase 3 completed
- [ ] Phase 4 pending

## Implemented So Far
- Added invocation-level compiled offer runtime objects.
- Compiled `selected ids`, parsed settings, standard tiers, and BXGY tiers once per offer.
- Switched shared entry filtering to consume compiled offer metadata instead of reparsing raw JSON fields.
- Switched regular product quantity selection to consume compiled tiers.
- Switched order discount candidate generation to consume compiled selected ids and parsed standard rules.
- Replaced regular quantity `findOffer()` full scans with a lightweight lookup index keyed by normalized configured ids.
- Switched BXGY and `quantity-breaks-different` evaluation to consume compiled BXGY rules and compiled selected ids instead of reparsing raw offer JSON on the hot path.

## Remaining Work
- Decide whether free-gift / complete-bundle should also consume compiled offers in a second refactor pass.
- Reduce or gate deep diagnostic logging after structure changes are validated.
