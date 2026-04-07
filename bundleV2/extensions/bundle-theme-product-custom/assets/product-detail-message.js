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

const MOCK_ITEMS = [
  {
    title: "Single",
    subtitle: "Standard price",
    price: "€65,00",
  },
  {
    title: "Duo",
    subtitle: "Buy more, save more",
    price: "€110,50",
    original: "€130,00",
    featured: true,
    badge: "Most Popular",
  },
  {
    title: "Trio",
    subtitle: "Extra savings",
    price: "€149,00",
  },
  {
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

function renderBundlePreviewHtml() {
  const itemsHtml = MOCK_ITEMS.map((item) => {
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
      <div class="create-offer-style-preview-item-price">${esc(item.price)}</div>
      ${
        item.original
          ? `<div class="create-offer-style-preview-item-original">${esc(item.original)}</div>`
          : ""
      }
    </div>`;
  }).join("");

  return `<div class="create-offer-preview-card">
    <div class="create-offer-style-preview-header" style="color:#111111;">Bundle & Save</div>
    <div class="create-offer-style-preview-list create-offer-style-preview-list--vertical">
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

function buildBundleUi() {
  const wrapper = document.createElement("section");
  wrapper.className = "ciwi-bundle-wrapper";
  wrapper.innerHTML = renderBundlePreviewHtml();
  return wrapper;
}

function tryMount() {
  if (document.querySelector(".ciwi-bundle-wrapper")) return "done";

  const src = document.getElementById("ciwi-product-message-root");
  if (!src) return "done";

  const selectors = parseSelectors(src.dataset.ciwiSelectors);
  const section = buildBundleUi();

  if (insertNearAddToCart(section, selectors)) {
    src.remove();
    return "done";
  }
  return "retry";
}

function fallbackMount() {
  if (document.querySelector(".ciwi-bundle-wrapper")) return;
  const src = document.getElementById("ciwi-product-message-root");
  if (!src) return;

  const section = buildBundleUi();
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

    if (tryMount() === "done") return;

    const started = Date.now();
    const obs = new MutationObserver(() => {
      if (tryMount() === "done") {
        obs.disconnect();
        return;
      }
      if (Date.now() - started > RETRY_MS) {
        fallbackMount();
        obs.disconnect();
      }
    });

    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      if (!document.querySelector(".ciwi-bundle-wrapper")) fallbackMount();
    }, RETRY_MS);
  } catch (e) {
    console.error("[ciwi] bundle mock ui error:", e);
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
