import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from "../generated/api";

//默认折扣规则
const DEFAULT_RULE = {
  groupSize: 3,
  groupDiscount: 0.6,
  remainder: {
    "1": 1,
    "2": 0.8,
  },
};

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  if (!hasOrderDiscountClass && !hasProductDiscountClass) {
    return { operations: [] };
  }

  const operations: CartLinesDiscountsGenerateRunResult["operations"] = [];

  if (hasOrderDiscountClass) {
    operations.push({
      orderDiscountsAdd: {
        candidates: [
          {
            message: "10% OFF ORDER",
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: [],
                },
              },
            ],
            value: {
              percentage: {
                value: 10,
              },
            },
          },
        ],
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });
  }

  if (hasProductDiscountClass) {
    for (const line of input.cart.lines) {
      if (line.merchandise.__typename !== "ProductVariant") continue;

      const quantity = line.quantity;
      if (quantity < 2) continue;

      const unitPrice = Number(line.cost.amountPerQuantity.amount);

      let rule: typeof DEFAULT_RULE | null = null;

      // Variant
      const variantRuleValue = line.merchandise.metafield?.value;

      console.log(`${line.merchandise.product.id}: `, variantRuleValue);

      if (variantRuleValue) {
        try {
          rule = {
            ...DEFAULT_RULE,
            ...JSON.parse(variantRuleValue),
          };
        } catch {
          rule = null;
        }
      }

      // Product（可选）
      if (!rule) {
        const productRuleValue = line.merchandise.product?.metafield?.value;

        if (productRuleValue) {
          try {
            rule = {
              ...DEFAULT_RULE,
              ...JSON.parse(productRuleValue),
            };
          } catch {
            rule = null;
          }
        }
      }

      if (!rule) continue; // 👈 没规则直接跳过

      const originalTotal = unitPrice * quantity;
      const discountedTotal = calculateDiscountedTotal(
        quantity,
        unitPrice,
        rule,
      );

      const totalDiscount = originalTotal - discountedTotal;

      if (totalDiscount <= 0) continue;

      const discountPerItem = totalDiscount / quantity;

      operations.push({
        productDiscountsAdd: {
          candidates: [
            {
              message: "Bundle pricing applied",
              targets: [
                {
                  cartLine: {
                    id: line.id,
                  },
                },
              ],
              value: {
                fixedAmount: {
                  amount: discountPerItem.toFixed(2),
                  appliesToEachItem: true,
                },
              },
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      });
    }
  }

  return { operations };
}

//计算折扣方法
function calculateDiscountedTotal(
  quantity: number,
  unitPrice: number,
  rule: {
    groupSize: number;
    groupDiscount: number;
    remainder: Record<string, number>;
  },
) {
  const groups = Math.floor(quantity / rule.groupSize);
  const remainderQty = quantity % rule.groupSize;

  let total = groups * rule.groupSize * unitPrice * rule.groupDiscount;

  if (remainderQty > 0) {
    const remainderDiscount = rule.remainder[String(remainderQty)] ?? 1;

    total += remainderQty * unitPrice * remainderDiscount;
  }

  return total;
}
