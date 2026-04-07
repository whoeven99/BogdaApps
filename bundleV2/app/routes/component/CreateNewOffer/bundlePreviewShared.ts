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
}: {
  title?: string;
  layoutFormat?: LayoutFormat;
  accentColor?: string;
  cardBackgroundColor?: string;
} = {}) {
  const safeLayout: LayoutFormat = ["vertical", "horizontal", "card", "compact"].includes(layoutFormat)
    ? layoutFormat
    : "vertical";

  const itemsHtml = PREVIEW_ITEMS.map((item) => {
    const featuredClass = item.featured ? " create-offer-style-preview-item--featured" : "";
    const borderStyle = item.featured ? `border-color:${esc(accentColor)};` : "";
    return `<div class="create-offer-style-preview-item${featuredClass}" style="background:${esc(cardBackgroundColor)};${borderStyle}">
      ${
        item.featured && item.badge
          ? `<div class="create-offer-style-preview-badge" style="background:${esc(accentColor)};">${esc(item.badge)}</div>`
          : ""
      }
      <div class="create-offer-style-preview-item-title">${esc(item.title)}</div>
      <div class="create-offer-style-preview-item-subtitle">${esc(item.subtitle)}</div>
      <div class="create-offer-style-preview-item-price">${esc(item.price)}</div>
      ${item.original ? `<div class="create-offer-style-preview-item-original">${esc(item.original)}</div>` : ""}
    </div>`;
  }).join("");

  return `<div class="create-offer-preview-card">
    <div class="create-offer-style-preview-header" style="color:${esc(accentColor)};">${esc(title)}</div>
    <div class="create-offer-style-preview-list create-offer-style-preview-list--${safeLayout}">
      ${itemsHtml}
    </div>
  </div>`;
}
