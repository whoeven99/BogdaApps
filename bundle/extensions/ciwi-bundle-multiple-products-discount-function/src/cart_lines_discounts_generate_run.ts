import { parseJSON, toCents } from "extensions/utils/typescripts";
import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  DiscountClass,
  ProductDiscountCandidate,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

interface RangeDiscountsType {
  min: number; // 最小件数（包含）
  max?: number; // 最大件数（包含），不填表示无限
  discountRate: {
    type: "percentage" | "amount" | "product"
    value: number;
    maxDiscount: number;
  };
}

interface BuyXGetYType {
  Xquantity: number;
  Yquantity: number;
}

interface WholeHouseRentalDiscountType {
  typename: "WholeHouseRentalDiscountType";
  groupSize: number; //折扣组的元素数量
  groupDiscount: number; //满一组的折扣（如 0.5 表示 50%）
  remainder: any; //不满一组的各种情况的折扣，key 为数量，value 为折扣系数
  calculateQuantityWithVariantsArray?: string[]; //一起计算quantity的变体数据数组
}

interface BundleDiscountType {
  typename: "BundleDiscountType";
  bundleItems: {
    variantId: string;
    quantity: number;
    discountRate: number;
  }[];
}

type productDiscountDataType = {
  discountClasses: ["PRODUCT"];
  basicInformation: {
    value: string;
  } | null;
  discountRules: {
    value: string;
  } | null;
  styleConfig: {
    value: string;
  } | null;
  targetingSettings: {
    value: string;
  } | null;
  productPool: {
    value: string;
  } | null;
};

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  if (!checkValid(input)) {
    return { operations: [] };
  }

  //定义产品Candidates数组
  const productCandidates: Array<ProductDiscountCandidate> = [];

  //初始化折扣规则数据

  const productDiscountData: productDiscountDataType =
    input.discount as productDiscountDataType;

  const basicInformation = productDiscountData.basicInformation?.value;
  const discountRules = productDiscountData.discountRules?.value;
  const styleConfig = productDiscountData.styleConfig?.value;
  const targetingSettings = productDiscountData.targetingSettings?.value;
  const productPool = productDiscountData.productPool?.value;

  const basicInformationJSON = parseJSON<any>(basicInformation);
  const discountRulesJSON = parseJSON<any>(discountRules);
  const targetingSettingsJSON = parseJSON<any>(targetingSettings);
  const productPoolJSON = parseJSON<any>(productPool);

  //轮询购物车每个item
  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") continue;

    const variantId = line.merchandise.id;
    const variantIdWithoutGid = variantId.split("gid://shopify/ProductVariant/")[1].toString();

    if (!Array.isArray(productPoolJSON?.include_variant_ids) || !productPoolJSON?.include_variant_ids?.includes(variantIdWithoutGid)) {
      continue;
    }

    //购物车此行产品数量quantity数据
    const quantity = line.quantity;
    if (!quantity) continue;

    //购物车此行产品价格转分级amount数据
    const unitPriceCents = toCents(line.cost.amountPerQuantity.amount);

    //购物车此行产品id数据
    const lineId = line.id;
    if (!lineId) continue;

    //根据typename字段做不同的折扣处理
    switch (true) {
      case basicInformationJSON?.offerType?.subtype == "quantity-breaks-same":
        try {
          const ranges = discountRulesJSON.map((rule: any, index: number) => {
            return {
              min: rule.quantity,
              max: discountRulesJSON[index + 1]?.quantity ? discountRulesJSON[index + 1]?.quantity : undefined,
              discountRate: rule.discount,
            }
          });

          const candidate1 = ruleAsQuantityBreaksSameTypeOperate({
            ranges,
            quantity,
            unitPriceCents,
            lineId,
            message: basicInformationJSON.displayName,
          });

          if (!candidate1) continue;
          productCandidates.push(candidate1);
          break;
        } catch (error) {
          console.error("quantity-breaks-same: ", error);
          break;
        }

      case basicInformationJSON?.offerType?.subtype == "buy-x-get-y":
        try {
          const ranges = discountRulesJSON.map((rule: any, index: number) => {
            return {
              Xquantity: rule.quantity,
              Yquantity: rule.discount.value,
            }
          });

          const candidate2 = ruleAsBuyXGetYTypeOperate({
            ranges,
            quantity,
            unitPriceCents,
            lineId,
            message: basicInformationJSON.displayName,
          });

          if (!candidate2) continue;
          productCandidates.push(candidate2);
          break;
        } catch (error) {
          console.error("buy-x-get-y: ", error);
          break;
        }


      // case appliedRule?.typename == "BundleDiscountType":
      //   const variantId = line.merchandise.id;

      //   const candidate3 = ruleAsBundleDiscountTypeOperate({
      //     lineQuantityMap,
      //     rule: appliedRule,
      //     unitPriceCents,
      //     lineId,
      //     variantId,
      //     message: basicInformationJSON.displayName,
      //   });
      //   if (!candidate3) continue;
      //   productCandidates.push(candidate3);
      //   break;

      default:
        break;
    }
  }

  const operations = [];

  if (productCandidates.length) {
    operations.push({
      productDiscountsAdd: {
        candidates: productCandidates,
        selectionStrategy: ProductDiscountSelectionStrategy.All,
      },
    });
  }

  return { operations };
}

