/**
 * 店面图片走 App Proxy → /api/storefront/picture/*。
 * Proxy 前缀由 Liquid `ciwi_app_proxy_base` 写入；缺省再按扩展 CDN handle 推断。
 * 不要把测试 subpath 写死成默认值。
 */
const DEFAULT_STOREFRONT_APP_PROXY_BASE = "/apps/ciwi-image";
const TEST_STOREFRONT_APP_PROXY_BASE = "/apps/ciwi-image-test";
const STOREFRONT_APP_PROXY_BASE_RE = /^\/apps\/[a-z0-9-]+$/i;

function sanitizeStorefrontApiBase(value) {
  const raw = String(value || "")
    .trim()
    .replace(/\/+$/, "");
  return STOREFRONT_APP_PROXY_BASE_RE.test(raw) ? raw : "";
}

function inferStorefrontApiBaseFromAssetUrl(url) {
  return String(url || "").includes("ciwi-image-translation-test")
    ? TEST_STOREFRONT_APP_PROXY_BASE
    : DEFAULT_STOREFRONT_APP_PROXY_BASE;
}

function resolveStorefrontApiBase() {
  if (typeof document !== "undefined") {
    const fromInput = sanitizeStorefrontApiBase(
      document.querySelector('input[name="ciwi_app_proxy_base"]')?.value,
    );
    if (fromInput) return fromInput;
  }
  try {
    if (typeof import.meta?.url === "string" && import.meta.url) {
      return inferStorefrontApiBaseFromAssetUrl(import.meta.url);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_STOREFRONT_APP_PROXY_BASE;
}

function switchUrl(blockId) {
  if (blockId === "AZXdIQ0pzK2ZsWlZqW__17209211813463636621") {
    return "https://springbackendprod.azurewebsites.net";
  }
  return "https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net";
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export async function GetProductImageData({ shopName, id, languageCode }) {
  try {
    const base = resolveStorefrontApiBase();
    const { data } = await fetchJson(
      `${base}/picture/selectPictureDataByShopNameAndProductIdAndLanguageCode?shopName=${encodeURIComponent(shopName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          productId: id,
          languageCode,
        }),
      },
    );
    return data;
  } catch (err) {
    console.error("Error GetProductImageData:", err);
  }
}

export async function GetShopImageData({ shopName, languageCode }) {
  try {
    const base = resolveStorefrontApiBase();
    const { data } = await fetchJson(
      `${base}/picture/selectPicturesByShopNameAndLanguageCode?shopName=${encodeURIComponent(shopName)}&languageCode=${encodeURIComponent(languageCode)}`,
      {
        method: "POST",
        body: JSON.stringify({ languageCode }),
      },
    );
    return data;
  } catch (err) {
    console.error("Error GetShopImageData:", err);
  }
}

export async function CollectSwitcherImageData({ shopName, images, pagePath, languageCode }) {
  try {
    if (!Array.isArray(images) || images.length === 0) {
      return { success: true, errorCode: null, errorMsg: null, response: { accepted: true } };
    }
    const base = resolveStorefrontApiBase();
    const { data } = await fetchJson(
      `${base}/picture/collect?shopName=${encodeURIComponent(shopName)}`,
      {
        method: "POST",
        body: JSON.stringify({ shopName, images, pagePath, languageCode }),
      },
    );
    return data;
  } catch (err) {
    console.error("Error CollectSwitcherImageData:", err);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "collect_failed",
      response: null,
    };
  }
}

export async function GetContentImageData({ shopName, urlKeys, languageCode }) {
  try {
    const base = resolveStorefrontApiBase();
    const { data } = await fetchJson(
      `${base}/picture/getPictureDataByUrlKeys?shopName=${encodeURIComponent(shopName)}`,
      {
        method: "POST",
        body: JSON.stringify({ shopName, urlKeys, languageCode }),
      },
    );
    return data;
  } catch (err) {
    console.error("Error GetContentImageData:", err);
  }
}

export async function CrawlerDDetectionReport({ shop, blockId, ua, reason }) {
  try {
    const { data } = await fetchJson(`${switchUrl(blockId)}/frontEndPrinting`, {
      method: "POST",
      body: JSON.stringify({
        data: `${shop} 检测到爬虫 ${ua}, 原因: ${reason}`,
      }),
    });
    return data;
  } catch (err) {
    console.error("Error CrawlerDDetectionReport:", err);
  }
}
