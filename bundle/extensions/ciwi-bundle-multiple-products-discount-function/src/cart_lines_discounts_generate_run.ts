import { parseJSON, toCents } from "extensions/utils/typescripts";
import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  DiscountClass,
  ProductDiscountCandidate,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

interface RangeDiscountsType {
  typename: "RangeDiscountsType";
  ranges: {
    min: number; // 最小件数（包含）
    max?: number; // 最大件数（包含），不填表示无限
    discountRate: number;
  }[];
  calculateQuantityWithVariantsArray?: string[];
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

  //定义每行购物车item ID与Quantity的映射关系
  const lineQuantityMap = new Map<string, number>();

  for (const l of input.cart.lines) {
    if (l.merchandise.__typename !== "ProductVariant") continue;
    const id = l.merchandise.id;
    lineQuantityMap.set(id, (lineQuantityMap.get(id) ?? 0) + l.quantity);
  }

  //轮询购物车每个item
  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") continue;

    //初始化折扣规则数据
    let appliedRule: any = null;

    const productDiscountData: productDiscountDataType =
      input.discount as productDiscountDataType;

    const basicInformation = productDiscountData.basicInformation?.value;
    const discountRules = productDiscountData.discountRules?.value;
    const styleConfig = productDiscountData.styleConfig?.value;
    const targetingSettings = productDiscountData.targetingSettings?.value;
    const productPool = productDiscountData.productPool?.value;

    const discountRulesJSON = parseJSON<any>(discountRules);
    const basicInformationJSON = parseJSON<any>(basicInformation);
    const productPoolJSON = parseJSON<any>(productPool);

    if (!discountRulesJSON) continue;

    const variantIdStr = line.merchandise.id.split("gid://shopify/ProductVariant/")[1].toString();

