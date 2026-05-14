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

/** Complete bundle 整包计价（与 CreateNewOffer 中 TS 逻辑对齐） */
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
  const domPrice = getUnitPriceFromProductDom();
  if (domPrice != null) return domPrice;

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
        const logicType = item.logicType === "bxgy" ? "bxgy" : "standard";
        const buyQuantity = Number(item.buyQuantity ?? item.count ?? 1);
        const getQuantity = Number(item.getQuantity ?? 1);
        const discountPercent = logicType === "bxgy" ? 100 : Number(item.discountPercent);
        if (!Number.isFinite(count) || count < 1) return null;
        if (!Number.isFinite(discountPercent)) return null;
        if (logicType === "bxgy") {
          if (!Number.isFinite(buyQuantity) || buyQuantity < 1) return null;
          if (!Number.isFinite(getQuantity) || getQuantity < 1) return null;
        }
        return {
        count: logicType === "bxgy" ? Math.trunc(buyQuantity) : Math.trunc(count),
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
        logicType: logicType,
        buyQuantity: logicType === "bxgy" ? Math.trunc(buyQuantity) : undefined,
        getQuantity: logicType === "bxgy" ? Math.trunc(getQuantity) : undefined,
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
          : buyProductIds;

        return {
          count: Math.trunc(buyQuantity),
          buyQuantity: Math.trunc(buyQuantity),
          getQuantity: Math.trunc(getQuantity),
          discountPercent: discountPercent,
          buyProductIds: buyProductIds,
          getProductIds: getProductIds,
          // Legacy dedicated BXGY records may not persist tierType; default them to BXGY.
          tierType: item.tierType === "simple" ? "simple" : "bxgy",
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

function parseDifferentProductsDiscountRulesJson(discountRulesJson) {
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
        const buyQuantity = Number(item.buyQuantity ?? item.count ?? 1);
        const getQuantity = Number(item.getQuantity ?? 0);
        const discountPercent = Number(item.discountPercent);
        const tierType = item.tierType === "bxgy" ? "bxgy" : "simple";
        const buyProductIds = Array.isArray(item.buyProductIds)
          ? item.buyProductIds.map(String).filter(Boolean)
          : [];
        const getProductIds = Array.isArray(item.getProductIds)
          ? item.getProductIds.map(String).filter(Boolean)
          : [];
        if (!Number.isFinite(count) || count < 1) return null;
        if (!Number.isFinite(buyQuantity) || buyQuantity < 1) return null;
        if (!Number.isFinite(discountPercent)) return null;
        if (!buyProductIds.length) return null;
        if (tierType === "bxgy") {
          if (!Number.isFinite(getQuantity) || getQuantity < 1) return null;
          if (!getProductIds.length) return null;
        }
        return {
          count: Math.trunc(count),
          buyQuantity: Math.trunc(buyQuantity),
          getQuantity: tierType === "bxgy" ? Math.trunc(getQuantity) : 0,
          discountPercent: Math.max(0, Math.min(100, discountPercent)),
          buyProductIds,
          getProductIds: tierType === "bxgy" ? getProductIds : [],
          tierType,
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
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.productIds)) {
      return parsed.productIds
        .map((id) => String(id || "").trim())
        .filter(Boolean);
    }
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

function parseSelectedProductsCatalog(selectedProductsJson) {
  if (typeof selectedProductsJson !== "string" || !selectedProductsJson.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(selectedProductsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        productId: String(item.id || "").trim(),
        handle: String(item.handle || "").trim(),
        title: String(item.title || "").trim(),
        image: String(item.image || "").trim(),
        price: String(item.price || "").trim(),
        selectedVariantId: String(item.selectedVariantId || "").trim(),
        variants: Array.isArray(item.variants)
          ? item.variants
              .filter((variant) => variant && typeof variant === "object" && variant.id)
              .map((variant) => {
                const selectedOptions = Array.isArray(variant.selectedOptions)
                  ? variant.selectedOptions
                      .filter((opt) => opt && typeof opt === "object")
                      .map((opt) => ({
                        name: String(opt.name || "").trim(),
                        value: String(opt.value || "").trim(),
                      }))
                  : [];
                const optLabel = selectedOptions
                  .map((o) => String(o.value || "").trim())
                  .filter(Boolean)
                  .join(" / ");
                return {
                  id: String(variant.id || "").trim(),
                  title: String(variant.title || "").trim() || optLabel,
                  price: String(variant.price || "").trim(),
                  selectedOptions,
                };
              })
          : [],
      }))
      .filter((item) => item.productId);
  } catch {
    return [];
  }
}

function parseFreeGiftConfig(selectedProductsJson, discountRulesJson) {
  const empty = { triggerProducts: [], giftProducts: [], tiers: [] };
  if (
    (typeof selectedProductsJson !== "string" || !selectedProductsJson.trim()) &&
    (typeof discountRulesJson !== "string" || !discountRulesJson.trim())
  ) {
    return empty;
  }

  let triggerProducts = [];
  let giftProducts = [];
  try {
    const parsed = JSON.parse(selectedProductsJson || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      triggerProducts = Array.isArray(parsed.triggerProducts)
        ? parsed.triggerProducts.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
      giftProducts = Array.isArray(parsed.giftProducts)
        ? parsed.giftProducts.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
    }
  } catch {}

  let tiers = [];
  try {
    const parsedRules = JSON.parse(discountRulesJson || "[]");
    if (Array.isArray(parsedRules)) {
      tiers = parsedRules
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const count = Math.max(1, Math.trunc(Number(item.count) || 1));
          const giftQuantity = Math.max(1, Math.trunc(Number(item.giftQuantity) || 1));
          const perRuleGiftProducts = Array.isArray(item.giftProductIds)
            ? item.giftProductIds.map((id) => String(id || "").trim()).filter(Boolean)
            : [];
          return {
            count,
            giftQuantity,
            giftProductIds: perRuleGiftProducts,
            title: String(item.title || ""),
            subtitle: String(item.subtitle || ""),
            badge: String(item.badge || ""),
            isDefault: !!item.isDefault,
          };
        })
        .sort((a, b) => a.count - b.count);
    }
  } catch {}

  return { triggerProducts, giftProducts, tiers };
}

