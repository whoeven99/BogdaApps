import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

// 默认折扣规则
interface RuleOption1Type { // TODO 这里的option1名字一定要这样还是可以改
  groupSize: number; //折扣组的元素数量
  groupDiscount: number; //满一组的折扣（如 0.5 表示 50%）
  remainder: any; //不满一组的各种情况的折扣，key 为数量，value 为折扣系数
}
interface ProductRuleOption1Type {
  applicateToAllVariants: boolean; //应用到所有变体
  applicateVariantsArray: string[]; //一起计算quantity的变体数据数组
  quantityCalculateForAllSelectedArray: boolean;
  rule: RuleOption1Type;
}

type CartLine = CartInput["cart"]["lines"][number];

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  if (!checkValid(input)) {
    return { operations: [] };
  }

  type ProductGroup = {
    rule: RuleOption1Type;
    lines: CartLine[];
  };

  const productRuleGroups = new Map<string, ProductGroup>();
  const productCandidates: Array<any> = [];

  const toCents = (amountStr: string) => {
    return Math.round(Number(amountStr) * 100);
  };

  // 最好挪到utils里，不过这种extension的代码也不多
  const parseJSON = <T>(s?: string | null): T | null => {
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  };

  const pushCandidate = (lineId: string, discountPerItemCents: number) => {
    if (discountPerItemCents <= 0) return;
    productCandidates.push({
      message: "Bundle pricing applied",
      targets: [{ cartLine: { id: lineId } }],
      value: {
        fixedAmount: {
          amount: (discountPerItemCents / 100).toFixed(2),
          appliesToEachItem: true,
        },
      },
    });
  };

  //轮询购物车每个item
  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") continue;
    const quantity = line.quantity;
    if (quantity <= 0) continue;

    const productId = line.merchandise.product.id;
    const variantId = line.merchandise.id;
    let appliedRule: RuleOption1Type | null = null;
    let useProductRule = false;
    let mergeQuantity = false;

    const productRuleJSON = parseJSON<ProductRuleOption1Type>(
      line.merchandise.product?.metafield?.value,
    );
    if (productRuleJSON) {
      const hitProductRule =
        productRuleJSON.applicateToAllVariants ||
        productRuleJSON.applicateVariantsArray?.includes(variantId);
      if (hitProductRule && productRuleJSON.rule) {
        appliedRule = productRuleJSON.rule;
        useProductRule = true;
        mergeQuantity = productRuleJSON.quantityCalculateForAllSelectedArray;
      }
    }

    if (!useProductRule) {
      const variantRule = parseJSON<RuleOption1Type>(
        line.merchandise.metafield?.value,
      );
      if (variantRule) appliedRule = variantRule;
    }

    if (!appliedRule) continue;

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

    // 单独按行计算
    const unitPriceCents = toCents(line.cost.amountPerQuantity.amount);
    const originalTotalCents = unitPriceCents * quantity;
    const discountedTotalCents = calculateDiscountedTotalCents(
      quantity,
      unitPriceCents,
      appliedRule,
    );

    const totalDiscountCents = originalTotalCents - discountedTotalCents;
    if (totalDiscountCents <= 0) continue;

    // 使用向下取整，避免累积四舍五入导致超额折扣
    const discountPerItemCents = Math.floor(totalDiscountCents / quantity);
    pushCandidate(line.id, discountPerItemCents);
  }

  // 处理需要合并数量的产品组
  for (const [, group] of productRuleGroups.entries()) {
    let lines = group.lines;

    const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
    if (totalQuantity < 1) continue;

    // 计算整组原价总额（按每行实际单价）
    const lineOriginalCentsArr = lines.map((l) =>
      l.quantity * toCents(l.cost.amountPerQuantity.amount)
    );
    const originalTotalCents = lineOriginalCentsArr.reduce((a, b) => a + b, 0);
    if (originalTotalCents <= 0) continue;

    const unitPriceCentsForCalc = toCents(lines[0].cost.amountPerQuantity.amount);

    const discountedTotalCents = calculateDiscountedTotalCents(
      totalQuantity,
      unitPriceCentsForCalc,
      group.rule,
    );
    const totalDiscountCents = originalTotalCents - discountedTotalCents;
    if (totalDiscountCents <= 0) continue;

    // 先按比例分配（向下取整），累计分配后把剩余余数补到最后一行
    const perLineDiscounts: number[] = [];
    let allocated = 0;
    for (let i = 0; i < lines.length; i++) {
      const share = Math.floor((totalDiscountCents * lineOriginalCentsArr[i]) / originalTotalCents,);
      perLineDiscounts.push(share);
      allocated += share;
    }
    const remainder = totalDiscountCents - allocated;
    if (remainder > 0 && perLineDiscounts.length > 0) {
      // 把余数加到最后一行的分配上（不会超额）
      perLineDiscounts[perLineDiscounts.length - 1] += remainder;
    }

    // 将每行的总折扣平均分配到该行的每件商品（向下取整），确保不超过该行总折扣
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTotalDiscountCents = perLineDiscounts[i] || 0;
      if (lineTotalDiscountCents <= 0) continue;
      const perItem = Math.floor(lineTotalDiscountCents / line.quantity);
      pushCandidate(line.id, perItem);
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
function calculateDiscountedTotalCents(
  quantity: number,
  unitPriceCents: number,
  rule: RuleOption1Type,
) {
  const groups = Math.floor(quantity / rule.groupSize);
  const remainderQty = quantity % rule.groupSize;

  const groupItemCount = groups * rule.groupSize;
  // 对组折扣与零头折扣分别计算并四舍五入到分
  let total = Math.round(
    groupItemCount * unitPriceCents * rule.groupDiscount,
  );

  if (remainderQty > 0) {
    const remainderDiscount = rule.remainder?.[String(remainderQty)] ?? 1;
    total += Math.round(remainderQty * unitPriceCents * remainderDiscount);
  }

  return total;
}

function checkValid(input: CartInput): boolean {
  if (!input.cart.lines.length) {
    return false;
  }

  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  if (!hasOrderDiscountClass && !hasProductDiscountClass) {
    return false;
  }

  if (!hasProductDiscountClass) {
    return false;
  }

  return true;
}