    if (Array.isArray(productPoolJSON?.include_variant_ids) && productPoolJSON?.include_variant_ids?.includes(variantIdStr)) {
      appliedRule = {
        typename: "RangeDiscountsType",
        ranges: discountRulesJSON.map((rule: any, index: number) => {
          return {
            min: rule.trigger_scope.min_quantity,
            max: discountRulesJSON[index + 1]?.trigger_scope?.min_quantity ? discountRulesJSON[index + 1]?.trigger_scope?.min_quantity : undefined,
            discountRate: rule.discount.value,
          }
        }),
      }
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
      case appliedRule?.typename == "RangeDiscountsType":
        const candidate1 = ruleAsRangeDiscountsTypeOperate({
          lineQuantityMap,
          rule: appliedRule,
          quantity,
          unitPriceCents,
          lineId,
          message: basicInformationJSON.offerName,
        });

        console.log("candidate1: ", candidate1);

        if (!candidate1) continue;
        productCandidates.push(candidate1);
        break;

      case appliedRule?.typename == "WholeHouseRentalDiscountType":
        const candidate2 = ruleAsWholeHouseRentalDiscountTypeOperate({
          lineQuantityMap,
          rule: appliedRule,
          quantity,
          unitPriceCents,
          lineId,
        });
        if (!candidate2) continue;
        productCandidates.push(candidate2);
        break;

      case appliedRule?.typename == "BundleDiscountType":
        const variantId = line.merchandise.id;

        const candidate3 = ruleAsBundleDiscountTypeOperate({
          lineQuantityMap,
          rule: appliedRule,
          unitPriceCents,
          lineId,
          variantId,
          message: basicInformationJSON.offerName,
        });
        if (!candidate3) continue;
        productCandidates.push(candidate3);
        break;

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

// 以分为单位计算折后总额
const calculateDiscountedTotalCents = ({
  quantity,
  unitPriceCents,
  rule,
}: {
  quantity: number;
  unitPriceCents: number;
  rule: WholeHouseRentalDiscountType;
}) => {
  const groups = Math.floor(quantity / rule.groupSize);
  const remainderQty = quantity % rule.groupSize;

  const groupItemCount = groups * rule.groupSize;
  // 对组折扣与零头折扣分别计算并四舍五入到分
  let total = Math.round(groupItemCount * unitPriceCents * rule.groupDiscount);

  if (remainderQty > 0) {
    const remainderDiscount = rule.remainder?.[String(remainderQty)] ?? 1;
    total += Math.round(remainderQty * unitPriceCents * remainderDiscount);
  }

  return total;
};

const calculateBundleGroups = ({
  rule,
  quantityMap,
}: {
  rule: BundleDiscountType;
  quantityMap: Map<string, number>;
}): number => {
  let groups = Infinity;

  for (const item of rule.bundleItems) {
    const cartQty = quantityMap.get(item.variantId) ?? 0;
    const possibleGroups = Math.floor(cartQty / item.quantity);
    groups = Math.min(groups, possibleGroups);
  }

  return Number.isFinite(groups) ? groups : 0;
};

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

const findMatchedRange = (
  quantity: number,
  ranges: RangeDiscountsType["ranges"],
) => {
  return ranges.find((r) => {
    if (quantity < r.min) return false;
    if (r.max != null && quantity >= r.max) return false;
    return true;
  });
};

const calculateRangeDiscountTotalCents = ({
  quantity,
  unitPriceCents,
  rule,
}: {
  quantity: number;
  unitPriceCents: number;
  rule: RangeDiscountsType;
}) => {
  const matchedRange = findMatchedRange(quantity, rule.ranges);
  if (!matchedRange) return null;

  const discountedTotal = Math.round(
    quantity * unitPriceCents * matchedRange.discountRate,
  );

  const originalTotal = quantity * unitPriceCents;

  return originalTotal - discountedTotal;
};

const ruleAsRangeDiscountsTypeOperate = ({
  lineQuantityMap,
  rule,
  quantity,
  unitPriceCents,
  lineId,
  message,
}: {
  lineQuantityMap: Map<string, number>;
  rule: RangeDiscountsType;
  quantity: number;
  unitPriceCents: number;
  lineId: string;
  message: string;
}): ProductDiscountCandidate | null => {
  try {
    // 合并计算其他变体数量
    if (rule?.calculateQuantityWithVariantsArray?.length) {
      for (const id of rule.calculateQuantityWithVariantsArray) {
        quantity += lineQuantityMap.get(id) ?? 0;
      }
    }

    if (quantity <= 0) return null;

    console.log("quantity: ", quantity);

    const totalDiscountCents = calculateRangeDiscountTotalCents({
      quantity,
      unitPriceCents,
      rule,
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

const ruleAsWholeHouseRentalDiscountTypeOperate = ({
  lineQuantityMap,
  rule,
  quantity,
  unitPriceCents,
  lineId,
}: {
  lineQuantityMap: Map<string, number>;
  rule: WholeHouseRentalDiscountType;
  quantity: number; //购物车产品的总数量
  unitPriceCents: number; //产品总价格分级数据
  lineId: string; //购物车id
}): ProductDiscountCandidate | null => {
  try {
    // 计算捆绑变体的总数量
    if (rule?.calculateQuantityWithVariantsArray?.length) {
      for (const id of rule.calculateQuantityWithVariantsArray) {
        quantity += lineQuantityMap.get(id) ?? 0;
      }
    }

    if (quantity <= 0) return null;

    // 单独按行计算价格
    const originalTotalCents = unitPriceCents * quantity;
    const discountedTotalCents = calculateDiscountedTotalCents({
      quantity,
      unitPriceCents,
      rule,
    });

    const totalDiscountCents = originalTotalCents - discountedTotalCents;
    if (totalDiscountCents <= 0) return null;

    // 使用向下取整，避免累积四舍五入导致超额折扣
    const discountPerItemCents = Math.round(totalDiscountCents / quantity);
    const candidate = getCandidate({
      lineId,
      discountPerItemCents,
    });
    // 返回candidate
    return candidate;
  } catch (error) {
    return null;
  }
};

const ruleAsBundleDiscountTypeOperate = ({
  lineQuantityMap,
  rule,
  unitPriceCents,
  lineId,
  variantId,
  message,
}: {
  lineQuantityMap: Map<string, number>;
  rule: BundleDiscountType;
  unitPriceCents: number; //产品总价格分级数据
  lineId: string; //购物车id
  variantId: string; // 当前变体id
  message: string;
}): ProductDiscountCandidate | null => {
  try {
    // 计算 bundle 组数（全局）
    const bundleGroups = calculateBundleGroups({
      rule,
      quantityMap: lineQuantityMap,
    });

    if (bundleGroups <= 0) return null;

    // 获取当前变体在bundle中的数据
    const bundle = rule.bundleItems.find(
      (item) => item.variantId === variantId,
    );

    if (!bundle) return null;

    // 计算需要折扣的件数
    const discountQty = bundleGroups * bundle.quantity;

    if (discountQty <= 0) return null;

    // 计算每一件应该优惠多少钱
    const discountPerItemCents = Math.round(
      unitPriceCents * (1 - bundle.discountRate),
    );

    if (discountPerItemCents <= 0) return null;

    const candidate = getCandidate({
      lineId,
      discountPerItemCents,
      message:
        bundle.discountRate === 0 ? "isFree Text" : message,
      quantity: discountQty,
    });
    // 返回candidate
    return candidate;
  } catch (error) {
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
