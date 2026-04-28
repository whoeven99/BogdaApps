import { buildLensVisibilityDiagnostic } from "../../src/services/diagnostics.js";
import { buildProductHealthReport } from "../../src/services/healthCheck.js";
import { buildProductLensOptions } from "../../src/services/productLensOptions.js";
import { InMemoryLensRepository } from "../../src/repositories/inMemoryLensRepository.js";
import type { LensOption, ProductContext } from "../../src/types/lens.js";
import type { ShopifyProductConfiguration } from "../services/shopify-products.server";
import {
  ensureDefaultLensRules,
  listLensRulesByProduct,
} from "../models/lens-rules.server";

const repository = new InMemoryLensRepository();

export function getLensRepository() {
  return repository;
}

export async function getLensDashboardDataWithOptions(
  context: ProductContext,
  lensOptions: LensOption[],
  configuration: ShopifyProductConfiguration,
) {
  await ensureDefaultLensRules(context.productId);
  const rules = await listLensRulesByProduct(context.productId);

  return {
    context,
    rules,
    lensOptions: buildProductLensOptions(context, rules, lensOptions),
    diagnostic: buildLensVisibilityDiagnostic(context, rules),
    health: buildProductHealthReport({
      context,
      rules,
      configuration,
    }),
    configuration,
  };
}
