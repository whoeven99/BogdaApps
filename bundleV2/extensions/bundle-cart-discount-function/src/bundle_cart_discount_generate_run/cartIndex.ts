import { CartInput } from "../../generated/api";
import { IndexedCartLine } from "./types";
import { buildOfferLookupKey, parseMoneyAmount } from "./parsing";

export function buildIndexedCartLines(
  cartLines: CartInput["cart"]["lines"],
): {
  entries: IndexedCartLine[];
  byLookupKey: Map<string, IndexedCartLine[]>;
  lookupKeys: Set<string>;
  totalQuantity: number;
} {
  const byLookupKey = new Map<string, IndexedCartLine[]>();
  const lookupKeys = new Set<string>();
  const entries: IndexedCartLine[] = [];
  let totalQuantity = 0;

  for (const line of cartLines) {
    const quantity = Math.max(0, Number(line.quantity) || 0);
    const productLookupKey =
      line.merchandise?.__typename === "ProductVariant"
        ? buildOfferLookupKey(line.merchandise?.product?.id)
        : "";
    const variantLookupKey =
      line.merchandise?.__typename === "ProductVariant"
        ? buildOfferLookupKey(line.merchandise?.id)
        : "";
    const entry: IndexedCartLine = {
      line,
      unitPrice: parseMoneyAmount(line.cost?.amountPerQuantity?.amount),
      quantity,
      productLookupKey,
      variantLookupKey,
    };
    entries.push(entry);
    totalQuantity += quantity;

    for (const lookupKey of [productLookupKey, variantLookupKey]) {
      if (!lookupKey) continue;
      lookupKeys.add(lookupKey);
      const bucket = byLookupKey.get(lookupKey);
      if (bucket) {
        bucket.push(entry);
      } else {
        byLookupKey.set(lookupKey, [entry]);
      }
    }
  }

  return {
    entries,
    byLookupKey,
    lookupKeys,
    totalQuantity,
  };
}

export function getIndexedCartEntriesForConfiguredIds(
  cartIndex: ReturnType<typeof buildIndexedCartLines>,
  configuredIds: string[],
): IndexedCartLine[] {
  if (!configuredIds.length) return [];
  const matched: IndexedCartLine[] = [];
  const seenLineIds = new Set<string>();

  for (const configuredId of configuredIds) {
    const lookupKey = buildOfferLookupKey(configuredId);
    if (!lookupKey) continue;
    for (const entry of cartIndex.byLookupKey.get(lookupKey) ?? []) {
      const lineId = String(entry.line.id || "");
      if (!lineId || seenLineIds.has(lineId)) continue;
      seenLineIds.add(lineId);
      matched.push(entry);
    }
  }

  return matched;
}