function parseCompleteBundleConfig(selectedProductsJson) {
  if (typeof selectedProductsJson !== "string" || !selectedProductsJson.trim()) {
    return { triggerProductIds: [], bars: [] };
  }
  try {
    const parsed = JSON.parse(selectedProductsJson);
    const bars = Array.isArray(parsed?.bars) ? parsed.bars : [];
    const triggerProductIds = Array.isArray(parsed?.triggerProductIds)
      ? parsed.triggerProductIds.map((id) => String(id || "").trim()).filter(Boolean)
      : Array.isArray(parsed?.productIds)
        ? parsed.productIds.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
    return {
      triggerProductIds,
      bars: bars
        .filter((bar) => bar && typeof bar === "object" && bar.id)
        .map((bar) => {
          const barMode = String(bar?.pricing?.mode || "full_price");
          const barValue = Number(bar?.pricing?.value) || 0;
          const minQuantity = Math.max(1, Math.trunc(Number(bar?.minQuantity) || 1));
          const maxQuantity = Math.max(
            minQuantity,
            Math.trunc(Number(bar?.maxQuantity) || Number(bar?.quantity) || 1),
          );
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
                          .map((v) => {
                          const selectedOptions = Array.isArray(v.selectedOptions)
                            ? v.selectedOptions.map((opt) => ({
                                name: String(opt?.name || ""),
                                value: String(opt?.value || ""),
                              }))
                            : [];
                          const optLabel = selectedOptions
                            .map((o) => String(o.value || "").trim())
                            .filter(Boolean)
                            .join(" / ");
                          return {
                            id: String(v.id),
                            title: String(v.title || "").trim() || optLabel,
                            price: String(v.price || ""),
                            selectedOptions,
                          };
                        })
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
            minQuantity,
            maxQuantity,
            excludeTriggerProduct: bar?.excludeTriggerProduct !== false,
            quantity: maxQuantity,
            pricing: { mode: barMode, value: barValue },
            products,
          };
        }),
    };
  } catch {
    return { triggerProductIds: [], bars: [] };
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

function productIdsMatch(aLike, bLike) {
  const a = toProductNumericId(aLike);
  const b = toProductNumericId(bLike);
  if (a && b) return a === b;
  return String(aLike || "").trim() === String(bLike || "").trim();
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

async function hydrateFreeGiftOfferInPlace(offer) {
  if (!offer || offer.offerType !== "free-gift") return false;
  const config = parseFreeGiftConfig(offer.selectedProductsJson, offer.discountRulesJson);
  if (!config.giftProducts.length) return false;
  let changed = false;

  const hydratedGiftProducts = config.giftProducts.map((productId) => ({
    productId: String(productId || ""),
    handle: "",
    title: "",
    image: "",
    price: "",
    selectedVariantId: "",
    variants: [],
  }));

  const missingProductIds = [];
  for (const product of hydratedGiftProducts) {
    const cached = readCachedStorefrontProduct(product.productId);
    if (cached) {
      Object.assign(product, hydrateProductFromStorefrontJson(cached, product));
      changed = true;
      continue;
    }
    const numericId = toProductNumericId(product.productId);
    if (numericId) missingProductIds.push(numericId);
  }

  if (missingProductIds.length) {
    await fetchProductsByProductIds(missingProductIds);
  }

  for (let i = 0; i < hydratedGiftProducts.length; i++) {
    const product = hydratedGiftProducts[i];
    if (Array.isArray(product.variants) && product.variants.length > 0) continue;
    let sfProduct = readCachedStorefrontProduct(product.productId);
    if (!sfProduct) continue;
    hydratedGiftProducts[i] = hydrateProductFromStorefrontJson(sfProduct, product);
    changed = true;
  }

  if (!changed) return false;
  offer.__ciwiFreeGiftHydratedProducts = hydratedGiftProducts;
  return true;
}

async function hydrateDifferentProductsOfferInPlace(offer) {
  if (!offer || offer.offerType !== "quantity-breaks-different") return false;
  const rules = parseDifferentProductsDiscountRulesJson(offer.discountRulesJson);
  if (!rules.length) return false;

  const catalogSeed = parseSelectedProductsCatalog(offer.selectedProductsJson);
  const catalogById = new Map(
    catalogSeed.map((product) => [String(product.productId), { ...product }]),
  );
  const allPoolIds = Array.from(
    new Set(rules.flatMap((rule) => rule.buyProductIds.map((id) => String(id)))),
  );

  let changed = false;
  const missingProductIds = [];

  for (const productId of allPoolIds) {
    const existing = catalogById.get(productId) || {
      productId,
      handle: "",
      title: "",
      image: "",
      price: "",
      selectedVariantId: "",
      variants: [],
    };
    const needsHydrate =
      !existing.handle ||
      !existing.title ||
      !existing.image ||
      !existing.price ||
      !Array.isArray(existing.variants) ||
      existing.variants.length === 0;
    if (!needsHydrate) {
      catalogById.set(productId, existing);
      continue;
    }
    const cached = readCachedStorefrontProduct(productId);
    if (cached) {
      const hydrated = hydrateProductFromStorefrontJson(cached, existing);
      catalogById.set(productId, {
        productId,
        handle: hydrated.handle || "",
        title: hydrated.title || "",
        image: hydrated.image || "",
        price: hydrated.price || "",
        selectedVariantId: hydrated.selectedVariantId || "",
        variants: Array.isArray(hydrated.variants) ? hydrated.variants : [],
      });
      changed = true;
      continue;
    }
    const numericId = toProductNumericId(productId);
    if (numericId) missingProductIds.push(numericId);
    catalogById.set(productId, existing);
  }

  if (missingProductIds.length) {
    await fetchProductsByProductIds(missingProductIds);
  }

  for (const productId of allPoolIds) {
    const existing = catalogById.get(productId) || {
      productId,
      handle: "",
      title: "",
      image: "",
      price: "",
      selectedVariantId: "",
      variants: [],
    };
    if (
      existing.handle &&
      existing.title &&
      existing.image &&
      existing.price &&
      Array.isArray(existing.variants) &&
      existing.variants.length > 0
    ) {
      continue;
    }
    const cached = readCachedStorefrontProduct(productId);
    if (!cached) continue;
    const hydrated = hydrateProductFromStorefrontJson(cached, existing);
    catalogById.set(productId, {
      productId,
      handle: hydrated.handle || "",
      title: hydrated.title || "",
      image: hydrated.image || "",
      price: hydrated.price || "",
      selectedVariantId: hydrated.selectedVariantId || "",
      variants: Array.isArray(hydrated.variants) ? hydrated.variants : [],
    });
    changed = true;
  }

  const hydratedCatalog = Array.from(catalogById.values()).filter((product) => product.productId);
  if (!hydratedCatalog.length) return false;
  offer.__ciwiDifferentProductsHydratedProducts = hydratedCatalog;
  return changed || hydratedCatalog.length !== catalogSeed.length;
}

/** 当前栏内某商品在 widget 中选中的变体（与 __ciwiBundleState.selectedBundleVariants 同步） */
function resolveCompleteBundleVariant(bar, product) {
  const picked =
    window.__ciwiBundleState?.selectedBundleVariants?.[bar.id]?.[product.productId] || "";
  const vid = picked || product.selectedVariantId || product.variants?.[0]?.id || "";
  return (product.variants || []).find((v) => String(v.id) === String(vid)) || product.variants?.[0] || null;
}

function getCurrentProductSummary() {
  const configEl = document.getElementById("ciwi-bundles-config");
  if (configEl) {
    try {
      const config = JSON.parse(configEl.textContent || "{}");
      return {
        title:
          String(config?.productTitle || config?.title || "").trim() ||
          String(window?.ShopifyAnalytics?.meta?.product?.title || "").trim() ||
          "Current product",
        image:
          String(config?.productImage || config?.featuredImage || "").trim() ||
          "",
      };
    } catch {}
  }
  return {
    title: String(window?.ShopifyAnalytics?.meta?.product?.title || "").trim() || "Current product",
    image: "",
  };
}

function getCompleteBundleSelectableItems(config, bar) {
  const currentProductId = getCurrentProductGid();
  return (bar?.products || []).filter((product) => {
    if (!bar?.excludeTriggerProduct) return true;
    if (currentProductId && productIdsMatch(currentProductId, product.productId)) return false;
    return !(config?.triggerProductIds || []).some((triggerId) =>
      productIdsMatch(triggerId, product.productId),
    );
  });
}

function getSelectedCompleteBundleItemIds(config, bar) {
  const pool = getCompleteBundleSelectableItems(config, bar);
  const allowedIds = new Set(pool.map((product) => String(product.productId)));
  const rawMap = window.__ciwiBundleState?.selectedCompleteBundleProducts?.[bar.id] || {};
  const explicitIds = Object.keys(rawMap).filter(
    (productId) => rawMap[productId] && allowedIds.has(String(productId)),
  );
  const minQuantity = Math.max(1, Math.trunc(Number(bar?.minQuantity) || 1));
  const maxQuantity = Math.max(
    minQuantity,
    Math.trunc(Number(bar?.maxQuantity) || Number(bar?.quantity) || 1),
  );
  const selectedIds = explicitIds.length
    ? explicitIds.slice(0, maxQuantity)
    : pool.slice(0, minQuantity).map((product) => String(product.productId));
  return Array.from(new Set(selectedIds));
}

/** 渲染单个商品块（缩略图、标题、基础价格、变体下拉） */
function buildOneCompleteBundleProductHtml(bar, product, options) {
  const selected = options?.selected !== false;
  const selectable = options?.selectable === true;
  const disabled = options?.disabled === true;
  const v = resolveCompleteBundleVariant(bar, product);
  const base = parseMoneyStringToNumber(v?.price || product.price);
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
            }>${esc(
              (variant.title && String(variant.title).trim()) ||
                (Array.isArray(variant.selectedOptions)
                  ? variant.selectedOptions
                      .map((o) => String(o?.value || "").trim())
                      .filter(Boolean)
                      .join(" / ")
                  : "") ||
                "Default",
            )}</option>`,
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
        selectable
          ? `<input type="checkbox" style="margin-top:2px;flex-shrink:0;" ${
              selected ? "checked" : ""
            } ${disabled ? "disabled" : ""} onchange="window.ciwiToggleCompleteBundleProduct('${esc(
              bar.id,
            )}','${esc(product.productId)}', this.checked)" />`
          : ""
      }
      ${
        product.image
          ? `<img src="${esc(product.image)}" alt="${esc(product.title)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;flex-shrink:0;" />`
          : ""
      }
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;font-weight:600;color:#1c1f23;line-height:1.35;">${esc(product.title || "Product")}</div>
        <div style="margin-top:4px;font-size:12px;display:flex;flex-wrap:wrap;gap:4px;align-items:baseline;">
          <span style="font-weight:700;color:#1c1f23;">${esc(formatPrice(base))}</span>
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
  if (offer.offerType === "complete-bundle") {
    const config = parseCompleteBundleConfig(offer.selectedProductsJson);
    const selectedBarId = String(window.__ciwiBundleState?.selectedCompleteBundleBarId || "");
    const idx = config.bars.findIndex((bar) => String(bar.id) === selectedBarId);
    return idx >= 0 ? idx + 1 : 1;
  }
  const sc = Number(window.__ciwiBundleState?.selectedCount ?? 1);
  if (offer.offerType === "bxgy") {
    const rules = parseBxgyDiscountRulesJson(offer.discountRulesJson);
    const idx = rules.findIndex((r) => Number(r.count) === sc);
    return idx >= 0 ? idx + 1 : 1;
  }
  if (offer.offerType === "quantity-breaks-different") {
    const rules = parseDifferentProductsDiscountRulesJson(offer.discountRulesJson);
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

function getDifferentProductsCatalog(offer) {
  if (Array.isArray(offer?.__ciwiDifferentProductsHydratedProducts)) {
    return offer.__ciwiDifferentProductsHydratedProducts;
  }
  return parseSelectedProductsCatalog(offer?.selectedProductsJson);
}

function getDifferentProductsPickerKey(offer, rule) {
  return `${String(offer?.id || offer?.offerId || "offer")}:${String(rule?.count || 1)}`;
}

function getDifferentProductsRequiredQuantity(rule) {
  return Math.max(1, Math.trunc(Number(rule?.count) || 1));
}

function getDifferentProductsPoolProducts(offer, selectedRule) {
  if (!selectedRule || !Array.isArray(selectedRule.buyProductIds) || !selectedRule.buyProductIds.length) {
    return [];
  }
  const catalog = getDifferentProductsCatalog(offer);
  const productMap = new Map(
    (Array.isArray(catalog) ? catalog : []).map((product) => [String(product.productId), product]),
  );
  return selectedRule.buyProductIds
    .map((productId) => productMap.get(String(productId)))
    .filter(Boolean);
}

function getDefaultDifferentProductsSelectionIds(poolProducts, requiredQty) {
  const limit = Math.max(1, Math.trunc(Number(requiredQty) || 1));
  const currentProductGid = getCurrentProductGid();
  const selectedIds = [];
  if (currentProductGid) {
    const currentProduct = (poolProducts || []).find((product) =>
      productIdsMatch(currentProductGid, product?.productId),
    );
    if (currentProduct?.productId) {
      selectedIds.push(String(currentProduct.productId));
    }
  }
  for (const product of poolProducts || []) {
    const productId = String(product?.productId || "");
    if (!productId || selectedIds.includes(productId)) continue;
    selectedIds.push(productId);
    if (selectedIds.length >= limit) break;
  }
  return selectedIds.slice(0, limit);
}

function getSelectedDifferentProductsIds(offer, selectedRule, poolProducts) {
  const pickerKey = getDifferentProductsPickerKey(offer, selectedRule);
  const limit = getDifferentProductsRequiredQuantity(selectedRule);
  const allowedIds = new Set((poolProducts || []).map((product) => String(product.productId || "")));
  const stored = window.__ciwiBundleState?.selectedDifferentProducts?.[pickerKey];
  if (Array.isArray(stored)) {
    return stored
      .map((id) => String(id || ""))
      .filter((id) => allowedIds.has(id))
      .slice(0, limit);
  }
  return getDefaultDifferentProductsSelectionIds(poolProducts, limit);
}

function resolveDifferentProductsVariant(product) {
  const currentProductGid = getCurrentProductGid();
  const picked =
    window.__ciwiBundleState?.selectedDifferentProductVariants?.[product.productId] || "";
  const currentVariantId =
    currentProductGid && productIdsMatch(currentProductGid, product?.productId)
      ? getSelectedVariantId()
      : "";
  const variantId =
    picked || currentVariantId || product.selectedVariantId || product.variants?.[0]?.id || "";
  return (
    (product.variants || []).find((variant) => String(variant.id) === String(variantId)) ||
    product.variants?.[0] ||
    null
  );
}

function buildEligibleProductHref(product) {
  const handle = String(product?.handle || "").trim();
  if (!handle) return "";
  const base = `/products/${encodeURIComponent(handle)}`;
  const variant = resolveDifferentProductsVariant(product);
  const ajaxVariantId = toAjaxVariantId(variant?.id || product?.selectedVariantId || "");
  return ajaxVariantId ? `${base}?variant=${encodeURIComponent(ajaxVariantId)}` : base;
}

function buildDifferentProductsProductCardHtml(
  offer,
  selectedRule,
  product,
  borderColor,
  accentColor,
  options,
) {
  const variant = resolveDifferentProductsVariant(product);
  const currentProductGid = getCurrentProductGid();
  const isCurrent =
    currentProductGid && String(currentProductGid) === String(product?.productId || "");
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const pickerKey = getDifferentProductsPickerKey(offer, selectedRule);
  const requiredQty = getDifferentProductsRequiredQuantity(selectedRule);
  const isSelected = options?.isSelected === true;
  const selectionCount = Math.max(0, Math.trunc(Number(options?.selectionCount) || 0));
  const selectionLocked = selectionCount >= requiredQty && !isSelected;
  const priceValue = parseMoneyStringToNumber(variant?.price || product?.price || "");
  const priceHtml =
    priceValue > 0
      ? `<div class="ciwi-different-products-picker__price">${esc(formatPrice(priceValue))}</div>`
      : "";
  const variantOptionsHtml =
    variants.length > 1
      ? `<select class="ciwi-different-products-picker__variant-select" aria-label="Choose variant" onclick="event.stopPropagation();" onmousedown="event.stopPropagation();" onchange="window.ciwiSetDifferentProductsVariant('${esc(
          product.productId,
        )}', this.value)">
          ${variants
            .map(
              (entry) =>
                `<option value="${esc(entry.id)}"${
                  String(entry.id) === String(variant?.id || "") ? " selected" : ""
                }>${esc(
                  (entry.title && String(entry.title).trim()) ||
                    (Array.isArray(entry.selectedOptions)
                      ? entry.selectedOptions
                          .map((o) => String(o?.value || "").trim())
                          .filter(Boolean)
                          .join(" / ")
                      : "") ||
                    "Default",
                )}</option>`,
            )
            .join("")}
        </select>`
      : "";

  return `<div class="ciwi-different-products-picker__card"${
    isCurrent ? ' data-current="1"' : ""
  }${isSelected ? ' data-selected="1"' : ""}${
    selectionLocked ? ' data-selection-locked="1"' : ""
  } onclick="event.stopPropagation();" onmousedown="event.stopPropagation();">
    <div class="ciwi-different-products-picker__card-top">
      ${
        product.image
          ? `<img class="ciwi-different-products-picker__image" src="${esc(
              product.image,
            )}" alt="${esc(product.title || "Eligible product")}" loading="lazy" decoding="async" />`
          : `<div class="ciwi-different-products-picker__image ciwi-different-products-picker__image--placeholder"></div>`
      }
      <div class="ciwi-different-products-picker__meta">
        <div class="ciwi-different-products-picker__title-row">
          <div class="ciwi-different-products-picker__title">${esc(
            product.title || "Included trigger product",
          )}</div>
          ${
            isCurrent
              ? `<span class="ciwi-different-products-picker__pill" style="background:${esc(
                  accentColor || "#008060",
                )}12;color:${esc(accentColor || "#008060")};border-color:${esc(
                  accentColor || "#008060",
                )}35;">Current</span>`
              : ""
          }
        </div>
        ${priceHtml}
      </div>
    </div>
    ${variantOptionsHtml}
    <div class="ciwi-different-products-picker__actions">
      <button type="button" class="ciwi-different-products-picker__select" style="background:${
        isSelected ? esc(accentColor || "#008060") : "#ffffff"
      };color:${isSelected ? "#ffffff" : esc(accentColor || "#008060")};border-color:${esc(
        accentColor || "#008060",
      )};" onclick="event.stopPropagation();window.ciwiToggleDifferentProductSelection('${esc(
        pickerKey,
      )}','${esc(product.productId)}',${requiredQty})" ${selectionLocked ? "disabled" : ""}>
        ${
          isSelected
            ? "Selected"
            : selectionLocked
              ? "Selection full"
              : "Select"
        }
      </button>
      <button type="button" class="ciwi-different-products-picker__open" style="border-color:${esc(
        borderColor || "#dfe3e8",
      )};color:${esc(accentColor || "#008060")};" onclick="event.stopPropagation();window.ciwiOpenEligibleProductByProduct('${esc(
        product.productId,
      )}','${esc(product.handle || "")}')">
        ${isCurrent ? "Open current" : "Open product"}
      </button>
    </div>
  </div>`;
}

function renderDifferentProductsPoolControlHtml(offer, selectedRule, borderColor, accentColor) {
  if (!selectedRule || !Array.isArray(selectedRule.buyProductIds) || !selectedRule.buyProductIds.length) {
    return "";
  }
  const poolProducts = getDifferentProductsPoolProducts(offer, selectedRule);

  if (!poolProducts.length) {
    return `<div style="margin-top:10px;border:1px dashed ${esc(
      borderColor,
    )};border-radius:10px;padding:10px;background:#ffffff;color:#5c6166;font-size:12px;">
      Included trigger products will appear here after the product pool is loaded.
    </div>`;
  }

  const pickerKey = getDifferentProductsPickerKey(offer, selectedRule);
  const requiredQty = getDifferentProductsRequiredQuantity(selectedRule);
  const selectedIds = getSelectedDifferentProductsIds(offer, selectedRule, poolProducts);
  const isOpen =
    String(window.__ciwiBundleState?.openDifferentProductsPickerKey || "") === pickerKey;
  const cardsHtml = poolProducts
    .map((product) =>
      buildDifferentProductsProductCardHtml(
        offer,
        selectedRule,
        product,
        borderColor,
        accentColor,
        {
          isSelected: selectedIds.includes(String(product.productId || "")),
          selectionCount: selectedIds.length,
        },
      ),
    )
    .join("");

  return `<div class="ciwi-different-products-picker" onclick="event.stopPropagation();" onmousedown="event.stopPropagation();">
    <button
      type="button"
      class="ciwi-different-products-picker__toggle"
      style="background:${esc(accentColor || "#008060")};"
      onclick="event.stopPropagation();window.ciwiToggleDifferentProductsPicker('${esc(
        pickerKey,
      )}')"
    >
      ${isOpen ? "Hide choices" : "Choose"}
    </button>
    ${
      isOpen
        ? `<div class="ciwi-different-products-picker__panel" style="border-color:${esc(
            borderColor || "#dfe3e8",
          )};">
            <div class="ciwi-different-products-picker__header">
              <span>Eligible products</span>
              <span>${selectedIds.length} / ${requiredQty} selected</span>
            </div>
            <div class="ciwi-different-products-picker__list">
              ${cardsHtml}
            </div>
          </div>`
        : ""
    }
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

  for (let index = 0; index < offers.length; index += 1) {
    const offer = offers[index];
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
      const triggerProductIds = Array.isArray(completeBundle.triggerProductIds)
        ? completeBundle.triggerProductIds
        : [];
      if (triggerProductIds.length > 0 && !triggerProductIds.includes(currentProductGid)) {
        console.log(
          "[ciwi] complete bundle skipped: current product not in trigger list",
          offer.id,
          currentProductGid,
          triggerProductIds,
        );
        continue;
      }
    } else {
      // quantity-breaks-same / subscription / free-gift
      if (offer.offerType === "free-gift") {
        const freeGiftConfig = parseFreeGiftConfig(
          offer.selectedProductsJson,
          offer.discountRulesJson,
        );
        if (!freeGiftConfig.tiers.length) {
          console.log("[ciwi] free-gift offer skipped: no valid free gift tiers", offer.id);
          continue;
        }
        if (freeGiftConfig.triggerProducts.length > 0) {
          if (!currentProductGid) {
            console.log("[ciwi] free-gift offer skipped: current product GID is null", offer.id);
            continue;
          }
          if (!freeGiftConfig.triggerProducts.includes(currentProductGid)) {
            console.log(
              "[ciwi] free-gift offer skipped: current product not in trigger list",
              offer.id,
              currentProductGid,
              freeGiftConfig.triggerProducts,
            );
            continue;
          }
        }
      }

      const discountRules = parseDiscountRulesJson(offer.discountRulesJson);
      if (offer.offerType !== "free-gift" && !discountRules.length) {
        console.log("[ciwi] offer skipped: no valid quantity discount rules", offer.id);
        continue;
      }
      const selectedIds =
        offer.offerType === "free-gift"
          ? parseFreeGiftConfig(offer.selectedProductsJson, offer.discountRulesJson)
              .triggerProducts
          : parseSelectedProductIds(offer.selectedProductsJson);
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

    console.log("[ciwi] offer selected for current product", {
      index,
      offerId: offer.id,
      offerName: offer.name,
      offerType: offer.offerType,
      currentProductGid,
    });
    return offer;
  }

  console.log("[ciwi] no matching offer for current product — skip bundle UI");
  return null;
}

