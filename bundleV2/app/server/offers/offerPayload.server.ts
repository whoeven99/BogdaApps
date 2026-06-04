import type { OfferListItem } from "../../routes/_index/types";
import type { StoreProductItem } from "../shopify/products.server";
import {
  buildPersistedOfferFieldsFromCampaignConfig,
  isOfferPublishedForBundleMetafieldSync,
  parseCampaignConfig,
  parseCompleteBundleConfig,
  parseDifferentProductsDiscountRules,
  parseFreeGiftRules,
  parseFreeGiftSelectedProducts,
  parseSelectedProductIds,
  resolveOfferTypeFromCampaignConfig,
  trimDiscountRulesJsonForFunction,
  trimOfferSettingsJsonForFunction,
  trimSelectedProductsJsonForFunction,
} from "../../utils/offerParsing";
import { fetchStoreProducts } from "../shopify/products.server";

type AdminType = {
  graphql: (query: string, opts?: { variables?: unknown }) => Promise<{ json: () => Promise<unknown> }>;
};

export type OfferRuntimeSyncData = {
  offerType: string;
  selectedProductsJson: string | null;
  storefrontSelectedProductsJson: string | null;
  discountRulesJson: string | null;
  offerSettingsJson: string | null;
  referencedProductIds: string[];
  storefrontHydration: "none" | "complete-bundle" | "quantity-breaks-different";
};

function slimVariantsForStorefront(
  variants: StoreProductItem["variants"] | undefined,
): Array<{ id: string; price: string; selectedOptions: Array<{ name: string; value: string }> }> {
  if (!Array.isArray(variants)) return [];
  return variants
    .filter((v) => v && typeof v === "object" && v.id)
    .map((v) => ({
      id: String(v.id),
      price: String(v.price ?? ""),
      selectedOptions: Array.isArray(v.selectedOptions)
        ? v.selectedOptions
            .filter((opt) => opt && typeof opt === "object")
            .map((opt) => ({ name: String(opt.name ?? ""), value: String(opt.value ?? "") }))
        : [],
    }));
}

function slimVariantsFromStoredShape(
  raw: unknown,
): Array<{ id: string; price: string; selectedOptions: Array<{ name: string; value: string }> }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v) => v && typeof v === "object" && (v as { id?: unknown }).id)
    .map((v) => {
      const vObj = v as { id?: unknown; price?: unknown; selectedOptions?: unknown };
      const selectedOptions = Array.isArray(vObj.selectedOptions)
        ? (vObj.selectedOptions as Array<{ name?: unknown; value?: unknown }>)
            .filter((opt) => opt && typeof opt === "object")
            .map((opt) => ({ name: String(opt.name ?? ""), value: String(opt.value ?? "") }))
        : [];
      return { id: String(vObj.id ?? ""), price: String(vObj.price ?? ""), selectedOptions };
    })
    .filter((row) => row.id);
}

function buildHydratedCompleteBundleJson(
  selectedProductsJson: string | null | undefined,
  storeProductMap: Map<string, StoreProductItem>,
): string | null {
  if (!selectedProductsJson) return null;
  const config = parseCompleteBundleConfig(selectedProductsJson);
  if (!config.bars.length) return selectedProductsJson;

  const bars = config.bars.map((bar) => ({
    ...bar,
    products: (bar.products || []).map((product) => {
      const hit = storeProductMap.get(String(product.productId || ""));
      if (!hit) {
        return {
          ...product,
          variants: slimVariantsFromStoredShape(product.variants),
        };
      }
      const variants = Array.isArray(hit.variants) ? hit.variants : [];
      const preferredVariantId = String(product.selectedVariantId || "");
      const selectedVariant =
        variants.find((v) => String(v.id) === preferredVariantId) || variants[0];
      return {
        productId: product.productId,
        handle: hit.handle || product.handle || "",
        title: hit.name || product.title || "",
        image: hit.image || product.image || "",
        price: selectedVariant?.price || product.price || hit.price || "",
        defaultVariantId: String(variants[0]?.id || product.defaultVariantId || ""),
        selectedVariantId: String(
          selectedVariant?.id || product.selectedVariantId || variants[0]?.id || "",
        ),
        selectionMode: product.selectionMode === "variant" ? "variant" : "product",
        selectedOptions:
          product.selectedOptions && Object.keys(product.selectedOptions).length > 0
            ? product.selectedOptions
            : Object.fromEntries(
                (selectedVariant?.selectedOptions || []).map((opt) => [opt.name, opt.value]),
              ),
        pricing: product.pricing ?? { mode: "full_price" as const, value: 0 },
        variants: slimVariantsForStorefront(variants),
      };
    }),
  }));

  return JSON.stringify({ triggerProductIds: config.triggerProductIds ?? [], bars });
}

