import type { Prisma } from "@prisma/client";

import prisma from "../db.server";
import { parseParameterConfigJson } from "../../src/lib/product-parameters.js";
import {
  DEFAULT_CONTACT_LENS_PARAMETER_TEMPLATE,
  DEFAULT_LENS_PARAMETER_TEMPLATE,
  DEFAULT_PARAMETER_UNITS,
  buildParameterSignature,
  type ParameterInputValue,
  type ParameterTemplateDefinition,
} from "../../src/types/product-parameters.js";

const DEMO_SHOP = "demo-shop.myshopify.com";

type ParameterUnitRecord = Prisma.ParameterUnitGetPayload<Record<string, never>>;

type ParameterTemplateRecord = Prisma.ParameterTemplateGetPayload<{
  include: {
    parameters: {
      include: {
        unit: true;
      };
    };
  };
}>;

type ProductParameterConfigRecord = Prisma.ProductParameterConfigGetPayload<{
  include: {
    template: {
      include: {
        parameters: {
          include: {
            unit: true;
          };
        };
      };
    };
    valueMappings: true;
  };
}>;

export type ProductParameterDefinitionView = {
  code: string;
  label: string;
  type: string;
  required: boolean;
  position: number;
  unitCode?: string;
  unitLabel?: string;
  options: string[];
  min: number | null;
  max: number | null;
  step: number | null;
  helpText: string | null;
  dependsOn: { code: string; values: string[] } | null;
};

export type ProductParameterConfigView = {
  id: string;
  shopifyProductId: string;
  templateId: string;
  productType?: string;
  allowOneTimePurchase: boolean;
  allowSubscription: boolean;
  parameterOverridesJson?: string;
  template: {
    id: string;
    name: string;
    productCategory: string;
    description?: string;
    parameters: ProductParameterDefinitionView[];
  };
  valueMappings: Array<{
    id: string;
    signature: string;
    shopifyVariantId: string;
    inventoryPolicy?: string;
    priceAdjustment?: number;
  }>;
};

function mapProductConfig(record: ProductParameterConfigRecord): ProductParameterConfigView {
  return {
    id: record.id,
    shopifyProductId: record.shopifyProductId,
    templateId: record.templateId,
    productType: record.productType ?? undefined,
    allowOneTimePurchase: record.allowOneTimePurchase,
    allowSubscription: record.allowSubscription,
    parameterOverridesJson: record.parameterOverridesJson ?? undefined,
    template: {
      id: record.template.id,
      name: record.template.name,
      productCategory: record.template.productCategory,
      description: record.template.description ?? undefined,
      parameters: record.template.parameters.map((parameter) => {
        const config = parseParameterConfigJson(parameter.configJson);
        return {
          code: parameter.code,
          label: parameter.label,
          type: parameter.type,
          required: parameter.required,
          position: parameter.position,
          unitCode: parameter.unit?.code ?? undefined,
          unitLabel: parameter.unit?.label ?? undefined,
          options: config.options,
          min: config.min,
          max: config.max,
          step: config.step,
          helpText: config.helpText,
          dependsOn: config.dependsOn,
        };
      }),
    },
    valueMappings: record.valueMappings.map((mapping) => ({
      id: mapping.id,
      signature: mapping.signature,
      shopifyVariantId: mapping.shopifyVariantId,
      inventoryPolicy: mapping.inventoryPolicy ?? undefined,
      priceAdjustment: mapping.priceAdjustment ?? undefined,
    })),
  };
}

export async function ensureDefaultParameterUnits(shop = DEMO_SHOP) {
  for (const unit of DEFAULT_PARAMETER_UNITS) {
    await prisma.parameterUnit.upsert({
      where: {
        shop_code: {
          shop,
          code: unit.code,
        },
      },
      update: {
        label: unit.label,
        precision: unit.precision,
        step: unit.step,
      },
      create: {
        shop,
        code: unit.code,
        label: unit.label,
        precision: unit.precision,
        step: unit.step,
      },
    });
  }
}

async function resolveUnitId(
  unitCode: string | undefined,
  shop: string,
): Promise<string | undefined> {
  if (!unitCode) {
    return undefined;
  }

  const unit = await prisma.parameterUnit.findUnique({
    where: {
      shop_code: {
        shop,
        code: unitCode,
      },
    },
  });

  return unit?.id;
}

async function upsertTemplateDefinition(
  template: ParameterTemplateDefinition,
  shop: string,
) {
  const existing = await prisma.parameterTemplate.findUnique({
    where: {
      shop_name: {
        shop,
        name: template.name,
      },
    },
  });

  const savedTemplate = existing
    ? await prisma.parameterTemplate.update({
        where: { id: existing.id },
        data: {
          productCategory: template.productCategory,
          description: template.description,
          active: true,
        },
      })
    : await prisma.parameterTemplate.create({
        data: {
          shop,
          name: template.name,
          productCategory: template.productCategory,
          description: template.description,
        },
      });

  await prisma.parameterDefinition.deleteMany({
    where: {
      templateId: savedTemplate.id,
    },
  });

  for (const parameter of template.parameters) {
    const unitId = await resolveUnitId(parameter.unitCode, shop);
    await prisma.parameterDefinition.create({
      data: {
        templateId: savedTemplate.id,
        code: parameter.code,
        label: parameter.label,
        type: parameter.type,
        required: parameter.required,
        position: parameter.position,
        unitId,
        configJson: JSON.stringify({
          options: parameter.options ?? [],
          min: parameter.min ?? null,
          max: parameter.max ?? null,
          step: parameter.step ?? null,
          helpText: parameter.helpText ?? null,
          dependsOn: parameter.dependsOn ?? null,
        }),
      },
    });
  }

  return savedTemplate;
}

