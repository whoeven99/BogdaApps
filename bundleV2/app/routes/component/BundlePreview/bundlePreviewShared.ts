import type { ProgressiveGiftsConfig } from "../../../utils/offerParsing";
import { isProgressiveGiftUnlocked } from "../../../utils/offerParsing";

export type LayoutFormat = "vertical" | "horizontal" | "card" | "compact";

export type PreviewItem = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  original?: string;
  featured?: boolean;
  badge?: string;
  saveLabel?: string;
};

export const PREVIEW_ITEMS: PreviewItem[] = [
  { id: "single", title: "Single", subtitle: "Standard price", price: "€65,00" },
  {
    id: "duo",
    title: "Duo",
    subtitle: "Buy more, save more",
    price: "€110,50",
    original: "€130,00",
    featured: true,
    badge: "Most Popular",
    saveLabel: "SAVE €19,50"
  },
  { id: "trio", title: "Trio", subtitle: "Extra savings", price: "€149,00", original: "€195,00", saveLabel: "SAVE €46,00" },
  { id: "pack4", title: "Pack of 4", subtitle: "Best value", price: "€185,00", original: "€260,00", saveLabel: "SAVE €75,00" },
];

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 管理端预览：阶梯赠品（免邮）区域 HTML
 * @param selectedBarIndex 当前模拟选中的 Bar 序号（1-based，与 __ciwi_bundle_tier 一致）
 * @param assumedLineQty 模拟购物车行数量（用于 at_count 解锁预览）
 */
export function renderProgressiveGiftsPreviewHtml(
  cfg: ProgressiveGiftsConfig,
  selectedBarIndex: number,
  assumedLineQty: number,
): string {
  if (!cfg.enabled || !cfg.gifts?.length) return "";

  const layout = ["vertical", "horizontal", "card", "compact"].includes(cfg.layout)
    ? cfg.layout
    : "vertical";

  const itemsHtml = cfg.gifts
    .map((gift) => {
      const unlocked = isProgressiveGiftUnlocked(gift, selectedBarIndex, assumedLineQty);
      const hidden = cfg.hideGiftsUntilUnlocked && !unlocked;
      if (hidden) return "";

      const lockLabel = unlocked ? "已解锁" : "未解锁";
      const showLock = cfg.showLabelsForLockedGifts || unlocked;
      const img = gift.imageUrl?.trim()
        ? `<div class="ciwi-progressive-gift__img-wrap"><img class="ciwi-progressive-gift__img" src="${esc(
            gift.imageUrl,
          )}" alt="" loading="lazy" /></div>`
        : "";

      const sub =
        gift.type === "free_shipping"
          ? `<div class="create-offer-style-preview-item-subtitle">${esc(
              gift.subtitle || "结账页对符合条件的运费 100% 折扣（以 Checkout 为准）",
            )}</div>`
          : "";

      return `<div class="ciwi-progressive-gift create-offer-style-preview-item${
        unlocked ? " create-offer-style-preview-item--featured" : ""
      }" data-unlocked="${unlocked ? "1" : "0"}">
        ${
          showLock
            ? `<div class="ciwi-progressive-gift__lock">${esc(lockLabel)}</div>`
            : ""
        }
        ${img || ""}
        <div class="create-offer-style-preview-item-title">${esc(gift.title)}</div>
        ${sub}
      </div>`;
    })
    .filter(Boolean)
    .join("");

  if (!itemsHtml.trim()) return "";

  return `<div class="ciwi-progressive-gifts" data-layout="${esc(layout)}">
    <div class="ciwi-progressive-gifts__head">
      <div class="ciwi-progressive-gifts__title">${esc(cfg.title)}</div>
      ${
        cfg.subtitle
          ? `<div class="ciwi-progressive-gifts__sub">${esc(cfg.subtitle)}</div>`
          : ""
      }
    </div>
    <div class="create-offer-style-preview-list create-offer-style-preview-list--${esc(layout)} ciwi-progressive-gifts__list">
      ${itemsHtml}
    </div>
    <p class="ciwi-progressive-gifts__legal">${esc(
      "产品页仅作提示；真实免邮金额以 Checkout 为准。",
    )}</p>
  </div>`;
}

export function renderBundlePreviewHtml({
  title = "Bundle & Save",
  layoutFormat = "vertical",
  accentColor = "#111111",
  cardBackgroundColor = "#ffffff",
  borderColor = "#dfe3e8",
  labelColor = "#ffffff",
  titleFontSize = 14,
  titleFontWeight = "600",
  titleColor = "#111111",
  buttonText = "Add to Cart",
  buttonPrimaryColor = "#008060",
  showCustomButton = true,
  items = PREVIEW_ITEMS,
}: {
  title?: string;
  layoutFormat?: LayoutFormat;
  accentColor?: string;
  cardBackgroundColor?: string;
  borderColor?: string;
  labelColor?: string;
  titleFontSize?: number;
  titleFontWeight?: string;
  titleColor?: string;
  buttonText?: string;
  buttonPrimaryColor?: string;
  showCustomButton?: boolean;
  items?: PreviewItem[];
} = {}) {
  const safeLayout: LayoutFormat = ["vertical", "horizontal", "card", "compact"].includes(layoutFormat)
    ? layoutFormat
    : "vertical";

  const itemsHtml = items.map((item) => {
    const featuredClass = item.featured ? " create-offer-style-preview-item--featured" : "";
    const featuredStyle = item.featured 
      ? `border-color: ${esc(accentColor)} !important; background: ${esc(cardBackgroundColor)} !important; box-shadow: 0 8px 18px ${esc(accentColor)}25 !important; cursor: pointer;`
      : `border-color: ${esc(borderColor)} !important; background: ${esc(cardBackgroundColor)} !important; cursor: pointer;`;
      
    return `<div class="create-offer-style-preview-item${featuredClass}" style="${featuredStyle}">
      ${
        item.badge
          ? `<div class="create-offer-style-preview-badge" style="background:${esc(accentColor)} !important; color:${esc(labelColor)} !important;">${esc(item.badge)}</div>`
          : ""
      }
      <div class="create-offer-style-preview-item-title">${esc(item.title)}</div>
      <div class="create-offer-style-preview-item-subtitle">${esc(item.subtitle)}</div>
      ${
        item.saveLabel
          ? `<div class="create-offer-style-preview-item-subtitle">${esc(item.saveLabel)}</div>`
          : ""
      }
      <div class="create-offer-style-preview-item-price">${esc(item.price)}</div>
      ${
        item.original
          ? `<div class="create-offer-style-preview-item-original">${esc(item.original)}</div>`
          : ""
      }
    </div>`;
  }).join("");

  return `<div class="create-offer-preview-card">
    <div class="create-offer-style-preview-header" style="color:${esc(titleColor)} !important; font-size: ${esc(titleFontSize)}px !important; font-weight: ${esc(titleFontWeight)} !important;">${esc(title)}</div>
    <div class="create-offer-style-preview-list create-offer-style-preview-list--${safeLayout}">
      ${itemsHtml}
    </div>
    ${showCustomButton ? `<button class="create-offer-preview-button" style="width: 100%; margin-top: 12px; padding: 12px; background: ${esc(buttonPrimaryColor)} !important; color: white !important; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
      ${esc(buttonText)}
    </button>` : ''}
  </div>`;
}
