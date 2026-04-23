const DEFAULT_SELECTORS = [
  ".product__info-container",
  ".product__info-wrapper",
  ".product__info",
  "[id^='ProductInfo']",
  ".product-info",
  "#ProductInfo",
];

const RETRY_MS = 12_000;
const SESSION_STORAGE_BUNDLE_RULE_KEY = "current-ciwi-bundle-rule";
let offersConfigCache = null;
let priceSyncController = null;
let bundlePriceDebounceT = null;
let currentMainForm = null;

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function detectNumberFormat(moneyFormat, price) {
  let number = price.toString();

  let [integerPart, decimalPart = "00"] = number.split(".");
  decimalPart = Number(`0.${decimalPart}`).toFixed(2).slice(2);
  switch (true) {
    case moneyFormat.includes("amount_no_decimals"):
      return formatWithComma(integerPart, "");
    case moneyFormat.includes("amount_with_comma_separator"):
      return formatWithCommaAndCommaDecimal(integerPart, decimalPart);
    case moneyFormat.includes("amount_no_decimals_with_comma_separator"):
      return formatWithCommaAndCommaDecimal(integerPart, "");
    case moneyFormat.includes("amount_with_apostrophe_separator"):
      return formatWithApostrophe(integerPart, decimalPart);
    case moneyFormat.includes("amount_no_decimals_with_space_separator"):
      return formatWithSpace(integerPart, "");
    case moneyFormat.includes("amount_with_space_separator"):
      return formatWithSpace(integerPart, decimalPart);
    case moneyFormat.includes("amount_with_period_and_space_separator"):
      return formatWithSpaceAndPeriod(integerPart, decimalPart);
    case moneyFormat.includes("amount"):
      return formatWithComma(integerPart, decimalPart);
    default:
      return number;
  }
}

