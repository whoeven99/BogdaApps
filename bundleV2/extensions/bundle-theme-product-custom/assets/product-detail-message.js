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
const CIWI_SUBSCRIPTION_MODE_NAME = "ciwi-subscription-mode";

// 中文注释：程序化写入 quantity / selling_plan 时会 synthetic dispatch change，否则会冒泡到
// document 上 attachBundlePriceSync 的 capture 监听器 → scheduleBundlePriceRefresh →
// 全量重绘 innerHTML → 再次 sync… 形成 F12 日志刷屏的死循环
let __ciwiSuppressBundlePriceSync = false;

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

function getCurrentProductHasSubscription() {
  const configEl = document.getElementById("ciwi-bundles-config");
  if (!configEl) return false;
  try {
    const config = JSON.parse(configEl.textContent || "{}");
    return config.hasSubscription === true;
  } catch (e) {
    return false;
  }
}

function getCurrentProductSubscriptionData() {
  const configEl = document.getElementById("ciwi-bundles-config");
  if (!configEl) return { hasSubscription: false, sellingPlanGroups: [] };
  try {
    const config = JSON.parse(configEl.textContent || "{}");
    return {
      hasSubscription: config.hasSubscription === true,
      sellingPlanGroups: Array.isArray(config.sellingPlanGroups)
        ? config.sellingPlanGroups
        : [],
    };
  } catch (e) {
    return { hasSubscription: false, sellingPlanGroups: [] };
  }
}

