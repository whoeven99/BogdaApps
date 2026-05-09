(() => {
  "use strict";

  const log = (...args) => {
    // eslint-disable-next-line no-console
    console.log("[ciwi-cart]", ...args);
  };

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

  function parseJsonLoose(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;
    try {
      const first = JSON.parse(raw);
      if (typeof first === "string") {
        try {
          const second = JSON.parse(first);
          log("检测到双层 JSON，已二次解析");
          return second;
        } catch (error) {
          log("配置 JSON 二次解析失败", { error: String(error) });
          return null;
        }
      }
      return first;
    } catch (error) {
      const unescaped = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"');
      try {
        const parsed = JSON.parse(unescaped);
        log("配置 JSON 经过反转义后解析成功");
        return parsed;
      } catch (error2) {
        log("配置 JSON 解析失败", {
          error: String(error),
          retryError: String(error2),
        });
        return null;
      }
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
    constructor() {
      this.root =
        (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || "/";
      if (typeof this.root !== "string" || !this.root.trim()) this.root = "/";
      if (/^https?:\/\//i.test(this.root)) {
        try {
          this.root = new URL(this.root).pathname || "/";
        } catch {
          this.root = "/";
        }
      }
      if (!this.root.startsWith("/")) this.root = `/${this.root}`;
      if (!this.root.endsWith("/")) this.root = `${this.root}/`;
    }
    url(path) {
      const p = String(path || "").replace(/^\/+/, "");
      return `${this.root}${p}`;
    }
    async getCart() {
      const requestUrl = this.url("cart.js");
      log("请求 cart.js", { url: requestUrl });
      const res = await fetch(requestUrl, { credentials: "same-origin" });
      if (!res.ok) {
        log("cart.js 响应异常", { status: res.status, statusText: res.statusText, url: requestUrl });
        throw new Error(`GET /cart.js failed: ${res.status}`);
      }
      const ct = String(res.headers.get("content-type") || "");
      const text = await res.text();
      log("cart.js 响应信息", {
        status: res.status,
        contentType: ct,
        sample: text.slice(0, 400),
        length: text.length,
      });
      if (!ct.includes("application/json") && !ct.includes("text/javascript")) {
        const fallback = await fetch("/cart.js", { credentials: "same-origin" });
        const fallbackCt = String(fallback.headers.get("content-type") || "");
        const fallbackText = await fallback.text();
        log("cart.js 兜底响应", {
          status: fallback.status,
          contentType: fallbackCt,
          sample: fallbackText.slice(0, 400),
          length: fallbackText.length,
        });
        if (
          fallback.ok &&
          (fallbackCt.includes("application/json") || fallbackCt.includes("text/javascript"))
        ) {
          try {
            return /** @type {ShopifyCart} */ (JSON.parse(fallbackText));
          } catch (error) {
            throw new Error(
              `GET /cart.js JSON parse failed: ${String(error)}; body=${fallbackText.slice(0, 80)}`,
            );
          }
        }
        throw new Error(
          `GET cart.js expected JSON but got ${ct || "(no content-type)"}: ${text.slice(0, 80)}`,
        );
      }
      try {
        return /** @type {ShopifyCart} */ (JSON.parse(text));
      } catch (error) {
        throw new Error(`GET cart.js JSON parse failed: ${String(error)}; body=${text.slice(0, 80)}`);
      }
    }
    async add(body) {
      const res = await fetch(this.url("cart/add.js"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body || {}),
      });
      return res;
    }
    async change(body) {
      const res = await fetch(this.url("cart/change.js"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body || {}),
      });
      return res;
    }
    async update(body) {
      const res = await fetch(this.url("cart/update.js"), {
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
      this.isRefreshing = false;
      this.refresh = debounce(() => void this._refreshNow(), debounceMs);
    }
    getSnapshot() {
      return this.cart;
    }
    async init() {
      await this._refreshNow();
    }
    async _refreshNow() {
      if (this.isRefreshing) return;
      this.isRefreshing = true;
      try {
        const cart = await this.api.getCart();
        this.cart = cart;
        this.bus.emit("cart:updated", cart);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[ciwi-cart] refresh failed", e);
      } finally {
        this.isRefreshing = false;
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

  function looksLikeCartContainer(el) {
    if (!el || !el.querySelector) return false;
    if (el.querySelector('form[action*="/cart"]')) return true;
    if (el.querySelector('[name="updates[]"], [name^="updates["]')) return true;
    if (el.querySelector('a[href*="/cart"], button[name="checkout"]')) return true;
    if (el.querySelector("[data-cart-items], .cart__items, .cart-items")) return true;
    return false;
  }

  function isElementVisible(el) {
    if (!el || typeof window.getComputedStyle !== "function") return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findVisibleInRoot(root) {
    if (!root) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let count = 0;
    while (walker.nextNode() && count < 80) {
      const node = /** @type {HTMLElement} */ (walker.currentNode);
      if (isElementVisible(node)) return node;
      count += 1;
    }
    return null;
  }

  function findMountPoints() {
    /** @type {HTMLElement[]} */
    const mounts = [];
    /** @type {string[]} */
    const sources = [];

    // Cart page common anchors（多语言场景 action 可能不是 /cart）
    const cartForm = document.querySelector('form[action*="/cart"]');
    if (cartForm) {
      const host = cartForm.parentElement || cartForm;
      mounts.push(/** @type {HTMLElement} */ (host));
      sources.push("cartFormParent");
    }

    const openDialog = document.querySelector("dialog[open]");
    if (openDialog) {
      const dialogTarget =
        openDialog.querySelector(".cart-drawer__content") ||
        openDialog.querySelector(".cart-items__wrapper") ||
        openDialog.querySelector("cart-items-component") ||
        openDialog.querySelector(".cart-items-component");
      if (dialogTarget) {
        mounts.push(/** @type {HTMLElement} */ (dialogTarget));
        sources.push("dialogOpenInner");
      }
    }

    // Common drawer roots across themes
    const drawerCandidates = [
      { label: "cart-drawer", node: document.querySelector("cart-drawer") },
      { label: "#CartDrawer", node: document.querySelector("#CartDrawer") },
      { label: ".cart-drawer", node: document.querySelector(".cart-drawer") },
      { label: "[data-cart-drawer]", node: document.querySelector("[data-cart-drawer]") },
      { label: 'dialog[open][role="dialog"]', node: document.querySelector('[role="dialog"][open]') },
      { label: "dialog[open]", node: document.querySelector("dialog[open]") },
    ].filter((item) => item.node);
    for (const el of drawerCandidates) {
      const node = /** @type {HTMLElement} */ (el.node);
      const isDrawerRoot =
        node.matches("cart-drawer") ||
        node.matches("#CartDrawer") ||
        node.matches(".cart-drawer") ||
        node.matches("[data-cart-drawer]");
      if (isDrawerRoot || looksLikeCartContainer(node)) {
        mounts.push(node);
        sources.push(el.label);
      }
    }

    const openDialogs = Array.from(
      document.querySelectorAll('dialog[open], [role="dialog"][open]'),
    );
    for (const d of openDialogs) {
      const node = /** @type {HTMLElement} */ (d);
      if (looksLikeCartContainer(node)) {
        mounts.push(node);
        sources.push("dialog[open]");
      }
    }

    // Shadow DOM: cart drawer component
    const shadowHosts = Array.from(document.querySelectorAll("cart-drawer-component, cart-drawer"));
    for (const host of shadowHosts) {
      if (!host || !host.shadowRoot) continue;
      const root = host.shadowRoot;
      const shadowTarget =
        root.querySelector(".cart-items__wrapper") ||
        root.querySelector(".cart-drawer__content") ||
        root.querySelector("cart-items-component") ||
        root.querySelector(".cart-items-component") ||
        root.querySelector("dialog[open]") ||
        root.querySelector("dialog");
      if (shadowTarget) {
        mounts.push(/** @type {HTMLElement} */ (shadowTarget));
        sources.push("shadowRoot");
        log("发现 shadowRoot 挂载点", {
          hostTag: host.tagName,
          hostClass: host.className,
          targetTag: shadowTarget.tagName,
          targetClass: shadowTarget.className,
        });
      }
    }

    // De-dup
    const uniqueMounts = Array.from(new Set(mounts)).filter((el) => el && el.isConnected);
    const visibleMounts = uniqueMounts.filter((el) => isElementVisible(el));
    if (visibleMounts.length > 0) {
      return { mounts: visibleMounts, sources: Array.from(new Set(sources)) };
    }
    return { mounts: uniqueMounts, sources: Array.from(new Set(sources)) };
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
    log("已应用样式变量", { accent, surface, border, radius });
  }

  function buildEnhancerElement() {
    const mount = document.createElement("div");
    mount.className = "ciwi-cart-enhancer ciwi-cart-enhancer__mount";
    mount.setAttribute("data-ciwi-enhancer", "true");
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

  function resolveMountTarget(host) {
    if (!host || !host.querySelector) return host;
    const inner =
      host.querySelector(".cart-drawer__content") ||
      host.querySelector("cart-items-component") ||
      host.querySelector(".cart-items-component") ||
      host.querySelector(".cart-drawer__inner") ||
      host.querySelector(".drawer__inner") ||
      host.querySelector(".cart-drawer__content") ||
      host.querySelector(".cart__contents") ||
      host.querySelector("[data-cart-drawer-inner]") ||
      host.querySelector("[data-cart-drawer-content]");
    const baseTarget = inner || host;
    if (!isElementVisible(baseTarget)) {
      const innerShadow = inner && inner.shadowRoot ? findVisibleInRoot(inner.shadowRoot) : null;
      if (innerShadow) {
        log("使用 inner shadowRoot 容器", {
          hostTag: host.tagName,
          hostClass: host.className,
          targetTag: innerShadow.tagName,
          targetClass: innerShadow.className,
        });
        return innerShadow;
      }
      const hostShadow = host.shadowRoot ? findVisibleInRoot(host.shadowRoot) : null;
      if (hostShadow) {
        log("使用 host shadowRoot 容器", {
          hostTag: host.tagName,
          hostClass: host.className,
          targetTag: hostShadow.tagName,
          targetClass: hostShadow.className,
        });
        return hostShadow;
      }
    }
    log("挂载目标解析", {
      hostTag: host.tagName,
      hostClass: host.className,
      resolvedTag: baseTarget.tagName,
      resolvedClass: baseTarget.className,
    });
    return baseTarget;
  }

  function logElementMetrics(el, label) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    log(label, {
      width: rect.width,
      height: rect.height,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      position: style.position,
      parentTag: el.parentElement ? el.parentElement.tagName : "",
      parentClass: el.parentElement ? el.parentElement.className : "",
    });
  }

  function tryFindVisibleCartContainer() {
    const candidates = [
      ".cart-items__wrapper",
      ".cart-drawer__content",
      ".cart-items-component",
      "cart-items-component",
      ".cart-drawer",
      "cart-drawer-component",
      "cart-drawer",
    ];
    for (const selector of candidates) {
      const node = document.querySelector(selector);
      if (!node) continue;
      if (isElementVisible(node)) return node;
      if (node.shadowRoot) {
        const shadowVisible = findVisibleInRoot(node.shadowRoot);
        if (shadowVisible) return shadowVisible;
      }
    }
    return null;
  }

  function wireUi(bus, store, timer, settings, currencyCode) {
    /** @type {HTMLElement[]} */
    let enhancers = [];

    const mountOnce = () => {
      const { mounts, sources } = findMountPoints();
      log("尝试挂载 Cart Enhancer", { mounts: mounts.length, sources });
      if (mounts.length === 0) {
        log("未找到挂载点", {
          cartForm: !!document.querySelector('form[action*="/cart"]'),
          drawer: !!document.querySelector("cart-drawer"),
          cartDrawer: !!document.querySelector("#CartDrawer"),
          cartDrawerClass: !!document.querySelector(".cart-drawer"),
          dialogOpen: !!document.querySelector("dialog[open]"),
        });
        return false;
      }

      const mounted = [];
      for (const host of mounts) {
        // 避免重复挂载（抽屉反复打开/关闭，DOM 可能重建）
        if (host.querySelector(".ciwi-cart-enhancer__mount")) {
          log("已存在挂载节点，跳过", { hostTag: host.tagName, hostClass: host.className });
          continue;
        }
        const el = buildEnhancerElement();
        applyCssVars(el, settings.ui || {});
        const target = resolveMountTarget(host);
        target.prepend(el);
        log("挂载节点完成", {
          hostTag: host.tagName,
          hostClass: host.className,
          targetTag: target.tagName,
          targetClass: target.className,
        });
        window.requestAnimationFrame(() => {
          logElementMetrics(el, "挂载节点可见性检查");
          if (el.getBoundingClientRect().height === 0) {
            const fallback = tryFindVisibleCartContainer();
            if (fallback && fallback !== target) {
              fallback.prepend(el);
              log("挂载节点移动到备用容器", {
                fallbackTag: fallback.tagName,
                fallbackClass: fallback.className,
              });
              window.requestAnimationFrame(() => logElementMetrics(el, "备用容器可见性检查"));
            } else {
              log("未找到可见容器，保持当前位置");
            }
          }
        });
        mounted.push(el);
      }
      if (mounted.length === 0) {
        log("找到挂载点，但已经挂载过");
        return false;
      }
      enhancers = mounted;
      log("挂载完成", { count: enhancers.length });
      return true;
    };

    // 初次尝试：页面加载时 cart page 可能已存在，drawer 可能还没插入 DOM
    if (!mountOnce()) {
      // drawer 常在点击后才插入；监听 DOM 变化，出现后再挂载
      const observer = new MutationObserver(() => {
        if (mountOnce()) observer.disconnect();
      });
      observer.observe(document.documentElement, { subtree: true, childList: true });

      // 兜底：部分主题打开抽屉不会触发明显 DOM 变化（或先隐藏再显示）
      const retry = () => {
        if (enhancers.length > 0) return;
        if (mountOnce()) {
          observer.disconnect();
          return;
        }
        window.setTimeout(retry, 250);
      };
      window.setTimeout(retry, 250);
    }

    const timerEnabled = settings?.modules?.timer?.enabled !== false;
    const promoEnabled = settings?.modules?.promotions?.enabled !== false;
    log("模块开关状态", {
      timerEnabled,
      promoEnabled,
      promotionsTierCount: Array.isArray(settings?.modules?.promotions?.tiers)
        ? settings.modules.promotions.tiers.length
        : 0,
    });
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
    } else {
      log("Timer 模块已关闭");
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
    } else {
      log("Promotions 模块不可用", { promoEnabled, tiersCount: tiers.length });
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
        if (store.isRefreshing) return res;
        if (url.includes("/cart/") || url.includes("/cart.js")) {
          log("捕获购物车请求，准备刷新", { url });
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
    if (!configEl) {
      log("未找到配置节点，可能未启用 App Embed");
      return;
    }
    const raw = configEl.textContent || "";
    const config = parseJsonLoose(raw);
    if (!config || typeof config !== "object") {
      log("配置 JSON 解析失败", { raw: raw.slice(0, 120) });
      return;
    }

    /** @type {CartSettings} */
    let settings = config.settings && typeof config.settings === "object" ? config.settings : {};
    if (typeof config.settings === "string") {
      const parsed = safeJsonParse(config.settings, null);
      if (parsed && typeof parsed === "object") {
        settings = parsed;
        log("settings 为字符串，已解析成对象");
      } else {
        log("settings 为字符串，但解析失败", { sample: String(config.settings).slice(0, 120) });
      }
    }
    const enabled = settings.enabled !== false;
    log("初始化配置", {
      settingsType: typeof config.settings,
      enabled,
      shopName: config.shopName,
    });
    if (!enabled) {
      log("购物车增强已关闭（settings.enabled=false）");
      return;
    }

    const currencyCode =
      String((config && config.currencyCode) || "") ||
      String((window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || "") ||
      "USD";
    log("货币信息", { currencyCode });

    const bus = new EventBus();
    const api = new AjaxCartApi();
    const debounceMs = clampNumber(settings?.ajax?.debounceMs, 0, 2000, 120);
    const store = new CartStore(api, bus, debounceMs);
    log("初始化 AjaxCartApi", { debounceMs, root: api.root });
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