function buildHydratedDifferentProductsJson(
  selectedProductsJson: string | null | undefined,
  discountRulesJson: string | null | undefined,
  storeProductMap: Map<string, StoreProductItem>,
): string | null {
  const referencedIds = Array.from(
    new Set([
      ...parseSelectedProductIds(selectedProductsJson),
      ...parseDifferentProductsDiscountRules(discountRulesJson).flatMap((rule) => [
        ...(Array.isArray(rule.buyProductIds) ? rule.buyProductIds : []),
        ...(Array.isArray(rule.getProductIds) ? rule.getProductIds : []),
      ]),
    ]),
  );

  if (!referencedIds.length) return selectedProductsJson ?? null;

  const hydratedCatalog = referencedIds
    .map((productId) => {
      const hit = storeProductMap.get(String(productId || ""));
      if (!hit) return null;
      const firstVariant = Array.isArray(hit.variants) ? hit.variants[0] : null;
      return {
        id: hit.id,
        handle: hit.handle || "",
        title: hit.name || "",
        image: hit.image || "",
        price: firstVariant?.price || hit.price || "",
        selectedVariantId: String(firstVariant?.id || ""),
        variants: slimVariantsForStorefront(Array.isArray(hit.variants) ? hit.variants : undefined),
      };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.id));

  return hydratedCatalog.length > 0 ? JSON.stringify(hydratedCatalog) : (selectedProductsJson ?? null);
}