function getDefaultSellingPlanId() {
  const data = getCurrentProductSubscriptionData();
  // 中文注释：遍历所有 selling_plan_groups，拿到第一个有效的 selling_plan.id
  for (const group of data.sellingPlanGroups) {
    const plans = Array.isArray(group?.sellingPlans) ? group.sellingPlans : [];
    const firstPlan = plans.find(
      (plan) => plan && (plan.id !== undefined && plan.id !== null && plan.id !== ""),
    );
    if (firstPlan?.id !== undefined && firstPlan?.id !== null) {
      return String(firstPlan.id);
    }
  }
  console.warn(
    "[ciwi][subscription] getDefaultSellingPlanId: no selling plan id found",
    { sellingPlanGroups: data.sellingPlanGroups },
  );
  return "";
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

function parseDifferentProductRulesJson(discountRulesJson) {
  try {
    let parsed = discountRulesJson;
    if (typeof parsed === "string") {
      if (!parsed.trim()) return [];
      parsed = JSON.parse(parsed);
    }
    if (!Array.isArray(parsed)) return [];
    // 解析后台保存的不同产品组合包规则
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const count = Number(item.count);
        const discountPercent = Number(item.discountPercent);
        const discountValue = Number(item.discountValue);
        const priceMode = String(item.priceMode || "percentage_off");
        if (!Number.isFinite(count) || count < 1) return null;
        if (!Number.isFinite(discountPercent)) return null;
        return {
          count: Math.trunc(count),
          discountPercent: Math.max(0, Math.min(100, discountPercent)),
          priceMode: ["full_price", "percentage_off", "amount_off", "fixed_price"].includes(priceMode)
            ? priceMode
            : "percentage_off",
          discountValue: Number.isFinite(discountValue)
            ? discountValue
            : Math.max(0, Math.min(100, discountPercent)),
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

function parseProductPool(selectedProductsJson) {
  if (typeof selectedProductsJson !== "string" || !selectedProductsJson.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(selectedProductsJson);
    if (!parsed || typeof parsed !== "object") return [];
    // productPool 里包含后台选择产品时的图文信息，用于前台预览渲染
    const productPool = Array.isArray(parsed.productPool) ? parsed.productPool : [];
    return productPool
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        return {
          id: typeof item.id === "string" ? item.id : "",
          title: String(item.title || ""),
          image: String(item.image || ""),
          price: String(item.price || ""),
        };
      })
      .filter((item) => item && item.id);
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
    if (!Array.isArray(parsed)) {
      // 新结构：{ productPool: [...] }，用于不同产品组合包
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.productPool)) {
        const ids = [];
        for (const item of parsed.productPool) {
          if (typeof item === "string") {
            ids.push(item);
            continue;
          }
          if (item && typeof item === "object" && item.id) {
            ids.push(String(item.id));
          }
        }
        return ids;
      }
      return [];
    }
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

/** 与 Admin / Function 对齐的购物车行属性名（勿改，已写入服务端白名单与配送折扣逻辑） */
const CIWI_PROP_OFFER_ID = "__ciwi_bundle_offer_id";
const CIWI_PROP_TIER = "__ciwi_bundle_tier";

/**
 * 从 offerSettingsJson 读取 progressiveGifts；未开启则返回 null
 */
function getProgressiveGiftsConfigFromOffer(offer) {
  if (!offer?.offerSettingsJson) return null;
  try {
    const root = JSON.parse(offer.offerSettingsJson);
    const pg = root && root.progressiveGifts;
    if (!pg || !pg.enabled) return null;
    return pg;
  } catch (e) {
    return null;
  }
}

/**
 * 根据当前选档（与 Bar 序号 1-based 对齐）计算 tier 属性值，规则与后台预览一致
 */
function computeSelectedBarIndexForOffer(offer) {
  const sc = Number(window.__ciwiBundleState?.selectedCount ?? 1);
  if (offer.offerType === "bxgy") {
    const rules = parseBxgyDiscountRulesJson(offer.discountRulesJson);
    const idx = rules.findIndex((r) => Number(r.count) === sc);
    return idx >= 0 ? idx + 1 : 1;
  }
  if (sc === 1) return 1;
  const rules = parseDiscountRulesJson(offer.discountRulesJson);
  const idx = rules.findIndex((r) => Number(r.count) === sc);
  return idx >= 0 ? idx + 2 : 1;
}

function isProgressiveGiftUnlockedStorefront(gift, barIndex, lineQty) {
  const mode = String(gift.unlockMode || "tier_index");
  if (mode === "at_count") {
    const need = Math.max(1, Math.trunc(Number(gift.unlockAtCount) || 1));
    return Math.max(1, Math.trunc(Number(lineQty) || 1)) >= need;
  }
  const needBar = Math.max(1, Math.trunc(Number(gift.unlockTierIndex) || 1));
  return Math.max(1, Math.trunc(Number(barIndex) || 1)) >= needBar;
}

function getCiwiBundlesPreviewContextLine() {
  try {
    const el = document.getElementById("ciwi-bundles-config");
    const j = JSON.parse(el?.textContent || "{}");
    const parts = [];
    if (j.countryIsoCode) parts.push(String(j.countryIsoCode));
    if (j.marketId) parts.push(`market:${String(j.marketId)}`);
    return parts.length ? parts.join(" / ") : "—";
  } catch (e) {
    return "—";
  }
}

/**
 * 店面前台：阶梯赠品 HTML（免邮提示 + 锁定态）；与 Admin 预览结构尽量一致
 */
function renderProgressiveGiftsStorefrontHtml(offer, barIndex, lineQty) {
  const cfg = getProgressiveGiftsConfigFromOffer(offer);
  if (!cfg) return "";
  const layout = ["vertical", "horizontal", "card", "compact"].includes(String(cfg.layout))
    ? cfg.layout
    : "vertical";
  const gifts = Array.isArray(cfg.gifts) ? cfg.gifts : [];
  if (!gifts.length) return "";

  const itemsHtml = gifts
    .map((gift) => {
      const unlocked = isProgressiveGiftUnlockedStorefront(gift, barIndex, lineQty);
      if (cfg.hideGiftsUntilUnlocked && !unlocked) return "";
      const lockLabel = unlocked ? "已解锁" : "未解锁";
      const showLock = cfg.showLabelsForLockedGifts !== false || unlocked;
      const img =
        gift.imageUrl &&
        String(gift.imageUrl).trim() &&
        `<div class="ciwi-progressive-gift__img-wrap"><img class="ciwi-progressive-gift__img" src="${esc(
          gift.imageUrl,
        )}" alt="" loading="lazy" decoding="async" /></div>`;
      const sub =
        gift.type === "free_shipping"
          ? `<div class="create-offer-style-preview-item-subtitle">${esc(
              gift.subtitle ||
                "结账页对符合条件的运费 100% 折扣（以 Checkout 为准；购物车 AJAX 不展示折后运费）",
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
        <div class="create-offer-style-preview-item-title">${esc(gift.title || "Free shipping")}</div>
        ${sub}
      </div>`;
    })
    .filter(Boolean)
    .join("");

  if (!itemsHtml.trim()) return "";

  return `<div class="ciwi-progressive-gifts" data-layout="${esc(layout)}">
    <div class="ciwi-progressive-gifts__head">
      <div class="ciwi-progressive-gifts__title">${esc(cfg.title || "Progressive gifts")}</div>
      ${
        cfg.subtitle
          ? `<div class="ciwi-progressive-gifts__sub">${esc(cfg.subtitle)}</div>`
          : ""
      }
    </div>
    <div class="create-offer-style-preview-list create-offer-style-preview-list--${esc(
      layout,
    )} ciwi-progressive-gifts__list">
      ${itemsHtml}
    </div>
    <p class="ciwi-progressive-gifts__legal">${esc(
      "当前市场 / 国家：" + getCiwiBundlesPreviewContextLine() + "；免邮以 Checkout 为准。",
    )}</p>
  </div>`;
}

/** 将档位与 Offer Id 写入加购表单，供 Checkout Function 读取 line item properties */
function ensureBundleLineProperties(offer) {
  const form = getAddToCartForm();
  if (!form || !offer || !offer.id) return;
  form.querySelectorAll('input[type="hidden"][data-ciwi-bundle-line-prop="1"]').forEach((n) => n.remove());
  const bar = computeSelectedBarIndexForOffer(offer);
  const mk = (k, v) => {
    const inp = document.createElement("input");
    inp.type = "hidden";
    inp.setAttribute("data-ciwi-bundle-line-prop", "1");
    inp.name = `properties[${k}]`;
    inp.value = String(v);
    form.appendChild(inp);
  };
  mk(CIWI_PROP_OFFER_ID, String(offer.id));
  mk(CIWI_PROP_TIER, String(bar));
}

/**
 * 在加购表单 submit 捕获阶段再次写入 bundle 行属性。
 * 部分主题在更早阶段序列化 FormData，导致仅靠切换档位时写入的隐藏域未进入请求；
 * 此处保证尽量与结账配送折扣 Function 所需的 __ciwi_* 属性一致。
 */
function attachBundleSubmitLinePropsGuard() {
  const form = getAddToCartForm();
  if (!form || form.dataset.ciwiBundleSubmitPropsGuard === "1") return;
  form.dataset.ciwiBundleSubmitPropsGuard = "1";
  form.addEventListener(
    "submit",
    () => {
      const offer = getCurrentOffer(offersConfigCache);
      if (offer) ensureBundleLineProperties(offer);
    },
    { capture: true },
  );
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
        console.log("[ciwi] complete bundle skipped: current product not in any bar", offer.id);
        continue;
      }
    } else if (offer.offerType === "quantity-breaks-different") {
      const differentRules = parseDifferentProductRulesJson(offer.discountRulesJson);
      if (!differentRules.length) {
        console.log("[ciwi] different-products offer skipped: no valid discount rules", offer.id);
        continue;
      }
      const selectedIds = parseSelectedProductIds(offer.selectedProductsJson);
      if (!selectedIds.length) {
        console.log("[ciwi] different-products offer skipped: selected pool is empty", offer.id);
        continue;
      }
      if (!currentProductGid || !selectedIds.includes(currentProductGid)) {
        console.log("[ciwi] different-products offer skipped: current product not in pool", offer.id);
        continue;
      }
    } else {
      // quantity-breaks-same / subscription
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

      // 中文注释：订阅型 offer 需要当前商品本身具备 selling plan，否则前台不展示订阅区块
      if (offer.offerType === "subscription" && !getCurrentProductHasSubscription()) {
        console.log("[ciwi] subscription offer skipped: current product has no selling plan", offer.id);
        continue;
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
  subscriptionMode: null,
  selectedSellingPlanId: "",
  // 不同产品组合的已选附加商品，按 ruleCount 存储
  differentSelections: {},
};

function getDifferentSelectionKey(count) {
  return String(Math.max(1, Number(count) || 1));
}

function getDifferentSelectionsForCount(count) {
  const key = getDifferentSelectionKey(count);
  const raw = window.__ciwiBundleState?.differentSelections?.[key];
  return Array.isArray(raw) ? raw : [];
}

function setDifferentSelectionForCount(count, slotIndex, product) {
  const key = getDifferentSelectionKey(count);
  if (!window.__ciwiBundleState) return;
  if (!window.__ciwiBundleState.differentSelections) {
    window.__ciwiBundleState.differentSelections = {};
  }
  const current = Array.isArray(window.__ciwiBundleState.differentSelections[key])
    ? [...window.__ciwiBundleState.differentSelections[key]]
    : [];
  current[Math.max(0, Number(slotIndex) || 0)] = product;
  window.__ciwiBundleState.differentSelections[key] = current.filter(Boolean);
}

function getMainVariantIdFromForm() {
  const form = getAddToCartForm();
  const input = form?.querySelector("input[name='id']");
  return input ? String(input.value || "").trim() : "";
}

async function addDifferentBundleToCart(offer) {
  const selectedCount = Math.max(1, Number(window.__ciwiBundleState?.selectedCount || 1));
  const mainVariantId = getMainVariantIdFromForm();
  if (!mainVariantId) return false;

  const selectedExtras = getDifferentSelectionsForCount(selectedCount).slice(
    0,
    Math.max(0, selectedCount - 1),
  );
  const items = [
    {
      id: mainVariantId,
      quantity: 1,
      properties: {
        _ciwi_bundle_offer_id: String(offer?.id || ""),
        _ciwi_bundle_offer_type: "quantity-breaks-different",
        _ciwi_bundle_count: String(selectedCount),
      },
    },
    ...selectedExtras
      .map((p) => ({
        id: p?.variantId ? String(p.variantId) : "",
        quantity: 1,
        properties: {
          _ciwi_bundle_offer_id: String(offer?.id || ""),
          _ciwi_bundle_offer_type: "quantity-breaks-different",
          _ciwi_bundle_count: String(selectedCount),
        },
      }))
      .filter((x) => x.id),
  ];

  // 如果用户没选附加商品，仍然保持旧行为（主商品数量）
  if (items.length === 1 && selectedCount > 1) {
    items[0].quantity = selectedCount;
  }

  try {
    const resp = await fetch("/cart/add.js", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ items }),
    });
    if (!resp.ok) {
      console.error("[ciwi] addDifferentBundleToCart failed", resp.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[ciwi] addDifferentBundleToCart error", e);
    return false;
  }
}

function notifyThemeCartUpdated() {
  // 尝试通知不同主题刷新购物车抽屉/角标
  try {
    document.dispatchEvent(new CustomEvent("cart:refresh", { bubbles: true }));
    document.dispatchEvent(new CustomEvent("cart:updated", { bubbles: true }));
    window.dispatchEvent(new Event("cart:refresh"));
    window.dispatchEvent(new Event("cart:updated"));
  } catch (e) {
    // ignore notify error
  }
}

function ensureDifferentProductPickerModal() {
  let modal = document.getElementById("ciwi-different-picker-modal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "ciwi-different-picker-modal";
  modal.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;";
  modal.innerHTML = `
    <div style="width:min(560px,100%);max-height:80vh;overflow:auto;background:#fff;border-radius:10px;padding:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong style="font-size:16px;">Choose product</strong>
        <button type="button" data-ciwi-close="1" style="border:none;background:#f3f4f6;border-radius:6px;padding:4px 10px;cursor:pointer;">✕</button>
      </div>
      <div id="ciwi-different-picker-list" style="display:flex;flex-direction:column;gap:8px;"></div>
    </div>
  `;
  modal.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target === modal || target.getAttribute("data-ciwi-close") === "1") {
      modal.style.display = "none";
    }
  });
  document.body.appendChild(modal);
  return modal;
}

