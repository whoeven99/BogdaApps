import * as API from "./ciwi-api.js";
import { GetContentImageData } from "./ciwi-api.js";

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
  if (matched.length) return `ua 包含: ${matched.join(",")}`;
  const error = [];
  if (navigator.webdriver) error.push("webdriver");
  if (!(navigator.languages && navigator.languages.length > 0)) error.push("without languages");
  if (window.outerWidth === 0 || window.outerHeight === 0) error.push("window undefined");
  if (!window.__JS_EXECUTED__) error.push("js not executed");
  return error.length >= 2 ? error.join(",") : undefined;
}

const CDN_FILES_PATH = /^\/s\/files\/1\/(?:\d+\/){2,3}(.+)$/;
const STOREFRONT_CDN_PATH = /\/cdn\/shop\/(.+)$/;
const THEME_ID_PREFIX = /^t\/\d+\//;
const SHOPIFY_SIZE_SUFFIX =
  /_(?:(?:\d+x\d*)|(?:x\d+)|(?:\{width\}(?:x(?:\{height\}|\d+)?)?))(?:_crop_(?:top|center|bottom|left|right))?(?:@[23]x)?(?=\.[a-z0-9]+$)/i;
const CONTENT_IMAGE_KEY_LIMIT = 200;
const TRANSLATABLE_MEDIA_SELECTOR = "img, video, model-viewer, iframe";

function decodeFileName(file) {
  try {
    return decodeURIComponent(file);
  } catch {
    return file;
  }
}

function stripShopifyImageSizeSuffix(pathOrKey) {
  const trimmed = String(pathOrKey || "").trim();
  if (!trimmed) return trimmed;
  const slash = trimmed.lastIndexOf("/");
  const dir = slash >= 0 ? trimmed.slice(0, slash + 1) : "";
  const file = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  return dir + decodeFileName(file).replace(SHOPIFY_SIZE_SUFFIX, "");
}

function parseContentImageUrl(raw) {
  const candidate = String(raw || "").trim().split(",")[0]?.trim().split(/\s+/)[0];
  if (!candidate) return null;
  try {
    return new URL(
      candidate.startsWith("//") ? `https:${candidate}` : candidate,
      window.location.origin,
    );
  } catch {
    return null;
  }
}

function shopifyContentImageUrlKey(raw) {
  const parsed = parseContentImageUrl(raw);
  if (!parsed) return null;
  const cdn =
    parsed.hostname === "cdn.shopify.com" ? CDN_FILES_PATH.exec(parsed.pathname) : null;
  const key = (cdn?.[1] ?? STOREFRONT_CDN_PATH.exec(parsed.pathname)?.[1] ?? "").trim();
  if (!key) return null;
  return stripShopifyImageSizeSuffix(key.replace(THEME_ID_PREFIX, "")) || null;
}

function externalContentImageUrlKey(raw) {
  const candidate = String(raw || "").trim().split(",")[0]?.trim().split(/\s+/)[0];
  if (!candidate || /^(data:|blob:)/i.test(candidate)) return null;
  if (shopifyContentImageUrlKey(raw)) return null;
  const parsed = parseContentImageUrl(raw);
  if (!parsed || parsed.protocol !== "https:") return null;
  const host = parsed.hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return null;
  }
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return null;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return null;
  const key = `ext:${host}${parsed.pathname || "/"}`;
  if (key.length > 512) return null;
  return key;
}

function contentImageUrlKey(raw) {
  return shopifyContentImageUrlKey(raw) || externalContentImageUrlKey(raw);
}

function getImageMatchCandidates(img) {
  if (!(img instanceof HTMLImageElement)) return [];
  const candidates = [
    img.dataset.ciwiOriginalSrc,
    img.currentSrc,
    img.src,
    img.getAttribute("src"),
    img.srcset,
    img.getAttribute("srcset"),
    img.getAttribute("data-src"),
    img.getAttribute("data-srcset"),
  ].filter(Boolean);
  return [...new Set(candidates)];
}

