import { buildProductLensOptions } from "../../src/services/productLensOptions.js";
import { buildLensVisibilityDiagnostic } from "../../src/services/diagnostics.js";
import type { ProductContext } from "../../src/types/lens.js";
import {
  ensureDefaultLensRules,
  listLensRulesByProduct,
} from "../models/lens-rules.server";
import type {
  ProductSubscriptionOffering,
  ShopifyProductNode,
} from "../services/shopify-products.server";
import {
  filterSubscriptionOfferingByVariant,
  toLensOptions,
  toProductContext,
  toSubscriptionOffering,
  toVariantSummaries,
} from "../services/shopify-products.server";

function withSelectedVariant(
  context: ProductContext,
  variantId?: string,
): ProductContext {
  return {
    ...context,
    selectedVariantId: variantId,
  };
}

export type StorefrontVariantLensPreview = {
  id: string;
  title: string;
  sku: string;
  inventoryAvailable: boolean;
  lensOptions: ReturnType<typeof buildProductLensOptions>;
};

export type StorefrontLensWidgetData = {
  productId: string;
  selectedVariantId?: string;
  prescriptionType?: ProductContext["prescriptionType"];
  currentLensOptions: ReturnType<typeof buildProductLensOptions>;
  currentDiagnostic: ReturnType<typeof buildLensVisibilityDiagnostic>;
  variants: StorefrontVariantLensPreview[];
  subscriptionOffering: ProductSubscriptionOffering;
};

export async function buildStorefrontLensWidgetData(
  product: ShopifyProductNode,
  options?: {
    selectedVariantId?: string;
    prescriptionType?: ProductContext["prescriptionType"];
  },
): Promise<StorefrontLensWidgetData> {
  const context = toProductContext(product);
  const lensOptions = toLensOptions(product);
  const subscriptionOffering = filterSubscriptionOfferingByVariant(
    toSubscriptionOffering(product),
    options?.selectedVariantId,
  );

  await ensureDefaultLensRules(context.productId);
  const rules = await listLensRulesByProduct(context.productId);

  const currentContext = {
    ...withSelectedVariant(context, options?.selectedVariantId),
    prescriptionType: options?.prescriptionType ?? context.prescriptionType,
  };

  return {
    productId: context.productId,
    selectedVariantId: options?.selectedVariantId,
    prescriptionType: currentContext.prescriptionType,
    currentLensOptions: buildProductLensOptions(
      currentContext,
      rules,
      lensOptions,
    ),
    currentDiagnostic: buildLensVisibilityDiagnostic(currentContext, rules),
    variants: toVariantSummaries(product).map((variant) => ({
      ...variant,
      lensOptions: buildProductLensOptions(
        {
          ...withSelectedVariant(context, variant.id),
          prescriptionType: currentContext.prescriptionType,
        },
        rules,
        lensOptions,
      ),
    })),
    subscriptionOffering,
  };
}