window.__ciwiBundleState = window.__ciwiBundleState || {
  selectedCount: null,
  selectedBundleVariants: {},
  selectedDifferentProductVariants: {},
  selectedDifferentProducts: {},
  openDifferentProductsPickerKey: null,
  /** complete-bundle：顾客在多个 bar 中选中的那一档（仅该档加入购物车） */
  selectedCompleteBundleBarId: null,
  selectedCompleteBundleProducts: {},
  subscriptionMode: null,
  selectedSellingPlanId: "",
};

function rerenderCurrentBundleWidget() {
  const wrap = document.querySelector(".ciwi-bundle-wrapper");
  const currentOffer = getCurrentOffer(offersConfigCache);
  if (!wrap || !currentOffer) return;
  const html = renderBundlePreviewHtml(currentOffer);
  if (!html) return;
  wrap.innerHTML = html;
  bindBundleInteractions(wrap);
  syncSubscriptionSelectionToTheme(currentOffer);
}

function getBxgyDisplayMeta(rule) {
  const buyQuantity = Math.max(1, Math.trunc(Number(rule && rule.buyQuantity) || 1));
  const configuredGetQuantity = Math.max(1, Math.trunc(Number(rule && rule.getQuantity) || 1));
  const usesTotalItemsSemantics = configuredGetQuantity > buyQuantity;
  const bundleQuantity = usesTotalItemsSemantics
    ? configuredGetQuantity
    : buyQuantity + configuredGetQuantity;

  if (usesTotalItemsSemantics) {
    return {
      title: `Buy ${buyQuantity}, Get ${bundleQuantity} Total`,
      subtitle: `Same product scope, pay for ${buyQuantity} and receive ${bundleQuantity} total items`,
      price: `Pay for ${buyQuantity}`,
      saveLabel: `GET ${bundleQuantity} TOTAL`,
    };
  }

  return {
    title: `Buy ${buyQuantity}, Get ${configuredGetQuantity} Free`,
    subtitle: "Same product, cheapest eligible variant becomes free",
    price: `Get ${configuredGetQuantity} Free`,
    saveLabel: `BUY ${buyQuantity}, GET ${configuredGetQuantity} FREE`,
  };
}

