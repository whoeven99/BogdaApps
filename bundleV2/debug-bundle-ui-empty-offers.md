# Debug Session: bundle-ui-empty-offers
- **Status**: [OPEN]
- **Issue**: Frontend bundle card does not render. Browser console shows `offers total: 0`, then skips bundle UI even though offer `#offer 2026-05-18 01:36:37` exists.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: `.dbg/trae-debug-log-bundle-ui-empty-offers.ndjson`

## Reproduction Steps
1. Open the PDP for product `gid://shopify/Product/8682446553111`.
2. Load storefront theme extension bundle card.
3. Observe browser console logs:
   - `[ciwi] offers total: 0`
   - `[ciwi] no offers in metafield — skip bundle UI`
   - `[ciwi] no active env offers after enabled checks, skip bundle UI`

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Storefront script reads the wrong metafield key for the current environment, so the raw offers array is empty before any product filtering. | High | Low | Pending |
| B | The offer exists in admin/test data, but storefront receives only the other environment's metafield (`prod` vs `test`), so active env filtering empties it. | High | Medium | Pending |
| C | The theme script fetch/parsing path returns malformed payload or silently falls back to an empty offers array when metafield JSON shape changed. | Medium | Low | Pending |
| D | The specific offer is present in raw offers, but is removed by enabled/theme/product gating before render, while current logs only show the final zero count. | Medium | Low | Pending |
| E | Theme extension initialization runs before storefront data/metafields are hydrated on this template, causing a false empty read. | Low | Medium | Pending |

## Log Evidence
- Database query confirms offer `#offer 2026-05-18 02:41:38` exists in test Turso with `status=true`, `offerType=bxgy`, and `selectedProductsJson.buyProducts=["gid://shopify/Product/8682446553111"]`.
- Shopify Admin GraphQL confirms shop metafield `ciwi_bundle.ciwi-bundle-offers` was updated at `2026-05-18T02:54:01Z` and contains that same offer in `offers[0]`.
- User console still reports old source line numbers (`2343`, `4537`) from the pre-instrumentation theme asset, while local debug-instrumented file moved those logs to later lines. This indicates the storefront is not executing the current local script build.
- After publishing the updated theme asset, user console shows `offers total: 1` and the offer payload is correctly preloaded.
- New runtime evidence shows `bxgy offer skipped: count is invalid`, because the first parsed BXGY rule is the `single` tier with `count=0`, and `getCurrentOffer()` incorrectly validates `bxgyRules[0]` instead of the first non-single BXGY tier.

## Instrumentation Points
- A: Theme reads `bundle-offers` script and parses storefront metafield payload.
- B: Theme enters `getCurrentOffer()` and reports the raw offer list before gating.
- C: Theme reports metafield parse failures.
- D: Admin sync reports how many offers survive `isOfferPublishedForBundleMetafieldSync()` and how many are written into storefront payload.
- E: Theme reports mount source missing before metafield read.

## Verification Conclusion
- A | Rejected: Shopify Admin API confirms `ciwi_bundle.ciwi-bundle-offers` contains the new offer.
- B | Rejected: test environment data exists in DB and in shop metafield.
- C | Rejected as primary cause: payload shape is valid JSON and contains `offers[0]`.
- D | Rejected: backend sync did not filter the offer out.
- Root cause confirmed: `product_detail_message_source.liquid` renders `bundle-offers` and `bundles-config` as siblings of `.ciwi-product-message-src`, but `getSourceScriptElement()` only searched inside the mount source. Result: theme script read `null`, then `offers=[]`, then skipped bundle UI.
- Fix applied: `getSourceScriptElement()` now falls back to adjacent sibling scripts and then a global `script[data-ciwi-script=...]` lookup.
- Secondary root cause confirmed: BXGY now includes a real `single` tier for storefront display, but `getCurrentOffer()` still assumes the first BXGY rule is actionable. When the first rule is `single`, validation sees `count=0` and skips the whole offer.
- Fix applied: BXGY availability checks now skip `single` and validate the first real BXGY tier.
