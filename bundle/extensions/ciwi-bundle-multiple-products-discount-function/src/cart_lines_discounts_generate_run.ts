//产品折扣和订单折扣相关代码
import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from "../generated/api";

//默认折扣规则
interface RuleOption1Type {
  groupSize: number; //折扣组的元素数量
  groupDiscount: number; //满一组的折扣
  remainder: any; //不满一组的各种情况的折扣
}
interface ProductRuleOption1Type {
  applicateToAllVariants: boolean; //应用到所有变体
  applicateVariantsArray: string[]; //一起计算quantity的变体数据数组
  quantityCalculateForAllSelectedArray: boolean;
  rule: RuleOption1Type;
}

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  //是否存在订单折扣（即使存在目前该方法也不使用）
  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );
  //是否存在产品折扣
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  //不存在相应折扣类型则直接跳过
  if (!hasOrderDiscountClass && !hasProductDiscountClass) {
    return { operations: [] };
  }

  //定义折扣数组
  const operations: CartLinesDiscountsGenerateRunResult["operations"] = [];

  //注释掉订单折扣相关代码
  // if (hasOrderDiscountClass) {
  //   operations.push({
  //     orderDiscountsAdd: {
  //       candidates: [
  //         {
  //           message: "10% OFF ORDER",
  //           targets: [
  //             {
  //               orderSubtotal: {
  //                 excludedCartLineIds: [],
  //               },
  //             },
  //           ],
  //           value: {
  //             percentage: {
  //               value: 10,
  //             },
  //           },
  //         },
  //       ],
  //       selectionStrategy: OrderDiscountSelectionStrategy.First,
  //     },
  //   });
  // }

  if (hasProductDiscountClass) {
    //定义Map值类型
    type ProductGroup = {
      rule: RuleOption1Type;
      lines: typeof input.cart.lines;
    };

    //定义后续需要用到的Map数据，用来存储产品中配置好的一起计算quantity的变体数据
    const productRuleGroups = new Map<string, ProductGroup>();

    //轮询购物车每个item
    for (const line of input.cart.lines) {
      if (line.merchandise.__typename !== "ProductVariant") continue;

      //该item的产品id
      const productId = line.merchandise.product.id;

      //该item的变体id
      const variantId = line.merchandise.id;

      //该item的加购数量
      const quantity = line.quantity;

      const unitPrice = Number(line.cost.amountPerQuantity.amount);

      //应用到的折扣规则
      let appliedRule: RuleOption1Type | null = null;
      //是否使用产品规则
      let useProductRule = false;
      //是否需要统一计算quantity
      let mergeQuantity = false;

      //产品折扣规则
      const productRuleValue = line.merchandise.product?.metafield?.value;

      //如果产品规则存在
      if (productRuleValue) {
        try {
          const productRuleJSON: ProductRuleOption1Type =
            JSON.parse(productRuleValue);

          //变体需要应用产品规则
          const hitProductRule =
            productRuleJSON.applicateToAllVariants ||
            productRuleJSON.applicateVariantsArray?.includes(variantId);

          //需要应用产品规则并且规则存在
          if (hitProductRule && productRuleJSON.rule) {
            appliedRule = productRuleJSON.rule;
            useProductRule = true;
            mergeQuantity =
              productRuleJSON.quantityCalculateForAllSelectedArray === true;
          }
        } catch {}
      }

      //当产品规则未应用成功时
      if (!useProductRule) {
        const variantRuleValue = line.merchandise.metafield?.value;
        if (variantRuleValue) {
          try {
            appliedRule = JSON.parse(variantRuleValue);
          } catch {
            // ignore
          }
        }
      }

      //折扣规则不存在时直接跳过后续逻辑
      if (!appliedRule) continue;

      //如果变体应用产品规则并且产品规则需要将所以变体数量一起计算时
      if (useProductRule && mergeQuantity) {
        if (!productRuleGroups.has(productId)) {
          productRuleGroups.set(productId, {
            rule: appliedRule,
            lines: [],
          });
        }

        productRuleGroups.get(productId)!.lines.push(line);
        continue;
      }

      //反之
      const originalTotal = unitPrice * quantity;
      const discountedTotal = calculateDiscountedTotal(
        quantity,
        unitPrice,
        appliedRule,
      );

      const totalDiscount = originalTotal - discountedTotal;
      if (totalDiscount <= 0) continue;

      const discountPerItem = totalDiscount / quantity;

      operations.push({
        productDiscountsAdd: {
          candidates: [
            {
              message: "Bundle pricing applied",
              targets: [{ cartLine: { id: line.id } }],
              value: {
                fixedAmount: {
                  amount: discountPerItem.toFixed(2),
                  appliesToEachItem: true,
                },
              },
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.All,
        },
      });
    }

    //计算需要统一计算quantity的折扣
    for (const [, group] of productRuleGroups.entries()) {
      const totalQuantity = group.lines.reduce(
        (sum, line) => sum + line.quantity,
        0,
      );

      if (totalQuantity < 2) continue;

      const originalTotal = group.lines.reduce(
        (sum, line) =>
          sum + line.quantity * Number(line.cost.amountPerQuantity.amount),
        0,
      );

      const unitPrice = Number(group.lines[0].cost.amountPerQuantity.amount);

      const discountedTotal = calculateDiscountedTotal(
        totalQuantity,
        unitPrice,
        group.rule,
      );

      const totalDiscount = originalTotal - discountedTotal;
      if (totalDiscount <= 0) continue;

      for (const line of group.lines) {
        const lineOriginal =
          line.quantity * Number(line.cost.amountPerQuantity.amount);

        const ratio = lineOriginal / originalTotal;
        const lineDiscountTotal = totalDiscount * ratio;
        const discountPerItem = lineDiscountTotal / line.quantity;

        if (operations?.length) {
          operations[0].productDiscountsAdd?.candidates?.push({
            message: "Bundle pricing applied",
            targets: [{ cartLine: { id: line.id } }],
            value: {
              fixedAmount: {
                amount: discountPerItem.toFixed(2),
                appliesToEachItem: true,
              },
            },
          });
        } else {
          operations.push({
            productDiscountsAdd: {
              candidates: [
                {
                  message: "Bundle pricing applied",
                  targets: [{ cartLine: { id: line.id } }],
                  value: {
                    fixedAmount: {
                      amount: discountPerItem.toFixed(2),
                      appliesToEachItem: true,
                    },
                  },
                },
              ],
              selectionStrategy: ProductDiscountSelectionStrategy.All,
            },
          });
        }
      }
    }
  }

  return { operations };
}

//计算折扣方法
function calculateDiscountedTotal(
  quantity: number,
  unitPrice: number,
  rule: RuleOption1Type,
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
