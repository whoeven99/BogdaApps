import { CompiledOfferRuntime, LARGE_PRODUCT_POOL_INLINE_INDEX_MAX, RegularOfferIndex } from "./types";
import { buildOfferLookupKey, lineMatchesCompiledOfferSelection } from "./parsing";

export function appendOfferToLookupIndex(
  index: Map<string, CompiledOfferRuntime[]>,
  lookupKey: string,
  compiledOffer: CompiledOfferRuntime,
): void {
  if (!lookupKey) return;
  const existing = index.get(lookupKey);
  if (existing) {
    existing.push(compiledOffer);
    return;
  }
  index.set(lookupKey, [compiledOffer]);
}

export function buildRegularOfferIndex(offers: CompiledOfferRuntime[]): RegularOfferIndex {
  const byLookupKey = new Map<string, CompiledOfferRuntime[]>();
  const matchAllOffers: CompiledOfferRuntime[] = [];
  const largePoolOffers: CompiledOfferRuntime[] = [];

  for (const compiledOffer of offers) {
    if (!compiledOffer.settings.quantityEnabled) continue;
    if (!compiledOffer.selectedIds.length) {
      matchAllOffers.push(compiledOffer);
      continue;
    }

    if (
      compiledOffer.packedSelectedPool ||
      compiledOffer.selectedIds.length > LARGE_PRODUCT_POOL_INLINE_INDEX_MAX
    ) {
      largePoolOffers.push(compiledOffer);
      continue;
    }

    const seenKeys = new Set<string>();
    for (const selectedId of compiledOffer.selectedIds) {
      const lookupKey = buildOfferLookupKey(selectedId);
      if (!lookupKey || seenKeys.has(lookupKey)) continue;
      seenKeys.add(lookupKey);
      appendOfferToLookupIndex(byLookupKey, lookupKey, compiledOffer);
    }
  }

  return {
    matchAllOffers,
    byLookupKey,
    largePoolOffers,
  };
}

export const findOffers = (
  productId: string | undefined,
  variantId: string | undefined,
  offerIndex: RegularOfferIndex,
): CompiledOfferRuntime[] => {
  const candidateOffers: CompiledOfferRuntime[] = [];
  const seenOfferIds = new Set<string>();
  const lookupKeys = [buildOfferLookupKey(productId), buildOfferLookupKey(variantId)].filter(Boolean);

  for (const compiledOffer of offerIndex.matchAllOffers) {
    const offerId = String(compiledOffer.offer.id || "");
    if (seenOfferIds.has(offerId)) continue;
    seenOfferIds.add(offerId);
    candidateOffers.push(compiledOffer);
  }

  for (const lookupKey of lookupKeys) {
    for (const compiledOffer of offerIndex.byLookupKey.get(lookupKey) ?? []) {
      const offerId = String(compiledOffer.offer.id || "");
      if (seenOfferIds.has(offerId)) continue;
      seenOfferIds.add(offerId);
      candidateOffers.push(compiledOffer);
    }
  }

  for (const compiledOffer of offerIndex.largePoolOffers) {
    const offerId = String(compiledOffer.offer.id || "");
    if (seenOfferIds.has(offerId)) continue;
    if (!lineMatchesCompiledOfferSelection(productId, variantId, compiledOffer)) {
      continue;
    }
    seenOfferIds.add(offerId);
    candidateOffers.push(compiledOffer);
  }

  return candidateOffers;
};