function getCartQuantityForSelectedOffer(offer, selectedCount) {
  const normalizedCount = Math.max(1, Math.trunc(Number(selectedCount) || 1));
  if (!offer || offer.offerType !== "bxgy") {
    return normalizedCount;
  }
  const rules = parseBxgyDiscountRulesJson(offer.discountRulesJson);
  const selectedRule =
    rules.find((rule) => Number(rule.count) === normalizedCount) || rules[0] || null;
  if (!selectedRule) return normalizedCount;
  const buyQuantity = Math.max(
    1,
    Math.trunc(Number(selectedRule.buyQuantity) || normalizedCount),
  );
  const getQuantity = Math.max(
    1,
    Math.trunc(Number(selectedRule.getQuantity) || 0),
  );
  return Math.max(
    1,
    getQuantity > buyQuantity ? getQuantity : buyQuantity + getQuantity,
  );
}

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
  const currentOffer = getCurrentOffer(offersConfigCache);
  updateThemeQuantityInput(getCartQuantityForSelectedOffer(currentOffer, count));
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
  } else if (currentOffer?.offerType === "quantity-breaks-different") {
    void hydrateDifferentProductsOfferInPlace(currentOffer).then((changed) => {
      if (!changed) return;
      const wrapNext = document.querySelector(".ciwi-bundle-wrapper");
      if (!wrapNext) return;
      const htmlNext = renderBundlePreviewHtml(currentOffer);
      if (htmlNext) {
        wrapNext.innerHTML = htmlNext;
        bindBundleInteractions(wrapNext);
      }
    });
  } else if (currentOffer?.offerType === "free-gift") {
    void hydrateFreeGiftOfferInPlace(currentOffer);
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

window.ciwiHandleBundleAddToCart = function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const currentOffer = getCurrentOffer(offersConfigCache);
  const count = window.__ciwiBundleState?.selectedCount || 1;
  updateThemeQuantityInput(getCartQuantityForSelectedOffer(currentOffer, count));
  syncSubscriptionSelectionToTheme(currentOffer);
  if (currentOffer?.offerType === "quantity-breaks-different") {
    performDifferentProductsCartAdd()
      .then((ok) => (ok ? notifyThemeAfterCartAdd() : false))
      .catch((error) => {
        console.error("[ciwi] performDifferentProductsCartAdd failed", error);
      });
    return;
  }
  if (currentOffer?.offerType === "free-gift") {
    performFreeGiftCartAdd()
      .then((ok) => (ok ? notifyThemeAfterCartAdd() : false))
      .catch((error) => {
        console.error("[ciwi] performFreeGiftCartAdd failed", error);
      });
    return;
  }
  submitBundleFormFallback();
};

