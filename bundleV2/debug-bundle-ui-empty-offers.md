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
- Pending

## Instrumentation Points
- A: Theme reads `bundle-offers` script and parses storefront metafield payload.
- B: Theme enters `getCurrentOffer()` and reports the raw offer list before gating.
- C: Theme reports metafield parse failures.
- D: Admin sync reports how many offers survive `isOfferPublishedForBundleMetafieldSync()` and how many are written into storefront payload.
- E: Theme reports mount source missing before metafield read.

## Verification Conclusion
- Pending
