import { toCents } from "extensions/utils/typescripts";
import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from "../generated/api";

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  if (!checkValid(input)) {
    return { operations: [] };
  }

  type orderDiscountDataType = {
    discountClasses: ["ORDER"];
    min_amount: {
      value: string;
    } | null;
    discount_type: {
      value: "fixed" | "percentage";
    } | null;
    discount_amount: {
      value: string;
    } | null;
    discount_percentage: {
      value: string;
    } | null;
    max_discount_amount: {
      value: string;
    } | null;
  };

  const orderDiscountData: orderDiscountDataType =
    input.discount as orderDiscountDataType;

  const minAmountStr = orderDiscountData.min_amount?.value; // 最低折扣限额
  const discountType = orderDiscountData.discount_type?.value; // 折扣类型 fixed | percentage， fixed代表固定折扣， percentage代表百分比折扣
  const discountAmountStr = orderDiscountData.discount_amount?.value; //固定fixed折扣额度
  const discountPercentageStr = orderDiscountData.discount_percentage?.value; //百分比percentage折扣额度
  const maxDiscountAmountStr = orderDiscountData.max_discount_amount?.value; //百分比percentage折扣额度最大折扣额度

  // 当最低折扣限额和折扣类型数据不存在时提前结束逻辑
  if (!minAmountStr || !discountType) {
    return { operations: [] };
  }

  const subtotalCents = toCents(input.cart.cost.subtotalAmount.amount);
  const minAmountCents = toCents(minAmountStr);

  // 未达门槛提前结束逻辑
  if (subtotalCents < minAmountCents) {
    return { operations: [] };
  }

  //定义折扣额度类型
  let value:
    | { fixedAmount: { amount: string } }
    | { percentage: { value: number } };

  let message = "";

  switch (true) {
    case discountType === "fixed":
      // 固定折扣逻辑
      if (!discountAmountStr) return { operations: [] };

      const discountCents = toCents(discountAmountStr);
      if (discountCents <= 0) return { operations: [] };

      value = {
        fixedAmount: {
          amount: (discountCents / 100).toFixed(2),
        },
      };

      message = `Save ${discountAmountStr} on orders over ${minAmountStr}`;
      break;
    case discountType === "percentage":
      // 百分比折扣逻辑
      if (!discountPercentageStr || !maxDiscountAmountStr) {
        return { operations: [] };
      }

      const percentage = Number(discountPercentageStr);
      const maxDiscountCents = toCents(maxDiscountAmountStr);

      if (percentage <= 0 || maxDiscountCents <= 0) {
        return { operations: [] };
      }

      // 计算理论折扣
      const calculatedDiscountCents = Math.round(
        (subtotalCents * percentage) / 100,
      );

      // 命中封顶 → 用 fixedAmount
      if (calculatedDiscountCents >= maxDiscountCents) {
        value = {
          fixedAmount: {
            amount: (maxDiscountCents / 100).toFixed(2),
          },
        };
      } else {
        value = {
          percentage: {
            value: percentage,
          },
        };
      }

      message = `${percentage}% off orders over ${minAmountStr}`;
      break;
    default:
      // 当discountType数据不合法时结束逻辑
      return { operations: [] };
  }

  const operations = [];

  if (message && value) {
    operations.push({
      orderDiscountsAdd: {
        candidates: [
          {
            message,
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: [],
                },
              },
            ],
            value,
          },
        ],
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });
  }

  return {
    operations,
  };
}

function checkValid(input: CartInput): boolean {
  if (!input.cart.lines.length) {
    return false;
  }

  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );

  if (!hasOrderDiscountClass) {
    return false;
  }

  return true;
}
