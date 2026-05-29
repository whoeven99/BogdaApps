import { describe, expect, it } from "vitest";

import {
  buildBxgyDiscountRulesJson,
  buildDifferentProductsDiscountRulesJson,
  buildFreeGiftRulesJson,
  buildLegacyFieldsFromCampaignConfig,
  compileCampaignRuntimeOutputs,
  migrateLegacyOfferToCampaignConfig,
  normalizeBxgyRules,
  normalizeDifferentProductsDiscountRules,
  normalizeFreeGiftRules,
  parseCampaignConfig,
  type CampaignConfig,
} from "./offerParsing";

function buildBaseCampaignConfig(params: {
  scopeProductIds: string[];
  logicBlocks: CampaignConfig["logicBlocks"];
  logicBlockRef?: string;
}): CampaignConfig {
  return {
    version: 1,
    scope: {
      productIds: params.scopeProductIds,
      markets: ["all"],
      customerSegments: ["all"],
      customerProfileFilters: [],
      ipCountryCodes: [],
    },
    logicBlocks: params.logicBlocks,
    displayBlocks: [
      {
        id: "display-offer-card",
        type: "offer-card",
        logicBlockRef: params.logicBlockRef ?? params.logicBlocks[0]?.id ?? "logic-primary",
        config: {
          title: "Bundle & Save",
          layoutFormat: "vertical",
          accentColor: "#008060",
          cardBackgroundColor: "#ffffff",
          borderColor: "#dfe3e8",
          labelColor: "#ffffff",
          titleFontSize: 14,
          titleFontWeight: "600",
          titleColor: "#111111",
          buttonText: "Add to Cart",
          buttonPrimaryColor: "#008060",
          showCustomButton: true,
        },
      },
    ],
    settings: {
      status: true,
      startTime: "2026-01-01T00:00:00.000Z",
      endTime: "",
      scheduleTimezone: "UTC",
      totalBudget: null,
      dailyBudget: null,
      usageLimitPerCustomer: "unlimited",
      compositionBarOrder: undefined,
      checkboxUpsellsEnabled: false,
      checkboxUpsellsTitle: "Add this offer to my order",
      checkboxUpsellsSubtitle: "Customers can opt in before adding the bundle.",
      checkboxUpsellsDefaultChecked: false,
      stickyAddToCartEnabled: false,
      stickyAddToCartTitle: "Ready to add this offer?",
      stickyAddToCartSubtitle:
        "Keep the bundle CTA visible while customers compare options.",
      stickyAddToCartButtonText: "Add bundle",
      couponEnabled: false,
      couponCode: "",
    },
  };
}