export async function saveParameterTemplate(
  template: ParameterTemplateDefinition,
  shop = DEMO_SHOP,
) {
  await ensureDefaultParameterUnits(shop);
  return upsertTemplateDefinition(template, shop);
}

export async function ensureDefaultParameterTemplates(shop = DEMO_SHOP) {
  await ensureDefaultParameterUnits(shop);
  await upsertTemplateDefinition(DEFAULT_LENS_PARAMETER_TEMPLATE, shop);
  await upsertTemplateDefinition(DEFAULT_CONTACT_LENS_PARAMETER_TEMPLATE, shop);
}

export async function listParameterUnits(shop = DEMO_SHOP) {
  return prisma.parameterUnit.findMany({
    where: { shop },
    orderBy: { code: "asc" },
  });
}

export async function listParameterTemplates(shop = DEMO_SHOP) {
  return prisma.parameterTemplate.findMany({
    where: { shop },
    include: {
      parameters: {
        include: {
          unit: true,
        },
        orderBy: {
          position: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function createProductParameterConfig(input: {
  shopifyProductId: string;
  templateId: string;
  productType?: string;
  allowOneTimePurchase: boolean;
  allowSubscription: boolean;
  parameterOverrides?: Record<string, unknown>;
  shop?: string;
}) {
  return prisma.productParameterConfig.upsert({
    where: {
      shop_shopifyProductId: {
        shop: input.shop ?? DEMO_SHOP,
        shopifyProductId: input.shopifyProductId,
      },
    },
    update: {
      templateId: input.templateId,
      productType: input.productType,
      allowOneTimePurchase: input.allowOneTimePurchase,
      allowSubscription: input.allowSubscription,
      parameterOverridesJson: input.parameterOverrides
        ? JSON.stringify(input.parameterOverrides)
        : null,
    },
    create: {
      shop: input.shop ?? DEMO_SHOP,
      shopifyProductId: input.shopifyProductId,
      templateId: input.templateId,
      productType: input.productType,
      allowOneTimePurchase: input.allowOneTimePurchase,
      allowSubscription: input.allowSubscription,
      parameterOverridesJson: input.parameterOverrides
        ? JSON.stringify(input.parameterOverrides)
        : null,
    },
    include: {
      template: {
        include: {
          parameters: {
            include: {
              unit: true,
            },
            orderBy: {
              position: "asc",
            },
          },
        },
      },
      valueMappings: true,
    },
  });
}

export async function listProductParameterConfigs(shop = DEMO_SHOP) {
  const configs = await prisma.productParameterConfig.findMany({
    where: { shop },
    include: {
      template: {
        include: {
          parameters: {
            include: {
              unit: true,
            },
            orderBy: {
              position: "asc",
            },
          },
        },
      },
      valueMappings: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return configs.map(mapProductConfig);
}

export async function getProductParameterConfig(
  shopifyProductId: string,
  shop = DEMO_SHOP,
) {
  const config = await prisma.productParameterConfig.findUnique({
    where: {
      shop_shopifyProductId: {
        shop,
        shopifyProductId,
      },
    },
    include: {
      template: {
        include: {
          parameters: {
            include: {
              unit: true,
            },
            orderBy: {
              position: "asc",
            },
          },
        },
      },
      valueMappings: true,
    },
  });

  return config ? mapProductConfig(config) : null;
}

export async function createParameterValueMapping(input: {
  productConfigId: string;
  values: Record<string, ParameterInputValue>;
  shopifyVariantId: string;
  inventoryPolicy?: string;
  priceAdjustment?: number;
  metadata?: Record<string, unknown>;
}) {
  const signature = buildParameterSignature(input.values);

  return prisma.parameterValueMapping.upsert({
    where: {
      productConfigId_signature: {
        productConfigId: input.productConfigId,
        signature,
      },
    },
    update: {
      shopifyVariantId: input.shopifyVariantId,
      inventoryPolicy: input.inventoryPolicy,
      priceAdjustment: input.priceAdjustment,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
    create: {
      productConfigId: input.productConfigId,
      signature,
      shopifyVariantId: input.shopifyVariantId,
      inventoryPolicy: input.inventoryPolicy,
      priceAdjustment: input.priceAdjustment,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function findMappedVariantByValues(input: {
  shopifyProductId: string;
  values: Record<string, ParameterInputValue>;
  shop?: string;
}) {
  const config = await prisma.productParameterConfig.findUnique({
    where: {
      shop_shopifyProductId: {
        shop: input.shop ?? DEMO_SHOP,
        shopifyProductId: input.shopifyProductId,
      },
    },
    include: {
      valueMappings: true,
    },
  });

  if (!config) {
    return null;
  }

  const signature = buildParameterSignature(input.values);

  return (
    config.valueMappings.find((mapping) => mapping.signature === signature) ?? null
  );
}

export type {
  ParameterTemplateRecord,
  ParameterUnitRecord,
  ProductParameterConfigRecord,
};