function formatWithComma(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

function formatWithCommaAndCommaDecimal(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimalPart ? `${integerPart},${decimalPart}` : integerPart;
}

function formatWithApostrophe(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

function formatWithSpace(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimalPart ? `${integerPart},${decimalPart}` : integerPart;
}

function formatWithSpaceAndPeriod(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

function formatPrice(value) {
  const configEl = document.getElementById("ciwi-bundles-config");
  let currencySymbol = "€";
  let moneyFormat = "amount_with_comma_separator";

  if (configEl) {
    try {
      const config = JSON.parse(configEl.textContent || "{}");
      if (config.currencySymbol) currencySymbol = config.currencySymbol;
      if (config.moneyFormat) moneyFormat = config.moneyFormat;
    } catch (e) {
      // ignore JSON parse error
    }
  }
  
  const formattedNumber = detectNumberFormat(moneyFormat, Number(value).toFixed(2));
  return `${currencySymbol}${formattedNumber}`;
}

/** 与后台 offerParsing 一致：从价格字符串解析为数字（元） */
function parseMoneyStringToNumber(raw) {
  if (raw == null) return 0;
  const stripped = String(raw).trim().replace(/[^\d.,-]/g, "");
  if (!stripped) return 0;
  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");
  let normalized = stripped;
  if (lastComma > lastDot) {
    normalized = stripped.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = stripped.replace(/,/g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Complete bundle 单件商品计价（与 CreateNewOffer 中 TS 逻辑对齐） */
function applyCompleteBundleProductPricing(mode, value, basePrice) {
  const original = Math.max(0, Number(basePrice) || 0);
  if (mode === "full_price") {
    return { final: original, original };
  }
  if (mode === "percentage_off") {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    const final = Math.round(original * (1 - pct / 100) * 100) / 100;
    return { final, original };
  }
  if (mode === "amount_off") {
    const off = Math.max(0, Number(value) || 0);
    const final = Math.max(0, Math.round((original - off) * 100) / 100);
    return { final, original };
  }
  const fixed = Math.max(0, Number(value) || 0);
  return { final: Math.round(fixed * 100) / 100, original };
}

function toCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function toAjaxVariantId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return raw;
  const hit = raw.match(/\/(\d+)$/);
  return hit ? hit[1] : "";
}

function toScaledInteger(value, scale) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * scale);
}

function fromCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
}

/**
 * Use higher precision during intermediate calculations and only round to cents
 * at the final step so the storefront card stays closer to Shopify cart totals.
 */
function calculateBundleAmounts(unitPrice, quantity, discountPercent) {
  const MONEY_SCALE = 10000;
  const safeQty = Math.max(1, Math.trunc(Number(quantity) || 1));
  const safeDiscountPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  const unitPriceScaled = toScaledInteger(unitPrice, MONEY_SCALE);
  const originalTotalScaled = unitPriceScaled * safeQty;
  const discountedTotalScaled = Math.round(
    originalTotalScaled * (1 - safeDiscountPercent / 100),
  );
  const originalTotalCents = Math.round(originalTotalScaled / (MONEY_SCALE / 100));
  const discountedTotalCents = Math.round(
    discountedTotalScaled / (MONEY_SCALE / 100),
  );
  const savedCents = originalTotalCents - discountedTotalCents;

  return {
    originalTotalCents,
    discountedTotalCents,
    savedCents,
    originalTotal: fromCents(originalTotalCents),
    discountedTotal: fromCents(discountedTotalCents),
    saved: fromCents(savedCents),
  };
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

/** 从主题页面上展示的金额文案解析单价（随变体切换而变） */
function parseMoneyFromDomString(text) {
  if (!text || typeof text !== "string") return null;
  const t = text.replace(/\u00a0/g, " ").trim();
  const stripped = t.replace(/[€$£¥₹\s]/gi, "").trim();
  if (!stripped) return null;
  // 1.234,56（欧陆）
  if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(stripped)) {
    const n = Number(stripped.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  // 1,234.56（美英）
  if (/^\d{1,3}(,\d{3})*\.\d{1,2}$/.test(stripped)) {
    const n = Number(stripped.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  // 12,99 或 12.99
  if (/,\d{1,2}$/.test(stripped)) {
    const n = Number(stripped.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(stripped.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function getAddToCartForm() {
  if (currentMainForm && document.body.contains(currentMainForm)) {
    return currentMainForm;
  }
  return document.querySelector("form[action*='/cart/add']");
}

function getSelectedVariantId() {
  const form = getAddToCartForm();
  const input = form?.querySelector("input[name='id']");
  if (!input) return "";
  return String(input.value || "").trim();
}

function isCurrentVariantAvailable() {
  const selectedVariantId = getSelectedVariantId();
  const configEl = document.getElementById("ciwi-bundles-config");
  if (configEl) {
    try {
      const config = JSON.parse(configEl.textContent || "{}");
      if (config.variants && Array.isArray(config.variants)) {
        // If there's a selected variant, find it
        if (selectedVariantId) {
          const v = config.variants.find(v => String(v.id) === selectedVariantId);
          if (v) return v.available;
        }
        // If no explicit variant id found in form but variants exist, check the first one (or default)
        return config.variants[0]?.available ?? true;
      }
    } catch (e) {
      // ignore
    }
  }
  // Fallback to ShopifyAnalytics
  const productMeta = window?.ShopifyAnalytics?.meta?.product;
  if (productMeta && typeof productMeta === "object" && Array.isArray(productMeta.variants)) {
    if (selectedVariantId) {
      const v = productMeta.variants.find(v => String(v.id) === selectedVariantId);
      if (v && v.available !== undefined) return v.available;
    }
  }
  // If we can't determine, assume available
  return true;
}

function isPriceElementVisible(el) {
  if (!el || !(el instanceof Element)) return false;
  const st = window.getComputedStyle(el);
  if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) {
    return false;
  }
  if (el.closest(".visually-hidden, .hidden, [hidden], template")) return false;
  return true;
}

/**
 * 从当前产品区 DOM 读取「单件价」（优先促销价），与主题变体切换同步
 */
function getUnitPriceFromProductDom() {
  const form = getAddToCartForm();
  const root =
    form?.closest(".product, .product-section, product-info, [id^='ProductInfo'], main") ||
    document.querySelector("main") ||
    document.body;

  const trySelectors = [
    ".price .price-item--sale .money",
    ".price__sale .money",
    ".price-item--sale .money",
    "[data-product-price-sale]",
    ".price .price-item--regular .money",
    ".price__regular .money",
    ".price-item--regular .money",
    ".product__price .money",
    ".price .money",
    "[data-product-price]",
    "sale-price .money",
  ];

  for (const sel of trySelectors) {
    const nodes = root.querySelectorAll(sel);
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (!isPriceElementVisible(el)) continue;
      const p = parseMoneyFromDomString(el.textContent || "");
      if (p != null && p > 0) return p;
    }
  }
  return null;
}

function getCurrentUnitPrice() {
  const selectedVariantId = getSelectedVariantId();
  const configEl = document.getElementById("ciwi-bundles-config");
  if (configEl) {
    try {
      const config = JSON.parse(configEl.textContent || "{}");
      const variants = Array.isArray(config?.variants) ? config.variants : [];
      if (selectedVariantId && variants.length) {
        const matched = variants.find(
          (v) => String(v?.id || "") === selectedVariantId,
        );
        const matchedPrice = normalizePriceNumber(matched?.price);
        if (matchedPrice != null) return matchedPrice;
      }
      const firstVariantPrice =
        normalizePriceNumber(config?.firstVariant?.price) ??
        normalizePriceNumber(variants[0]?.price);
      if (firstVariantPrice != null) return firstVariantPrice;
    } catch {
      // ignore config parse error
    }
  }

  const productMeta = window?.ShopifyAnalytics?.meta?.product;
  const variants =
    productMeta && typeof productMeta === "object" && Array.isArray(productMeta.variants)
      ? productMeta.variants
      : [];

  // 1) Analytics 里按当前 variant id 匹配
  if (productMeta && typeof productMeta === "object") {
    if (selectedVariantId && variants.length) {
      const matched = variants.find(
        (v) => String(v?.id || "") === selectedVariantId,
      );
      const matchedPrice = normalizePriceNumber(matched?.price);
      if (matchedPrice != null) return matchedPrice;
    }

    const productPrice = normalizePriceNumber(productMeta.price);
    if (productPrice != null) return productPrice;

    const firstVariantPrice = normalizePriceNumber(variants[0]?.price);
    if (firstVariantPrice != null) return firstVariantPrice;
  }

  // 3) 页面上顾客看到的单价（DOM）作为最后兜底
  const domPrice = getUnitPriceFromProductDom();
  if (domPrice != null) return domPrice;

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
        title: item.title || "",
        subtitle: item.subtitle || "",
        badge: item.badge || "",
        isDefault: !!item.isDefault,
      };
      })
      .filter(Boolean)
      .sort((a, b) => a.count - b.count);
  } catch {
    return [];
  }
}

function parseBxgyDiscountRulesJson(discountRulesJson) {
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
        const buyQuantity = Number(item.buyQuantity);
        const getQuantity = Number(item.getQuantity);
        const discountPercent = Number(item.discountPercent);

        if (!Number.isFinite(count) || count < 1) return null;
        if (!Number.isFinite(buyQuantity) || buyQuantity < 1) return null;
        if (!Number.isFinite(getQuantity) || getQuantity < 1) return null;
        if (
          !Number.isFinite(discountPercent) ||
          discountPercent < 0 ||
          discountPercent > 100
        )
          return null;

        const buyProductIds = Array.isArray(item.buyProductIds)
          ? item.buyProductIds.map(String)
          : [];
        const getProductIds = Array.isArray(item.getProductIds)
          ? item.getProductIds.map(String)
          : [];

        return {
          count: Math.trunc(count),
          buyQuantity: Math.trunc(buyQuantity),
          getQuantity: Math.trunc(getQuantity),
          discountPercent: discountPercent,
          buyProductIds: buyProductIds,
          getProductIds: getProductIds,
          title: item.title || "",
          subtitle: item.subtitle || "",
          badge: item.badge || "",
          maxUsesPerOrder: Number(item.maxUsesPerOrder) || 1,
          isDefault: !!item.isDefault,
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

function parseCompleteBundleConfig(selectedProductsJson) {
  if (typeof selectedProductsJson !== "string" || !selectedProductsJson.trim()) {
    return { bars: [] };
  }
  try {
    const parsed = JSON.parse(selectedProductsJson);
    const bars = Array.isArray(parsed?.bars) ? parsed.bars : [];
    return {
      bars: bars
        .filter((bar) => bar && typeof bar === "object" && bar.id)
        .map((bar) => {
          const barMode = String(bar?.pricing?.mode || "full_price");
          const barValue = Number(bar?.pricing?.value) || 0;
          const products = Array.isArray(bar.products)
            ? bar.products
                .filter((p) => p && typeof p === "object" && p.productId)
                .map((p) => {
                  const pm = String(p?.pricing?.mode || "full_price");
                  const pv = Number(p?.pricing?.value) || 0;
                  return {
                    productId: String(p.productId),
                    handle: String(p.handle || ""),
                    title: String(p.title || ""),
                    image: String(p.image || ""),
                    price: String(p.price || ""),
                    selectedVariantId: String(p.selectedVariantId || p.defaultVariantId || ""),
                    pricing: { mode: pm, value: pv },
                    variants: Array.isArray(p.variants)
                      ? p.variants
                          .filter((v) => v && typeof v === "object" && v.id)
                          .map((v) => ({
                            id: String(v.id),
                            title: String(v.title || ""),
                            price: String(v.price || ""),
                            selectedOptions: Array.isArray(v.selectedOptions)
                              ? v.selectedOptions.map((opt) => ({
                                  name: String(opt?.name || ""),
                                  value: String(opt?.value || ""),
                                }))
                              : [],
                          }))
                      : [],
                  };
                })
            : [];
          const allDefault = products.every(
            (p) => p.pricing.mode === "full_price" && (p.pricing.value || 0) === 0,
          );
          if (products.length && allDefault && (barMode !== "full_price" || barValue !== 0)) {
            products[0].pricing = { mode: barMode, value: barValue };
          }
          return {
            id: String(bar.id),
            type: bar.type === "bxgy" ? "bxgy" : "quantity-break-same",
            title: String(bar.title || ""),
            subtitle: String(bar.subtitle || ""),
            quantity: Math.max(1, Math.trunc(Number(bar.quantity) || 1)),
            pricing: { mode: barMode, value: barValue },
            products,
          };
        }),
    };
  } catch {
    return { bars: [] };
  }
}

const __ciwiProductHandleCache = {};
const __ciwiProductIdCache = {};
const __ciwiHydrateInFlight = {};

function normalizeProductHandle(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.replace(/^\/+|\/+$/g, "");
}

function toProductNumericId(idLike) {
  const raw = String(idLike || "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return raw;
  const hit = raw.match(/\/(\d+)$/);
  return hit ? hit[1] : "";
}

function toProductGid(idLike) {
  const raw = String(idLike || "").trim();
  if (!raw) return "";
  if (/^gid:\/\//.test(raw)) return raw;
  const numericId = toProductNumericId(raw);
  return numericId ? `gid://shopify/Product/${numericId}` : raw;
}

function toVariantGid(idLike) {
  const raw = String(idLike || "").trim();
  if (!raw) return "";
  if (/^gid:\/\//.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return `gid://shopify/ProductVariant/${raw}`;
  const hit = raw.match(/(\d+)$/);
  return hit ? `gid://shopify/ProductVariant/${hit[1]}` : raw;
}

function getProductImageUrl(rawProduct) {
  const featured = rawProduct?.featured_image;
  if (typeof featured === "string" && featured) return featured;
  if (featured && typeof featured === "object" && typeof featured.url === "string") {
    return featured.url;
  }
  if (Array.isArray(rawProduct?.images) && rawProduct.images.length) {
    const firstImage = rawProduct.images[0];
    if (typeof firstImage === "string" && firstImage) return firstImage;
    if (firstImage && typeof firstImage === "object") {
      if (typeof firstImage.src === "string" && firstImage.src) return firstImage.src;
      if (typeof firstImage.url === "string" && firstImage.url) return firstImage.url;
    }
  }
  return "";
}

function cacheStorefrontProduct(rawProduct) {
  if (!rawProduct || typeof rawProduct !== "object") return;
  const numericId = toProductNumericId(rawProduct.id);
  const productGid = toProductGid(rawProduct.id);
  if (numericId) __ciwiProductIdCache[numericId] = rawProduct;
  if (productGid) __ciwiProductIdCache[productGid] = rawProduct;
  const handle = normalizeProductHandle(rawProduct.handle);
  if (handle) __ciwiProductHandleCache[handle] = rawProduct;
}

function readCachedStorefrontProduct(productIdLike) {
  const numericId = toProductNumericId(productIdLike);
  const productGid = toProductGid(productIdLike);
  return (
    __ciwiProductIdCache[String(productIdLike || "").trim()] ||
    (numericId ? __ciwiProductIdCache[numericId] : null) ||
    (productGid ? __ciwiProductIdCache[productGid] : null) ||
    null
  );
}

async function fetchProductByHandle(handle) {
  const h = normalizeProductHandle(handle);
  if (!h) return null;
  if (__ciwiProductHandleCache[h]) return __ciwiProductHandleCache[h];
  const requestKey = `handle:${h}`;
  if (!__ciwiHydrateInFlight[requestKey]) {
    __ciwiHydrateInFlight[requestKey] = fetch(`/products/${encodeURIComponent(h)}.js`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => {
        if (data) cacheStorefrontProduct(data);
        delete __ciwiHydrateInFlight[requestKey];
        return data;
      });
  }
  return __ciwiHydrateInFlight[requestKey];
}

async function fetchProductsByProductIds(productIds) {
  // 中文注释：优先按 productId 批量拉取，避免 selectedProductsJson 存价格/图片/变体大字段。
  const numericIds = Array.from(
    new Set(
      (Array.isArray(productIds) ? productIds : [])
        .map((id) => toProductNumericId(id))
        .filter(Boolean),
    ),
  );
  if (!numericIds.length) return [];

  const missingIds = numericIds.filter((id) => !readCachedStorefrontProduct(id));
  const batches = [];
  for (let i = 0; i < missingIds.length; i += 20) {
    batches.push(missingIds.slice(i, i + 20));
  }

  await Promise.all(
    batches.map((batch) => {
      const requestKey = `ids:${batch.join(",")}`;
      if (!__ciwiHydrateInFlight[requestKey]) {
        const query = encodeURIComponent(batch.join(","));
        __ciwiHydrateInFlight[requestKey] = fetch(
          `/products.json?ids=${query}&limit=${batch.length}`,
          {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          },
        )
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
          .then((data) => {
            const products = Array.isArray(data?.products) ? data.products : [];
            products.forEach((product) => cacheStorefrontProduct(product));
            delete __ciwiHydrateInFlight[requestKey];
            return products;
          });
      }
      return __ciwiHydrateInFlight[requestKey];
    }),
  );

  return numericIds
    .map((id) => readCachedStorefrontProduct(id))
    .filter(Boolean);
}

function hydrateProductFromStorefrontJson(rawProduct, existing) {
  if (!rawProduct || typeof rawProduct !== "object") return existing;
  const options = Array.isArray(rawProduct.options) ? rawProduct.options : [];
  const variants = Array.isArray(rawProduct.variants)
    ? rawProduct.variants.map((v) => ({
        id: toVariantGid(v?.id),
        title: String(v?.title || ""),
        price: String(v?.price || ""),
        selectedOptions: options
          .map((name, idx) => {
            const value = v?.[`option${idx + 1}`];
            if (!name || value == null) return null;
            return { name: String(name), value: String(value) };
          })
          .filter(Boolean),
      }))
    : [];
  const selectedVariantIdRaw = String(existing?.selectedVariantId || "");
  const selectedVariantId = toVariantGid(selectedVariantIdRaw);
  const hasSelected = selectedVariantId
    ? variants.some((v) => String(v.id) === String(selectedVariantId))
    : false;
  return {
    ...existing,
    handle: String(rawProduct.handle || existing?.handle || ""),
    title: String(rawProduct.title || existing?.title || ""),
    image: getProductImageUrl(rawProduct) || String(existing?.image || ""),
    price: String(variants[0]?.price || rawProduct?.price || existing?.price || ""),
    selectedVariantId: hasSelected
      ? selectedVariantId
      : String(variants[0]?.id || selectedVariantId || ""),
    variants,
  };
}

async function hydrateCompleteBundleOfferInPlace(offer) {
  if (!offer || offer.offerType !== "complete-bundle") return false;
  const config = parseCompleteBundleConfig(offer.selectedProductsJson);
  if (!config.bars.length) return false;
  let changed = false;

  // 中文注释：先批量收集缺失详情的 productId，一次性拉回 storefront 数据，再回填每个 bar。
  const missingProductIds = [];
  for (const bar of config.bars) {
    for (const product of bar.products || []) {
      const needsHydrate =
        !Array.isArray(product.variants) ||
        product.variants.length === 0 ||
        !product.title ||
        !product.image ||
        !product.price;
      if (!needsHydrate) continue;
      const cached = readCachedStorefrontProduct(product.productId);
      if (cached) {
        Object.assign(product, hydrateProductFromStorefrontJson(cached, product));
        changed = true;
        continue;
      }
      const numericId = toProductNumericId(product.productId);
      if (numericId) missingProductIds.push(numericId);
    }
  }

  if (missingProductIds.length) {
    await fetchProductsByProductIds(missingProductIds);
  }

  for (const bar of config.bars) {
    for (let i = 0; i < (bar.products || []).length; i++) {
      const product = bar.products[i];
      const needsHydrate =
        !Array.isArray(product.variants) ||
        product.variants.length === 0 ||
        !product.title ||
        !product.image ||
        !product.price;
      if (!needsHydrate) continue;

      let sfProduct = readCachedStorefrontProduct(product.productId);
      if (!sfProduct) {
        const handle = normalizeProductHandle(product.handle);
        if (handle) {
          sfProduct = await fetchProductByHandle(handle);
        }
      }
      if (!sfProduct) continue;
      bar.products[i] = hydrateProductFromStorefrontJson(sfProduct, product);
      changed = true;
    }
  }
  if (changed) {
    offer.selectedProductsJson = JSON.stringify({ bars: config.bars });
  }
  return changed;
}

/** 当前栏内某商品在 widget 中选中的变体（与 __ciwiBundleState.selectedBundleVariants 同步） */
function resolveCompleteBundleVariant(bar, product) {
  const picked =
    window.__ciwiBundleState?.selectedBundleVariants?.[bar.id]?.[product.productId] || "";
  const vid = picked || product.selectedVariantId || product.variants?.[0]?.id || "";
  return (product.variants || []).find((v) => String(v.id) === String(vid)) || product.variants?.[0] || null;
}

/** 渲染单个商品块（缩略图、标题、折后价/原价、变体下拉） */
function buildOneCompleteBundleProductHtml(bar, product) {
  const v = resolveCompleteBundleVariant(bar, product);
  const base = parseMoneyStringToNumber(v?.price || product.price);
  const { final, original } = applyCompleteBundleProductPricing(
    product.pricing?.mode || "full_price",
    Number(product.pricing?.value) || 0,
    base,
  );
  const variantOptions = Array.isArray(product.variants) ? product.variants : [];
  const curVid = v?.id || "";
  const optionHtml = variantOptions.length
    ? `<select class="ciwi-bundle-variant-select" onchange="window.ciwiSelectBundleVariant('${esc(bar.id)}','${esc(
        product.productId,
      )}', this.value)">${variantOptions
        .map(
          (variant) =>
            `<option value="${esc(variant.id)}"${
              String(variant.id) === String(curVid) ? " selected" : ""
            }>${esc(variant.title || "Default")}</option>`,
        )
        .join("")}</select>`
    : "";
  const cardStyle =
    (bar.products || []).length >= 2
      ? "flex:1;min-width:140px;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:#fff;"
      : "";
  return `<div style="${cardStyle}">
    <div style="display:flex;align-items:flex-start;gap:8px;">
      ${
        product.image
          ? `<img src="${esc(product.image)}" alt="${esc(product.title)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;flex-shrink:0;" />`
          : ""
      }
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;font-weight:600;color:#1c1f23;line-height:1.35;">${esc(product.title || "Product")}</div>
        <div style="margin-top:4px;font-size:12px;display:flex;flex-wrap:wrap;gap:4px;align-items:baseline;">
          <span style="font-weight:700;color:#1c1f23;">${esc(formatPrice(final))}</span>
          ${
            original > final
              ? `<span style="font-size:11px;color:#9aa0a6;text-decoration:line-through;">${esc(formatPrice(original))}</span>`
              : ""
          }
        </div>
        ${optionHtml ? `<div style="margin-top:6px;">${optionHtml}</div>` : ""}
      </div>
    </div>
  </div>`;
}

function getCurrentProductGid() {
  const productId = window?.ShopifyAnalytics?.meta?.product?.id;
  if (!productId) return null;
  return `gid://shopify/Product/${productId}`;
}

function getCurrentMarketId() {
  const configEl = document.getElementById("ciwi-bundles-config");
  if (configEl) {
    try {
      const config = JSON.parse(configEl.textContent || "{}");
      if (config.marketId) return String(config.marketId);
    } catch (e) {}
  }
  return null;
}

function getOfferBundleTitle(offer) {
  if (!offer || typeof offer !== "object") return "NO_BUNDLE_TITLE";
  const offerId = offer.offerId || offer.id || "";
  const offerName = (offer.offerName || offer.name || offer.title || "").trim();
  if (offerName) return offerName;
  if (offerId) return `#Bundle ${offerId}`;
  return "NO_BUNDLE_TITLE";
}

function readSessionStorageJson(key, fallback) {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

function syncCurrentBundleToSessionStorage(offer) {
  const variantId = getSelectedVariantId();
  if (!variantId) return;

  const offerId = String(offer?.offerId || offer?.id || "");
  const bundleTitle = getOfferBundleTitle(offer);
  const currentProductGid = getCurrentProductGid() || "";
  const data = readSessionStorageJson(SESSION_STORAGE_BUNDLE_RULE_KEY, {});
  data[variantId] = {
    title: bundleTitle,
    offerId,
    offerName: bundleTitle,
    productId: currentProductGid,
    variantId,
    source: "bundle-theme-product-custom",
  };

  try {
    window.sessionStorage.setItem(
      SESSION_STORAGE_BUNDLE_RULE_KEY,
      JSON.stringify(data),
    );
  } catch (error) {
    console.error("[ciwi] failed to persist bundle session data", error);
  }
}

function getCurrentOffer(offersConfig) {
  const offers = Array.isArray(offersConfig?.offers) ? offersConfig.offers : [];
  const currentProductGid = getCurrentProductGid();
  const currentMarketId = getCurrentMarketId();
  const now = Date.now();

  console.log("[ciwi] offers total:", offers.length, "currentProductGid:", currentProductGid, "currentMarketId:", currentMarketId);

  if (!offers.length) {
    console.log("[ciwi] no offers in metafield — skip bundle UI");
    return null;
  }

  for (const offer of offers) {
    if (!offer || typeof offer !== "object") continue;
    if (offer.status === false) {
      console.log("[ciwi] offer skipped: status is false", offer.id);
      continue;
    }
    
    // Check schedule
    if (offer.startTime) {
      const startTimeMs = Date.parse(offer.startTime);
      if (Number.isFinite(startTimeMs) && now < startTimeMs) {
        console.log("[ciwi] offer skipped: not started yet", offer.id, offer.startTime);
        continue;
      }
    }

    if (offer.endTime) {
      const endTimeMs = Date.parse(offer.endTime);
      if (Number.isFinite(endTimeMs) && now > endTimeMs) {
        console.log("[ciwi] offer skipped: already ended", offer.id, offer.endTime);
        continue;
      }
    }

    // Check settings / market filter
    let parsedSettings = null;
    if (currentMarketId && offer.offerSettingsJson) {
      try {
        const settings = JSON.parse(offer.offerSettingsJson);
        parsedSettings = settings;
        const offerMarkets = settings.markets;
        if (typeof offerMarkets === "string" && offerMarkets !== "all" && offerMarkets.trim() !== "") {
          const allowedMarkets = offerMarkets.split(",").map(m => m.trim());
          const matchMarket = allowedMarkets.some(m => m === currentMarketId || m.endsWith(`/${currentMarketId}`));
          if (!matchMarket) {
            console.log("[ciwi] offer skipped: market mismatch", offer.id, "allowed:", allowedMarkets, "current:", currentMarketId);
            continue;
          }
        }
      } catch (e) {
        // ignore parse error
      }
    } else if (offer.offerSettingsJson) {
      try {
        parsedSettings = JSON.parse(offer.offerSettingsJson);
      } catch (e) {}
    }

    // 兼容旧版开关：当 quantity bar 显式为 false 时，不渲染 quantity-break offer
    if (
      offer.offerType !== "complete-bundle" &&
      offer.offerType !== "bxgy" &&
      parsedSettings &&
      (parsedSettings.quantity === false || parsedSettings.showQuantityBar === false)
    ) {
      console.log("[ciwi] offer skipped: quantity bar disabled by settings", offer.id);
      continue;
    }

    if (offer.offerType === 'bxgy') {
      const bxgyRules = parseBxgyDiscountRulesJson(offer.discountRulesJson);
      if (!bxgyRules.length) {
        console.log("[ciwi] offer skipped: no valid bxgy discount rules", offer.id);
        continue;
      }
      const rule = bxgyRules[0];
      if (!rule.count) {
        console.log("[ciwi] bxgy offer skipped: count is invalid", offer.id);
        continue;
      }
      if (!rule.buyProductIds || rule.buyProductIds.length === 0) {
        console.log("[ciwi] bxgy offer skipped: buyProductIds is empty", offer.id);
        continue;
      }
      if (!currentProductGid) {
        console.log("[ciwi] bxgy offer skipped: current product GID is null", offer.id);
        continue;
      }
      if (!rule.buyProductIds.includes(currentProductGid)) {
        console.log("[ciwi] bxgy offer skipped: current product not in buy list", offer.id, currentProductGid);
        continue;
      }
    } else if (offer.offerType === "complete-bundle") {
      const completeBundle = parseCompleteBundleConfig(offer.selectedProductsJson);
      if (!completeBundle.bars.length) {
        console.log("[ciwi] complete bundle skipped: no bars", offer.id);
        continue;
      }
      if (!currentProductGid) {
        continue;
      }
      const belongsToBar = completeBundle.bars.some((bar) =>
        bar.products.some((p) => p.productId === currentProductGid),
      );
      if (!belongsToBar) {
        continue;
      }
    } else {
      // quantity-breaks-same
      const discountRules = parseDiscountRulesJson(offer.discountRulesJson);
      if (!discountRules.length) {
        console.log("[ciwi] offer skipped: no valid quantity discount rules", offer.id);
        continue;
      }
      const selectedIds = parseSelectedProductIds(offer.selectedProductsJson);
      if (selectedIds.length > 0) {
        if (!currentProductGid) {
          console.log("[ciwi] offer skipped: requires specific products but current product GID is null", offer.id);
          continue;
        }
        if (!selectedIds.includes(currentProductGid)) {
          console.log("[ciwi] offer skipped: current product not in selected list", offer.id, currentProductGid, selectedIds);
          continue;
        }
      }
    }

    return offer;
  }

  console.log("[ciwi] no matching offer for current product — skip bundle UI");
  return null;
}

window.__ciwiBundleState = window.__ciwiBundleState || {
  selectedCount: null,
  selectedBundleVariants: {},
  /** complete-bundle：顾客在多个 bar 中选中的那一档（仅该档加入购物车） */
  selectedCompleteBundleBarId: null,
};

function updateThemeQuantityInput(count) {
  const form = getAddToCartForm();
  if (form) {
    // 1. 找到表单内所有名为 quantity 的输入框
    const innerQtyInputs = Array.from(form.querySelectorAll('[name="quantity"]'));
    
    // 2. 找到通过 form 属性关联的 quantity 输入框
    const formId = form.getAttribute("id");
    const linkedQtyInputs = formId
      ? Array.from(document.querySelectorAll(`[name="quantity"][form="${formId}"]`))
      : [];

    // 去重，防止同一元素既在表单内又带有 form 属性
    const allQtyInputs = Array.from(new Set([...innerQtyInputs, ...linkedQtyInputs]));

    // 3. 如果都没有，则创建一个隐藏的输入框
    if (allQtyInputs.length === 0) {
      const newQtyInput = document.createElement("input");
      newQtyInput.type = "hidden";
      newQtyInput.name = "quantity";
      newQtyInput.value = count;
      form.appendChild(newQtyInput);
      allQtyInputs.push(newQtyInput);
    }

    // 4. 更新所有找到的输入框，但禁用多余的，防止重复提交导致数量翻倍
    allQtyInputs.forEach((input, index) => {
      input.value = count;
      if (index === 0) {
        input.disabled = false;
        // 触发 change 和 input 事件，以兼容不同主题的事件监听
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        // 如果有多个 quantity 输入框（如桌面端和移动端各一个），只保留第一个有效
        // 防止主题的 AJAX 提交脚本收集到多个 quantity 字段并相加（如 4 + 4 = 8）
        input.disabled = true;
      }
    });
  }
}

window.ciwiSelectBundleOption = function(count) {
  if (window.__ciwiBundleState) {
    window.__ciwiBundleState.selectedCount = count;
  }
  updateThemeQuantityInput(count);
  const currentOffer = getCurrentOffer(offersConfigCache);
  if (currentOffer) {
    syncCurrentBundleToSessionStorage(currentOffer);
  }
  const wrap = document.querySelector(".ciwi-bundle-wrapper");
  if (wrap && currentOffer) {
    const html = renderBundlePreviewHtml(currentOffer);
    if (html) wrap.innerHTML = html;
  }
  if (currentOffer?.offerType === "complete-bundle") {
    void hydrateCompleteBundleOfferInPlace(currentOffer).then((changed) => {
      if (!changed) return;
      const wrapNext = document.querySelector(".ciwi-bundle-wrapper");
      if (!wrapNext) return;
      const htmlNext = renderBundlePreviewHtml(currentOffer);
      if (htmlNext) wrapNext.innerHTML = htmlNext;
    });
  }
};

window.ciwiHandleBundleAddToCart = function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const count = window.__ciwiBundleState?.selectedCount || 1;
  updateThemeQuantityInput(count);
  const form = getAddToCartForm();
  
  if (form) {
    // 优先尝试寻找表单内部的提交按钮或带有 name="add" 的按钮
    let addBtn = form.querySelector("button[type='submit'], button[name='add'], input[type='submit'], input[name='add'], [name='add']");
    
    // 如果找不到，可能通过 form 属性关联在外部
    if (!addBtn) {
      const formId = form.getAttribute("id");
      if (formId) {
        addBtn = document.querySelector(`button[type='submit'][form='${formId}'], button[name='add'][form='${formId}'], input[type='submit'][form='${formId}'], input[name='add'][form='${formId}']`);
      }
    }

    if (addBtn) {
      addBtn.click();
    } else {
      form.submit();
    }
  } else {
    console.error("[ciwi] Add to cart form not found");
  }
};

window.ciwiSelectBundleVariant = function(barId, productId, variantId) {
  if (!window.__ciwiBundleState.selectedBundleVariants) {
    window.__ciwiBundleState.selectedBundleVariants = {};
  }
  if (!window.__ciwiBundleState.selectedBundleVariants[barId]) {
    window.__ciwiBundleState.selectedBundleVariants[barId] = {};
  }
  window.__ciwiBundleState.selectedBundleVariants[barId][productId] = String(variantId || "");
  const wrap = document.querySelector(".ciwi-bundle-wrapper");
  const currentOffer = getCurrentOffer(offersConfigCache);
  if (wrap && currentOffer && currentOffer.offerType === "complete-bundle") {
    const html = renderBundlePreviewHtml(currentOffer);
    if (html) wrap.innerHTML = html;
  }
  if (currentOffer?.offerType === "complete-bundle") {
    void hydrateCompleteBundleOfferInPlace(currentOffer);
  }
};

/** 顾客切换「生效」的 complete-bundle 栏并刷新 widget */
window.ciwiSelectCompleteBundleBar = function (barId) {
  if (!window.__ciwiBundleState) return;
  window.__ciwiBundleState.selectedCompleteBundleBarId = String(barId || "");
  const wrap = document.querySelector(".ciwi-bundle-wrapper");
  const currentOffer = getCurrentOffer(offersConfigCache);
  if (wrap && currentOffer && currentOffer.offerType === "complete-bundle") {
    const html = renderBundlePreviewHtml(currentOffer);
    if (html) wrap.innerHTML = html;
  }
  if (currentOffer) syncCurrentBundleToSessionStorage(currentOffer);
  if (currentOffer?.offerType === "complete-bundle") {
    void hydrateCompleteBundleOfferInPlace(currentOffer);
  }
};

/** 防止同一次点击触发 click + submit 时重复请求 */
let completeBundleCartAddBusy = false;

/**
 * AJAX 加购成功后通知主题刷新购物车/侧栏（不跳转 /cart）。
 * Dawn 及部分主题会监听 cart:refresh / cart:updated；多派发几种常见事件以提高兼容性。
 */
async function notifyThemeAfterCartAdd() {
  try {
    const res = await fetch("/cart.js", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    const cart = res.ok ? await res.json().catch(() => null) : null;

    document.documentElement.dispatchEvent(
      new CustomEvent("cart:refresh", { bubbles: true }),
    );
    document.dispatchEvent(new CustomEvent("cart:updated", { detail: { cart } }));
    window.dispatchEvent(new CustomEvent("shopify:cart:change", { detail: { cart } }));
    document.body.dispatchEvent(
      new CustomEvent("ajaxCart:updated", { bubbles: true, detail: { cart } }),
    );
  } catch (error) {
    console.warn("[ciwi] notifyThemeAfterCartAdd failed", error);
  }
}

/**
 * 将当前选中的 complete-bundle 档加入购物车。
 * bar.quantity 仅表示档位文案（如 Qty 2），不叠乘到每行 SKU 数量；每行固定加 1 件。
 */
async function performCompleteBundleCartAdd() {
  if (completeBundleCartAddBusy) return false;
  completeBundleCartAddBusy = true;
  try {
    const currentOffer = getCurrentOffer(offersConfigCache);
    if (!currentOffer || currentOffer.offerType !== "complete-bundle") return false;
    const config = parseCompleteBundleConfig(currentOffer?.selectedProductsJson);
    const items = [];
    const selId = window.__ciwiBundleState?.selectedCompleteBundleBarId;
    const barToUse =
      config.bars.find((b) => String(b.id) === String(selId)) || config.bars[0] || null;
    if (!barToUse || !Array.isArray(barToUse.products) || !barToUse.products.length) {
      return false;
    }
    for (const product of barToUse.products) {
      const selectedMap = window.__ciwiBundleState?.selectedBundleVariants?.[barToUse.id] || {};
      const variantId = toAjaxVariantId(
        selectedMap[product.productId] ||
          product.selectedVariantId ||
          product.variants?.[0]?.id ||
          "",
      );
      if (!variantId) continue;
      items.push({ id: Number(variantId), quantity: 1 });
    }
    if (!items.length) return false;
    const res = await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(
        "[ciwi] cart/add.js failed",
        res.status,
        body?.description || body?.message || body,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[ciwi] performCompleteBundleCartAdd failed", error);
    return false;
  } finally {
    completeBundleCartAddBusy = false;
  }
}

window.ciwiHandleCompleteBundleAddToCart = async function (event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const ok = await performCompleteBundleCartAdd();
  if (!ok) {
    window.ciwiHandleBundleAddToCart(event);
    return;
  }
  await notifyThemeAfterCartAdd();
};

function renderBundlePreviewHtml(offer) {
  if (offer.offerType === "complete-bundle") {
    const completeBundle = parseCompleteBundleConfig(offer?.selectedProductsJson);
    if (!completeBundle.bars.length) return "";
    let offerSettings = {};
    try {
      if (offer?.offerSettingsJson) {
        offerSettings = JSON.parse(offer.offerSettingsJson);
      }
    } catch (e) {}
    const accentColor = offerSettings.accentColor || "#008060";
    const cardBackgroundColor = offerSettings.cardBackgroundColor || "#ffffff";
    const borderColor = offerSettings.borderColor || "#dfe3e8";
    const titleFontSize = offerSettings.titleFontSize || 14;
    const titleFontWeight = offerSettings.titleFontWeight || "600";
    const titleColor = offerSettings.titleColor || "#111111";
    const buttonText = offerSettings.buttonText || "Add to Cart";
    const buttonPrimaryColor = offerSettings.buttonPrimaryColor || "#008060";
    const showCustomButton = offerSettings.showCustomButton !== false;
    const widgetTitle = offerSettings.title || "Bundle & Save";

    // 默认选中第一档；配置变更后若 id 不存在则回退到第一档
    if (!window.__ciwiBundleState.selectedCompleteBundleBarId) {
      window.__ciwiBundleState.selectedCompleteBundleBarId = completeBundle.bars[0].id;
    }
    if (
      !completeBundle.bars.some(
        (b) => String(b.id) === String(window.__ciwiBundleState.selectedCompleteBundleBarId),
      )
    ) {
      window.__ciwiBundleState.selectedCompleteBundleBarId = completeBundle.bars[0].id;
    }
    const selectedBarId = String(window.__ciwiBundleState.selectedCompleteBundleBarId || "");

    const barsHtml = completeBundle.bars
      .map((bar) => {
        const isSelected = String(bar.id) === selectedBarId;
        const borderCol = isSelected ? accentColor : borderColor;
        let sumOriginal = 0;
        let sumFinal = 0;
        for (const p of bar.products || []) {
          const v = resolveCompleteBundleVariant(bar, p);
          const base = parseMoneyStringToNumber(v?.price || p.price);
          const r = applyCompleteBundleProductPricing(
            p.pricing?.mode || "full_price",
            Number(p.pricing?.value) || 0,
            base,
          );
          sumOriginal += r.original;
          sumFinal += r.final;
        }
        const saved = Math.max(0, sumOriginal - sumFinal);
        const summaryHtml =
          bar.products && bar.products.length
            ? `<div style="margin-top:8px;">
                <div style="font-size:13px;font-weight:700;color:#1c1f23;display:flex;flex-wrap:wrap;gap:6px;align-items:baseline;">
                  <span>${esc(formatPrice(sumFinal))}</span>
                  ${
                    sumOriginal > sumFinal
                      ? `<span style="font-size:12px;color:#9aa0a6;text-decoration:line-through;">${esc(formatPrice(sumOriginal))}</span>`
                      : ""
                  }
                </div>
                ${
                  saved > 0
                    ? `<div style="margin-top:4px;font-size:12px;font-weight:600;color:${esc(accentColor)};">Save ${esc(formatPrice(saved))}!</div>`
                    : ""
                }
              </div>`
            : "";
        let productsHtml = "";
        const plist = bar.products || [];
        for (let idx = 0; idx < plist.length; idx++) {
          if (idx > 0 && plist.length >= 2) {
            productsHtml += `<div style="display:flex;align-items:center;justify-content:center;color:#9aa0a6;font-weight:700;width:22px;flex-shrink:0;font-size:16px;">+</div>`;
          }
          productsHtml += buildOneCompleteBundleProductHtml(bar, plist[idx]);
        }
        const productsWrap =
          plist.length >= 2
            ? `<div style="display:flex;flex-wrap:wrap;align-items:stretch;gap:6px;margin-top:8px;">${productsHtml}</div>`
            : `<div style="margin-top:8px;">${productsHtml}</div>`;
        return `<div class="create-offer-style-preview-item" style="border:2px solid ${esc(
          borderCol,
        )};border-radius:8px;padding:10px;background:${esc(cardBackgroundColor)};">
          <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;margin:0;">
            <input type="radio" name="ciwi-complete-bundle-bar-pick" style="margin-top:3px;flex-shrink:0;" ${
              isSelected ? "checked" : ""
            } onchange="window.ciwiSelectCompleteBundleBar('${esc(bar.id)}')" />
            <span style="flex:1;min-width:0;">
              <div class="create-offer-style-preview-item-title" style="color:${esc(titleColor)};">${esc(
                bar.title || "Complete the bundle",
              )}</div>
              <div class="create-offer-style-preview-item-subtitle" style="font-size:12px;color:#5c6166;margin-top:2px;">${esc(
                bar.subtitle || `Quantity break · Qty ${bar.quantity}`,
              )}</div>
            </span>
          </label>
          ${summaryHtml}
          ${productsWrap}
        </div>`;
      })
      .join("");

    return `<div class="create-offer-preview-card">
      <div class="create-offer-style-preview-header" style="color:${esc(
        titleColor,
      )} !important; font-size:${esc(titleFontSize)}px !important; font-weight:${esc(
        titleFontWeight,
      )} !important;">${esc(widgetTitle)}</div>
      <div class="create-offer-style-preview-list create-offer-style-preview-list--vertical">${barsHtml}</div>
      ${
        showCustomButton
          ? `<button type="button" class="create-offer-preview-button" onclick="window.ciwiHandleCompleteBundleAddToCart(event)" style="width:100%;margin-top:12px;padding:12px;background:${esc(
              buttonPrimaryColor,
            )};color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;">${esc(
              buttonText,
            )}</button>`
          : ""
      }
    </div>`;
  }

  // BXGY offer type support — quantity-break-style tier cards
  if (offer.offerType === 'bxgy') {
    const bxgyRules = parseBxgyDiscountRulesJson(offer?.discountRulesJson);
    if (!bxgyRules.length) return "";

    if (!window.__ciwiBundleState.selectedCount) {
      const defaultRule = bxgyRules.find(r => r.isDefault);
      window.__ciwiBundleState.selectedCount = defaultRule ? defaultRule.count : (bxgyRules[0]?.count || 1);
      setTimeout(() => updateThemeQuantityInput(window.__ciwiBundleState.selectedCount), 0);
    }
    const selectedCount = window.__ciwiBundleState.selectedCount;

    let offerSettings = {};
    try {
      if (offer?.offerSettingsJson) {
        offerSettings = JSON.parse(offer.offerSettingsJson);
      }
    } catch (e) {
      console.error("[ciwi] failed to parse offerSettingsJson", e);
    }

    const layoutFormat = offerSettings.layoutFormat || "vertical";
    const accentColor = offerSettings.accentColor || "#008060";
    const cardBackgroundColor = offerSettings.cardBackgroundColor || "#ffffff";
    const borderColor = offerSettings.borderColor || "#dfe3e8";
    const labelColor = offerSettings.labelColor || "#ffffff";
    const titleFontSize = offerSettings.titleFontSize || 14;
    const titleFontWeight = offerSettings.titleFontWeight || "600";
    const titleColor = offerSettings.titleColor || "#111111";
    const buttonText = offerSettings.buttonText || "Add to Cart";
    const buttonPrimaryColor = offerSettings.buttonPrimaryColor || "#008060";
    const showCustomButton = offerSettings.showCustomButton !== false;
    const widgetTitle = offerSettings.title || "Bundle & Save";
    const hasDefault = bxgyRules.some((r) => r.isDefault);

    const items = bxgyRules.map((rule, index) => {
      const isFeatured = hasDefault ? !!rule.isDefault : index === 0;
      const displayCount = rule.count || 1;
      return {
        count: displayCount,
        title: rule.title || `${displayCount} items`,
        subtitle: rule.subtitle || `Buy ${rule.buyQuantity}, Get ${rule.getQuantity}`,
        price: rule.discountPercent === 100
          ? `${rule.getQuantity} FREE`
          : `${rule.discountPercent}% OFF`,
        badge: rule.badge || (isFeatured ? "Most Popular" : ""),
        saveLabel: `BUY ${rule.buyQuantity} + GET ${rule.getQuantity}`,
      };
    });

    const itemsHtml = items
      .map((item) => {
        const isSelected = item.count === selectedCount;
        const featuredClass = isSelected
          ? " create-offer-style-preview-item--featured"
          : "";
        const featuredStyle = isSelected
          ? `border-color: ${esc(accentColor)} !important; background: ${esc(cardBackgroundColor)} !important; box-shadow: 0 8px 18px ${esc(accentColor)}25 !important; cursor: pointer;`
          : `border-color: ${esc(borderColor)} !important; background: ${esc(cardBackgroundColor)} !important; cursor: pointer;`;

        return `<div class="create-offer-style-preview-item${featuredClass}" style="${featuredStyle}" onclick="window.ciwiSelectBundleOption(${item.count})">
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
      </div>`;
      })
      .join("");

    return `<div class="create-offer-preview-card">
      <div class="create-offer-style-preview-header" style="color:${esc(titleColor)} !important; font-size: ${esc(titleFontSize)}px !important; font-weight: ${esc(titleFontWeight)} !important;">${esc(widgetTitle)}</div>
      <div class="create-offer-style-preview-list create-offer-style-preview-list--${layoutFormat}">
        ${itemsHtml}
      </div>
      ${showCustomButton ? `<button class="create-offer-preview-button" onclick="window.ciwiHandleBundleAddToCart()" style="width: 100%; margin-top: 12px; padding: 12px; background: ${esc(buttonPrimaryColor)}; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
        ${esc(buttonText)}
      </button>` : ""}
    </div>`;
  }
  
  // Existing logic for quantity breaks
  const discountRules = parseDiscountRulesJson(offer?.discountRulesJson);
  if (!discountRules.length) return "";

  if (!window.__ciwiBundleState.selectedCount) {
    const defaultRule = discountRules.find(r => r.isDefault);
    window.__ciwiBundleState.selectedCount = defaultRule ? defaultRule.count : (discountRules[0]?.count || 1);
    setTimeout(() => updateThemeQuantityInput(window.__ciwiBundleState.selectedCount), 0);
  }
  const selectedCount = window.__ciwiBundleState.selectedCount;

  // Extract styles from offer settings, use defaults if missing
  let offerSettings = {};
  try {
    if (offer?.offerSettingsJson) {
      offerSettings = JSON.parse(offer.offerSettingsJson);
    }
  } catch (e) {
    console.error("[ciwi] failed to parse offerSettingsJson", e);
  }
  
  const layoutFormat = offerSettings.layoutFormat || "vertical";
  const accentColor = offerSettings.accentColor || "#008060";
  const cardBackgroundColor = offerSettings.cardBackgroundColor || "#ffffff";
  const borderColor = offerSettings.borderColor || "#dfe3e8";
  const labelColor = offerSettings.labelColor || "#ffffff";
  const titleFontSize = offerSettings.titleFontSize || 14;
  const titleFontWeight = offerSettings.titleFontWeight || "600";
  const titleColor = offerSettings.titleColor || "#111111";
  const buttonText = offerSettings.buttonText || "Add to Cart";
  const buttonPrimaryColor = offerSettings.buttonPrimaryColor || "#008060";
  const showCustomButton = offerSettings.showCustomButton !== false;
  const widgetTitle = offerSettings.title || "Bundle & Save";

  const unitPrice = getCurrentUnitPrice();
  const hasDefault = discountRules.some((r) => r.isDefault);
  const items = [
    {
      count: 1,
      title: "Single",
      subtitle: "Standard price",
      price: formatPrice(unitPrice),
    },
    ...discountRules.map((rule, index) => {
      const { originalTotal, discountedTotal, saved } = calculateBundleAmounts(
        unitPrice,
        rule.count,
        rule.discountPercent,
      );
      const isFeatured = hasDefault ? !!rule.isDefault : index === 0;
      return {
        count: rule.count,
        title: rule.title || `${rule.count} items`,
        subtitle: rule.subtitle || `You save ${rule.discountPercent}%`,
        price: formatPrice(discountedTotal),
        original: formatPrice(originalTotal),
        badge: rule.badge || (isFeatured ? "Most Popular" : ""),
        saveLabel: `SAVE ${formatPrice(saved)}`,
      };
    }),
  ];

  const itemsHtml = items
    .map((item) => {
      const isSelected = item.count === selectedCount;
      const featuredClass = isSelected
        ? " create-offer-style-preview-item--featured"
        : "";
      const featuredStyle = isSelected 
        ? `border-color: ${esc(accentColor)} !important; background: ${esc(cardBackgroundColor)} !important; box-shadow: 0 8px 18px ${esc(accentColor)}25 !important; cursor: pointer;`
        : `border-color: ${esc(borderColor)} !important; background: ${esc(cardBackgroundColor)} !important; cursor: pointer;`;
        
      return `<div class="create-offer-style-preview-item${featuredClass}" style="${featuredStyle}" onclick="window.ciwiSelectBundleOption(${item.count})">
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
    })
    .join("");

  return `<div class="create-offer-preview-card">
    <div class="create-offer-style-preview-header" style="color:${esc(titleColor)} !important; font-size: ${esc(titleFontSize)}px !important; font-weight: ${esc(titleFontWeight)} !important;">${esc(widgetTitle)}</div>
    <div class="create-offer-style-preview-list create-offer-style-preview-list--${layoutFormat}">
      ${itemsHtml}
    </div>
    ${showCustomButton ? `<button type="button" class="create-offer-preview-button" onclick="window.ciwiHandleBundleAddToCart(event)" style="width: 100%; margin-top: 12px; padding: 12px; background: ${esc(buttonPrimaryColor)}; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
      ${esc(buttonText)}
    </button>` : ""}
  </div>`;
}

function parseCiwiMetafieldScript(scriptId) {
  const metaEl = document.getElementById(scriptId);
  if (!metaEl) return null;

  let raw = (metaEl.innerText || metaEl.textContent || "").trim();
  if (!raw) return null;

  // 与 bundle-cart.js 一致：兼容 Ruby hash 风格的字符串化输出
  if (raw.startsWith('"') && raw.endsWith('"')) {
    raw = raw.slice(1, -1);
  }
  const jsonLike = raw.replace(/=>/g, ":").replace(/\bnil\b/g, "null");
  return JSON.parse(jsonLike);
}

function readOffersConfigFromMetafield() {
  try {
    return parseCiwiMetafieldScript("ciwi-bundle-offers");
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
  currentMainForm = form;
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
  wrapper.style.display = isCurrentVariantAvailable() ? "block" : "none";
  return wrapper;
}

function scheduleBundlePriceRefresh(offer) {
  if (!offer) return;
  if (bundlePriceDebounceT != null) clearTimeout(bundlePriceDebounceT);
  // 略延迟：不少主题先改 variant input，再在下一帧更新 .price DOM
  bundlePriceDebounceT = setTimeout(() => {
    bundlePriceDebounceT = null;
    const wrap = document.querySelector(".ciwi-bundle-wrapper");
    if (!wrap) return;
    const html = renderBundlePreviewHtml(offer);
    if (html) {
      wrap.innerHTML = html;
      wrap.style.display = isCurrentVariantAvailable() ? "block" : "none";
    } else {
      wrap.style.display = "none";
    }
    syncCurrentBundleToSessionStorage(offer);
    hideThemeQuantitySelectors();
  }, 64);
}

function detachBundlePriceSync() {
  if (bundlePriceDebounceT != null) {
    clearTimeout(bundlePriceDebounceT);
    bundlePriceDebounceT = null;
  }
  if (priceSyncController) {
    priceSyncController.abort();
    priceSyncController = null;
  }
}

/** 变体 / 样式切换后重算 bundle 展示价（与页面主价格区同步） */
function attachBundlePriceSync(offer) {
  detachBundlePriceSync();
  const ac = new AbortController();
  priceSyncController = ac;
  const { signal } = ac;

  const refresh = () => scheduleBundlePriceRefresh(offer);

  document.addEventListener("variant:change", refresh, { signal });
  document.addEventListener("shopify:variant:change", refresh, { signal });

  const form = getAddToCartForm();
  if (form) {
    form.addEventListener("change", refresh, { capture: true, signal });
    form.addEventListener("input", refresh, { capture: true, signal });
    const idInput = form.querySelector('input[name="id"]');
    if (idInput) {
      idInput.addEventListener("change", refresh, { signal });
      const mo = new MutationObserver(refresh);
      mo.observe(idInput, { attributes: true, attributeFilter: ["value"] });
      signal.addEventListener("abort", () => mo.disconnect(), { once: true });
    }
  }

  document.addEventListener("change", refresh, { capture: true, signal });

  const root =
    form?.closest(".product, .product-section, product-info, [id^='ProductInfo'], main") ||
    document.querySelector("main");
  const priceRoot = root?.querySelector(".price");
  if (priceRoot) {
    const moPrice = new MutationObserver(refresh);
    moPrice.observe(priceRoot, { childList: true, subtree: true, characterData: true });
    signal.addEventListener("abort", () => moPrice.disconnect(), { once: true });
  }

  // complete-bundle：主题原生「添加到购物车」应与绿色 Add to Cart 一致（整档多 SKU 各 1 件）
  if (offer.offerType === "complete-bundle") {
    const isThemeAddTrigger = (t, productForm) => {
      if (!t || typeof t.closest !== "function" || !productForm) return false;
      if (!productForm.contains(t)) return false;
      if (t.closest(".ciwi-bundle-wrapper")) return false;
      if (
        t.closest(
          ".shopify-payment-button, shopify-buy-it-now-button, [data-shopify='payment-button']",
        )
      ) {
        return false;
      }
      const btn = t.closest(
        "button[type='submit'],button[name='add'],input[type='submit'][name='add'],input[name='add']",
      );
      return !!(btn && productForm.contains(btn));
    };

    document.addEventListener(
      "click",
      (e) => {
        const productForm = getAddToCartForm();
        if (!isThemeAddTrigger(e.target, productForm)) return;
        if (!document.querySelector(".ciwi-bundle-wrapper")) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        void performCompleteBundleCartAdd().then(async (ok) => {
          if (ok) await notifyThemeAfterCartAdd();
        });
      },
      { capture: true, signal },
    );
  }

  queueMicrotask(refresh);
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
    attachBundlePriceSync(offer);
    hideThemeQuantitySelectors();
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

  if (!currentMainForm) {
    currentMainForm = document.querySelector("form[action*='/cart/add']");
  }

  attachBundlePriceSync(offer);
  hideThemeQuantitySelectors();
}

function hideThemeQuantitySelectors() {
  const selectors = [
    ".quantity-selector-wrapper",
    ".product-form__quantity",
    ".product-quantity",
    "quantity-input",
    ".quantity",
    "[data-product-quantity]"
  ];
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    els.forEach((el) => {
      if (el && el.style) {
        el.style.display = "none";
      }
    });
  }
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
      console.log("[ciwi] no active env offers after enabled checks, skip bundle UI");
      return;
    }
    if (currentOffer.offerType === "complete-bundle") {
      void hydrateCompleteBundleOfferInPlace(currentOffer).then((changed) => {
        if (!changed) return;
        const wrap = document.querySelector(".ciwi-bundle-wrapper");
        if (wrap) {
          const html = renderBundlePreviewHtml(currentOffer);
          if (html) wrap.innerHTML = html;
        } else if (tryMount(currentOffer) !== "done") {
          fallbackMount(currentOffer);
        }
      });
    }
    syncCurrentBundleToSessionStorage(currentOffer);

    // Set offer name to sessionStorage for tracking.    
    const offerName = currentOffer.name || `Bundle-${currentOffer.id}`;
    sessionStorage.setItem("current-ciwi-offer-name", offerName);

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