function parseBxgySelectedProductIds(selectedProductsJson?: string | null): string[] {
  if (!selectedProductsJson) return [];
  try {
    const parsed = JSON.parse(selectedProductsJson) as { buyProducts?: unknown; getProducts?: unknown };
    return [
      ...(Array.isArray(parsed.buyProducts) ? parsed.buyProducts : []),
      ...(Array.isArray(parsed.getProducts) ? parsed.getProducts : []),
    ]
      .map((id) => String(id || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function collectLegacyReferencedProductIds(offer: OfferListItem): string[] {
  const effectiveOfferType = resolveOfferTypeFromCampaignConfig({
    offerType: offer.offerType,
    campaignConfigJson: offer.campaignConfigJson,
  });

  if (effectiveOfferType === "complete-bundle") {
    const config = parseCompleteBundleConfig(offer.selectedProductsJson);
    return Array.from(
      new Set(
        config.bars.flatMap((bar) =>
          (bar.products || []).map((p) => String(p.productId || "").trim()),
        ),
      ),
    ).filter(Boolean);
  }

  if (effectiveOfferType === "quantity-breaks-different") {
    const selectedIds = parseSelectedProductIds(offer.selectedProductsJson);
    const ruleIds = parseDifferentProductsDiscountRules(offer.discountRulesJson).flatMap((rule) => [
      ...(Array.isArray(rule.buyProductIds) ? rule.buyProductIds : []),
      ...(Array.isArray(rule.getProductIds) ? rule.getProductIds : []),
    ]);
    return Array.from(new Set([...selectedIds, ...ruleIds])).filter(Boolean);
  }

  return Array.from(
    new Set(
      effectiveOfferType === "bxgy"
        ? parseBxgySelectedProductIds(offer.selectedProductsJson)
        : effectiveOfferType === "free-gift"
          ? [
              ...parseFreeGiftSelectedProducts(offer.selectedProductsJson).triggerProducts,
              ...parseFreeGiftSelectedProducts(offer.selectedProductsJson).giftProducts,
              ...parseFreeGiftRules(offer.discountRulesJson).flatMap((rule) =>
                Array.isArray(rule.giftProductIds) ? rule.giftProductIds : [],
              ),
            ]
          : parseSelectedProductIds(offer.selectedProductsJson),
    ),
  ).filter(Boolean);
}

export function compileOfferRuntimeSyncData(offer: OfferListItem): OfferRuntimeSyncData {
  const parsedCampaignConfig = parseCampaignConfig(offer.campaignConfigJson);
  if (parsedCampaignConfig) {
    const persistedFields = buildPersistedOfferFieldsFromCampaignConfig(
      parsedCampaignConfig,
      offer.offerSettingsJson,
    );
    return {
      offerType: persistedFields.offerType,
      selectedProductsJson: persistedFields.selectedProductsJsonForFunction,
      storefrontSelectedProductsJson: persistedFields.selectedProductsJson,
      discountRulesJson: persistedFields.discountRulesJson,
      offerSettingsJson: persistedFields.offerSettingsJson,
      referencedProductIds: persistedFields.referencedProductIds,
      storefrontHydration: persistedFields.storefrontHydration,
    };
  }

  const effectiveOfferType = resolveOfferTypeFromCampaignConfig({
    offerType: offer.offerType,
    campaignConfigJson: offer.campaignConfigJson,
  });

  return {
    offerType: effectiveOfferType,
    selectedProductsJson: trimSelectedProductsJsonForFunction(effectiveOfferType, offer.selectedProductsJson),
    storefrontSelectedProductsJson: offer.selectedProductsJson ?? null,
    discountRulesJson: offer.discountRulesJson ?? null,
    offerSettingsJson: offer.offerSettingsJson ?? null,
    referencedProductIds: collectLegacyReferencedProductIds(offer),
    storefrontHydration:
      effectiveOfferType === "complete-bundle"
        ? "complete-bundle"
        : effectiveOfferType === "quantity-breaks-different"
          ? "quantity-breaks-different"
          : "none",
  };
}

export function collectReferencedProductIds(offers: OfferListItem[]): string[] {
  const ids = new Set<string>();
  for (const offer of offers) {
    for (const productId of compileOfferRuntimeSyncData(offer).referencedProductIds) {
      const normalized = String(productId || "").trim();
      if (normalized) ids.add(normalized);
    }
  }
  return Array.from(ids);
}

export async function buildCompactOffersPayload(shopOffers: OfferListItem[]): Promise<string> {
  const activeOffers = shopOffers.filter(isOfferPublishedForBundleMetafieldSync);
  const compactOffers = activeOffers.map((offer) => {
    const runtimeSyncData = compileOfferRuntimeSyncData(offer);
    return {
      id: offer.id,
      cartTitle: offer.cartTitle,
      status: offer.status,
      startTime: offer.startTime,
      endTime: offer.endTime,
      selectedProductsJson: runtimeSyncData.selectedProductsJson,
      discountRulesJson: trimDiscountRulesJsonForFunction(runtimeSyncData.discountRulesJson),
      offerSettingsJson: trimOfferSettingsJsonForFunction(runtimeSyncData.offerSettingsJson),
      offerType: runtimeSyncData.offerType,
    };
  });
  return JSON.stringify({ updatedAt: new Date().toISOString(), offers: compactOffers });
}

export async function buildStorefrontOffersStructured(
  admin: AdminType,
  shopOffers: OfferListItem[],
): Promise<{ updatedAt: string; offers: unknown[] }> {
  const activeOffers = shopOffers.filter(isOfferPublishedForBundleMetafieldSync);
  const compiledActiveOffers = activeOffers.map((offer) => ({
    offer,
    runtimeSyncData: compileOfferRuntimeSyncData(offer),
  }));

  const storefrontCatalogProductIds = collectReferencedProductIds(
    compiledActiveOffers
      .filter(
        ({ runtimeSyncData }) =>
          runtimeSyncData.storefrontHydration === "complete-bundle" ||
          runtimeSyncData.storefrontHydration === "quantity-breaks-different",
      )
      .map(({ offer }) => offer),
  );

  const storeProducts =
    storefrontCatalogProductIds.length > 0
      ? await fetchStoreProducts(admin, storefrontCatalogProductIds)
      : [];
  const storeProductMap = new Map(storeProducts.map((p) => [String(p.id || ""), p]));

  const offers = compiledActiveOffers
    .map(({ offer, runtimeSyncData }) => {
      const id = String(offer.id || "").trim();
      if (!id) return null;
      const hydrationMode = runtimeSyncData.storefrontHydration;
      const effectiveOfferType =
        runtimeSyncData.offerType ||
        resolveOfferTypeFromCampaignConfig({ offerType: offer.offerType });

      return {
        id,
        name: offer.name,
        cartTitle: offer.cartTitle,
        status: offer.status,
        startTime: offer.startTime,
        endTime: offer.endTime,
        discountRulesJson: runtimeSyncData.discountRulesJson,
        offerSettingsJson: runtimeSyncData.offerSettingsJson,
        offerType: effectiveOfferType,
        selectedProductsJson:
          hydrationMode === "complete-bundle"
            ? buildHydratedCompleteBundleJson(
                runtimeSyncData.storefrontSelectedProductsJson,
                storeProductMap,
              )
            : hydrationMode === "quantity-breaks-different"
              ? buildHydratedDifferentProductsJson(
                  runtimeSyncData.storefrontSelectedProductsJson,
                  runtimeSyncData.discountRulesJson,
                  storeProductMap,
                )
              : runtimeSyncData.storefrontSelectedProductsJson,
      };
    })
    .filter((o): o is NonNullable<typeof o> => Boolean(o));

  return { updatedAt: new Date().toISOString(), offers };
}
