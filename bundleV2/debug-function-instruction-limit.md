# Debug Session: function-instruction-limit
- **Status**: [OPEN]
- **Issue**: Shopify cart function fails with `InstructionCountLimitExceededError` after BXGY storefront rendering is fixed.
- **Debug Server**: Pending
- **Log File**: `.dbg/trae-debug-log-function-instruction-limit.ndjson`

## Reproduction Steps
1. Open PDP for product `gid://shopify/Product/8682446553111`.
2. Select BXGY tier and add to cart.
3. Observe Shopify Function failure with `InstructionCountLimitExceededError`.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Cart function is iterating too many offers/rules because stale offers remain in `ciwi-bundle-offers-fn`, causing BXGY evaluation to explode. | High | Low | Pending |
| B | BXGY rule matching does nested loops over cart lines and product pools, and the new single-tier/duplicate-offer shape causes excessive repeated evaluation. | High | Medium | Pending |
| C | Function logs are too verbose on the hot path, and instruction budget is being burned mostly by diagnostics rather than discount math. | Medium | Low | Pending |
| D | The function is evaluating both legacy BXGY and shared-scope BXGY paths for the same offer set, duplicating work until the instruction limit is hit. | Medium | Medium | Pending |
| E | The current cart payload or metafield payload is much larger than expected, and parse/normalization work alone exceeds the instruction budget before candidate selection completes. | Medium | Low | Pending |

## Log Evidence
- User-provided function `input` contains only 2 cart lines and 3 offers, so the failure is unlikely to come from raw payload size alone.
- Current invocation has `discount.discountClasses = ["ORDER"]`, but the function still grouped 2 offers into `bxgyOffers` (`bxgy` + `quantity-breaks-different`) and previously ran BXGY evaluation anyway.
- The current BXGY offer uses same-product `free_items` semantics (`buyQuantity=2`, `getQuantity=2`), which can only generate product candidates, not order candidates; evaluating it on an ORDER-only node is wasted work.
- Previous diagnostics serialized the full effective offers payload into function logs, duplicating large JSON strings from discount owner/shop metafields and burning instruction budget for debugging output.

## Verification Conclusion
- A | Rejected: the input is small (2 cart lines, 3 offers); no evidence of abnormal stale-offer explosion.
- B | Partially confirmed: BXGY evaluation has nested loops, but with this small input it becomes problematic mainly because it still runs on irrelevant ORDER-only paths.
- C | Confirmed: hot-path diagnostics were serializing large offer payload JSON and likely consumed unnecessary instructions.
- D | Confirmed in practical effect: ORDER-only invocation still evaluated BXGY and `quantity-breaks-different` paths that could only emit product candidates.
- E | Rejected: payload size is normal for this run.
