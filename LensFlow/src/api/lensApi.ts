import { buildLensVisibilityDiagnostic } from "../services/diagnostics.js";
import { buildProductHealthReport } from "../services/healthCheck.js";
import { buildProductLensOptions } from "../services/productLensOptions.js";
import type { LensRule, ProductContext } from "../types/lens.js";
import type { LensRepository } from "../repositories/lensRepository.js";

export type ApiResponse<T> = {
  status: number;
  body: T | { error: string };
};

export type PreviewInput = {
  productId: string;
  prescriptionType?: ProductContext["prescriptionType"];
  tags?: string[];
};

export type CreateRuleInput = {
  productId: string;
  rule: LensRule;
};

export type ProductLensOptionsInput = {
  productId: string;
  prescriptionType?: ProductContext["prescriptionType"];
  tags?: string[];
};

function notFoundResponse(): ApiResponse<never> {
  return {
    status: 404,
    body: {
      error: "未找到对应商品上下文",
    },
  };
}

function isMissingContext(
  context: ProductContext | undefined,
): context is undefined {
  return context === undefined;
}

function getRulesByProduct(
  repository: LensRepository,
  productId: string,
): LensRule[] {
  return repository.listRules(productId).map((item) => item.rule);
}

function getResolvedContext(
  repository: LensRepository,
  productId: string,
): ProductContext | undefined {
  const context = repository.getProductContext(productId);
  return context;
}

export function listLensRules(
  repository: LensRepository,
  productId?: string,
): ApiResponse<ReturnType<LensRepository["listRules"]>> {
  return {
    status: 200,
    body: repository.listRules(productId),
  };
}

export function createOrUpdateLensRule(
  repository: LensRepository,
  input: CreateRuleInput,
): ApiResponse<LensRule> {
  const context = getResolvedContext(repository, input.productId);
  if (isMissingContext(context)) {
    return notFoundResponse();
  }

  return {
    status: 200,
    body: repository.saveRule(input.productId, input.rule),
  };
}

export function previewLensRules(
  repository: LensRepository,
  input: PreviewInput,
): ApiResponse<ReturnType<typeof buildLensVisibilityDiagnostic>> {
  const context = getResolvedContext(repository, input.productId);
  if (isMissingContext(context)) {
    return notFoundResponse();
  }

  const previewContext: ProductContext = {
    ...context,
    prescriptionType: input.prescriptionType ?? context.prescriptionType,
    tags: input.tags ?? context.tags,
  };

  const rules = getRulesByProduct(repository, input.productId);

  return {
    status: 200,
    body: buildLensVisibilityDiagnostic(previewContext, rules),
  };
}

export function diagnoseLensVisibility(
  repository: LensRepository,
  input: PreviewInput,
): ApiResponse<ReturnType<typeof buildLensVisibilityDiagnostic>> {
  return previewLensRules(repository, input);
}

export function getProductHealth(
  repository: LensRepository,
  productId: string,
): ApiResponse<ReturnType<typeof buildProductHealthReport>> {
  const context = getResolvedContext(repository, productId);
  if (isMissingContext(context)) {
    return notFoundResponse();
  }

  const rules = getRulesByProduct(repository, productId);

  return {
    status: 200,
    body: buildProductHealthReport({
      context,
      rules,
    }),
  };
}

export function getProductLensOptions(
  repository: LensRepository,
  input: ProductLensOptionsInput,
): ApiResponse<ReturnType<typeof buildProductLensOptions>> {
  const context = getResolvedContext(repository, input.productId);
  if (isMissingContext(context)) {
    return notFoundResponse();
  }

  const resolvedContext: ProductContext = {
    ...context,
    prescriptionType: input.prescriptionType ?? context.prescriptionType,
    tags: input.tags ?? context.tags,
  };
  const rules = getRulesByProduct(repository, input.productId);
  const lensOptions = repository.getLensOptions(input.productId);

  return {
    status: 200,
    body: buildProductLensOptions(resolvedContext, rules, lensOptions),
  };
}