function getMediaUrlCandidates(el) {
  if (el instanceof HTMLImageElement) return getImageMatchCandidates(el);
  if (el instanceof HTMLVideoElement) {
    const fromSources = Array.from(el.querySelectorAll("source")).map(
      (source) => source.src || source.getAttribute("src"),
    );
    return [
      ...new Set(
        [
          el.poster,
          el.getAttribute("poster"),
          el.currentSrc,
          el.src,
          el.getAttribute("src"),
          ...fromSources,
        ].filter(Boolean),
      ),
    ];
  }
  if (el?.tagName === "MODEL-VIEWER") {
    return [el.getAttribute("poster"), el.getAttribute("src")].filter(Boolean);
  }
  if (el instanceof HTMLIFrameElement) {
    return [el.src, el.getAttribute("src"), el.getAttribute("data-src")].filter(Boolean);
  }
  return [];
}

function contentImageKeyOf(el) {
  if (el instanceof HTMLImageElement) {
    const original = el.dataset.ciwiOriginalSrc;
    if (original) {
      const key = contentImageUrlKey(original);
      if (key) return key;
    }
  }
  for (const candidate of getMediaUrlCandidates(el)) {
    const key = contentImageUrlKey(candidate);
    if (key) return key;
  }
  return null;
}

function collectScanRoots() {
  const roots = [];
  const seen = new Set();
  const add = (root) => {
    if (!root || seen.has(root)) return;
    seen.add(root);
    roots.push(root);
  };
  add(document.body);
  const walk = (root) => {
    if (!root) return;
    try {
      root.querySelectorAll?.("*")?.forEach((el) => {
        if (el.shadowRoot) {
          add(el.shadowRoot);
          walk(el.shadowRoot);
        }
      });
    } catch {
      /* ignore */
    }
    try {
      root.querySelectorAll?.("iframe")?.forEach((frame) => {
        try {
          const doc = frame.contentDocument;
          if (doc?.body) {
            add(doc.body);
            walk(doc.body);
          }
        } catch {
          /* cross-origin */
        }
      });
    } catch {
      /* ignore */
    }
  };
  walk(document.body);
  return roots;
}

function collectTranslatableMediaByKey(roots) {
  const imagesByKey = new Map();
  const add = (el) => {
    const key = contentImageKeyOf(el);
    if (!key) return;
    if (!imagesByKey.has(key)) {
      if (imagesByKey.size >= CONTENT_IMAGE_KEY_LIMIT) return;
      imagesByKey.set(key, []);
    }
    const list = imagesByKey.get(key);
    if (!list.includes(el)) list.push(el);
  };
  for (const root of roots) {
    try {
      if (root.matches?.(TRANSLATABLE_MEDIA_SELECTOR)) add(root);
      root.querySelectorAll?.(TRANSLATABLE_MEDIA_SELECTOR).forEach(add);
    } catch {
      /* ignore */
    }
  }
  return imagesByKey;
}

function collectTranslatableMediaInNode(node, out) {
  if (!node) return;
  try {
    if (node.matches?.(TRANSLATABLE_MEDIA_SELECTOR)) out.push(node);
    node.querySelectorAll?.(TRANSLATABLE_MEDIA_SELECTOR)?.forEach((el) => out.push(el));
  } catch {
    /* ignore */
  }
  try {
    if (node.shadowRoot) collectTranslatableMediaInNode(node.shadowRoot, out);
    node.querySelectorAll?.("*")?.forEach((el) => {
      if (el.shadowRoot) collectTranslatableMediaInNode(el.shadowRoot, out);
    });
  } catch {
    /* ignore */
  }
}

function rememberOriginalAttr(el, datasetKey, attrName) {
  if (!(datasetKey in el.dataset)) {
    el.dataset[datasetKey] = el.getAttribute(attrName) || "";
  }
}

function rememberOriginalPictureSources(img) {
  const picture = img.closest?.("picture");
  picture?.querySelectorAll("source").forEach((source, index) => {
    const key = `ciwiOriginalSource${index}`;
    if (!(key in img.dataset)) {
      img.dataset[key] = source.getAttribute("srcset") || source.srcset || "";
    }
  });
}

function rememberOriginalImageState(img) {
  if (!(img instanceof HTMLImageElement)) return;
  if (!("ciwiOriginalSrc" in img.dataset)) {
    img.dataset.ciwiOriginalSrc = img.getAttribute("src") || img.currentSrc || img.src || "";
  }
  if (!("ciwiOriginalSrcset" in img.dataset)) {
    img.dataset.ciwiOriginalSrcset = img.getAttribute("srcset") || img.srcset || "";
  }
  if (!("ciwiOriginalAlt" in img.dataset)) {
    img.dataset.ciwiOriginalAlt = img.getAttribute("alt") || img.alt || "";
  }
  rememberOriginalPictureSources(img);
}

