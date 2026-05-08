(() => {
  "use strict";

  /** @typedef {{ thresholdMinor: number, label: string }} PromotionTier */
  /** @typedef {"hide" | "restart" | "clearCart"} TimerExpireAction */
  /**
   * @typedef {{
   *  version?: number,
   *  enabled?: boolean,
   *  ui?: { accentColor?: string, surfaceColor?: string, borderColor?: string, radiusPx?: number },
   *  modules?: {
   *    topBar?: { enabled?: boolean, order?: number },
   *    timer?: { enabled?: boolean, order?: number, durationSeconds?: number, expireAction?: TimerExpireAction },
   *    promotions?: { enabled?: boolean, order?: number, tiers?: PromotionTier[] },
   *    trustBadges?: { enabled?: boolean, order?: number },
   *    footer?: { enabled?: boolean, order?: number }
   *  },
   *  ajax?: { optimisticUpdate?: boolean, sectionRender?: boolean, debounceMs?: number },
   *  storage?: { timerKey?: string }
   * }} CartSettings
   */

  /** @typedef {{ total_price: number, currency?: string, items_subtotal_price?: number }} ShopifyCart */

  function clampNumber(n, min, max, fallback) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    return Math.max(min, Math.min(max, x));
  }

  function safeJsonParse(text, fallback) {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }

  function debounce(fn, waitMs) {
    let t = 0;
    return (...args) => {
      window.clearTimeout(t);
      t = window.setTimeout(() => fn(...args), waitMs);
    };
  }

  class EventBus {
    constructor() {
      /** @type {Map<string, Set<(payload:any)=>void>>} */
      this.listeners = new Map();
    }
    on(event, handler) {
      const set = this.listeners.get(event) || new Set();
      set.add(handler);
      this.listeners.set(event, set);
      return () => set.delete(handler);
    }
    emit(event, payload) {
      const set = this.listeners.get(event);
      if (!set) return;
      for (const h of set) {
        try {
          h(payload);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("[ciwi-cart] event handler error", { event, e });
        }
      }
    }
  }

  class StorageAdapter {
    constructor(namespaceKey) {
      this.key = String(namespaceKey || "ciwi_cart_timer_v1");
    }
    /** @returns {null | { endAtMs: number, durationSeconds: number }} */
    getTimer() {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      const parsed = safeJsonParse(raw, null);
      if (!parsed || typeof parsed !== "object") return null;
      const endAtMs = Number(parsed.endAtMs);
      const durationSeconds = Number(parsed.durationSeconds);
      if (!Number.isFinite(endAtMs) || !Number.isFinite(durationSeconds)) return null;
      return { endAtMs, durationSeconds };
    }
    setTimer(payload) {
      window.localStorage.setItem(this.key, JSON.stringify(payload));
    }
    clearTimer() {
      window.localStorage.removeItem(this.key);
    }
  }

  class AjaxCartApi {
    async getCart() {
      const res = await fetch("/cart.js", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`GET /cart.js failed: ${res.status}`);
      return /** @type {ShopifyCart} */ (await res.json());
    }
    async add(body) {
      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body || {}),
      });
      return res;
    }
    async change(body) {
      const res = await fetch("/cart/change.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body || {}),
      });
      return res;
    }
    async update(body) {
      const res = await fetch("/cart/update.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body || {}),
      });
      return res;
    }
  }

  class CartStore {
    constructor(api, bus, debounceMs) {
      this.api = api;
      this.bus = bus;
      this.cart = null;
      this.refresh = debounce(() => void this._refreshNow(), debounceMs);
    }
    getSnapshot() {
      return this.cart;
    }
    async init() {
      await this._refreshNow();
    }
    async _refreshNow() {
      try {
        const cart = await this.api.getCart();
        this.cart = cart;
        this.bus.emit("cart:updated", cart);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[ciwi-cart] refresh failed", e);
      }
    }
  }

  class TimerService {
    constructor(storage, bus, durationSeconds, expireAction) {
      this.storage = storage;
      this.bus = bus;
      this.durationSeconds = clampNumber(durationSeconds, 10, 24 * 60 * 60, 600);
      this.expireAction = expireAction || "hide";
      this.intervalId = 0;
      this.endAtMs = 0;
    }
    init() {
      const existing = this.storage.getTimer();
      if (existing && existing.endAtMs > Date.now() - 1000) {
        this.endAtMs = existing.endAtMs;
      } else {
        this.endAtMs = Date.now() + this.durationSeconds * 1000;
        this.storage.setTimer({ endAtMs: this.endAtMs, durationSeconds: this.durationSeconds });
      }

      window.addEventListener("storage", (evt) => {
        if (!evt || evt.key !== this.storage.key) return;
        const next = this.storage.getTimer();
        if (!next) return;
        this.endAtMs = next.endAtMs;
        this.bus.emit("timer:tick", this.getRemainingSeconds());
      });

      this._startLoop();
      this.bus.emit("timer:tick", this.getRemainingSeconds());
    }
    _startLoop() {
      if (this.intervalId) window.clearInterval(this.intervalId);
      this.intervalId = window.setInterval(() => {
        const left = this.getRemainingSeconds();
        if (left <= 0) {
          this.bus.emit("timer:expired", { action: this.expireAction });
          if (this.expireAction === "restart") {
            this.endAtMs = Date.now() + this.durationSeconds * 1000;
            this.storage.setTimer({
              endAtMs: this.endAtMs,
              durationSeconds: this.durationSeconds,
            });
            this.bus.emit("timer:tick", this.getRemainingSeconds());
            return;
          }
          if (this.expireAction === "hide") {
            window.clearInterval(this.intervalId);
            this.intervalId = 0;
            return;
          }
          if (this.expireAction === "clearCart") {
            // 交给外部处理，避免强耦合购物车清空策略
            window.clearInterval(this.intervalId);
            this.intervalId = 0;
            return;
          }
        }
        this.bus.emit("timer:tick", left);
      }, 1000);
    }
    getRemainingSeconds() {
      return Math.max(0, Math.floor((this.endAtMs - Date.now()) / 1000));
    }
  }

  function formatMinorCurrency(minor, currencyCode) {
    const value = Number(minor || 0) / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode || "USD",
      }).format(value);
    } catch {
      return `${value.toFixed(2)}`;
    }
  }

  function findMountPoints() {
    /** @type {HTMLElement[]} */
    const mounts = [];

    // Cart page common anchors
    const cartForm = document.querySelector('form[action="/cart"]');
    if (cartForm && cartForm.parentElement) {
      mounts.push(/** @type {HTMLElement} */ (cartForm.parentElement));
    }

    // Common drawer roots across themes
    const drawerCandidates = [
      document.querySelector("cart-drawer"),
      document.querySelector("#CartDrawer"),
      document.querySelector(".cart-drawer"),
      document.querySelector("[data-cart-drawer]"),
    ].filter(Boolean);
    for (const el of drawerCandidates) {
      mounts.push(/** @type {HTMLElement} */ (el));
    }

    // De-dup
    return Array.from(new Set(mounts)).filter((el) => el && el.isConnected);
  }

  function applyCssVars(root, ui) {
    if (!root || !ui) return;
    const accent = String(ui.accentColor || "#008060").trim();
    const surface = String(ui.surfaceColor || "#ffffff").trim();
    const border = String(ui.borderColor || "#dfe3e8").trim();
    const radius = clampNumber(ui.radiusPx, 0, 24, 10);

    root.style.setProperty("--ciwi-cart-accent", accent);
    root.style.setProperty("--ciwi-cart-surface", surface);
    root.style.setProperty("--ciwi-cart-border", border);
    root.style.setProperty("--ciwi-cart-radius", `${radius}px`);
  }

  function buildEnhancerElement() {
    const mount = document.createElement("div");
    mount.className = "ciwi-cart-enhancer ciwi-cart-enhancer__mount";
    mount.innerHTML = `
      <div class="ciwi-cart-enhancer__card">
        <div class="ciwi-cart-enhancer__row">
          <div>
            <div class="ciwi-cart-enhancer__title">Cart offers</div>
            <div class="ciwi-cart-enhancer__sub" data-ciwi-sub>Listening to cart updates…</div>
          </div>
          <div class="ciwi-cart-enhancer__timer" data-ciwi-timer style="display:none"></div>
        </div>
        <div class="ciwi-cart-enhancer__progress" data-ciwi-progress style="display:none">
          <div class="ciwi-cart-enhancer__sub" data-ciwi-progress-text></div>
          <div class="ciwi-cart-enhancer__bar">
            <div class="ciwi-cart-enhancer__barFill" data-ciwi-progress-fill></div>
          </div>
        </div>
      </div>
    `;
    return mount;
  }

  function wireUi(bus, store, timer, settings, currencyCode) {
    const mounts = findMountPoints();
    if (mounts.length === 0) return;

    const enhancers = mounts.map((host) => {
      const el = buildEnhancerElement();
      applyCssVars(el, settings.ui || {});
      host.prepend(el);
      return el;
    });

    const timerEnabled = settings?.modules?.timer?.enabled !== false;
    const promoEnabled = settings?.modules?.promotions?.enabled !== false;
    const tiers = Array.isArray(settings?.modules?.promotions?.tiers)
      ? settings.modules.promotions.tiers
          .map((t) => ({
            thresholdMinor: clampNumber(t.thresholdMinor, 0, 10_000_000_00, 0),
            label: String(t.label || "").trim(),
          }))
          .filter((t) => t.thresholdMinor > 0 && t.label)
          .sort((a, b) => a.thresholdMinor - b.thresholdMinor)
      : [];

    const updateSub = (text) => {
      for (const el of enhancers) {
        const node = el.querySelector("[data-ciwi-sub]");
        if (node) node.textContent = text;
      }
    };

    if (timerEnabled) {
      bus.on("timer:tick", (secondsLeft) => {
        for (const el of enhancers) {
          const node = el.querySelector("[data-ciwi-timer]");
          if (!node) continue;
          const s = clampNumber(secondsLeft, 0, 24 * 60 * 60, 0);
          const mm = String(Math.floor(s / 60)).padStart(2, "0");
          const ss = String(s % 60).padStart(2, "0");
          node.textContent = `${mm}:${ss}`;
          node.style.display = s > 0 ? "" : "none";
        }
      });
      bus.on("timer:expired", async (payload) => {
        if (!payload || payload.action !== "clearCart") return;
        updateSub("Timer ended. Clearing cart…");
        try {
          const cart = await store.api.getCart();
          const updates = {};
          if (cart && Array.isArray(cart.items)) {
            for (const item of cart.items) {
              if (item && item.variant_id) updates[String(item.variant_id)] = 0;
            }
          }
          await store.api.update({ updates });
          store.refresh();
          updateSub("Cart cleared.");
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("[ciwi-cart] clear cart failed", e);
          updateSub("Failed to clear cart. Please try again.");
        }
      });
    }

    if (promoEnabled && tiers.length > 0) {
      bus.on("cart:updated", (cart) => {
        const total = clampNumber(cart?.total_price, 0, 10_000_000_00, 0);
        const nextTier = tiers.find((t) => total < t.thresholdMinor) || null;
        const maxTier = tiers[tiers.length - 1];
        const target = nextTier ? nextTier.thresholdMinor : maxTier.thresholdMinor;
        const pct = target > 0 ? Math.min(1, total / target) : 0;
        for (const el of enhancers) {
          const box = el.querySelector("[data-ciwi-progress]");
          const text = el.querySelector("[data-ciwi-progress-text]");
          const fill = el.querySelector("[data-ciwi-progress-fill]");
          if (!box || !text || !fill) continue;
          box.style.display = "";
          fill.style.width = `${Math.round(pct * 100)}%`;
          if (!nextTier) {
            text.textContent = `Unlocked: ${maxTier.label}（${formatMinorCurrency(maxTier.thresholdMinor, currencyCode)}）`;
          } else {
            const remaining = Math.max(0, nextTier.thresholdMinor - total);
            text.textContent = `Spend ${formatMinorCurrency(remaining, currencyCode)} more to unlock ${nextTier.label}`;
          }
        }
      });
    }

    bus.on("cart:updated", (cart) => {
      const total = clampNumber(cart?.total_price, 0, 10_000_000_00, 0);
      updateSub(`Cart total: ${formatMinorCurrency(total, currencyCode)}`);
    });
  }

  function patchFetchForCart(store) {
    const originalFetch = window.fetch;
    if (typeof originalFetch !== "function") return;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      try {
        const input = args[0];
        const url = typeof input === "string" ? input : input && typeof input.url === "string" ? input.url : "";
        if (url.includes("/cart/") || url.includes("/cart.js")) {
          store.refresh();
        }
      } catch {
        // ignore
      }
      return res;
    };
  }

  function main() {
    const configEl = document.getElementById("ciwi-cart-enhancer-config");
    if (!configEl) return;
    const raw = configEl.textContent || "";
    const config = safeJsonParse(raw, null);
    if (!config || typeof config !== "object") return;

    /** @type {CartSettings} */
    const settings = config.settings && typeof config.settings === "object" ? config.settings : {};
    const enabled = settings.enabled !== false;
    if (!enabled) return;

    const currencyCode =
      String((config && config.currencyCode) || "") ||
      String((window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || "") ||
      "USD";

    const bus = new EventBus();
    const api = new AjaxCartApi();
    const debounceMs = clampNumber(settings?.ajax?.debounceMs, 0, 2000, 120);
    const store = new CartStore(api, bus, debounceMs);
    patchFetchForCart(store);

    const timerKey = settings?.storage?.timerKey || "ciwi_cart_timer_v1";
    const storage = new StorageAdapter(timerKey);
    const timerEnabled = settings?.modules?.timer?.enabled !== false;
    const timer = timerEnabled
      ? new TimerService(
          storage,
          bus,
          settings?.modules?.timer?.durationSeconds || 600,
          settings?.modules?.timer?.expireAction || "hide",
        )
      : null;

    if (timer) timer.init();
    wireUi(bus, store, timer, settings, currencyCode);

    void store.init();

    // 实时监听购物车变化：MutationObserver + 兜底刷新
    const mo = new MutationObserver(() => store.refresh());
    mo.observe(document.documentElement, { subtree: true, childList: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main, { once: true });
  } else {
    main();
  }
})();

