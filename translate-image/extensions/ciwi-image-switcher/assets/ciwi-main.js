import { CollectSwitcherImageData, GetContentImageData } from "./ciwi-api.js";

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

function currentStorefrontLanguage() {
  return (
    document.querySelector('input[name="image_language_code"]')?.value ||
    document.documentElement.lang ||
    ""
  );
}

async function ContentImageTranslate() {
  const shop =
    document.querySelector("#image_queryCiwiId")?.value ||
    document.querySelector('input[name="image_queryCiwiId"]')?.value;
  const language = currentStorefrontLanguage();
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

const SWITCHER_IMAGE_MIN_ATTR_PX = 80;
const SWITCHER_IMAGE_POST_CHUNK = 100;
const SWITCHER_IMAGE_OBSERVE_MS = 15000;
const SWITCHER_IMAGE_POSTED_PREFIX = "ciwi_sw_img_posted:";

function isThemeEditor() {
  const referrer = String(document.referrer || "");
  if (document.documentElement.classList.contains("shopify-design-mode")) return true;
  if (window.Shopify?.designMode === true) return true;
  if (window.Shopify?.visualPreviewMode === true) return true;
  if (/admin\.shopify\.com\/.*\/themes\/\d+\/editor/i.test(referrer)) return true;
  if (/shopifypreview|preview_theme_id/i.test(window.location.href)) return true;
  return false;
}

function scheduleIdle(fn, timeout = 2000) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(fn, { timeout });
    return;
  }
  setTimeout(fn, Math.min(timeout, 2000));
}

function originalImgSrc(img) {
  if (!(img instanceof HTMLImageElement)) return "";
  return (
    img.dataset.ciwiOriginalSrc ||
    img.currentSrc ||
    img.getAttribute("src") ||
    img.getAttribute("data-src") ||
    ""
  );
}

function isTinySwitcherImg(img) {
  const w = Number(img.getAttribute("width"));
  const h = Number(img.getAttribute("height"));
  if (Number.isFinite(w) && w > 0 && w < SWITCHER_IMAGE_MIN_ATTR_PX) return true;
  if (Number.isFinite(h) && h > 0 && h < SWITCHER_IMAGE_MIN_ATTR_PX) return true;
  return false;
}

function collectibleSwitcherImg(img) {
  if (!(img instanceof HTMLImageElement)) return null;
  if (isTinySwitcherImg(img)) return null;
  const src = originalImgSrc(img);
  if (!src || /^(data:|blob:)/i.test(src)) return null;
  if (shopifyContentImageUrlKey(src)) return null;
  const urlKey = externalContentImageUrlKey(src);
  if (!urlKey) return null;
  return { src, urlKey };
}

function collectSwitcherImgElements(node, out) {
  if (!node) return;
  try {
    if (node instanceof HTMLImageElement) out.push(node);
    node.querySelectorAll?.("img")?.forEach((img) => out.push(img));
  } catch {
    /* ignore */
  }
  try {
    if (node.shadowRoot) collectSwitcherImgElements(node.shadowRoot, out);
    node.querySelectorAll?.("*")?.forEach((el) => {
      if (el.shadowRoot) collectSwitcherImgElements(el.shadowRoot, out);
    });
  } catch {
    /* ignore */
  }
}

function collectSwitcherImgsFromRoots() {
  const byKey = new Map();
  for (const root of collectScanRoots()) {
    const imgs = [];
    collectSwitcherImgElements(root, imgs);
    for (const img of imgs) {
      const item = collectibleSwitcherImg(img);
      if (!item || byKey.has(item.urlKey)) continue;
      byKey.set(item.urlKey, item);
    }
  }
  return [...byKey.values()];
}

function noteSwitcherImgsFrom(node, pending) {
  const imgs = [];
  collectSwitcherImgElements(node, imgs);
  for (const img of imgs) {
    const item = collectibleSwitcherImg(img);
    if (item) pending.set(item.urlKey, item);
  }
}

function loadPostedSwitcherKeys(shop, pagePath) {
  const posted = new Set();
  try {
    const raw = sessionStorage.getItem(`${SWITCHER_IMAGE_POSTED_PREFIX}${shop}:${pagePath}`);
    if (raw) JSON.parse(raw).forEach((key) => posted.add(key));
  } catch {
    /* ignore */
  }
  return posted;
}

function savePostedSwitcherKeys(shop, pagePath, posted) {
  try {
    sessionStorage.setItem(
      `${SWITCHER_IMAGE_POSTED_PREFIX}${shop}:${pagePath}`,
      JSON.stringify([...posted]),
    );
  } catch {
    /* ignore */
  }
}

