type LayoutFormat = "vertical" | "horizontal" | "card" | "compact";

type PreviewItem = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  original?: string;
  featured?: boolean;
  badge?: string;
};

const PREVIEW_ITEMS: PreviewItem[] = [
  { id: "single", title: "Single", subtitle: "Standard price", price: "€65,00" },
  {
    id: "duo",
    title: "Duo",
    subtitle: "Buy more, save more",
    price: "€110,50",
    original: "€130,00",
    featured: true,
    badge: "Most Popular",
  },
  { id: "trio", title: "Trio", subtitle: "Extra savings", price: "€149,00" },
  { id: "pack4", title: "Pack of 4", subtitle: "Best value", price: "€185,00" },
];

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  enableCountdown = false,
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
  enableCountdown?: boolean;
} = {}) {
  const safeLayout: LayoutFormat = ["vertical", "horizontal", "card", "compact"].includes(layoutFormat)
    ? layoutFormat
    : "vertical";

  const itemsHtml = PREVIEW_ITEMS.map((item) => {
    const featuredClass = item.featured ? " create-offer-style-preview-item--featured" : "";
    const featuredStyle = item.featured 
      ? `border-color: ${esc(accentColor)} !important; background: ${esc(cardBackgroundColor)} !important; box-shadow: 0 8px 18px ${esc(accentColor)}25 !important;`
      : `border-color: ${esc(borderColor)} !important; background: ${esc(cardBackgroundColor)} !important;`;
      
    return `<div class="create-offer-style-preview-item${featuredClass}" style="${featuredStyle}">
      ${
        item.featured && item.badge
          ? `<div class="create-offer-style-preview-badge" style="background:${esc(accentColor)} !important; color:${esc(labelColor)} !important;">${esc(item.badge)}</div>`
          : ""
      }
      <div class="create-offer-style-preview-item-title">${esc(item.title)}</div>
      <div class="create-offer-style-preview-item-subtitle">${esc(item.subtitle)}</div>
      <div class="create-offer-style-preview-item-price">${esc(item.price)}</div>
      ${item.original ? `<div class="create-offer-style-preview-item-original">${esc(item.original)}</div>` : ""}
    </div>`;
  }).join("");

  const countdownHtml = enableCountdown
    ? `<div class="create-offer-countdown-wrapper" style="margin-top: 12px; padding: 8px; background: #fff8f8; border: 1px solid #ffdcdc; border-radius: 6px; text-align: center;">
         <div style="font-size: 12px; font-weight: 600; color: #d72c0d;">Ends in: 00:15:00</div>
       </div>`
    : "";

  return `<div class="create-offer-preview-card">
    <div class="create-offer-style-preview-header" style="color:${esc(titleColor)} !important; font-size: ${esc(titleFontSize)}px !important; font-weight: ${esc(titleFontWeight)} !important;">${esc(title)}</div>
    <div class="create-offer-style-preview-list create-offer-style-preview-list--${safeLayout}">
      ${itemsHtml}
    </div>
    ${countdownHtml}
    <button class="create-offer-preview-button" style="width: 100%; margin-top: 12px; padding: 12px; background: ${esc(buttonPrimaryColor)}; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
      ${esc(buttonText)}
    </button>
  </div>`;
}
