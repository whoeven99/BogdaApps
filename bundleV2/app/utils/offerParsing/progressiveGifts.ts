import {
  sanitizeSingleLineText,
  parseNonNegativeNumberOrNull,
  OFFER_TEXT_LIMITS,
} from "./sanitize";

export type ProgressiveGiftType = "free_shipping";

export type ProgressiveGiftUnlockMode = "tier_index" | "at_count";

export type ProgressiveGift = {
  id: string;
  type: ProgressiveGiftType;
  title: string;
  subtitle: string;
  imageUrl: string;
  unlockMode: ProgressiveGiftUnlockMode;
  /** 与店面前台 Bar 序号一致（1-based）：quantity-breaks 含"Single"为 Bar#1 */
  unlockTierIndex: number;
  /** unlockMode === at_count 时使用：购物车行数量达到该值即视为解锁 */
  unlockAtCount: number;
  /**
   * 免邮排除规则（可选）：仅当配送选项标价 amount（与结算货币一致）<= 该值时才应用 100% 折扣。
   * null/undefined 表示不限制（所有已解锁场景下的适用配送方式均可免邮）。
   */
  freeShippingMaxRateAmount: number | null;
};

export type ProgressiveGiftsConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  layout: "vertical" | "horizontal" | "card" | "compact";
  hideGiftsUntilUnlocked: boolean;
  showLabelsForLockedGifts: boolean;
  gifts: ProgressiveGift[];
};

export const PROGRESSIVE_GIFTS_LINE_PROPERTY_TIER = "__ciwi_bundle_tier";
export const PROGRESSIVE_GIFTS_LINE_PROPERTY_OFFER_ID = "__ciwi_bundle_offer_id";

export const DEFAULT_PROGRESSIVE_GIFTS: ProgressiveGiftsConfig = {
  enabled: false,
  title: "Progressive gifts",
  subtitle: "",
  layout: "vertical",
  hideGiftsUntilUnlocked: false,
  showLabelsForLockedGifts: true,
  gifts: [],
};

const MAX_PROGRESSIVE_GIFTS = 12;

function randomGiftId(): string {
  return `gift_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function parseProgressiveGiftsConfig(
  raw: unknown,
): ProgressiveGiftsConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_PROGRESSIVE_GIFTS };
  }
  const o = raw as Record<string, unknown>;
  const layoutRaw = String(o.layout ?? "").trim();
  const layout: ProgressiveGiftsConfig["layout"] = [
    "vertical",
    "horizontal",
    "card",
    "compact",
  ].includes(layoutRaw)
    ? (layoutRaw as ProgressiveGiftsConfig["layout"])
    : "vertical";

  const giftsIn = Array.isArray(o.gifts) ? o.gifts : [];
  const gifts: ProgressiveGift[] = [];
  for (const item of giftsIn) {
    if (gifts.length >= MAX_PROGRESSIVE_GIFTS) break;
    if (!item || typeof item !== "object") continue;
    const g = item as Record<string, unknown>;
    const type = String(g.type ?? "").trim();
    if (type !== "free_shipping") continue;

    const unlockModeRaw = String(g.unlockMode ?? "tier_index").trim();
    const unlockMode: ProgressiveGiftUnlockMode =
      unlockModeRaw === "at_count" ? "at_count" : "tier_index";

    let unlockTierIndex = Math.trunc(Number(g.unlockTierIndex));
    if (!Number.isFinite(unlockTierIndex) || unlockTierIndex < 1) unlockTierIndex = 1;

    let unlockAtCount = Math.trunc(Number(g.unlockAtCount));
    if (!Number.isFinite(unlockAtCount) || unlockAtCount < 1) unlockAtCount = 1;

    const maxRate = parseNonNegativeNumberOrNull(g.freeShippingMaxRateAmount);

    const idRaw = String(g.id ?? "").trim();
    const id = idRaw || randomGiftId();

    gifts.push({
      id,
      type: "free_shipping",
      title: sanitizeSingleLineText(g.title, 120, "Free shipping"),
      subtitle: sanitizeSingleLineText(g.subtitle, 200, ""),
      imageUrl: sanitizeSingleLineText(g.imageUrl, 2048, ""),
      unlockMode,
      unlockTierIndex,
      unlockAtCount,
      freeShippingMaxRateAmount: maxRate,
    });
  }

  return {
    enabled: !!o.enabled,
    title: sanitizeSingleLineText(o.title, OFFER_TEXT_LIMITS.widgetTitle, DEFAULT_PROGRESSIVE_GIFTS.title),
    subtitle: sanitizeSingleLineText(o.subtitle, 200, ""),
    layout,
    hideGiftsUntilUnlocked: !!o.hideGiftsUntilUnlocked,
    showLabelsForLockedGifts: o.showLabelsForLockedGifts !== false,
    gifts,
  };
}

/** 写入 DB / metafield 前剔除多余字段，保持 schema 稳定 */
export function progressiveGiftsConfigToStorableJson(
  cfg: ProgressiveGiftsConfig,
): ProgressiveGiftsConfig {
  return parseProgressiveGiftsConfig(cfg as unknown as Record<string, unknown>);
}

export function parseProgressiveGiftsFromOfferSettingsJson(
  offerSettingsJson?: string | null,
): ProgressiveGiftsConfig {
  if (!offerSettingsJson) return { ...DEFAULT_PROGRESSIVE_GIFTS };
  try {
    const parsed = JSON.parse(offerSettingsJson) as Record<string, unknown>;
    return parseProgressiveGiftsConfig(parsed.progressiveGifts);
  } catch {
    return { ...DEFAULT_PROGRESSIVE_GIFTS };
  }
}

/** 判断某个赠品在当前"档位位置 / 数量"下是否已解锁（店面前台与预览共用同一规则） */
export function isProgressiveGiftUnlocked(
  gift: ProgressiveGift,
  selectedBarIndex: number,
  lineQuantity: number,
): boolean {
  if (gift.unlockMode === "at_count") {
    const need = Math.max(1, Math.trunc(gift.unlockAtCount || 1));
    return Math.max(1, Math.trunc(lineQuantity)) >= need;
  }
  const needBar = Math.max(1, Math.trunc(gift.unlockTierIndex || 1));
  return Math.max(1, Math.trunc(selectedBarIndex)) >= needBar;
}
