import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  DiscountClass,
  ProductDiscountCandidate,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

const DISCOUNT_PERCENTAGE = "10.0";
const DEFAULT_DISCOUNT_PERCENTAGE = DISCOUNT_PERCENTAGE;

type OfferMetafieldPayload = {
  updatedAt?: string;
  offers?: Array<{
    id?: string;
    name?: string;
    status?: boolean;
    selectedProductsJson?: string | null;
    discountRulesJson?: string | null;
  }>;
};

type Offer = NonNullable<OfferMetafieldPayload["offers"]>[number];

export function cartLinesDiscountsGenerateRun(
  input: CartInput, // input 配置在graphql文件中
): CartLinesDiscountsGenerateRunResult {
  // app里存储的优惠数据，存在shopify metafield里
  const offersPayload = input.shop.metafield?.jsonValue as
    | OfferMetafieldPayload
    | null
    | undefined;
  const offers = offersPayload?.offers ?? [];
  console.log("offers", JSON.stringify(offers, null, 2));

  if (!offers.length || !checkValid(input)) {
    return { operations: [] };
  }

  const productCandidates: ProductDiscountCandidate[] = [];

  // 遍历购物车商品，生成productCandidates
  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") continue;

    const lineId = line.id;
    const quantity = line.quantity;
    if (!lineId || !quantity) continue;

    console.log("find suitOffer");
    const suitOffer = findOffer(lineId, offers); // TODO
    if (!suitOffer) continue;
    console.log("find suitOffer success");

    console.log("get discountPercentValue");
    const discountPercentValue = getDiscountPercentValue(
      suitOffer.discountRulesJson,
      quantity,
    );
    console.log("get discountPercentValue success");
    // 数量阈值没满足时，不对该 line 施加折扣
    if (!discountPercentValue) continue;

    console.log("create candidate");
    const candidate: ProductDiscountCandidate = {
      message: suitOffer.name,
      targets: [
        {
          cartLine: {
            id: lineId,
            quantity,
          },
        },
      ],
      value: {
        percentage: {
          value: discountPercentValue,
        },
      },
    };

    productCandidates.push(candidate);
  }

  if (!productCandidates.length) {
    return { operations: [] };
  }

  const operations = [{
    productDiscountsAdd: {
      candidates: productCandidates,
      selectionStrategy: ProductDiscountSelectionStrategy.All,
    },
  }];

  console.log("create operations success");
  return { operations };
}

type DiscountTier = {
  count: number;
  discountPercent: number;
};

function parseDiscountRulesJson(
  discountRulesJson?: string | null,
): DiscountTier[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const tiers: DiscountTier[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const count = Number((item as { count?: unknown }).count);
      const discountPercent = Number(
        (item as { discountPercent?: unknown }).discountPercent,
      );
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(discountPercent) || discountPercent < 0) continue;
      tiers.push({ count: Math.trunc(count), discountPercent });
    }

    tiers.sort((a, b) => a.count - b.count);
    return tiers;
  } catch {
    return [];
  }
}

function formatDiscountPercentValue(percent: number): string {
  if (!Number.isFinite(percent)) return DEFAULT_DISCOUNT_PERCENTAGE;
  // Shopify 使用十进制字符串表示（例如 "10.0"）
  return percent.toFixed(1);
}

function getDiscountPercentValue(
  discountRulesJson: string | null | undefined,
  quantity: number,
): string | null {
  const tiers = parseDiscountRulesJson(discountRulesJson);

  // 如果规则为空：保持旧行为（默认 10%）
  if (tiers.length === 0) {
    return null;
  }

  // 选中所有满足 quantity >= count 的 tier 里 count 最大的那个
  let best: DiscountTier | null = null;
  for (const tier of tiers) {
    if (quantity >= tier.count) best = tier;
  }

  if (!best) return null;
  return formatDiscountPercentValue(best.discountPercent);
}

// 解析selectedProductsJson，返回商品id列表
const parseSelectedIds = (selectedProductsJson?: string | null): string[] => {
  if (!selectedProductsJson) return [];

  try {
    const parsed = JSON.parse(selectedProductsJson);
    if (!Array.isArray(parsed)) return [];

    const ids: string[] = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        ids.push(item);
        continue;
      }
      if (item && typeof item === "object") {
        const id = (item as { id?: unknown }).id;
        if (typeof id === "string") ids.push(id);
      }
    }
    return ids;
  } catch {
    return [];
  }
};

/**
 * 尝试为当前 cart line 找到“匹配的生效 offer”（suitOffer）
 */
const findOffer = (lineId: string, offers: Offer[]): Offer | null => {
  const matched = offers.find((offer) => {
    if (offer.status === false) return false;

    const selectedIds = parseSelectedIds(offer.selectedProductsJson);
    // 没有限制时，视为对所有 line 都生效
    if (!selectedIds.length) return true;

    return selectedIds.includes(lineId);
  });

  return matched ?? null;
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