function openDifferentProductPicker({ offer, ruleCount, slotIndex }) {
  const productPool = parseProductPool(offer?.selectedProductsJson);
  if (!productPool.length) return;
  const modal = ensureDifferentProductPickerModal();
  const list = modal.querySelector("#ciwi-different-picker-list");
  if (!list) return;
  list.innerHTML = productPool
    .map(
      (p) => `
      <button type="button" data-ciwi-pick-id="${esc(String(p.id))}" style="display:flex;align-items:center;gap:10px;text-align:left;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:#fff;cursor:pointer;">
        ${
          p.image
            ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;" />`
            : `<div style="width:40px;height:40px;background:#f3f4f6;border-radius:6px;"></div>`
        }
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(
            p.title || "Product",
          )}</div>
          <div style="font-size:12px;color:#6b7280;">${esc(p.price || "")}</div>
        </div>
      </button>
    `,
    )
    .join("");

  list.querySelectorAll("[data-ciwi-pick-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-ciwi-pick-id");
      const picked = productPool.find((p) => String(p.id) === String(id));
      if (!picked) return;
      setDifferentSelectionForCount(ruleCount, slotIndex, picked);
      modal.style.display = "none";
      const wrap = document.querySelector(".ciwi-bundle-wrapper");
      if (wrap) {
        const html = renderBundlePreviewHtml(offer);
        if (html) wrap.innerHTML = html;
      }
    });
  });

  modal.style.display = "flex";
}

let ciwiAllActiveProductsCache = null;
async function loadAllActiveProductsFromStorefront() {
  if (Array.isArray(ciwiAllActiveProductsCache)) return ciwiAllActiveProductsCache;
  try {
    // 主题前台只能拿到 storefront 公开可售商品，这里作为 active 产品候选池
    const resp = await fetch("/products.json?limit=250", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    const products = Array.isArray(json?.products) ? json.products : [];
    ciwiAllActiveProductsCache = products
      .map((p) => ({
        id: p?.admin_graphql_api_id || (p?.id ? `gid://shopify/Product/${p.id}` : ""),
        variantId:
          Array.isArray(p?.variants) && p.variants[0]?.id
            ? String(p.variants[0].id)
            : "",
        title: String(p?.title || ""),
        image: p?.images?.[0]?.src || "",
        price: p?.variants?.[0]?.price || "",
      }))
      .filter((p) => p.id);
    return ciwiAllActiveProductsCache;
  } catch {
    return [];
  }
}

