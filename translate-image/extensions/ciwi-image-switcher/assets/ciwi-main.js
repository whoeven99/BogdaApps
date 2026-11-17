import * as API from "./ciwi-api.js";
import { GetShopImageData, GetProductImageData } from "./ciwi-api.js";

function isLikelyBotByUA() {
  const ua = navigator.userAgent.toLowerCase();
  const botKeywords = [
    "bot",
    "spider",
    "crawl",
    "slurp",
    "bingpreview",
    "facebookexternalhit",
    "monitor",
    "headless",
    "wget",
    "curl",
    "python-requests",
  ];
  const matched = botKeywords.filter((k) => ua.includes(k));
  if (matched.length) return `ua 包含: ${matched.join(", ")}`;
  const error = [];
  if (navigator.webdriver) error.push("webdriver");
  if (!(navigator.languages && navigator.languages.length > 0))
    error.push("without languages");
  if (window.outerWidth === 0 || window.outerHeight === 0)
    error.push("window undefined");
  if (!window.__JS_EXECUTED__) error.push("js not executed");
  return error.length >= 2 ? error.join(",") : undefined;
}

// =============================
// 缓存工具（按图片URL存储）
// =============================
function getCache(key) {
  try {
    const cached = JSON.parse(localStorage.getItem(key));
    if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
      return cached.data;
    }
  } catch {}
  return null;
}

function setCache(key, data) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

// =============================
// 图片预加载
// =============================
function preloadImages(items) {
  items.forEach((item) => {
    if (item.imageAfterUrl) {
      const img = new Image();
      img.src = item.imageAfterUrl;
    }
  });
}

// =============================
// 图片替换逻辑（Map 优化）
// =============================
function observeVisibleImages(map, language) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        for (const [key, item] of map.entries()) {
          if (img.src.includes(key) || img.srcset.includes(key)) {
            if (item.imageAfterUrl) {
              img.src = item.imageAfterUrl;
              img.srcset = item.imageAfterUrl;
            }
            if (item.altAfterTranslation && item.languageCode === language) {
              img.alt = item.altAfterTranslation;
            }
            observer.unobserve(img);
            break;
          }
        }
      }
    });
  });

  document.querySelectorAll("img").forEach((img) => observer.observe(img));
}

// =============================
// 产品图片翻译逻辑
// =============================
async function ProductImgTranslate(blockId, shop, ciwiBlock) {
  const articleId = ciwiBlock.querySelector(
    'input[name="image_article_id"]',
  ).value;
  const productId = ciwiBlock.querySelector(
    'input[name="image_product_id"]',
  ).value;
  if (!productId && !articleId) return;

  const language = ciwiBlock.querySelector(
    'input[name="image_language_code"]',
  ).value;
  const cachePrefix = `ciwi_product_img_`;
  console.log("查询产品详情数据");

  // 先检查缓存中是否存在该产品的图片信息
  const cacheKeys = Object.keys(localStorage).filter((k) =>
    k.startsWith(
      `${cachePrefix}${shop.value}_${productId || articleId}_${language}_`,
    ),
  );
  let cacheMap = new Map();
  cacheKeys.forEach((key) => {
    const cached = getCache(key);
    if (cached) cacheMap.set(key, cached);
  });

  // 请求最新数据
  const data = await GetProductImageData({
    shopName: shop.value,
    id: articleId
      ? `gid://shopify/Article/${articleId}`
      : `gid://shopify/Product/${productId}`,
    languageCode: language,
  });
  console.log("GetProductImageData", data);

  const response = data?.response || [];

  const map = new Map();

  for (const item of response) {
    const key = productId
      ? item.imageBeforeUrl?.split("/files/")[2]
      : item.imageBeforeUrl?.split("/articles/")[1];

    if (!key) continue;
    const cacheKey = `${cachePrefix}${shop.value}_${productId}_${language}_${key}`;
    const cachedItem = getCache(cacheKey);

    // 如果服务器返回了新的 URL 或更新时间不同 → 更新缓存
    if (
      !cachedItem ||
      cachedItem.imageAfterUrl !== item.imageAfterUrl ||
      cachedItem.updatedAt !== item.updatedAt
    ) {
      setCache(cacheKey, item);
      cacheMap.set(cacheKey, item);
    }

    map.set(key, item);
  }

  preloadImages([...map.values()]);
  observeVisibleImages(map, language);
}

// =============================
// 店铺主页图片翻译逻辑
// =============================
async function HomeImageTranslate(blockId, ciwiBlock) {
  const productId = ciwiBlock.querySelector(
    'input[name="image_product_id"]',
  ).value;
  // console.log("productId", productId);
  if (!productId) {
    return;
  }
  const shop = document.querySelector("#image_queryCiwiId")?.value;
  const language = document.querySelector(
    'input[name="image_language_code"]',
  )?.value;
  if (!shop || !language) return;

  const cachePrefix = `ciwi_shop_img_`;

  const data = await GetShopImageData({
    shopName: shop,
    languageCode: language,
  });
  console.log("GetShopImageData: ", data);

  const response = data?.response || [];

  const map = new Map();

  for (const item of response) {
    const key = item.imageBeforeUrl?.split("/files/")[2];
    if (!key) continue;
    const cacheKey = `${cachePrefix}${shop}_${language}_${key}`;
    const cachedItem = getCache(cacheKey);

    if (
      !cachedItem ||
      cachedItem.imageAfterUrl !== item.imageAfterUrl ||
      cachedItem.updatedAt !== item.updatedAt
    ) {
      setCache(cacheKey, item);
    }

    map.set(key, item);
  }

  preloadImages([...map.values()]);
  observeVisibleImages(map, language);
}

// =============================
// 启动逻辑 + 性能测量
// =============================
window.onload = async () => {
  const startTime = performance.now();
  console.log("🚀 Ciwi_Image_Switcher 启动（带缓存校验）");

  const blockId = document.querySelector('input[name="image_block_id"]')?.value;
  if (!blockId) return console.warn("blockId not found");
  const ciwiBlock = document.querySelector(`#shopify-block-${blockId}`);
  if (!ciwiBlock) return console.warn("ciwiBlock not found");
  const shop = ciwiBlock.querySelector("#image_queryCiwiId");

  // 爬虫检测
  const reason = isLikelyBotByUA();
  if (reason) {
    console.warn("⚠️ 疑似爬虫访问", reason);
    API.CrawlerDDetectionReport({
      shop: shop.value,
      blockId,
      ua: navigator.userAgent,
      reason,
    });
    return;
  }

  await Promise.all([
    ProductImgTranslate(blockId, shop, ciwiBlock),
    HomeImageTranslate(blockId, ciwiBlock),
  ]);

  const endTime = performance.now();
  const duration = (endTime - startTime).toFixed(2);
  console.log(
    `✅ 图片替换+加载完成，用时 ${duration} ms (${(duration / 1000).toFixed(2)} 秒)`,
  );
};
