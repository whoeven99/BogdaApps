export const BUNDLE_PREVIEW_MOCK_ITEMS = [
  {
    id: "single",
    title: "Single",
    subtitle: "Standard price",
    price: "€65,00",
  },
  {
    id: "duo",
    title: "Duo",
    subtitle: "Buy more, save more",
    price: "€110,50",
    original: "€130,00",
    featured: true,
    badge: "Most Popular",
  },
  {
    id: "trio",
    title: "Trio",
    subtitle: "Extra savings",
    price: "€149,00",
  },
  {
    id: "pack4",
    title: "Pack of 4",
    subtitle: "Best value",
    price: "€185,00",
  },
];

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderItem(item, cardBackgroundColor, accentColor) {
  const featuredClass = item.featured
    ? " create-offer-style-preview-item--featured"
    : "";
  const borderStyle = item.featured ? `border-color:${esc(accentColor)};` : "";
  const baseStyle = `background:${esc(cardBackgroundColor)};${borderStyle}`;

  return `<div class="create-offer-style-preview-item${featuredClass}" style="${baseStyle}">
    ${
      item.featured && item.badge
        ? `<div class="create-offer-style-preview-badge" style="background:${esc(accentColor)};">${esc(item.badge)}</div>`
        : ""
    }
    <div class="create-offer-style-preview-item-title">${esc(item.title)}</div>
    <div class="create-offer-style-preview-item-subtitle">${esc(item.subtitle)}</div>
    <div class="create-offer-style-preview-item-price">${esc(item.price)}</div>
    ${
      item.original
        ? `<div class="create-offer-style-preview-item-original">${esc(item.original)}</div>`
        : ""
    }
  </div>`;
}

export function renderBundlePreviewHtml({
  title = "Bundle & Save",
  layoutFormat = "vertical",
  accentColor = "#111111",
  cardBackgroundColor = "#ffffff",
  items = BUNDLE_PREVIEW_MOCK_ITEMS,
} = {}) {
  const safeLayout = ["vertical", "horizontal", "card", "compact"].includes(
    layoutFormat,
  )
    ? layoutFormat
    : "vertical";

  return `<div class="create-offer-preview-card">
    <div class="create-offer-style-preview-header" style="color:${esc(accentColor)};">
      ${esc(title)}
    </div>
    <div class="create-offer-style-preview-list create-offer-style-preview-list--${safeLayout}">
      ${items
        .map((item) => renderItem(item, cardBackgroundColor, accentColor))
        .join("")}
    </div>
  </div>`;
}