function CollectSwitcherImages(shop) {
  const shopName = typeof shop === "string" ? shop : shop?.value;
  if (!shopName) return;
  const pagePath = window.location.pathname || "/";
  const languageCode = currentStorefrontLanguage();
  const posted = loadPostedSwitcherKeys(shopName, pagePath);
  const inFlight = new Set();
  const pending = new Map();
  const observedRoots = new WeakSet();
  const frameLoads = [];

  const commitPostedKeys = (keys) => {
    let changed = false;
    for (const key of keys) {
      if (posted.has(key)) continue;
      posted.add(key);
      changed = true;
    }
    if (changed) savePostedSwitcherKeys(shopName, pagePath, posted);
  };

  const postChunk = async (chunk) => {
    const keys = chunk.map((item) => item.urlKey);
    try {
      const data = await CollectSwitcherImageData({
        shopName,
        images: chunk,
        pagePath,
        languageCode,
      });
      if (data?.success === true && data?.response?.accepted !== false) {
        commitPostedKeys(keys);
      }
    } catch {
      /* CollectSwitcherImageData already logs */
    } finally {
      keys.forEach((key) => inFlight.delete(key));
    }
  };

  const postSeen = (items) => {
    const fresh = items.filter(
      (item) => item && !posted.has(item.urlKey) && !inFlight.has(item.urlKey),
    );
    if (!fresh.length) return;
    fresh.forEach((item) => inFlight.add(item.urlKey));
    for (let i = 0; i < fresh.length; i += SWITCHER_IMAGE_POST_CHUNK) {
      void postChunk(fresh.slice(i, i + SWITCHER_IMAGE_POST_CHUNK));
    }
  };

  let flushTimer = 0;
  const flushPending = () => {
    if (flushTimer) {
      window.clearTimeout(flushTimer);
      flushTimer = 0;
    }
    if (pending.size === 0) return;
    const items = [...pending.values()];
    pending.clear();
    postSeen(items);
  };
  const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = window.setTimeout(() => {
      flushTimer = 0;
      flushPending();
    }, 400);
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        noteSwitcherImgsFrom(mutation.target, pending);
        continue;
      }
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element) && node?.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
          return;
        }
        noteSwitcherImgsFrom(node, pending);
        watchSwitcherImageTree(node);
      });
    }
    scheduleFlush();
  });

  const observeRoot = (root) => {
    if (!root || observedRoots.has(root)) return;
    observedRoots.add(root);
    try {
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "srcset", "data-src"],
      });
    } catch {
      /* ignore */
    }
  };

  const watchFrame = (frame) => {
    const attach = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc?.body) return;
        observeRoot(doc.body);
        noteSwitcherImgsFrom(doc.body, pending);
        scheduleFlush();
      } catch {
        /* cross-origin */
      }
    };
    attach();
    frame.addEventListener("load", attach);
    frameLoads.push([frame, attach]);
  };

  const watchSwitcherImageTree = (node) => {
    if (!node) return;
    try {
      if (node.shadowRoot) {
        observeRoot(node.shadowRoot);
        watchSwitcherImageTree(node.shadowRoot);
      }
      node.querySelectorAll?.("*")?.forEach((el) => {
        if (el.shadowRoot) {
          observeRoot(el.shadowRoot);
          watchSwitcherImageTree(el.shadowRoot);
        }
      });
      node.querySelectorAll?.("iframe")?.forEach(watchFrame);
    } catch {
      /* ignore */
    }
  };

  postSeen(collectSwitcherImgsFromRoots());
  observeRoot(document.body);
  watchSwitcherImageTree(document.body);
  window.setTimeout(() => {
    observer.disconnect();
    frameLoads.forEach(([frame, attach]) => {
      try {
        frame.removeEventListener("load", attach);
      } catch {
        /* ignore */
      }
    });
    flushPending();
    postSeen(collectSwitcherImgsFromRoots());
  }, SWITCHER_IMAGE_OBSERVE_MS);
}

function watchLanguageAndHistory() {
  let lastLang = currentStorefrontLanguage();
  const rerunIfLangChanged = () => {
    const next = currentStorefrontLanguage();
    if (!next || next === lastLang) return;
    lastLang = next;
    void ContentImageTranslate();
  };
  const langObserver = new MutationObserver(rerunIfLangChanged);
  langObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
  window.addEventListener("pageshow", () => {
    void ContentImageTranslate();
  });
  window.addEventListener("popstate", rerunIfLangChanged);
}

function startImageSwitcher() {
  if (isLikelyBotByUA()) return;
  const shop = document.querySelector("#image_queryCiwiId")?.value;
  const runReplace = () => {
    void ContentImageTranslate();
  };
  if (isThemeEditor()) {
    runReplace();
    return;
  }
  scheduleIdle(runReplace, 2000);
  scheduleIdle(() => CollectSwitcherImages(shop), 2000);
  watchLanguageAndHistory();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startImageSwitcher, { once: true });
} else {
  startImageSwitcher();
}
