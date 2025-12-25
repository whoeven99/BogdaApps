import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

// 默认折扣规则
interface RuleOption1Type {
  groupSize: number; //折扣组的元素数量
  groupDiscount: number; //满一组的折扣（如 0.5 表示 50%）
  remainder: any; //不满一组的各种情况的折扣，key 为数量，value 为折扣系数
  calculateQuantityWithVariantsArray: string[]; //一起计算quantity的变体数据数组
}

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  if (!checkValid(input)) {
    return { operations: [] };
  }

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

    let appliedRule: RuleOption1Type | null = null;

    const variantRule = parseJSON<RuleOption1Type>(
      line.merchandise.metafield?.value,
    );
    if (variantRule) appliedRule = variantRule;

    if (!appliedRule) continue;

    const lineQuantityMap = new Map(
      input.cart.lines
        .filter(
          (
            line,
          ): line is typeof line & {
            merchandise: { __typename: "ProductVariant"; id: string };
          } => line.merchandise.__typename === "ProductVariant",
        )
        .map((line) => [line.merchandise.id, line.quantity]),
    );

    let quantity = line.quantity;

    if (variantRule?.calculateQuantityWithVariantsArray?.length) {
      for (const id of variantRule.calculateQuantityWithVariantsArray) {
        quantity += lineQuantityMap.get(id) ?? 0;
      }
    }

    if (quantity <= 0) continue;

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
  let total = Math.round(groupItemCount * unitPriceCents * rule.groupDiscount);

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

  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  if (!hasProductDiscountClass) {
    return false;
  }

  return true;
}
