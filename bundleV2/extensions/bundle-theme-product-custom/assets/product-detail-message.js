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

function toCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
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

    // Check market filter
    if (currentMarketId && offer.offerSettingsJson) {
      try {
        const settings = JSON.parse(offer.offerSettingsJson);
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
};

window.ciwiHandleBundleAddToCart = async function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const currentOffer = getCurrentOffer(offersConfigCache);
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

    function calcDifferentPrice(rule) {
      const count = Math.max(1, Number(rule.count) || 1);
      const mode = rule.priceMode || "percentage_off";
      const value = Number.isFinite(Number(rule.discountValue))
        ? Number(rule.discountValue)
        : Number(rule.discountPercent || 0);
      // 主题端暂无附加商品明细缓存，先按当前主商品单价估算，保证前台可渲染
      const original = unitPrice * count;
      let discounted = original;
      if (mode === "percentage_off") {
        discounted = original * (1 - Math.max(0, Math.min(100, value)) / 100);
      } else if (mode === "amount_off") {
        discounted = Math.max(0, original - Math.max(0, value) * count);
      } else if (mode === "fixed_price") {
        discounted = Math.max(0, value) * count;
      }
      return { original, discounted };
    }

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
        const { original, discounted } = (() => {
          const base = Number(primary?.price || unitPrice) || unitPrice;
          const extrasTotal = selectedExtras.reduce(
            (sum, p) => sum + (Number(p?.price || 0) || 0),
            0,
          );
          const mode = rule.priceMode || "percentage_off";
          const value = Number.isFinite(Number(rule.discountValue))
            ? Number(rule.discountValue)
            : Number(rule.discountPercent || 0);
          // 主商品 + 已选附加商品求原价
          const originalMix = base + extrasTotal;
          const effectiveCount = Math.max(1, 1 + selectedExtras.length);
          let discountedMix = originalMix;
          if (mode === "percentage_off") {
            discountedMix =
              originalMix * (1 - Math.max(0, Math.min(100, value)) / 100);
          } else if (mode === "amount_off") {
            discountedMix = Math.max(0, originalMix - Math.max(0, value) * effectiveCount);
          } else if (mode === "fixed_price") {
            discountedMix = Math.max(0, value) * effectiveCount;
          }
          return { original: originalMix, discounted: discountedMix };
        })();
        const showStrike = discounted < original;
        const chooseEnabled = offerSettings.enableMultiProductBundle === true && rule.count > 1;
        const chooseCount = Math.max(
          0,
          Math.max(0, rule.count - 1) - selectedExtras.length,
        );
        const chooseRowHtml = chooseEnabled
          ? `<div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
              ${Array.from({ length: chooseCount })
                .map(
                  (_, idx) =>
                    `<button type="button" onclick="window.ciwiOpenDifferentPicker(event, ${rule.count}, ${
                      selectedExtras.length + idx
                    })" style="width:24px;height:24px;border-radius:4px;border:1px solid #111;background:#fff;color:#111;font-weight:700;cursor:pointer;">+</button>`,
                )
                .join("")}
              ${
                chooseCount > 0
                  ? `<button type="button" onclick="window.ciwiOpenDifferentPicker(event, ${rule.count}, ${selectedExtras.length})" style="height:24px;padding:0 10px;border-radius:4px;border:1px solid #111;background:#111;color:#fff;font-size:11px;cursor:pointer;">${esc(offerSettings.chooseButtonText || "Choose")}</button>`
                  : ""
              }
            </div>`
          : "";
        const extrasHtml = selectedExtras
          .map(
            (p) => `<div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
              ${
                p?.image
                  ? `<img src="${esc(p.image)}" alt="${esc(p.title || "Product")}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;" />`
                  : `<div style="width:36px;height:36px;border-radius:4px;background:#f4f6f8;"></div>`
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
              ${primary.image ? `<img src="${esc(primary.image)}" alt="${esc(primary.title || "Product")}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;" />` : `<div style="width:36px;height:36px;border-radius:4px;background:#f4f6f8;"></div>`}
              <div style="flex:1;min-width:0;">
                <div style="font-size:12px;line-height:1.2;color:#1c1f23;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(primary.title || "Product")}</div>
                <div style="font-size:11px;color:#6b7280;">${esc(primary.price || "")}</div>
              </div>
            </div>`
          : "";

        return `<div class="create-offer-style-preview-item${isSelected ? " create-offer-style-preview-item--featured" : ""}" style="${featuredStyle}" onclick="window.ciwiSelectBundleOption(${rule.count})">
          ${rule.badge ? `<div class="create-offer-style-preview-badge" style="background:${esc(accentColor)} !important; color:${esc(labelColor)} !important;">${esc(rule.badge)}</div>` : ""}
          <div class="create-offer-style-preview-item-title">${esc(rule.title || `${rule.count} pack`)}</div>
          <div class="create-offer-style-preview-item-subtitle">${esc(rule.subtitle || `${rule.discountPercent}% OFF`)}</div>
          <div class="create-offer-style-preview-item-price">${esc(formatPrice(discounted))}</div>
          ${showStrike ? `<div class="create-offer-style-preview-item-original">${esc(formatPrice(original))}</div>` : ""}
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