function submitBundleFormFallback() {
  const form = getAddToCartForm();
  if (form) {
    let addBtn = form.querySelector(
      "button[type='submit'], button[name='add'], input[type='submit'], input[name='add'], [name='add']",
    );
    if (!addBtn) {
      const formId = form.getAttribute("id");
      if (formId) {
        addBtn = document.querySelector(
          `button[type='submit'][form='${formId}'], button[name='add'][form='${formId}'], input[type='submit'][form='${formId}'], input[name='add'][form='${formId}']`,
        );
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
}

window.ciwiToggleDifferentProductsPicker = function(pickerKey) {
  const nextKey = String(pickerKey || "");
  const currentKey = String(window.__ciwiBundleState?.openDifferentProductsPickerKey || "");
  window.__ciwiBundleState.openDifferentProductsPickerKey =
    currentKey === nextKey ? null : nextKey;
  rerenderCurrentBundleWidget();
};

window.ciwiToggleDifferentProductSelection = function(pickerKey, productId, requiredQty) {
  if (!window.__ciwiBundleState.selectedDifferentProducts) {
    window.__ciwiBundleState.selectedDifferentProducts = {};
  }
  const key = String(pickerKey || "");
  const nextId = String(productId || "");
  const limit = Math.max(1, Math.trunc(Number(requiredQty) || 1));
  const prev = Array.isArray(window.__ciwiBundleState.selectedDifferentProducts[key])
    ? window.__ciwiBundleState.selectedDifferentProducts[key].map((id) => String(id || ""))
    : [];
  const next = prev.includes(nextId)
    ? prev.filter((id) => id !== nextId)
    : prev.length >= limit
      ? prev
      : [...prev, nextId];
  window.__ciwiBundleState.selectedDifferentProducts[key] = next;
  rerenderCurrentBundleWidget();
};

window.ciwiSetDifferentProductsVariant = function(productId, variantId) {
  if (!window.__ciwiBundleState.selectedDifferentProductVariants) {
    window.__ciwiBundleState.selectedDifferentProductVariants = {};
  }
  window.__ciwiBundleState.selectedDifferentProductVariants[String(productId || "")] = String(
    variantId || "",
  );
  rerenderCurrentBundleWidget();
};

window.ciwiOpenEligibleProduct = function(url, variantId) {
  const href = String(url || "").trim();
  if (!href) return;
  const ajaxVariantId = toAjaxVariantId(variantId);
  if (!ajaxVariantId) {
    window.location.assign(href);
    return;
  }
  const nextUrl = new URL(href, window.location.origin);
  nextUrl.searchParams.set("variant", ajaxVariantId);
  window.location.assign(nextUrl.toString());
};

window.ciwiOpenEligibleProductByProduct = function(productId, handle) {
  const currentOffer = getCurrentOffer(offersConfigCache);
  const catalog = getDifferentProductsCatalog(currentOffer);
  const product =
    (Array.isArray(catalog) ? catalog : []).find(
      (entry) => String(entry.productId || "") === String(productId || ""),
    ) || null;
  const href = handle ? `/products/${encodeURIComponent(String(handle))}` : buildEligibleProductHref(product);
  const variantId =
    window.__ciwiBundleState?.selectedDifferentProductVariants?.[String(productId || "")] ||
    product?.selectedVariantId ||
    product?.variants?.[0]?.id ||
    "";
  if (!href) return;
  window.ciwiOpenEligibleProduct(href, variantId);
};

function resolveDifferentProductsSelectedRule(offer) {
  if (!offer || offer.offerType !== "quantity-breaks-different") return null;
  const selectedCount = Math.max(1, Math.trunc(Number(window.__ciwiBundleState?.selectedCount) || 1));
  const rules = parseDifferentProductsDiscountRulesJson(offer.discountRulesJson);
  return rules.find((rule) => Number(rule.count) === selectedCount) || null;
}

async function performDifferentProductsCartAdd() {
  const currentOffer = getCurrentOffer(offersConfigCache);
  if (!currentOffer || currentOffer.offerType !== "quantity-breaks-different") return false;
  await hydrateDifferentProductsOfferInPlace(currentOffer);

  const selectedRule = resolveDifferentProductsSelectedRule(currentOffer);
  if (!selectedRule) {
    submitBundleFormFallback();
    return false;
  }

  const poolProducts = getDifferentProductsPoolProducts(currentOffer, selectedRule);
  const requiredQty = getDifferentProductsRequiredQuantity(selectedRule);
  const selectedIds = getSelectedDifferentProductsIds(currentOffer, selectedRule, poolProducts);
  if (selectedIds.length < requiredQty) {
    window.alert(`Please select ${requiredQty} products for this bundle.`);
    return false;
  }

  const productMap = new Map(poolProducts.map((product) => [String(product.productId || ""), product]));
  const tierValue = computeSelectedBarIndexForOffer(currentOffer);
  const items = selectedIds
    .slice(0, requiredQty)
    .map((productId) => {
      const product = productMap.get(String(productId || ""));
      if (!product) return null;
      const selectedVariant = resolveDifferentProductsVariant(product);
      const variantId = toAjaxVariantId(
        selectedVariant?.id || product.selectedVariantId || product.variants?.[0]?.id || "",
      );
      if (!variantId) return null;
      return {
        id: Number(variantId),
        quantity: 1,
        properties: {
          [CIWI_PROP_OFFER_ID]: String(currentOffer.id || ""),
          [CIWI_PROP_TIER]: String(tierValue),
        },
      };
    })
    .filter(Boolean);

  if (items.length < requiredQty) {
    window.alert("Some selected products are missing variants. Please reselect them.");
    return false;
  }

  const res = await fetch("/cart/add.js", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ items }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(
      "[ciwi] different products cart/add.js failed",
      res.status,
      body?.description || body?.message || body,
    );
    return false;
  }
  return true;
}

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

window.ciwiToggleCompleteBundleProduct = function (barId, productId, checked) {
  if (!window.__ciwiBundleState.selectedCompleteBundleProducts) {
    window.__ciwiBundleState.selectedCompleteBundleProducts = {};
  }
  const currentOffer = getCurrentOffer(offersConfigCache);
  const config =
    currentOffer?.offerType === "complete-bundle"
      ? parseCompleteBundleConfig(currentOffer.selectedProductsJson)
      : null;
  const bar = config?.bars.find((entry) => String(entry.id) === String(barId));
  if (!bar) return;
  const selectedIds = getSelectedCompleteBundleItemIds(config, bar);
  const maxQuantity = Math.max(
    Math.max(1, Math.trunc(Number(bar?.minQuantity) || 1)),
    Math.trunc(Number(bar?.maxQuantity) || Number(bar?.quantity) || 1),
  );
  const nextSet = new Set(selectedIds);
  if (checked) {
    if (nextSet.size >= maxQuantity && !nextSet.has(String(productId))) {
      return;
    }
    nextSet.add(String(productId));
  } else {
    nextSet.delete(String(productId));
  }
  window.__ciwiBundleState.selectedCompleteBundleProducts[barId] = {};
  Array.from(nextSet).forEach((id) => {
    window.__ciwiBundleState.selectedCompleteBundleProducts[barId][id] = true;
  });
  const wrap = document.querySelector(".ciwi-bundle-wrapper");
  if (wrap && currentOffer && currentOffer.offerType === "complete-bundle") {
    const html = renderBundlePreviewHtml(currentOffer);
    if (html) wrap.innerHTML = html;
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

function getCurrentQuantityFromThemeForm() {
  const form = getAddToCartForm();
  const input = form?.querySelector('[name="quantity"]');
  const quantity = Number(input?.value || window.__ciwiBundleState?.selectedCount || 1);
  return Number.isFinite(quantity) && quantity > 0 ? Math.max(1, Math.trunc(quantity)) : 1;
}

function resolveFreeGiftVariantId(offer, rule) {
  const configuredGiftIds =
    Array.isArray(rule?.giftProductIds) && rule.giftProductIds.length > 0
      ? rule.giftProductIds
      : parseFreeGiftConfig(offer?.selectedProductsJson, offer?.discountRulesJson).giftProducts;
  const hydratedProducts = Array.isArray(offer?.__ciwiFreeGiftHydratedProducts)
    ? offer.__ciwiFreeGiftHydratedProducts
    : [];

  for (const productId of configuredGiftIds) {
    const hydrated = hydratedProducts.find(
      (item) => String(item.productId || "") === String(productId || ""),
    );
    const variantId = toAjaxVariantId(
      hydrated?.selectedVariantId || hydrated?.variants?.[0]?.id || "",
    );
    if (variantId) return variantId;
  }

  return "";
}

async function performFreeGiftCartAdd() {
  const currentOffer = getCurrentOffer(offersConfigCache);
  if (!currentOffer || currentOffer.offerType !== "free-gift") return false;

  await hydrateFreeGiftOfferInPlace(currentOffer);

  const form = getAddToCartForm();
  const mainVariantId = toAjaxVariantId(getSelectedVariantId());
  if (!form || !mainVariantId) return false;

  const quantity = getCurrentQuantityFromThemeForm();
  const config = parseFreeGiftConfig(
    currentOffer.selectedProductsJson,
    currentOffer.discountRulesJson,
  );
  if (!config.tiers.length) return false;

  let selectedRule = null;
  for (const tier of config.tiers) {
    if (quantity >= tier.count) {
      selectedRule = tier;
    }
  }
  if (!selectedRule) return false;

  const giftVariantId = resolveFreeGiftVariantId(currentOffer, selectedRule);
  if (!giftVariantId) {
    console.warn("[ciwi] free gift add-to-cart skipped: no resolvable gift variant", {
      offerId: currentOffer.id,
    });
    return false;
  }

  const items = [
    { id: Number(mainVariantId), quantity },
    {
      id: Number(giftVariantId),
      quantity: Math.max(1, Math.trunc(Number(selectedRule.giftQuantity) || 1)),
    },
  ];

  const res = await fetch("/cart/add.js", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ items }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(
      "[ciwi] free gift cart/add.js failed",
      res.status,
      body?.description || body?.message || body,
    );
    return false;
  }
  return true;
}

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
    const mainVariantId = toAjaxVariantId(getSelectedVariantId());
    if (!mainVariantId) return false;
    const quantity = getCurrentQuantityFromThemeForm();
    items.push({ id: Number(mainVariantId), quantity });
    const selectedItemIds = new Set(getSelectedCompleteBundleItemIds(config, barToUse));
    if (selectedItemIds.size < Math.max(1, Math.trunc(Number(barToUse.minQuantity) || 1))) {
      return false;
    }
    for (const product of getCompleteBundleSelectableItems(config, barToUse)) {
      if (!selectedItemIds.has(String(product.productId))) continue;
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
    if (items.length <= 1) return false;
    const res = await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
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
    const currentProduct = getCurrentProductSummary();
    const currentUnitPrice = getCurrentUnitPrice();

    const singleHtml = `<div class="create-offer-style-preview-item" style="border:1px solid ${esc(
      borderColor,
    )};border-radius:8px;padding:10px;background:${esc(cardBackgroundColor)};">
      <div style="display:flex;align-items:flex-start;gap:8px;">
        <span style="margin-top:3px;width:16px;height:16px;border:2px solid ${esc(
          borderColor,
        )};border-radius:999px;flex-shrink:0;"></span>
        <span style="flex:1;min-width:0;">
          <div class="create-offer-style-preview-item-title" style="color:${esc(titleColor)};">${esc(
            currentProduct.title || "Current product",
          )}</div>
          <div class="create-offer-style-preview-item-subtitle" style="font-size:12px;color:#5c6166;margin-top:2px;">Standard price</div>
        </span>
        <span style="font-size:13px;font-weight:700;color:#1c1f23;">${esc(
          formatPrice(currentUnitPrice),
        )}</span>
      </div>
    </div>`;

    const barsHtml = completeBundle.bars
      .map((bar) => {
        const isSelected = String(bar.id) === selectedBarId;
        const borderCol = isSelected ? accentColor : borderColor;
        const bundleItems = getCompleteBundleSelectableItems(completeBundle, bar);
        const selectedItemIds = new Set(getSelectedCompleteBundleItemIds(completeBundle, bar));
        let sumOriginal = currentUnitPrice;
        for (const p of bundleItems) {
          if (!selectedItemIds.has(String(p.productId))) continue;
          const v = resolveCompleteBundleVariant(bar, p);
          const base = parseMoneyStringToNumber(v?.price || p.price);
          sumOriginal += Math.max(0, base);
        }
        const bundlePricing = applyCompleteBundleProductPricing(
          bar.pricing?.mode || "full_price",
          Number(bar.pricing?.value) || 0,
          sumOriginal,
        );
        const sumFinal = bundlePricing.final;
        const saved = Math.max(0, sumOriginal - sumFinal);
        const summaryHtml =
          bundleItems && bundleItems.length
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
        const plist = bundleItems || [];
        const minQuantity = Math.max(1, Math.trunc(Number(bar.minQuantity) || 1));
        const maxQuantity = Math.max(minQuantity, Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1));
        for (let idx = 0; idx < plist.length; idx++) {
          if (idx > 0 && plist.length >= 2) {
            productsHtml += `<div style="display:flex;align-items:center;justify-content:center;color:#9aa0a6;font-weight:700;width:22px;flex-shrink:0;font-size:16px;">+</div>`;
          }
          const isChecked = selectedItemIds.has(String(plist[idx].productId));
          const disableUnchecked = !isChecked && selectedItemIds.size >= maxQuantity;
          productsHtml += buildOneCompleteBundleProductHtml(bar, plist[idx], {
            selectable: true,
            selected: isChecked,
            disabled: disableUnchecked,
          });
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
                bar.subtitle || `Pick ${minQuantity}-${maxQuantity} bundle items`,
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
      <div class="create-offer-style-preview-list create-offer-style-preview-list--vertical">${singleHtml}${barsHtml}</div>
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

  if (offer.offerType === "free-gift") {
    const freeGiftConfig = parseFreeGiftConfig(
      offer?.selectedProductsJson,
      offer?.discountRulesJson,
    );
    if (!freeGiftConfig.tiers.length) return "";

    if (!window.__ciwiBundleState.selectedCount) {
      const defaultRule = freeGiftConfig.tiers.find((r) => r.isDefault);
      window.__ciwiBundleState.selectedCount = defaultRule
        ? defaultRule.count
        : (freeGiftConfig.tiers[0]?.count || 1);
      setTimeout(
        () =>
          updateThemeQuantityInput(
            getCartQuantityForSelectedOffer(offer, window.__ciwiBundleState.selectedCount),
          ),
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
    const hasDefault = freeGiftConfig.tiers.some((r) => r.isDefault);

    const items = freeGiftConfig.tiers.map((rule, index) => {
      const isFeatured = hasDefault ? !!rule.isDefault : index === 0;
      return {
        count: rule.count || 1,
        title: rule.title || `Buy ${rule.count} item${rule.count > 1 ? "s" : ""}`,
        subtitle:
          rule.subtitle ||
          `Unlock ${rule.giftQuantity} free gift${rule.giftQuantity > 1 ? "s" : ""}`,
        price: `${rule.giftQuantity} FREE`,
        badge: rule.badge || (isFeatured ? "Gift included" : ""),
        saveLabel: `TRIGGER AT ${rule.count}`,
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

  // BXGY offer type support — quantity-break-style tier cards
  if (offer.offerType === 'bxgy') {
    const bxgyRules = parseBxgyDiscountRulesJson(offer?.discountRulesJson);
    if (!bxgyRules.length) return "";

    if (!window.__ciwiBundleState.selectedCount) {
      const defaultRule = bxgyRules.find(r => r.isDefault);
      window.__ciwiBundleState.selectedCount = defaultRule ? defaultRule.count : (bxgyRules[0]?.count || 1);
      setTimeout(
        () =>
          updateThemeQuantityInput(
            getCartQuantityForSelectedOffer(offer, window.__ciwiBundleState.selectedCount),
          ),
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
    const hasDefault = bxgyRules.some((r) => r.isDefault);

    const items = bxgyRules.map((rule, index) => {
      const isFeatured = hasDefault ? !!rule.isDefault : index === 0;
      const displayCount = rule.count || 1;
      const bxgyDisplay = getBxgyDisplayMeta(rule);
      return {
        count: displayCount,
        title: rule.title || bxgyDisplay.title,
        subtitle: rule.subtitle || bxgyDisplay.subtitle,
        price: rule.discountPercent === 100 ? bxgyDisplay.price : `${rule.discountPercent}% OFF`,
        badge: rule.badge || (isFeatured ? "Most Popular" : ""),
        saveLabel: bxgyDisplay.saveLabel,
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

  if (offer.offerType === "quantity-breaks-different") {
    const differentRules = parseDifferentProductsDiscountRulesJson(offer?.discountRulesJson);
    if (!differentRules.length) return "";

    if (!window.__ciwiBundleState.selectedCount) {
      const defaultRule = differentRules.find((r) => r.isDefault);
      window.__ciwiBundleState.selectedCount = defaultRule
        ? defaultRule.count
        : (differentRules[0]?.count || 1);
      setTimeout(
        () =>
          updateThemeQuantityInput(
            getCartQuantityForSelectedOffer(offer, window.__ciwiBundleState.selectedCount),
          ),
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
    const hasDefault = differentRules.some((r) => r.isDefault);

    const currentPool = parseSelectedProductIds(offer.selectedProductsJson);
    if (currentPool.length > 0 && getCurrentProductGid() && !currentPool.includes(getCurrentProductGid())) {
      return "";
    }

    const unitPrice = getCurrentUnitPrice();
    const items = [
      {
        count: 1,
        title: "Single",
        subtitle: "Standard price",
        price: formatPrice(unitPrice),
      },
      ...differentRules.map((rule, index) => {
      const isFeatured = hasDefault ? !!rule.isDefault : index === 0;
      const amounts = calculateBundleAmounts(unitPrice, rule.count, rule.discountPercent);
      return {
        count: rule.count || 1,
        title: rule.title || `Any ${rule.count} items`,
        subtitle:
          rule.subtitle ||
          `Includes ${rule.buyProductIds.length} trigger product${
            rule.buyProductIds.length === 1 ? "" : "s"
          }`,
        price: formatPrice(amounts.discountedTotal),
        original: formatPrice(amounts.originalTotal),
        badge: rule.badge || (isFeatured ? "Most Popular" : ""),
        saveLabel: `SAVE ${formatPrice(amounts.saved)}`,
        chooserHtml: renderDifferentProductsPoolControlHtml(
          offer,
          rule,
          borderColor,
          accentColor,
        ),
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
        ${item.chooserHtml || ""}
        <div class="create-offer-style-preview-item-price">${esc(item.price)}</div>
        ${
          item.original
            ? `<div class="create-offer-style-preview-item-original">${esc(item.original)}</div>`
            : ""
        }
      </div>`;
      })
      .join("");

    const barIdxDifferent = computeSelectedBarIndexForOffer(offer);
    const progressiveDifferent = renderProgressiveGiftsStorefrontHtml(
      offer,
      barIdxDifferent,
      selectedCount,
    );

    return `<div class="create-offer-preview-card">
      <div class="create-offer-style-preview-header" style="color:${esc(titleColor)} !important; font-size: ${esc(titleFontSize)}px !important; font-weight: ${esc(titleFontWeight)} !important;">${esc(widgetTitle)}</div>
      <div class="create-offer-style-preview-list create-offer-style-preview-list--${layoutFormat}">
        ${itemsHtml}
      </div>
      ${showCustomButton ? `<button class="create-offer-preview-button" onclick="window.ciwiHandleBundleAddToCart()" style="width: 100%; margin-top: 12px; padding: 12px; background: ${esc(buttonPrimaryColor)}; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
        ${esc(buttonText)}
      </button>` : ""}
    </div>` + progressiveDifferent;
  }
  
  // Existing logic for quantity breaks
  const discountRules = parseDiscountRulesJson(offer?.discountRulesJson);
  if (!discountRules.length) return "";

  if (!window.__ciwiBundleState.selectedCount) {
    const defaultRule = discountRules.find(r => r.isDefault);
    window.__ciwiBundleState.selectedCount = defaultRule ? defaultRule.count : (discountRules[0]?.count || 1);
    setTimeout(
      () =>
        updateThemeQuantityInput(
          getCartQuantityForSelectedOffer(offer, window.__ciwiBundleState.selectedCount),
        ),
      0,
    );
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
      if (rule.logicType === "bxgy") {
        const isFeatured = hasDefault ? !!rule.isDefault : index === 0;
        const bxgyDisplay = getBxgyDisplayMeta(rule);
        return {
          count: rule.count,
          title: rule.title || bxgyDisplay.title,
          subtitle: rule.subtitle || bxgyDisplay.subtitle,
          price: bxgyDisplay.price,
          badge: rule.badge || (isFeatured ? "Most Popular" : ""),
          saveLabel: bxgyDisplay.saveLabel,
        };
      }
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
    if (document.getElementById("ciwi-bundle-enabled")) {
      const enabledPayload = parseCiwiMetafieldScript("ciwi-bundle-enabled");
      if (
        enabledPayload &&
        typeof enabledPayload === "object" &&
        typeof enabledPayload.enabled === "boolean" &&
        !enabledPayload.enabled
      ) {
        return null;
      }
    }
    const mergedEl = document.getElementById("ciwi-bundle-offers");
    if (!mergedEl) {
      return null;
    }
    return parseCiwiMetafieldScript("ciwi-bundle-offers");
  } catch (e) {
    console.error("[ciwi] Failed to parse bundle offers metafield", e);
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
    } else if (currentOffer.offerType === "quantity-breaks-different") {
      void hydrateDifferentProductsOfferInPlace(currentOffer).then((changed) => {
        if (!changed) return;
        const wrap = document.querySelector(".ciwi-bundle-wrapper");
        if (wrap) {
          const html = renderBundlePreviewHtml(currentOffer);
          if (html) wrap.innerHTML = html;
        }
      });
    } else if (currentOffer.offerType === "free-gift") {
      void hydrateFreeGiftOfferInPlace(currentOffer).then((changed) => {
        if (!changed) return;
        const wrap = document.querySelector(".ciwi-bundle-wrapper");
        if (wrap) {
          const html = renderBundlePreviewHtml(currentOffer);
          if (html) wrap.innerHTML = html;
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
