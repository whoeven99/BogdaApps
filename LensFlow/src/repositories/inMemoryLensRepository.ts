import type { LensOption, LensRule, ProductContext } from "../types/lens.js";
import type {
  LensRepository,
  StoredLensRule,
} from "./lensRepository.js";

const seedProductContexts: ProductContext[] = [
  {
    productId: "product-1",
    productType: "glasses",
    tags: ["frame", "acetate"],
    prescriptionType: "non_prescription",
    variants: [
      {
        id: "variant-1",
        sku: "SKU-1",
        isDeleted: false,
        inventoryAvailable: true,
      },
      {
        id: "variant-2",
        sku: "SKU-2",
        isDeleted: true,
        inventoryAvailable: false,
      },
    ],
  },
];

const seedRules: StoredLensRule[] = [
  {
    productId: "product-1",
    rule: {
      id: "rule-show-non-prescription",
      name: "无度数显示基础镜片",
      priority: 100,
      enabled: true,
      conditions: [
        {
          field: "prescriptionType",
          operator: "eq",
          value: "non_prescription",
        },
      ],
      actions: [
        {
          type: "show",
          lensOptionId: "lens-basic",
          variantId: "variant-1",
          message: "当前处方支持基础镜片",
        },
      ],
    },
  },
  {
    productId: "product-1",
    rule: {
      id: "rule-hide-other-prescription",
      name: "非无度数隐藏基础镜片",
      priority: 90,
      enabled: true,
      conditions: [
        {
          field: "prescriptionType",
          operator: "neq",
          value: "non_prescription",
        },
      ],
      actions: [
        {
          type: "hide",
          lensOptionId: "lens-basic",
          message: "该镜片仅支持无度数",
        },
      ],
    },
  },
];

const seedLensOptions = new Map<string, LensOption[]>([
  [
    "product-1",
    [
      {
        id: "lens-basic",
        name: "基础镜片",
        basePrice: 0,
      },
      {
        id: "lens-pro",
        name: "高级镜片",
        basePrice: 80,
      },
    ],
  ],
]);

const defaultLensOptions: LensOption[] = [
  {
    id: "lens-basic",
    name: "基础镜片",
    basePrice: 0,
  },
  {
    id: "lens-pro",
    name: "高级镜片",
    basePrice: 80,
  },
];

export class InMemoryLensRepository implements LensRepository {
  private readonly productContexts = new Map<string, ProductContext>();
  private readonly rules = new Map<string, LensRule[]>();
  private readonly lensOptions = new Map<string, LensOption[]>();

  constructor(
    productContexts: ProductContext[] = seedProductContexts,
    storedRules: StoredLensRule[] = seedRules,
  ) {
    for (const context of productContexts) {
      this.productContexts.set(context.productId, structuredClone(context));
    }

    for (const item of storedRules) {
      const currentRules = this.rules.get(item.productId) ?? [];
      currentRules.push(structuredClone(item.rule));
      this.rules.set(item.productId, currentRules);
    }

    for (const [productId, lensOptions] of seedLensOptions.entries()) {
      this.lensOptions.set(productId, structuredClone(lensOptions));
    }
  }

  listRules(productId?: string): StoredLensRule[] {
    if (productId) {
      return (this.rules.get(productId) ?? []).map((rule) => ({
        productId,
        rule: structuredClone(rule),
      }));
    }

    return [...this.rules.entries()].flatMap(([currentProductId, rules]) =>
      rules.map((rule) => ({
        productId: currentProductId,
        rule: structuredClone(rule),
      })),
    );
  }

  getProductContext(productId: string): ProductContext | undefined {
    const context = this.productContexts.get(productId);
    return context ? structuredClone(context) : undefined;
  }

  getLensOptions(productId: string): LensOption[] {
    return structuredClone(this.lensOptions.get(productId) ?? defaultLensOptions);
  }

  saveRule(productId: string, rule: LensRule): LensRule {
    const currentRules = this.rules.get(productId) ?? [];
    const existingIndex = currentRules.findIndex(
      (currentRule) => currentRule.id === rule.id,
    );

    if (existingIndex >= 0) {
      currentRules[existingIndex] = structuredClone(rule);
    } else {
      currentRules.push(structuredClone(rule));
    }

    this.rules.set(productId, currentRules);
    return structuredClone(rule);
  }
}