async function openDifferentProductPickerWithAllProducts({ offer, ruleCount, slotIndex }) {
  const explicitPool = parseProductPool(offer?.selectedProductsJson);
  const allActive = await loadAllActiveProductsFromStorefront();
  // 合并并去重，确保既有后台配置池，也有全店 active 产品可选
  const mergedMap = new Map();
  [...explicitPool, ...allActive].forEach((p) => {
    if (!p || !p.id) return;
    if (!mergedMap.has(String(p.id))) mergedMap.set(String(p.id), p);
  });
  const mergedPool = Array.from(mergedMap.values());
  if (!mergedPool.length) return;

  const modal = ensureDifferentProductPickerModal();
  const list = modal.querySelector("#ciwi-different-picker-list");
  if (!list) return;
  list.innerHTML = mergedPool
    .map(
      (p) => `
      <button type="button" data-ciwi-pick-id="${esc(String(p.id))}" style="display:flex;align-items:center;gap:10px;text-align:left;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:#fff;cursor:pointer;">
        ${
          p.image
            ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;" />`
            : `<div style="width:40px;height:40px;background:#f3f4f6;border-radius:6px;"></div>`
        }
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(
            p.title || "Product",
          )}</div>
          <div style="font-size:12px;color:#6b7280;">${esc(p.price || "")}</div>
        </div>
      </button>
    `,
    )
    .join("");
  list.querySelectorAll("[data-ciwi-pick-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-ciwi-pick-id");
      const picked = mergedPool.find((p) => String(p.id) === String(id));
      if (!picked) return;
      setDifferentSelectionForCount(ruleCount, slotIndex, picked);
      modal.style.display = "none";
      const wrap = document.querySelector(".ciwi-bundle-wrapper");
      if (wrap) {
        const html = renderBundlePreviewHtml(offer);
        if (html) wrap.innerHTML = html;
      }
    });
  });
  modal.style.display = "flex";
}

window.ciwiOpenDifferentPicker = async function(event, ruleCount, slotIndex) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const currentOffer = getCurrentOffer(offersConfigCache);
  if (!currentOffer || currentOffer.offerType !== "quantity-breaks-different") return;
  await openDifferentProductPickerWithAllProducts({
    offer: currentOffer,
    ruleCount,
    slotIndex,
  });
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
    __ciwiSuppressBundlePriceSync = true;
    try {
    allQtyInputs.forEach((input, index) => {
      const prev = String(input.value);
      input.value = count;
      if (index === 0) {
        input.disabled = false;
        // 触发 change 和 input 事件，以兼容不同主题的事件监听
        if (String(count) === prev) {
          return;
        }
        // 中文注释：必须在 suppress 块内 dispatch，避免触发整卡 bundle 重绘死循环
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        // 如果有多个 quantity 输入框（如桌面端和移动端各一个），只保留第一个有效
        // 防止主题的 AJAX 提交脚本收集到多个 quantity 字段并相加（如 4 + 4 = 8）
        input.disabled = true;
      }
    });
    } finally {
      __ciwiSuppressBundlePriceSync = false;
    }
  }
}

function updateThemeSellingPlanInput(sellingPlanId) {
  const form = getAddToCartForm();
  if (!form) return;

  const innerInputs = Array.from(form.querySelectorAll("[name='selling_plan']"));
  const formId = form.getAttribute("id");
  const linkedInputs = formId
    ? Array.from(document.querySelectorAll(`[name="selling_plan"][form="${formId}"]`))
    : [];
  const allInputs = Array.from(new Set([...innerInputs, ...linkedInputs]));

  if (allInputs.length === 0) {
    const newInput = document.createElement("input");
    newInput.type = "hidden";
    newInput.name = "selling_plan";
    form.appendChild(newInput);
    allInputs.push(newInput);
  }

  // 中文注释：订阅模式写入 selling_plan，一次性购买则清空并禁用，避免旧值被提交
  __ciwiSuppressBundlePriceSync = true;
  try {
  allInputs.forEach((input, index) => {
    const prevVal = String(input.value);
    const prevDisabled = input.disabled;
    if (sellingPlanId) {
      input.value = sellingPlanId;
      input.disabled = index > 0;
    } else {
      input.value = "";
      input.disabled = true;
    }
    const valChanged = String(input.value) !== prevVal;
    const disabledChanged = input.disabled !== prevDisabled;
    if (!valChanged && !disabledChanged) {
      return;
    }
    // 中文注释：synthetic 事件会触发 document capture 的 refresh，必须用 suppress 打断反馈环
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  } finally {
    __ciwiSuppressBundlePriceSync = false;
  }
}

function syncSubscriptionSelectionToTheme(offer) {
  if (!offer || offer.offerType !== "subscription") {
    console.log(
      "[ciwi][subscription] syncSubscriptionSelectionToTheme skipped: offer is not subscription type",
      { offerType: offer?.offerType },
    );
    return;
  }
  const defaultSellingPlanId = getDefaultSellingPlanId();
  const mode = window.__ciwiBundleState?.subscriptionMode || "one-time";
  console.log("[ciwi][subscription] syncSubscriptionSelectionToTheme", {
    mode,
    defaultSellingPlanId,
    offerId: offer.offerId || offer.id,
  });
  if (mode === "subscription" && defaultSellingPlanId) {
    window.__ciwiBundleState.selectedSellingPlanId = defaultSellingPlanId;
    updateThemeSellingPlanInput(defaultSellingPlanId);
    return;
  }
  window.__ciwiBundleState.selectedSellingPlanId = "";
  updateThemeSellingPlanInput("");
}

window.ciwiSelectBundleOption = function(count) {
  if (window.__ciwiBundleState) {
    window.__ciwiBundleState.selectedCount = count;
  }
  updateThemeQuantityInput(count);
  const currentOffer = getCurrentOffer(offersConfigCache);
  if (currentOffer) {
    syncCurrentBundleToSessionStorage(currentOffer);
    ensureBundleLineProperties(currentOffer);
  }
  const wrap = document.querySelector(".ciwi-bundle-wrapper");
  if (wrap && currentOffer) {
    const html = renderBundlePreviewHtml(currentOffer);
    if (html) {
      wrap.innerHTML = html;
      bindBundleInteractions(wrap);
      syncSubscriptionSelectionToTheme(currentOffer);
    }
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

window.ciwiSelectSubscriptionMode = function(mode) {
  console.log("[ciwi][subscription] ciwiSelectSubscriptionMode called", { mode });
  if (!window.__ciwiBundleState) {
    console.warn("[ciwi][subscription] __ciwiBundleState is not initialized");
    return;
  }
  const nextMode = mode === "subscription" ? "subscription" : "one-time";
  const prevMode = window.__ciwiBundleState.subscriptionMode;
  window.__ciwiBundleState.subscriptionMode = nextMode;
  console.log("[ciwi][subscription] mode changed", { prevMode, nextMode });

  // 中文注释：如果用户选择订阅，但商品没有可用的 selling plan，直接给用户反馈而不是静默回退
  if (nextMode === "subscription") {
    const defaultSellingPlanId = getDefaultSellingPlanId();
    if (!defaultSellingPlanId) {
      console.error(
        "[ciwi][subscription] cannot switch to subscription mode: product has no selling plan",
      );
    }
  }

  const currentOffer = getCurrentOffer(offersConfigCache);
  syncSubscriptionSelectionToTheme(currentOffer);
  const wrap = document.querySelector(".ciwi-bundle-wrapper");
  if (!wrap) {
    console.warn("[ciwi][subscription] .ciwi-bundle-wrapper not found in DOM, cannot re-render");
    return;
  }
  if (!currentOffer) {
    console.warn(
      "[ciwi][subscription] getCurrentOffer returned null, cannot re-render. Check offer rules/market/product GID.",
    );
    return;
  }
  const html = renderBundlePreviewHtml(currentOffer);
  if (html) {
    wrap.innerHTML = html;
    bindBundleInteractions(wrap);
    syncSubscriptionSelectionToTheme(currentOffer);
    console.log("[ciwi][subscription] bundle UI re-rendered after mode change");
  } else {
    console.warn("[ciwi][subscription] renderBundlePreviewHtml returned empty, UI not updated");
  }
};

function bindBundleInteractions(root) {
  if (!root) return;

  const bundleOptions = Array.from(
    root.querySelectorAll("[data-ciwi-bundle-count]"),
  );
  bundleOptions.forEach((option) => {
    if (option.dataset.ciwiBound === "true") return;
    option.dataset.ciwiBound = "true";
    option.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextCount = Number(option.getAttribute("data-ciwi-bundle-count"));
      if (Number.isFinite(nextCount) && nextCount > 0) {
        window.ciwiSelectBundleOption(nextCount);
      }
    });
  });

  const subscriptionOptions = Array.from(
    root.querySelectorAll("[data-ciwi-subscription-mode]"),
  );
  console.log("[ciwi][subscription] bindBundleInteractions — subscription options count:", subscriptionOptions.length);

  subscriptionOptions.forEach((option) => {
    if (option.dataset.ciwiBound === "true") return;
    option.dataset.ciwiBound = "true";
    const mode = option.getAttribute("data-ciwi-subscription-mode");

    // 中文注释：label 的 click 负责主交互；为兼容主题事件拦截，用 capture 监听防止被中途 stopPropagation
    option.addEventListener(
      "click",
      (event) => {
        console.log("[ciwi][subscription] click on option", {
          mode,
          target: event.target?.tagName,
        });
        event.preventDefault();
        event.stopPropagation();
        window.ciwiSelectSubscriptionMode(mode);
      },
      { capture: false },
    );

    // 中文注释：radio input 的 change 事件作为兜底，防止某些主题拦截 label click
    const radio = option.querySelector("input[type='radio']");
    if (radio) {
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        console.log("[ciwi][subscription] radio change fallback", { mode });
        // 中文注释：ciwiSelectSubscriptionMode 幂等，重复调用安全
        window.ciwiSelectSubscriptionMode(mode);
      });
    } else {
      console.warn("[ciwi][subscription] no radio input found under option label", { mode });
    }
  });
}

window.ciwiHandleBundleAddToCart = async function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  let currentOffer = getCurrentOffer(offersConfigCache);
  if (
    currentOffer &&
    currentOffer.offerType === "quantity-breaks-different"
  ) {
    const ok = await addDifferentBundleToCart(currentOffer);
    if (ok) {
      notifyThemeCartUpdated();
      return;
    }
  }
  const count = window.__ciwiBundleState?.selectedCount || 1;
  updateThemeQuantityInput(count);
  currentOffer = getCurrentOffer(offersConfigCache);
  syncSubscriptionSelectionToTheme(currentOffer);
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
let ciwiDifferentFormBound = false;
function bindThemeNativeAddToCart(offer) {
  if (!offer || offer.offerType !== "quantity-breaks-different") return;
  if (ciwiDifferentFormBound) return;
  const form = getAddToCartForm();
  if (!form) return;
  ciwiDifferentFormBound = true;

  // 让主题原生「添加到购物车」按钮与 Bundle Add to Cart 逻辑一致
  form.addEventListener(
    "submit",
    async (event) => {
      const currentOffer = getCurrentOffer(offersConfigCache);
      if (!currentOffer || currentOffer.offerType !== "quantity-breaks-different") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const ok = await addDifferentBundleToCart(currentOffer);
      if (ok) {
        notifyThemeCartUpdated();
      }
    },
    true,
  );
}

function renderBundlePreviewHtml(offer) {
  if (offer.offerType === "quantity-breaks-different") {
    const rules = parseDifferentProductRulesJson(offer?.discountRulesJson);
    if (!rules.length) return "";
    const productPool = parseProductPool(offer?.selectedProductsJson);
    const poolMap = new Map(productPool.map((p) => [String(p.id), p]));

    if (!window.__ciwiBundleState.selectedCount) {
      const defaultRule = rules.find((r) => r.isDefault);
      window.__ciwiBundleState.selectedCount = defaultRule
        ? defaultRule.count
        : (rules[0]?.count || 1);
      setTimeout(
        () => updateThemeQuantityInput(window.__ciwiBundleState.selectedCount),
        0,
      );
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

    const hasDefault = rules.some((r) => r.isDefault);
    const unitPrice = getCurrentUnitPrice();
    const itemsHtml = rules
      .map((rule, index) => {
        const isFeatured = hasDefault ? !!rule.isDefault : index === 0;
        const isSelected = selectedCount === rule.count;
        const featuredStyle = isSelected
          ? `border-color: ${esc(accentColor)} !important; background: ${esc(cardBackgroundColor)} !important; box-shadow: 0 8px 18px ${esc(accentColor)}25 !important; cursor: pointer;`
          : `border-color: ${esc(borderColor)} !important; background: ${esc(cardBackgroundColor)} !important; cursor: pointer;`;
        const primary = productPool[0] || null;
        const selectedExtras = getDifferentSelectionsForCount(rule.count).slice(
          0,
          Math.max(0, rule.count - 1),
        );
        const base = Number(primary?.price || unitPrice) || unitPrice;
        const extrasTotal = selectedExtras.reduce(
          (sum, p) => sum + (Number(p?.price || 0) || 0),
          0,
        );
        const mode = rule.priceMode || "percentage_off";
        const value = Number.isFinite(Number(rule.discountValue))
          ? Number(rule.discountValue)
          : Number(rule.discountPercent || 0);
        const original = base + extrasTotal;
        const effectiveCount = Math.max(1, 1 + selectedExtras.length);
        let discounted = original;
        if (mode === "percentage_off") {
          discounted = original * (1 - Math.max(0, Math.min(100, value)) / 100);
        } else if (mode === "amount_off") {
          discounted = Math.max(0, original - Math.max(0, value) * effectiveCount);
        } else if (mode === "fixed_price") {
          discounted = Math.max(0, value) * effectiveCount;
        }
        const chooseEnabled = offerSettings.enableMultiProductBundle === true && rule.count > 1;
        const chooseCount = Math.max(0, Math.max(0, rule.count - 1) - selectedExtras.length);
        const chooseColor = offerSettings.chooseButtonColor || "#111111";
        const chooseSize = offerSettings.chooseButtonSize || 24;
        const chooseImageSize = offerSettings.chooseImageSize || 36;
        const chooseRowHtml = chooseEnabled
          ? `<div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
              ${Array.from({ length: chooseCount })
                .map(
                  (_, idx) =>
                    `<button type="button" onclick="window.ciwiOpenDifferentPicker(event, ${rule.count}, ${
                      selectedExtras.length + idx
                    })" style="width:${esc(chooseSize)}px;height:${esc(chooseSize)}px;border-radius:4px;border:1px solid ${esc(chooseColor)};background:#fff;color:${esc(chooseColor)};font-weight:700;cursor:pointer;">+</button>`,
                )
                .join("")}
              ${
                chooseCount > 0
                  ? `<button type="button" onclick="window.ciwiOpenDifferentPicker(event, ${rule.count}, ${selectedExtras.length})" style="height:${esc(chooseSize)}px;padding:0 10px;border-radius:4px;border:1px solid ${esc(chooseColor)};background:${esc(chooseColor)};color:#fff;font-size:11px;cursor:pointer;">${esc(offerSettings.chooseButtonText || "Choose")}</button>`
                  : ""
              }
            </div>`
          : "";
        const extrasHtml = selectedExtras
          .map(
            (p) => `<div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
              ${
                p?.image
                  ? `<img src="${esc(p.image)}" alt="${esc(p.title || "Product")}" style="width:${esc(chooseImageSize)}px;height:${esc(chooseImageSize)}px;object-fit:cover;border-radius:4px;" />`
                  : `<div style="width:${esc(chooseImageSize)}px;height:${esc(chooseImageSize)}px;border-radius:4px;background:#f4f6f8;"></div>`
              }
              <div style="flex:1;min-width:0;">
                <div style="font-size:12px;line-height:1.2;color:#1c1f23;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(
                  p?.title || "Product",
                )}</div>
                <div style="font-size:11px;color:#6b7280;">${esc(p?.price || "")}</div>
              </div>
            </div>`,
          )
          .join("");
        const productRowHtml = primary
          ? `<div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
              ${
                primary.image
                  ? `<img src="${esc(primary.image)}" alt="${esc(primary.title || "Product")}" style="width:${esc(chooseImageSize)}px;height:${esc(chooseImageSize)}px;object-fit:cover;border-radius:4px;" />`
                  : `<div style="width:${esc(chooseImageSize)}px;height:${esc(chooseImageSize)}px;border-radius:4px;background:#f4f6f8;"></div>`
              }
              <div style="flex:1;min-width:0;">
                <div style="font-size:12px;line-height:1.2;color:#1c1f23;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(primary.title || "Product")}</div>
                <div style="font-size:11px;color:#6b7280;">${esc(primary.price || "")}</div>
              </div>
            </div>`
          : "";

        return `<div class="create-offer-style-preview-item${isFeatured ? " create-offer-style-preview-item--featured" : ""}" style="${featuredStyle}" onclick="window.ciwiSelectBundleOption(${rule.count})">
          ${rule.badge ? `<div class="create-offer-style-preview-badge" style="background:${esc(accentColor)} !important; color:${esc(labelColor)} !important;">${esc(rule.badge)}</div>` : ""}
          <div class="create-offer-style-preview-item-title">${esc(rule.title || `${rule.count} pack`)}</div>
          <div class="create-offer-style-preview-item-subtitle">${esc(rule.subtitle || `${rule.discountPercent}% OFF`)}</div>
          <div class="create-offer-style-preview-item-price">${esc(formatPrice(discounted))}</div>
          ${discounted < original ? `<div class="create-offer-style-preview-item-original">${esc(formatPrice(original))}</div>` : ""}
          ${productRowHtml}
          ${extrasHtml}
          ${chooseRowHtml}
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

  if (offer.offerType === "complete-bundle") {
    const completeBundle = parseCompleteBundleConfig(offer?.selectedProductsJson);
    if (!completeBundle.bars.length) return "";

    let offerSettings = {};
    try {
      if (offer?.offerSettingsJson) {
        offerSettings = JSON.parse(offer.offerSettingsJson);
      }
    } catch (e) {
      console.error("[ciwi] failed to parse offerSettingsJson", e);
    }
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

        return `<div class="create-offer-style-preview-item${featuredClass}" style="${featuredStyle}" data-ciwi-bundle-count="${esc(item.count)}">
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

    const barIdxBxgy = computeSelectedBarIndexForOffer(offer);
    const progressiveBxgy = renderProgressiveGiftsStorefrontHtml(offer, barIdxBxgy, selectedCount);

    return `<div class="create-offer-preview-card">
      <div class="create-offer-style-preview-header" style="color:${esc(titleColor)} !important; font-size: ${esc(titleFontSize)}px !important; font-weight: ${esc(titleFontWeight)} !important;">${esc(widgetTitle)}</div>
      <div class="create-offer-style-preview-list create-offer-style-preview-list--${layoutFormat}">
        ${itemsHtml}
      </div>
      ${showCustomButton ? `<button class="create-offer-preview-button" onclick="window.ciwiHandleBundleAddToCart()" style="width: 100%; margin-top: 12px; padding: 12px; background: ${esc(buttonPrimaryColor)}; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
        ${esc(buttonText)}
      </button>` : ""}
    </div>` + progressiveBxgy;
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
        
      return `<div class="create-offer-style-preview-item${featuredClass}" style="${featuredStyle}" data-ciwi-bundle-count="${esc(item.count)}">
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

  const barIdxQty = computeSelectedBarIndexForOffer(offer);
  const progressiveQty = renderProgressiveGiftsStorefrontHtml(offer, barIdxQty, selectedCount);
  let subscriptionHtml = "";
  const hasProductSubscription = getCurrentProductHasSubscription();
  console.log("[ciwi][subscription] render pre-check", {
    offerType: offer?.offerType,
    hasProductSubscription,
    subscriptionEnabled: offerSettings.subscriptionEnabled,
  });
  if (offer?.offerType === "subscription" && hasProductSubscription) {
    const subscriptionEnabled = offerSettings.subscriptionEnabled === true;
    if (!subscriptionEnabled) {
      console.warn(
        "[ciwi][subscription] offer.subscriptionEnabled is false — subscription UI not rendered",
        { offerId: offer.offerId || offer.id },
      );
    }
    if (subscriptionEnabled) {
      const defaultSellingPlanId = getDefaultSellingPlanId();
      const subscriptionTitle = offerSettings.subscriptionTitle || "Subscribe & Save 20%";
      const subscriptionSubtitle = offerSettings.subscriptionSubtitle || "Delivered weekly";
      const oneTimeTitle = offerSettings.oneTimeTitle || "One-time purchase";
      const oneTimeSubtitle = offerSettings.oneTimeSubtitle || "";
      const subscriptionDefaultSelected =
        offerSettings.subscriptionDefaultSelected !== false;
      const defaultMode =
        subscriptionDefaultSelected && defaultSellingPlanId
          ? "subscription"
          : "one-time";

      if (!window.__ciwiBundleState.subscriptionMode) {
        window.__ciwiBundleState.subscriptionMode = defaultMode;
      }
      // 中文注释：这里曾经把 subscriptionMode 强制回退为 "one-time"（当 defaultSellingPlanId 为空时），
      // 会导致「点击 Subscribe 时 UI 立刻弹回 One-time」的视觉错觉。
      // 现改为只在渲染时读取状态，不再覆盖用户的显式选择，便于暴露真实的问题（selling_plan 未配置等）。
      if (
        window.__ciwiBundleState.subscriptionMode === "subscription" &&
        !defaultSellingPlanId
      ) {
        console.warn(
          "[ciwi][subscription] subscriptionMode is 'subscription' but no selling plan id — UI will still render, but add-to-cart will not carry selling_plan.",
          {
            sellingPlanGroups: getCurrentProductSubscriptionData().sellingPlanGroups,
          },
        );
      }
      const selectedMode = window.__ciwiBundleState.subscriptionMode;
      console.log("[ciwi][subscription] render subscription block", {
        selectedMode,
        defaultSellingPlanId,
        subscriptionTitle,
        oneTimeTitle,
      });
      setTimeout(() => {
        syncSubscriptionSelectionToTheme(offer);
      }, 0);

      subscriptionHtml = `
        <div class="ciwi-subscription-box">
          <label class="ciwi-subscription-option ${selectedMode === "subscription" ? "is-selected" : ""}" data-ciwi-subscription-mode="subscription">
            <input type="radio" name="${CIWI_SUBSCRIPTION_MODE_NAME}" ${selectedMode === "subscription" ? "checked" : ""} />
            <span>
              <span class="ciwi-subscription-title">${esc(subscriptionTitle)}</span>
              <span class="ciwi-subscription-subtitle">${esc(subscriptionSubtitle)}</span>
            </span>
          </label>
          <label class="ciwi-subscription-option ${selectedMode === "one-time" ? "is-selected" : ""}" data-ciwi-subscription-mode="one-time">
            <input type="radio" name="${CIWI_SUBSCRIPTION_MODE_NAME}" ${selectedMode === "one-time" ? "checked" : ""} />
            <span>
              <span class="ciwi-subscription-title">${esc(oneTimeTitle)}</span>
              <span class="ciwi-subscription-subtitle">${esc(oneTimeSubtitle)}</span>
            </span>
          </label>
        </div>
      `;
    }
  }

  return `<div class="create-offer-preview-card">
    <div class="create-offer-style-preview-header" style="color:${esc(titleColor)} !important; font-size: ${esc(titleFontSize)}px !important; font-weight: ${esc(titleFontWeight)} !important;">${esc(widgetTitle)}</div>
    <div class="create-offer-style-preview-list create-offer-style-preview-list--${layoutFormat}">
      ${itemsHtml}
    </div>
    ${subscriptionHtml}
    ${showCustomButton ? `<button type="button" class="create-offer-preview-button" onclick="window.ciwiHandleBundleAddToCart(event)" style="width: 100%; margin-top: 12px; padding: 12px; background: ${esc(buttonPrimaryColor)}; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
      ${esc(buttonText)}
    </button>` : ""}
  </div>` + progressiveQty;
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
  bindBundleInteractions(wrapper);
  syncSubscriptionSelectionToTheme(offer);
  wrapper.style.display = isCurrentVariantAvailable() ? "block" : "none";
  ensureBundleLineProperties(offer);
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
      bindBundleInteractions(wrap);
      syncSubscriptionSelectionToTheme(offer);
      wrap.style.display = isCurrentVariantAvailable() ? "block" : "none";
    } else {
      wrap.style.display = "none";
    }
    syncCurrentBundleToSessionStorage(offer);
    ensureBundleLineProperties(offer);
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

  const refresh = () => {
    if (__ciwiSuppressBundlePriceSync) {
      return;
    }
    scheduleBundlePriceRefresh(offer);
  };

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

  attachBundleSubmitLinePropsGuard();
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
    bindThemeNativeAddToCart(currentOffer);

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
