import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  DiscountClass,
  ProductDiscountCandidate,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

const DISCOUNT_PERCENTAGE = "10.0";

type OfferMetafieldPayload = {
  updatedAt?: string;
  offers?: Array<{
    id?: string;
    status?: boolean;
    selectedProductsJson?: string | null;
    discountRulesJson?: string | null;
  }>;
};

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

  if (!checkValid(input)) {
    return { operations: [] };
  }

  const productCandidates: ProductDiscountCandidate[] = [];

  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") continue;

    const lineId = line.id;
    const quantity = line.quantity;
    if (!lineId || !quantity) continue;

    const candidate: ProductDiscountCandidate = {
      message: offers.length ? "10% OFF (Offer Matched11)" : "10% OFF (DEBUG)",
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
          value: DISCOUNT_PERCENTAGE,
        },
      },
    };

    productCandidates.push(candidate);
  }

  const operations: CartLinesDiscountsGenerateRunResult["operations"] = [];

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

