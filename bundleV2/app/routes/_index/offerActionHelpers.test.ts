import { describe, expect, it } from "vitest";

import { parseCampaignConfig } from "../../utils/offerParsing";
import {
  buildOfferStatusCampaignConfigJson,
  resolveOfferPersistenceFields,
  validateOwnedOfferAccess,
} from "./offerActionHelpers";

describe("offerActionHelpers", () => {
  it("rejects update access when the offer belongs to another shop", () => {
    const result = validateOwnedOfferAccess({
      idRaw: "offer-1",
      shopName: "current-shop.myshopify.com",
      existingOffer: {
        id: "offer-1",
        shopName: "other-shop.myshopify.com",
      },
      missingIdMessage: "Missing offer ID, cannot update.",
    });

    expect(result).toEqual({
      ok: false,
      status: 404,
      message: "Offer not found.",
    });
  });

  it("rejects update access when the offer id is missing", () => {
    const result = validateOwnedOfferAccess({
      idRaw: "",
      shopName: "current-shop.myshopify.com",
      existingOffer: null,
      missingIdMessage: "Missing offer ID, cannot update.",
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: "Missing offer ID, cannot update.",
    });
  });

  it("normalizes campaignConfig persistence using the primary module instead of stale form fields", () => {
    const result = resolveOfferPersistenceFields({
      campaignConfigJsonRaw: JSON.stringify({
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
                  minQuantity: 1,
                  maxQuantity: 2,
                  quantity: 2,
                  excludeTriggerProduct: true,
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
        displayBlocks: [
          {
            id: "display-offer-card",
            type: "offer-card",
            logicBlockRef: "logic-free-gift",
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
      offerType: "quantity-breaks-same",
      selectedProductsJson: JSON.stringify([{ id: "stale-product" }]),
      discountRulesJson: JSON.stringify([{ id: "stale-rule", count: 9, discountPercent: 1 }]),
      offerSettingsJson: JSON.stringify({}),
      startTimeRaw: "2026-01-01T00:00:00.000Z",
      endTimeRaw: "",
      status: true,
      progressiveGiftsJson: JSON.stringify({ progressiveGifts: { enabled: false } }),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }

    expect(result.value.offerType).toBe("free-gift");
    expect(JSON.parse(result.value.selectedProductsJson)).toEqual({
      triggerProducts: ["trigger-1"],
      giftProducts: ["gift-1"],
    });
    expect(JSON.parse(result.value.discountRulesJson)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "gift-rule-1",
          count: 2,
          giftQuantity: 1,
        }),
      ]),
    );
  });

  it("keeps richer shipping semantics when resolving legacy persistence fields", () => {
    const result = resolveOfferPersistenceFields({
      campaignConfigJsonRaw: "",
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
      startTimeRaw: "2026-01-01T00:00:00.000Z",
      endTimeRaw: "",
      status: true,
      progressiveGiftsJson: JSON.stringify({ progressiveGifts: { enabled: false } }),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }

    const parsedCampaign = parseCampaignConfig(result.value.campaignConfigJson);
    expect(parsedCampaign).not.toBeNull();
    const quantityBreaksBlock = parsedCampaign?.logicBlocks[0];
    expect(quantityBreaksBlock?.type).toBe("quantity-breaks");
    if (quantityBreaksBlock?.type !== "quantity-breaks") {
      throw new Error("Expected quantity-breaks block");
    }

    const migratedTier = quantityBreaksBlock.config.tiers.find(
      (tier) => tier.id === "shipping-rule-1",
    );
    expect(migratedTier).toEqual(
      expect.objectContaining({
        discountClass: "shipping",
        offerKind: "free_shipping",
        conditionType: "cart_amount",
        amountThreshold: 50,
        rewardType: "free_shipping",
      }),
    );
  });

  it("rejects campaign persistence when the normalized scope has no products", () => {
    const result = resolveOfferPersistenceFields({
      campaignConfigJsonRaw: JSON.stringify({
        version: 1,
        scope: {
          productIds: [],
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
          checkboxUpsellsTitle: "",
          checkboxUpsellsSubtitle: "",
          checkboxUpsellsDefaultChecked: false,
          stickyAddToCartEnabled: false,
          stickyAddToCartTitle: "",
          stickyAddToCartSubtitle: "",
          stickyAddToCartButtonText: "",
          couponEnabled: false,
          couponCode: "",
        },
      }),
      offerType: "quantity-breaks-same",
      selectedProductsJson: "",
      discountRulesJson: "",
      offerSettingsJson: "{}",
      startTimeRaw: "2026-01-01T00:00:00.000Z",
      endTimeRaw: "",
      status: true,
      progressiveGiftsJson: JSON.stringify({ progressiveGifts: { enabled: false } }),
    });

    expect(result).toEqual({
      ok: false,
      message: "Please select at least one product.",
    });
  });

  it("patches status inside a valid campaign config", () => {
    const nextCampaignConfigJson = buildOfferStatusCampaignConfigJson({
      campaignConfigJson: JSON.stringify({
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
          checkboxUpsellsTitle: "",
          checkboxUpsellsSubtitle: "",
          checkboxUpsellsDefaultChecked: false,
          stickyAddToCartEnabled: false,
          stickyAddToCartTitle: "",
          stickyAddToCartSubtitle: "",
          stickyAddToCartButtonText: "",
          couponEnabled: false,
          couponCode: "",
        },
      }),
      nextStatus: false,
    });

    const parsedCampaign = parseCampaignConfig(nextCampaignConfigJson);
    expect(parsedCampaign?.settings.status).toBe(false);
  });

  it("falls back to shallow JSON patching when campaign config cannot be normalized", () => {
    const nextCampaignConfigJson = buildOfferStatusCampaignConfigJson({
      campaignConfigJson: JSON.stringify({
        settings: {
          status: true,
          extra: "keep-me",
        },
        extraRootField: "still-here",
      }),
      nextStatus: false,
    });

    expect(JSON.parse(nextCampaignConfigJson || "null")).toEqual({
      settings: {
        status: false,
        extra: "keep-me",
      },
      extraRootField: "still-here",
    });
  });

  it("keeps malformed campaign config payload unchanged during status patching", () => {
    const malformed = "{not-valid-json";
    const nextCampaignConfigJson = buildOfferStatusCampaignConfigJson({
      campaignConfigJson: malformed,
      nextStatus: false,
    });

    expect(nextCampaignConfigJson).toBe(malformed);
  });
});
