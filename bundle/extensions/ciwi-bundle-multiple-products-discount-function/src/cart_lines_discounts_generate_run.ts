import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

// 默认折扣规则
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

  const pushCandidate = ({
    lineId,
    discountPerItemCents,
    isfree,
    quantity,
  }: {
    lineId: string;
    discountPerItemCents: number;
    isfree?: boolean;
    quantity?: number;
  }) => {
    if (discountPerItemCents <= 0) return;
    productCandidates.push({
      message: isfree ? "Text IsFree" : "Bundle pricing applied",
      targets: [{ cartLine: { id: lineId, quantity: quantity || null } }],
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

    let appliedRule: any = null;

    const variantRule = parseJSON<any>(line.merchandise.metafield?.value);
    if (variantRule) appliedRule = variantRule;

    if (!appliedRule) continue;

    switch (true) {
      case appliedRule?.typename == "WholeHouseRentalDiscountType":
        try {
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
          const discountPerItemCents = Math.round(
            totalDiscountCents / quantity,
          );
          pushCandidate({
            lineId: line.id,
            discountPerItemCents,
          });
          break;
        } catch (error) {
          break;
        }
      case appliedRule?.typename == "BundleDiscountType":
        try {
          // const lineQuantityMap = new Map(
          //   input.cart.lines
          //     .filter(
          //       (
          //         line,
          //       ): line is typeof line & {
          //         merchandise: { __typename: "ProductVariant"; id: string };
          //       } => line.merchandise.__typename === "ProductVariant",
          //     )
          //     .map((line) => [line.merchandise.id, line.quantity]),
          // );
          const rule = appliedRule as BundleDiscountType;

          // 1. 计算整车每个 variant 的数量
          const lineQuantityMap = new Map<string, number>();
          const lineMap = new Map<string, typeof line>();

          for (const l of input.cart.lines) {
            if (l.merchandise.__typename !== "ProductVariant") continue;
            const id = l.merchandise.id;
            lineQuantityMap.set(
              id,
              (lineQuantityMap.get(id) ?? 0) + l.quantity,
            );
            lineMap.set(id, l); // 用于后面拿价格
          }

          // 2. 计算 bundle 组数（全局）
          const bundleGroups = calculateBundleGroups(rule, lineQuantityMap);

          if (bundleGroups <= 0) break;

          // 3. 对 bundle 中的每个 variant 分别算折扣

          const variantId = line.merchandise.id;

          const bundle = rule.bundleItems.find(
            (item) => item.variantId === variantId,
          );

          if (!bundle) continue;

          const targetLine = lineMap.get(variantId);

          if (!targetLine) continue;

          const discountQty = bundleGroups * bundle.quantity;

          if (discountQty <= 0) continue;

          const unitPriceCents = toCents(
            targetLine.cost.amountPerQuantity.amount,
          );

          // 每一件应该优惠多少钱
          const discountPerItemCents = Math.round(
            unitPriceCents * (1 - bundle.discountRate),
          );

          if (discountPerItemCents <= 0) continue;

          pushCandidate({
            lineId: targetLine.id,
            discountPerItemCents,
            isfree: bundle.discountRate === 0,
            quantity: discountQty,
          });
          break;
        } catch (error) {
          break;
        }

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
function calculateDiscountedTotalCents(
  quantity: number,
  unitPriceCents: number,
  rule: WholeHouseRentalDiscountType,
) {
  const groups = Math.round(quantity / rule.groupSize);
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

function calculateBundleGroups(
  rule: BundleDiscountType,
  quantityMap: Map<string, number>,
): number {
  let groups = Infinity;

  for (const item of rule.bundleItems) {
    const cartQty = quantityMap.get(item.variantId) ?? 0;
    const possibleGroups = Math.round(cartQty / item.quantity);
    groups = Math.min(groups, possibleGroups);
  }

  return Number.isFinite(groups) ? groups : 0;
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
