# Debug Session: function-instruction-limit
- **Status**: [RESOLVED — pending deploy + offer re-sync]
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

## Verification Conclusion (2026-06-15)
- **Root cause confirmed**: `quantity-breaks-same` 的 `s.productIds` 含 **232 个 ID**（JSON 数组）。WASM 在编译期对数组 split/Set 建索引消耗 ~10M+ 指令；每行再经 `findOffers` 二次线性扫描时总计 **~104M**（用户 input 实测）。
- **v2 短键压缩无效的原因**: 仅缩短字段名与去掉 GID 前缀，**未减少** Function 需解析/匹配的商品 ID 数量。
- **修复后本地模拟**（同 3 行购物车 + 3 条 offer）:
  - 旧 `productIds` 数组: **~15.7M** 指令（仍超限）
  - 新 `p` 逗号分隔 + 大池优化: **~8.5M** 指令，折扣输出正确（组合优惠 fixedAmount €11.95）
- **上线步骤**: 1) deploy `bundle-cart-discount-function` 2) 任意保存/触发 offer sync，使 metafield 写入 `s.p` 格式

## Prior Verification Conclusion
- A | Rejected: the input is small (2 cart lines, 3 offers); no evidence of abnormal stale-offer explosion.
- B | Partially confirmed: BXGY evaluation has nested loops, but with this small input it becomes problematic mainly because it still runs on irrelevant ORDER-only paths.
- C | Confirmed: hot-path diagnostics were serializing large offer payload JSON and likely consumed unnecessary instructions.
- D | Confirmed in practical effect: ORDER-only invocation still evaluated BXGY and `quantity-breaks-different` paths that could only emit product candidates.
- E | Rejected: payload size is normal for this run.
