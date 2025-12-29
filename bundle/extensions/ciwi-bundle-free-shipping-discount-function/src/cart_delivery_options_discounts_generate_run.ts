import { toCents } from "extensions/utils/typescripts";
import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
  DeliveryInput,
  CartDeliveryOptionsDiscountsGenerateRunResult,
} from "../generated/api";

export function cartDeliveryOptionsDiscountsGenerateRun(
  input: DeliveryInput,
): CartDeliveryOptionsDiscountsGenerateRunResult {
  const deliveryGroup = input.cart.deliveryGroups[0];
  if (!deliveryGroup) return { operations: [] };

  // 是否存在运费折扣
  const hasShippingDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Shipping,
  );
  if (!hasShippingDiscountClass) return { operations: [] };

  // 读取配置最低免邮金额
  const minAmountMetafield = input.discount.metafield;
  const minAmountStr = minAmountMetafield?.value;

  if (!minAmountStr) return { operations: [] };

  const minAmount = toCents(minAmountStr);

  // 获取购物车价格
  const cartSubtotal = toCents(input.cart.cost.subtotalAmount.amount);

  // 判断是否满足门槛，不满足门槛（不免邮）
  if (cartSubtotal < minAmount) {
    return { operations: [] };
  }

  const operations = [];

  operations.push({
    deliveryDiscountsAdd: {
      candidates: [
        {
          message: `FREE DELIVERY (Orders over ${minAmountStr})`,
          targets: [
            {
              deliveryGroup: {
                id: deliveryGroup.id,
              },
            },
          ],
          value: {
            percentage: {
              value: 100,
            },
          },
        },
      ],
      selectionStrategy: DeliveryDiscountSelectionStrategy.All,
    },
  });

  // 满足门槛（免邮）
  return {
    operations,
  };
}