describe("offerParsing regression coverage", () => {
  it("uses the primary module when backfilling legacy selectedProductsJson and discountRulesJson", () => {
    const config = buildBaseCampaignConfig({
      scopeProductIds: ["trigger-1"],
      logicBlocks: [
        {
          id: "logic-free-gift",
          type: "free-gift",
          config: {
            triggerProductIds: ["trigger-1"],
            giftProductIds: ["gift-1"],
            tiers: [
              {
                id: "gift-rule-1",
                count: 2,
                giftQuantity: 1,
                title: "Free gift",
                subtitle: "",
                badge: "",
                isDefault: true,
              },
            ],
          },
        },
        {
          id: "logic-quantity-breaks",
          type: "quantity-breaks",
          config: {
            tiers: [
              {
                id: "discount-rule-1",
                qty: 3,
                discountPercent: 10,
                title: "Save 10%",
                subtitle: "",
                badge: "",
                isDefault: true,
              },
            ],
          },
        },
      ],
      logicBlockRef: "logic-free-gift",
    });

    const legacyFields = buildLegacyFieldsFromCampaignConfig(config);

    expect(legacyFields.offerType).toBe("free-gift");
    expect(JSON.parse(legacyFields.selectedProductsJson || "null")).toEqual({
      triggerProducts: ["trigger-1"],
      giftProducts: ["gift-1"],
    });
    expect(JSON.parse(legacyFields.discountRulesJson || "[]")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "gift-rule-1",
          count: 2,
          giftQuantity: 1,
        }),
      ]),
    );
  });

  it("builds quantity-breaks-different legacy selectedProductsJson from the shared pool ids", () => {
    const config = buildBaseCampaignConfig({
      scopeProductIds: ["scope-trigger-only"],
      logicBlocks: [
        {
          id: "logic-quantity-breaks-different",
          type: "quantity-breaks-different",
          config: {
            tiers: [
              {
                id: "different-rule-1",
                count: 3,
                discountPercent: 20,
                buyQuantity: 3,
                getQuantity: 0,
                buyProductIds: ["shared-1", "shared-2"],
                getProductIds: [],
                maxUsesPerOrder: 1,
                tierType: "simple",
                title: "Mix any 3",
                subtitle: "",
                badge: "",
                isDefault: true,
              },
            ],
          },
        },
      ],
    });

    const runtimeOutputs = compileCampaignRuntimeOutputs(config);

    expect(runtimeOutputs.primaryOfferType).toBe("quantity-breaks-different");
    expect(JSON.parse(runtimeOutputs.primaryModule?.selectedProductsJson || "null")).toEqual({
      productIds: ["shared-1", "shared-2"],
    });
    expect(runtimeOutputs.primaryModule?.referencedProductIds).toEqual([
      "shared-1",
      "shared-2",
    ]);
  });

  it("preserves richer shipping discount semantics when migrating legacy rules", () => {
    const migrated = migrateLegacyOfferToCampaignConfig({
      offerType: "shipping-discount",
      selectedProductsJson: JSON.stringify([{ id: "trigger-1" }]),
      discountRulesJson: JSON.stringify([
        {
          id: "shipping-rule-1",
          count: 2,
          discountPercent: 100,
          title: "Free shipping",
          subtitle: "",
          badge: "",
          isDefault: true,
          discountClass: "shipping",
          offerKind: "free_shipping",
          conditionType: "cart_amount",
          amountThreshold: 50,
          rewardType: "free_shipping",
        },
      ]),
      offerSettingsJson: JSON.stringify({
        markets: "all",
        customerSegments: "all",
      }),
      startTime: "2026-01-01T00:00:00.000Z",
      endTime: "",
      status: true,
    });

    const quantityBreaksBlock = migrated.logicBlocks[0];
    expect(quantityBreaksBlock?.type).toBe("quantity-breaks");
    if (quantityBreaksBlock?.type !== "quantity-breaks") {
      throw new Error("Expected quantity-breaks block");
    }

    const migratedShippingTier = quantityBreaksBlock.config.tiers.find(
      (tier) => tier.id === "shipping-rule-1",
    );

    expect(migratedShippingTier).toEqual(
      expect.objectContaining({
        id: "shipping-rule-1",
        discountClass: "shipping",
        offerKind: "free_shipping",
        conditionType: "cart_amount",
        amountThreshold: 50,
        rewardType: "free_shipping",
      }),
    );
  });

  it("keeps free-gift root scope limited to trigger products during legacy migration", () => {
    const migrated = migrateLegacyOfferToCampaignConfig({
      offerType: "free-gift",
      selectedProductsJson: JSON.stringify({
        triggerProducts: ["trigger-1"],
        giftProducts: ["gift-1"],
      }),
      discountRulesJson: JSON.stringify([
        {
          id: "free-gift-rule-1",
          count: 2,
          giftQuantity: 1,
          title: "",
          subtitle: "",
          badge: "",
          isDefault: true,
        },
      ]),
      startTime: "2026-01-01T00:00:00.000Z",
      endTime: "",
      status: true,
    });

    expect(migrated.scope.productIds).toEqual(["trigger-1"]);
    const freeGiftBlock = migrated.logicBlocks[0];
    expect(freeGiftBlock?.type).toBe("free-gift");
    if (freeGiftBlock?.type !== "free-gift") {
      throw new Error("Expected free-gift block");
    }
    expect(freeGiftBlock.config.giftProductIds).toEqual(["gift-1"]);
  });

  it("keeps complete-bundle root scope limited to trigger products during legacy migration", () => {
    const migrated = migrateLegacyOfferToCampaignConfig({
      offerType: "complete-bundle",
      selectedProductsJson: JSON.stringify({
        triggerProductIds: ["trigger-1"],
        bars: [
          {
            id: "bundle-bar-1",
            type: "quantity-break-same",
            title: "Bundle",
            subtitle: "",
            badge: "",
            isDefault: true,
            quantity: 2,
            pricing: { mode: "percentage_off", value: 10 },
            products: [
              {
                productId: "bundle-item-1",
                pricing: { mode: "full_price", value: 0 },
              },
              {
                productId: "bundle-item-2",
                pricing: { mode: "full_price", value: 0 },
              },
            ],
          },
        ],
      }),
      startTime: "2026-01-01T00:00:00.000Z",
      endTime: "",
      status: true,
    });

    expect(migrated.scope.productIds).toEqual(["trigger-1"]);
    const completeBundleBlock = migrated.logicBlocks[0];
    expect(completeBundleBlock?.type).toBe("complete-bundle");
    if (completeBundleBlock?.type !== "complete-bundle") {
      throw new Error("Expected complete-bundle block");
    }
    const migratedBundleBar = completeBundleBlock.config.bars.find(
      (bar) => bar.id === "bundle-bar-1",
    );
    expect(migratedBundleBar?.products.map((product) => product.productId)).toEqual([
      "bundle-item-1",
      "bundle-item-2",
    ]);
  });

  it("keeps primary module selectedProductsJson stable when additional complete-bundle exists", () => {
    const config = buildBaseCampaignConfig({
      scopeProductIds: ["trigger-1"],
      logicBlocks: [
        {
          id: "logic-quantity-breaks",
          type: "quantity-breaks",
          config: {
            tiers: [
              {
                id: "discount-rule-1",
                qty: 2,
                discountPercent: 10,
                title: "Save 10%",
                subtitle: "",
                badge: "",
                isDefault: true,
              },
            ],
          },
        },
        {
          id: "logic-complete-bundle",
          type: "complete-bundle",
          config: {
            triggerProductIds: ["trigger-1"],
            bars: [
              {
                id: "bundle-bar-1",
                type: "quantity-break-same",
                title: "Bundle",
                subtitle: "",
                badge: "",
                isDefault: true,
                quantity: 2,
                pricing: { mode: "percentage_off", value: 10 },
                products: [
                  {
                    productId: "bundle-item-1",
                    pricing: { mode: "full_price", value: 0 },
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    const legacyFields = buildLegacyFieldsFromCampaignConfig(config);

    expect(legacyFields.offerType).toBe("quantity-breaks-same");
    expect(JSON.parse(legacyFields.selectedProductsJson || "null")).toEqual([
      { id: "trigger-1" },
    ]);
  });

  it("preserves same-count quantity tiers with different semantics when parsing campaign config", () => {
    const parsed = parseCampaignConfig(
      JSON.stringify({
        version: 1,
        scope: {
          productIds: ["trigger-1"],
          markets: ["all"],
          customerSegments: ["all"],
          customerProfileFilters: [],
          ipCountryCodes: [],
        },
        logicBlocks: [
          {
            id: "logic-quantity-breaks",
            type: "quantity-breaks",
            config: {
              tiers: [
                {
                  qty: 2,
                  discountPercent: 10,
                  title: "Save 10%",
                  rewardType: "percentage_off",
                },
                {
                  qty: 2,
                  discountPercent: 100,
                  title: "Free shipping",
                  discountClass: "shipping",
                  offerKind: "free_shipping",
                  conditionType: "cart_amount",
                  amountThreshold: 50,
                  rewardType: "free_shipping",
                },
              ],
            },
          },
        ],
        displayBlocks: [
          {
            id: "display-offer-card",
            type: "offer-card",
            logicBlockRef: "logic-quantity-breaks",
            config: {
              title: "Bundle & Save",
              layoutFormat: "vertical",
              accentColor: "#008060",
              cardBackgroundColor: "#ffffff",
              borderColor: "#dfe3e8",
              labelColor: "#ffffff",
              titleFontSize: 14,
              titleFontWeight: "600",
              titleColor: "#111111",
              buttonText: "Add to Cart",
              buttonPrimaryColor: "#008060",
              showCustomButton: true,
            },
          },
        ],
        settings: {
          status: true,
          startTime: "2026-01-01T00:00:00.000Z",
          endTime: "",
          totalBudget: null,
          dailyBudget: null,
          usageLimitPerCustomer: "unlimited",
          checkboxUpsellsEnabled: false,
          checkboxUpsellsTitle: "Add this offer to my order",
          checkboxUpsellsSubtitle: "Customers can opt in before adding the bundle.",
          checkboxUpsellsDefaultChecked: false,
          stickyAddToCartEnabled: false,
          stickyAddToCartTitle: "Ready to add this offer?",
          stickyAddToCartSubtitle:
            "Keep the bundle CTA visible while customers compare options.",
          stickyAddToCartButtonText: "Add bundle",
          couponEnabled: false,
          couponCode: "",
        },
      }),
    );

    expect(parsed).not.toBeNull();
    const quantityBreaksBlock = parsed?.logicBlocks[0];
    expect(quantityBreaksBlock?.type).toBe("quantity-breaks");
    if (quantityBreaksBlock?.type !== "quantity-breaks") {
      throw new Error("Expected quantity-breaks block");
    }

    expect(quantityBreaksBlock.config.tiers).toHaveLength(2);
    expect(
      quantityBreaksBlock.config.tiers.map((tier) => ({
        title: tier.title,
        rewardType: tier.rewardType,
      })),
    ).toEqual(
      expect.arrayContaining([
        { title: "Save 10%", rewardType: "percentage_off" },
        { title: "Free shipping", rewardType: "free_shipping" },
      ]),
    );
  });

  it("keeps BXGY default selection stable by rule id when multiple rules share the same count", () => {
    const normalized = normalizeBxgyRules([
      {
        id: "bxgy-single",
        count: 0,
        buyQuantity: 0,
        getQuantity: 0,
        buyProductIds: [],
        getProductIds: [],
        discountPercent: 0,
        maxUsesPerOrder: 1,
        tierType: "single",
        title: "Single",
        subtitle: "Standard price",
        badge: "",
        isDefault: false,
      },
      {
        id: "bxgy-rule-a",
        count: 2,
        buyQuantity: 2,
        getQuantity: 1,
        buyProductIds: ["buy-1"],
        getProductIds: ["gift-a"],
        discountPercent: 100,
        maxUsesPerOrder: 1,
        tierType: "bxgy",
        title: "Gift A",
        subtitle: "",
        badge: "",
        isDefault: false,
      },
      {
        id: "bxgy-rule-b",
        count: 2,
        buyQuantity: 2,
        getQuantity: 1,
        buyProductIds: ["buy-1"],
        getProductIds: ["gift-b"],
        discountPercent: 100,
        maxUsesPerOrder: 1,
        tierType: "bxgy",
        title: "Gift B",
        subtitle: "",
        badge: "",
        isDefault: true,
      },
    ]);

    expect(normalized.find((rule) => rule.id === "bxgy-rule-a")?.isDefault).toBe(false);
    expect(normalized.find((rule) => rule.id === "bxgy-rule-b")?.isDefault).toBe(true);
  });

  it("keeps different-products default selection stable by rule id when multiple rules share the same count", () => {
    const normalized = normalizeDifferentProductsDiscountRules([
      {
        id: "different-products-single",
        count: 0,
        buyQuantity: 0,
        getQuantity: 0,
        buyProductIds: [],
        getProductIds: [],
        discountPercent: 0,
        maxUsesPerOrder: 1,
        tierType: "single",
        title: "Single",
        subtitle: "Standard price",
        badge: "",
        isDefault: false,
      },
      {
        id: "different-rule-a",
        count: 3,
        buyQuantity: 3,
        getQuantity: 0,
        buyProductIds: ["pool-a"],
        getProductIds: [],
        discountPercent: 15,
        maxUsesPerOrder: 1,
        tierType: "simple",
        title: "Mix from pool A",
        subtitle: "",
        badge: "",
        isDefault: false,
      },
      {
        id: "different-rule-b",
        count: 3,
        buyQuantity: 3,
        getQuantity: 0,
        buyProductIds: ["pool-b"],
        getProductIds: [],
        discountPercent: 10,
        maxUsesPerOrder: 1,
        tierType: "simple",
        title: "Mix from pool B",
        subtitle: "",
        badge: "",
        isDefault: true,
      },
    ]);

    expect(normalized.find((rule) => rule.id === "different-rule-a")?.isDefault).toBe(false);
    expect(normalized.find((rule) => rule.id === "different-rule-b")?.isDefault).toBe(true);
  });

  it("keeps free-gift default selection stable by rule id when multiple rules share the same count", () => {
    const normalized = normalizeFreeGiftRules([
      {
        id: "free-gift-single",
        count: 0,
        giftQuantity: 0,
        giftProductIds: [],
        tierType: "single",
        title: "Single",
        subtitle: "Standard price",
        badge: "",
        isDefault: false,
      },
      {
        id: "free-gift-rule-a",
        count: 2,
        giftQuantity: 1,
        giftProductIds: ["gift-a"],
        title: "Gift A",
        subtitle: "",
        badge: "",
        isDefault: false,
      },
      {
        id: "free-gift-rule-b",
        count: 2,
        giftQuantity: 2,
        giftProductIds: ["gift-b"],
        title: "Gift B",
        subtitle: "",
        badge: "",
        isDefault: true,
      },
    ]);

    expect(normalized.find((rule) => rule.id === "free-gift-rule-a")?.isDefault).toBe(false);
    expect(normalized.find((rule) => rule.id === "free-gift-rule-b")?.isDefault).toBe(true);
  });

  it("preserves BXGY rules with the same count but different semantics when building legacy json", () => {
    const built = buildBxgyDiscountRulesJson([
      {
        id: "bxgy-rule-a",
        count: 2,
        buyQuantity: 2,
        getQuantity: 1,
        buyProductIds: ["buy-1"],
        getProductIds: ["gift-a"],
        discountPercent: 100,
        maxUsesPerOrder: 1,
        tierType: "bxgy",
        title: "Gift A",
        subtitle: "",
        badge: "",
        isDefault: false,
      },
      {
        id: "bxgy-rule-b",
        count: 2,
        buyQuantity: 2,
        getQuantity: 1,
        buyProductIds: ["buy-1"],
        getProductIds: ["gift-b"],
        discountPercent: 100,
        maxUsesPerOrder: 1,
        tierType: "bxgy",
        title: "Gift B",
        subtitle: "",
        badge: "",
        isDefault: true,
      },
    ]);

    expect(
      built.filter((rule) => rule.tierType !== "single").map((rule) => rule.id),
    ).toEqual(expect.arrayContaining(["bxgy-rule-a", "bxgy-rule-b"]));
    expect(built.filter((rule) => rule.tierType !== "single")).toHaveLength(2);
  });

  it("preserves different-products rules with the same count but different pools when building legacy json", () => {
    const built = buildDifferentProductsDiscountRulesJson([
      {
        id: "different-rule-a",
        count: 3,
        buyQuantity: 3,
        getQuantity: 0,
        buyProductIds: ["pool-a"],
        getProductIds: [],
        discountPercent: 15,
        maxUsesPerOrder: 1,
        tierType: "simple",
        title: "Pool A",
        subtitle: "",
        badge: "",
        isDefault: false,
      },
      {
        id: "different-rule-b",
        count: 3,
        buyQuantity: 3,
        getQuantity: 0,
        buyProductIds: ["pool-b"],
        getProductIds: [],
        discountPercent: 10,
        maxUsesPerOrder: 1,
        tierType: "simple",
        title: "Pool B",
        subtitle: "",
        badge: "",
        isDefault: true,
      },
    ]);

    expect(
      built.filter((rule) => rule.tierType !== "single").map((rule) => rule.id),
    ).toEqual(expect.arrayContaining(["different-rule-a", "different-rule-b"]));
    expect(built.filter((rule) => rule.tierType !== "single")).toHaveLength(2);
  });

  it("preserves free-gift rules with the same count but different rewards when building legacy json", () => {
    const built = buildFreeGiftRulesJson([
      {
        id: "free-gift-rule-a",
        count: 2,
        giftQuantity: 1,
        giftProductIds: ["gift-a"],
        title: "Gift A",
        subtitle: "",
        badge: "",
        isDefault: false,
      },
      {
        id: "free-gift-rule-b",
        count: 2,
        giftQuantity: 2,
        giftProductIds: ["gift-b"],
        title: "Gift B",
        subtitle: "",
        badge: "",
        isDefault: true,
      },
    ]);

    expect(
      built.filter((rule) => rule.tierType !== "single").map((rule) => rule.id),
    ).toEqual(expect.arrayContaining(["free-gift-rule-a", "free-gift-rule-b"]));
    expect(built.filter((rule) => rule.tierType !== "single")).toHaveLength(2);
  });
});
