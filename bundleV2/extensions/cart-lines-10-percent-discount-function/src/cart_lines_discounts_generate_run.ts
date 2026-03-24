import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  DiscountClass,
  ProductDiscountCandidate,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

const DISCOUNT_PERCENTAGE = "10.0";

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
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
      message: "10% OFF (DEBUG)",
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

