import type {
  ProductSnapshot,
  SyncJobResult,
  VariantSnapshot,
  VariantSyncChange,
} from "../types/sync.js";

function indexByVariantId(variants: VariantSnapshot[]): Map<string, VariantSnapshot> {
  return new Map(variants.map((variant) => [variant.id, variant]));
}

export function diffVariantSnapshots(
  previousVariants: VariantSnapshot[],
  nextVariants: VariantSnapshot[],
): VariantSyncChange[] {
  const previousMap = indexByVariantId(previousVariants);
  const nextMap = indexByVariantId(nextVariants);
  const changes: VariantSyncChange[] = [];

  for (const nextVariant of nextVariants) {
    const previousVariant = previousMap.get(nextVariant.id);

    if (!previousVariant) {
      changes.push({
        variantId: nextVariant.id,
        type: "created",
        message: `发现新变体 ${nextVariant.sku}`,
      });
      continue;
    }

    if (previousVariant.sku !== nextVariant.sku) {
      changes.push({
        variantId: nextVariant.id,
        type: "updated",
        message: `变体 SKU 从 ${previousVariant.sku} 更新为 ${nextVariant.sku}`,
      });
    }

    if (previousVariant.inventoryAvailable !== nextVariant.inventoryAvailable) {
      changes.push({
        variantId: nextVariant.id,
        type: "inventory_changed",
        message: `变体 ${nextVariant.sku} 库存状态发生变化`,
      });
    }

    if (previousVariant.isDeleted !== nextVariant.isDeleted) {
      changes.push({
        variantId: nextVariant.id,
        type: nextVariant.isDeleted ? "deleted" : "updated",
        message: nextVariant.isDeleted
          ? `变体 ${nextVariant.sku} 已被标记删除`
          : `变体 ${nextVariant.sku} 已恢复`,
      });
    }
  }

  for (const previousVariant of previousVariants) {
    if (nextMap.has(previousVariant.id)) {
      continue;
    }

    changes.push({
      variantId: previousVariant.id,
      type: "deleted",
      message: `变体 ${previousVariant.sku} 在最新快照中不存在`,
    });
  }

  return changes;
}

export function buildSyncJobResult(input: {
  jobType: SyncJobResult["jobType"];
  previousProducts: ProductSnapshot[];
  nextProducts: ProductSnapshot[];
  previousVariants: VariantSnapshot[];
  nextVariants: VariantSnapshot[];
}): SyncJobResult {
  const variantChanges = diffVariantSnapshots(
    input.previousVariants,
    input.nextVariants,
  );

  const issueMessages = variantChanges.map((change) => change.message);
  const productChanges = Math.abs(
    input.nextProducts.length - input.previousProducts.length,
  );

  return {
    jobType: input.jobType,
    status: "success",
    productChanges,
    variantChanges: variantChanges.length,
    issueMessages,
  };
}