function syncPictureSources(img, afterUrl) {
  if (!(img instanceof HTMLImageElement) || !afterUrl) return;
  const picture = img.closest("picture");
  picture?.querySelectorAll("source").forEach((source) => {
    source.srcset = afterUrl;
    source.setAttribute("srcset", afterUrl);
  });
}

function applyTranslatedImage(img, item) {
  if (!(img instanceof HTMLImageElement) || !item) return;
  rememberOriginalImageState(img);
  if (item.imageAfterUrl) {
    img.src = item.imageAfterUrl;
    img.setAttribute("src", item.imageAfterUrl);
    img.srcset = item.imageAfterUrl;
    img.setAttribute("srcset", item.imageAfterUrl);
    syncPictureSources(img, item.imageAfterUrl);
  }
  if (item.altAfterTranslation) {
    img.alt = item.altAfterTranslation;
    img.setAttribute("alt", item.altAfterTranslation);
  }
}

function applyTranslatedMedia(el, item) {
  if (!(el instanceof Element) || !item) return;
  if (el instanceof HTMLImageElement) {
    applyTranslatedImage(el, item);
    return;
  }
  const alt = item.altAfterTranslation;
  if (!alt) return;
  if (el instanceof HTMLVideoElement) {
    rememberOriginalAttr(el, "ciwiOriginalAriaLabel", "aria-label");
    rememberOriginalAttr(el, "ciwiOriginalTitle", "title");
    el.setAttribute("aria-label", alt);
    el.setAttribute("title", alt);
    return;
  }
  if (el.tagName === "MODEL-VIEWER") {
    rememberOriginalAttr(el, "ciwiOriginalAlt", "alt");
    el.setAttribute("alt", alt);
    return;
  }
  if (el instanceof HTMLIFrameElement) {
    rememberOriginalAttr(el, "ciwiOriginalTitle", "title");
    el.setAttribute("title", alt);
  }
}

function isStorefrontPictureItem(item) {
  return Boolean(item?.urlKey && (item.imageAfterUrl || item.altAfterTranslation));
}

let _contentImageObserver = null;

function observeContentImages(translatedByKey) {
  _contentImageObserver?.disconnect();
  if (translatedByKey.size === 0) return;
  const applyTo = (el) => {
    const item = translatedByKey.get(contentImageKeyOf(el));
    if (item) applyTranslatedMedia(el, item);
  };
  const applyNode = (node) => {
    const media = [];
    collectTranslatableMediaInNode(node, media);
    media.forEach(applyTo);
  };
  _contentImageObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element) && node?.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
          return;
        }
        applyNode(node);
      });
    }
  });
  _contentImageObserver.observe(document.body, { childList: true, subtree: true });
}

async function ContentImageTranslate() {
  const blockId = document.querySelector('input[name="image_block_id"]')?.value;
  const ciwiBlock = blockId
    ? document.querySelector(`#shopify-block-${blockId}`)
    : document.querySelector("#image_queryCiwiId")?.closest("[id]");
  const shop =
    ciwiBlock?.querySelector?.("#image_queryCiwiId")?.value ||
    document.querySelector("#image_queryCiwiId")?.value;
  const language =
    ciwiBlock?.querySelector?.('input[name="image_language_code"]')?.value ||
    document.querySelector('input[name="image_language_code"]')?.value;
  if (!shop || !language) return;

  const imagesByKey = collectTranslatableMediaByKey(collectScanRoots());
  if (imagesByKey.size === 0) return;

  const translated = await GetContentImageData({
    shopName: shop,
    urlKeys: [...imagesByKey.keys()],
    languageCode: language,
  });
  if (!Array.isArray(translated?.response)) return;

  const translatedByKey = new Map();
  translated.response.forEach((item) => {
    if (!isStorefrontPictureItem(item)) return;
    translatedByKey.set(item.urlKey, item);
    imagesByKey.get(item.urlKey)?.forEach((el) => applyTranslatedMedia(el, item));
  });
  observeContentImages(translatedByKey);
}

window.onload = async () => {
  const blockId = document.querySelector('input[name="image_block_id"]')?.value;
  if (!blockId) return console.warn("blockId not found");
  const ciwiBlock = document.querySelector(`#shopify-block-${blockId}`);
  if (!ciwiBlock) return console.warn("ciwiBlock not found");
  const shop = ciwiBlock.querySelector("#image_queryCiwiId");

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

  await ContentImageTranslate();
};
