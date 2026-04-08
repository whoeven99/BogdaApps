const DEFAULT_SELECTORS = [
  ".product__info-container",
  ".product__info-wrapper",
  ".product__info",
  "[id^='ProductInfo']",
  ".product-info",
  "#ProductInfo",
];

const RETRY_MS = 12_000;
let offersConfigCache = null;

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEuro(value) {
  return `€${Number(value).toFixed(2).replace(".", ",")}`;
}

function normalizePriceNumber(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    // ShopifyAnalytics 常见数值是分（如 18000 表示 180.00）
    return Number.isInteger(value) ? value / 100 : value;
  }
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    // 纯数字字符串按分处理；带小数分隔符按元处理
    if (/^\d+$/.test(raw)) {
      const cents = Number(raw);
      if (Number.isFinite(cents)) return cents / 100;
      return null;
    }
    const n = Number(raw.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function getSelectedVariantId() {
  const input = document.querySelector("form[action*='/cart/add'] input[name='id']");
  if (!input) return "";
  return String(input.value || "").trim();
}

function getCurrentUnitPrice() {
  const productMeta = window?.ShopifyAnalytics?.meta?.product;
  if (!productMeta || typeof productMeta !== "object") return 100;

  const selectedVariantId = getSelectedVariantId();
  const variants = Array.isArray(productMeta.variants) ? productMeta.variants : [];

  if (selectedVariantId && variants.length) {
    const matched = variants.find((v) => String(v?.id || "") === selectedVariantId);
    const matchedPrice = normalizePriceNumber(matched?.price);
    if (matchedPrice != null) return matchedPrice;
  }

  const productPrice = normalizePriceNumber(productMeta.price);
  if (productPrice != null) return productPrice;

  const firstVariantPrice = normalizePriceNumber(variants[0]?.price);
  if (firstVariantPrice != null) return firstVariantPrice;

  return 100;
}

function parseDiscountRulesJson(discountRulesJson) {
  try {
    let parsed = discountRulesJson;
    if (typeof parsed === "string") {
      if (!parsed.trim()) return [];
      parsed = JSON.parse(parsed);
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const count = Number(item.count);
        const discountPercent = Number(item.discountPercent);
        if (!Number.isFinite(count) || count < 1) return null;
        if (!Number.isFinite(discountPercent)) return null;
        return {
          count: Math.trunc(count),
          discountPercent: Math.max(0, Math.min(100, discountPercent)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.count - b.count);
  } catch {
    return [];
  }
}

function parseSelectedProductIds(selectedProductsJson) {
  if (typeof selectedProductsJson !== "string" || !selectedProductsJson.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(selectedProductsJson);
    if (!Array.isArray(parsed)) return [];
    const ids = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        ids.push(item);
        continue;
      }
      if (item && typeof item === "object" && item.id) {
        ids.push(String(item.id));
      }
    }
    return ids;
  } catch {
    return [];
  }
}

function getCurrentProductGid() {
  const productId = window?.ShopifyAnalytics?.meta?.product?.id;
  if (!productId) return null;
  return `gid://shopify/Product/${productId}`;
}

function getCurrentOffer(offersConfig) {
  const offers = Array.isArray(offersConfig?.offers) ? offersConfig.offers : [];
  const currentProductGid = getCurrentProductGid();
  const validOffers = [];

  console.log("[ciwi] offers total:", offers.length, "currentProductGid:", currentProductGid);

  for (const offer of offers) {
    if (!offer || typeof offer !== "object") continue;
    const discountRules = parseDiscountRulesJson(offer.discountRulesJson);
    if (!discountRules.length) continue;
    validOffers.push(offer);

    const selectedIds = parseSelectedProductIds(offer.selectedProductsJson);
    // 指定了商品列表时，优先按当前商品精准匹配
    if (selectedIds.length > 0) {
      if (!currentProductGid) continue;
      if (!selectedIds.includes(currentProductGid)) continue;
    }

    return offer;
  }
  // 回退：至少展示一个有效 offer，避免整块 UI 消失
  console.log("[ciwi] valid offers total:", validOffers.length);
  return validOffers[0] || null;
}

function renderBundlePreviewHtml(offer) {
  const discountRules = parseDiscountRulesJson(offer?.discountRulesJson);
  if (!discountRules.length) return "";

  const layoutFormat = "vertical";
  const unitPrice = getCurrentUnitPrice();
  const items = [
    {
      title: "Single",
      subtitle: "Standard price",
      price: formatEuro(unitPrice),
    },
    ...discountRules.map((rule, index) => {
      const originalTotal = unitPrice * rule.count;
      const discountedTotal = originalTotal * (1 - rule.discountPercent / 100);
      const saved = originalTotal - discountedTotal;
      return {
        title: `${rule.count} items`,
        subtitle: `You save ${rule.discountPercent}%`,
        price: formatEuro(discountedTotal),
        original: formatEuro(originalTotal),
        featured: index === 0,
        badge: index === 0 ? "Most Popular" : "",
        saveLabel: `SAVE ${formatEuro(saved)}`,
      };
    }),
  ];

  const itemsHtml = items
    .map((item) => {
      const featuredClass = item.featured
        ? " create-offer-style-preview-item--featured"
        : "";
      return `<div class="create-offer-style-preview-item${featuredClass}" style="background:#ffffff;">
      ${
        item.featured && item.badge
          ? `<div class="create-offer-style-preview-badge" style="background:#111111;">${esc(item.badge)}</div>`
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
    })
    .join("");

  return `<div class="create-offer-preview-card">
    <div class="create-offer-style-preview-header" style="color:#111111;">Bundle & Save</div>
    <div class="create-offer-style-preview-list create-offer-style-preview-list--${layoutFormat}">
      ${itemsHtml}
    </div>
  </div>`;
}

function readOffersConfigFromMetafield() {
  const metaEl = document.getElementById("ciwi-bundle-offers");
  if (!metaEl) return null;

  try {
    let raw = (metaEl.innerText || metaEl.textContent || "").trim();
    if (!raw) return null;

    // 与 bundle-cart.js 一致：兼容 Ruby hash 风格的字符串化输出
    if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1);
    }
    const jsonLike = raw.replace(/=>/g, ":").replace(/\bnil\b/g, "null");
    return JSON.parse(jsonLike);
  } catch (e) {
    console.error("[ciwi] Failed to parse ciwi-bundle-offers metafield", e);
    return null;
  }
}

function parseSelectors(data) {
  const raw = (data || "").trim();
  if (!raw || raw === "-") return DEFAULT_SELECTORS;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function findFormBySelectors(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (!el) continue;

      const formCandidates = el.matches("form[action*='/cart/add']")
        ? [el]
        : Array.from(el.querySelectorAll("form[action*='/cart/add']"));

      for (const form of formCandidates) {
        const variantInput = form.querySelector("input[name='id']");
        if (variantInput && String(variantInput.value || "").trim()) {
          return { container: el, form };
        }
      }
    } catch {
      // ignore invalid selector
    }
  }
  return null;
}

function insertNearAddToCart(node, selectors) {
  const hit = findFormBySelectors(selectors);
  if (!hit) return false;

  const { container, form } = hit;
  const addBtn = form.querySelector("[name='add'], button[type='submit']");
  const buyNowBtn = container.querySelector(
    ".shopify-payment-button, shopify-buy-it-now-button, [data-shopify='payment-button']",
  );

  if (addBtn && buyNowBtn) {
    // 优先找两个按钮的共同容器，并插在其前面，避免错位
    let ancestor = addBtn.parentElement;
    while (ancestor && ancestor !== container) {
      if (ancestor.contains(buyNowBtn)) {
        ancestor.insertAdjacentElement("beforebegin", node);
        return true;
      }
      ancestor = ancestor.parentElement;
    }
  }

  const buttonsGroup = addBtn?.closest(
    ".product-form__buttons, .product-form__submit, .product-form__controls-group",
  );

  // 优先插在按钮组前，避免插到 Add 和 Buy now 两个按钮中间
  if (buttonsGroup) {
    buttonsGroup.insertAdjacentElement("beforebegin", node);
    return true;
  }

  if (addBtn) {
    addBtn.insertAdjacentElement("beforebegin", node);
    return true;
  }

  const productForm = form.closest("product-form");
  if (productForm && productForm.parentElement) {
    productForm.insertAdjacentElement("beforebegin", node);
    return true;
  }

  if (form.parentElement) {
    form.insertAdjacentElement("beforebegin", node);
    return true;
  }

  container.appendChild(node);
  return true;
}

function buildBundleUi(offer) {
  const wrapper = document.createElement("section");
  wrapper.className = "ciwi-bundle-wrapper";
  wrapper.innerHTML = renderBundlePreviewHtml(offer);
  if (!wrapper.innerHTML.trim()) return null;
  return wrapper;
}

function tryMount(offer) {
  if (document.querySelector(".ciwi-bundle-wrapper")) return "done";

  const src = document.getElementById("ciwi-product-message-root");
  if (!src) return "done";

  const selectors = parseSelectors(src.dataset.ciwiSelectors);
  const section = buildBundleUi(offer);
  if (!section) return "done";

  if (insertNearAddToCart(section, selectors)) {
    src.remove();
    return "done";
  }
  return "retry";
}

function fallbackMount(offer) {
  if (document.querySelector(".ciwi-bundle-wrapper")) return;
  const src = document.getElementById("ciwi-product-message-root");
  if (!src) return;

  const section = buildBundleUi(offer);
  if (!section) return;
  const main = document.querySelector("main") || document.body;
  main.appendChild(section);
  src.remove();
}

function run() {
  try {
    if (!offersConfigCache) {
      offersConfigCache = readOffersConfigFromMetafield();
      if (offersConfigCache) {
        console.log("[ciwi] metafield offers loaded", offersConfigCache);
      }
    }

    const currentOffer = getCurrentOffer(offersConfigCache);
    if (!currentOffer) {
      console.log("[ciwi] no current offer resolved");
      return;
    }

    if (tryMount(currentOffer) === "done") return;

    const started = Date.now();
    const obs = new MutationObserver(() => {
      if (tryMount(currentOffer) === "done") {
        obs.disconnect();
        return;
      }
      if (Date.now() - started > RETRY_MS) {
        fallbackMount(currentOffer);
        obs.disconnect();
      }
    });

    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      if (!document.querySelector(".ciwi-bundle-wrapper")) {
        fallbackMount(currentOffer);
      }
    }, RETRY_MS);
  } catch (e) {
    console.error("[ciwi] bundle ui error:", e);
  }
}

// 尽早读取一次（在 DOMContentLoaded 之前）
offersConfigCache = readOffersConfigFromMetafield();
if (offersConfigCache) {
  console.log("[ciwi] metafield offers preloaded", offersConfigCache);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