const getCandidate = ({
  lineId,
  discountPerItemCents,
  message,
  quantity,
}: {
  lineId: string;
  discountPerItemCents: number;
  message?: string;
  quantity?: number;
}): ProductDiscountCandidate | null => {
  if (discountPerItemCents <= 0) return null;
  return {
    message: message ? message : "Bundle pricing applied",
    targets: [{ cartLine: { id: lineId, quantity: quantity || null } }],
    value: {
      fixedAmount: {
        amount: (discountPerItemCents / 100).toFixed(2),
        appliesToEachItem: true,
      },
    },
  };
};

const calculateQuantityBreaksSameTotalCents = ({
  quantity,
  unitPriceCents,
  ranges,
}: {
  quantity: number;
  unitPriceCents: number;
  ranges: RangeDiscountsType[];
}) => {
  const matchedRange = ranges.find((r) => {
    if (quantity < r.min) return false;
    if (r.max != null && quantity >= r.max) return false;
    return true;
  });;
  if (!matchedRange) return null;

  let discountedTotal = 0;

  if (matchedRange.discountRate.type === "percentage") {
    discountedTotal = Math.round(
      quantity * unitPriceCents * matchedRange.discountRate.value,
    );
  }

  if (matchedRange.discountRate.type === "amount") {
    discountedTotal = Math.round(
      matchedRange.discountRate.value,
    );
  }

  const originalTotal = quantity * unitPriceCents;

  return originalTotal - discountedTotal;
};

const ruleAsQuantityBreaksSameTypeOperate = ({
  ranges,
  quantity,
  unitPriceCents,
  lineId,
  message,
}: {
  ranges: RangeDiscountsType[];
  quantity: number;
  unitPriceCents: number;
  lineId: string;
  message: string;
}): ProductDiscountCandidate | null => {
  try {
    if (quantity <= 0) return null;

    const totalDiscountCents = calculateQuantityBreaksSameTotalCents({
      quantity,
      unitPriceCents,
      ranges,
    });

    if (!totalDiscountCents || totalDiscountCents <= 0) return null;

    // ⚠️ Shopify 要 per-item 折扣
    const discountPerItemCents = Math.floor(totalDiscountCents / quantity);

    if (discountPerItemCents <= 0) return null;

    const candidate = getCandidate({
      lineId,
      discountPerItemCents,
      message,
    });
    // 返回candidate
    return candidate;
  } catch {
    return null;
  }
};

const ruleAsBuyXGetYTypeOperate = ({
  ranges,
  quantity,
  unitPriceCents,
  lineId,
  message,
}: {
  ranges: BuyXGetYType[];
  quantity: number;
  unitPriceCents: number;
  lineId: string;
  message: string;
}): ProductDiscountCandidate | null => {
  try {
    if (ranges.length <= 0) return null;

    const sortedRanges = [...ranges].sort(
      (a, b) => (b.Xquantity - b.Yquantity) - (a.Xquantity - a.Yquantity)
    );

    let remaining = quantity;
    let discountQuantity = 0;

    for (const range of sortedRanges) {
      const cycle = range.Xquantity;

      if (remaining < cycle) continue;

      const times = Math.floor(remaining / cycle);

      discountQuantity += times * range.Yquantity;
      remaining = remaining % cycle;

      if (remaining === 0) break;
    }

    // ⚠️ Shopify 要 per-item 折扣
    const candidate = getCandidate({
      lineId,
      discountPerItemCents: discountQuantity * unitPriceCents,
      message,
      quantity: discountQuantity,
    });
    // 返回candidate
    return candidate;
  } catch {
    return null;
  }
};

const checkValid = (input: CartInput): boolean => {
  if (!input.cart.lines.length) {
    return false;
  }

  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  if (!hasProductDiscountClass) {
    return false;
  }

  return true;
};
