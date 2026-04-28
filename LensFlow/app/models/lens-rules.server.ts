import type { Prisma } from "@prisma/client";
import prisma from "../db.server";
import type {
  ConditionOperator,
  LensRule,
  LensVisibilityAction,
  RuleConditionField,
} from "../../src/types/lens.js";

const DEMO_SHOP = "demo-shop.myshopify.com";

type LensRuleRecord = Prisma.LensRuleGetPayload<{
  include: {
    conditions: true;
    actions: true;
  };
}>;

function mapRule(record: LensRuleRecord): LensRule {
  return {
    id: record.id,
    name: record.name,
    priority: record.priority,
    enabled: record.enabled,
    conditions: record.conditions.map((condition) => ({
      field: condition.field as RuleConditionField,
      operator: condition.operator as ConditionOperator,
      value: condition.value,
    })),
    actions: record.actions.map((action) => ({
      type: action.type as LensVisibilityAction,
      lensOptionId: action.lensOptionId,
      message: action.message ?? undefined,
      variantId: action.variantId ?? undefined,
    })),
  };
}

export async function ensureDefaultLensRules(productId: string) {
  const existingCount = await prisma.lensRule.count({
    where: {
      productId,
      shop: DEMO_SHOP,
    },
  });

  if (existingCount > 0) {
    return;
  }

  await prisma.lensRule.create({
    data: {
      shop: DEMO_SHOP,
      productId,
      name: "无度数显示基础镜片",
      priority: 100,
      enabled: true,
      conditions: {
        create: [
          {
            field: "prescriptionType",
            operator: "eq",
            value: "non_prescription",
          },
        ],
      },
      actions: {
        create: [
          {
            type: "show",
            lensOptionId: "lens-basic",
            message: "当前处方支持基础镜片",
            variantId: "variant-1",
          },
        ],
      },
    },
  });

  await prisma.lensRule.create({
    data: {
      shop: DEMO_SHOP,
      productId,
      name: "非无度数隐藏基础镜片",
      priority: 90,
      enabled: true,
      conditions: {
        create: [
          {
            field: "prescriptionType",
            operator: "neq",
            value: "non_prescription",
          },
        ],
      },
      actions: {
        create: [
          {
            type: "hide",
            lensOptionId: "lens-basic",
            message: "该镜片仅支持无度数",
          },
        ],
      },
    },
  });
}

export async function listLensRulesByProduct(productId: string): Promise<LensRule[]> {
  const rules = await prisma.lensRule.findMany({
    where: {
      productId,
      shop: DEMO_SHOP,
    },
    include: {
      conditions: true,
      actions: true,
    },
    orderBy: {
      priority: "desc",
    },
  });

  return rules.map(mapRule);
}

export async function createLensRule(input: {
  productId: string;
  name: string;
  priority: number;
  enabled: boolean;
  prescriptionType: string;
  actionType: LensVisibilityAction;
  lensOptionId: string;
  message?: string;
  variantId?: string;
}) {
  const created = await prisma.lensRule.create({
    data: {
      shop: DEMO_SHOP,
      productId: input.productId,
      name: input.name,
      priority: input.priority,
      enabled: input.enabled,
      conditions: {
        create: [
          {
            field: "prescriptionType",
            operator: "eq",
            value: input.prescriptionType,
          },
        ],
      },
      actions: {
        create: [
          {
            type: input.actionType,
            lensOptionId: input.lensOptionId,
            message: input.message,
            variantId: input.variantId,
          },
        ],
      },
    },
    include: {
      conditions: true,
      actions: true,
    },
  });

  return mapRule(created);
}

export async function updateLensRule(input: {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  prescriptionType: string;
  actionType: LensVisibilityAction;
  lensOptionId: string;
  message?: string;
  variantId?: string;
}) {
  const updated = await prisma.lensRule.update({
    where: {
      id: input.id,
    },
    data: {
      name: input.name,
      priority: input.priority,
      enabled: input.enabled,
      conditions: {
        deleteMany: {},
        create: [
          {
            field: "prescriptionType",
            operator: "eq",
            value: input.prescriptionType,
          },
        ],
      },
      actions: {
        deleteMany: {},
        create: [
          {
            type: input.actionType,
            lensOptionId: input.lensOptionId,
            message: input.message,
            variantId: input.variantId,
          },
        ],
      },
    },
    include: {
      conditions: true,
      actions: true,
    },
  });

  return mapRule(updated);
}

export async function setLensRuleEnabled(id: string, enabled: boolean) {
  const updated = await prisma.lensRule.update({
    where: {
      id,
    },
    data: {
      enabled,
    },
    include: {
      conditions: true,
      actions: true,
    },
  });

  return mapRule(updated);
}

export async function deleteLensRule(id: string) {
  await prisma.lensRule.delete({
    where: {
      id,
    },
  });
}
