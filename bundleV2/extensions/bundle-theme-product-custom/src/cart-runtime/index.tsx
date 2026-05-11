import React from "react";
import { createRoot, type Root } from "react-dom/client";
import type { CartSettingsFormValues } from "../../../../app/types/cartSettings";
import { buildFallbackMarket } from "../../../../cart-runtime/money";
import { CartRenderer } from "../../../../cart-runtime/renderer/CartRenderer";
import { CartStoreProvider } from "../../../../cart-runtime/react";
import { createCartStore } from "../../../../cart-runtime/store";
import type {
  CartItem,
  CartMarketContext,
  CartMoneyFormat,
  CartPromotionsOverrides,
  CartState,
  CartTimerOverrides,
  CartUpsellOverrides,
  CartUpsellItem,
} from "../../../../cart-runtime/types";

type CartRuntimeConfig = {
  shopName: string;
  shopDisplayName: string;
  moneyFormat: string;
  marketId: string;
  countryIsoCode: string;
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  settings: CartSettingsFormValues & { upsellOverrides?: CartUpsellOverrides };
};

type ShopifyCartItem = {
  key: string;
  id?: number;
  product_id?: number;
  variant_id?: number;
  product_title?: string;
  variant_title?: string;
  options_with_values?: { name: string; value: string }[];
  quantity: number;
  price: number;
  final_price?: number;
  original_price?: number;
  image?: string;
  featured_image?: { url: string };
  vendor?: string;
  properties?: Record<string, string>;
  selling_plan_allocation?: {
    selling_plan?: { name?: string; options?: { name: string; value: string }[] };
  };
};

type ShopifyCart = {
  items: ShopifyCartItem[];
  items_subtotal_price?: number;
  total_price?: number;
  currency?: string;
};

function safeJsonParse(text: string, fallback: unknown) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function parseJsonLoose(text: string) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    const first = JSON.parse(raw);
    if (typeof first === "string") {
      return safeJsonParse(first, null);
    }
    return first;
  } catch {
    const unescaped = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"');
    return safeJsonParse(unescaped, null);
  }
}

const MONEY_FORMAT_MAP: Record<string, CartMoneyFormat> = {
  amount: "amount",
  amount_no_decimals: "amount_no_decimals",
  amount_with_comma_separator: "amount_with_comma_separator",
  amount_no_decimals_with_comma_separator: "amount_no_decimals_with_comma_separator",
  amount_with_apostrophe_separator: "amount_with_apostrophe_separator",
  amount_no_decimals_with_space_separator: "amount_no_decimals_with_space_separator",
  amount_with_space_separator: "amount_with_space_separator",
  amount_with_period_and_space_separator: "amount_with_period_and_space_separator",
};

function inferMoneyFormat(template: string): CartMoneyFormat {
  const tokenMatch = template.match(/\{\{\s*([a-z_]+)\s*\}\}/i);
  const token = tokenMatch ? tokenMatch[1] : "amount";
  return MONEY_FORMAT_MAP[token] ?? "amount";
}

function normalizeCartMarket(config: CartRuntimeConfig): CartMarketContext {
  const fallback = buildFallbackMarket();
  return {
    marketId: config.marketId || fallback.marketId,
    marketName: config.shopDisplayName || fallback.marketName,
    currencyCode: config.currencyCode || fallback.currencyCode,
    currencySymbol: config.currencySymbol || fallback.currencySymbol,
    moneyFormat: inferMoneyFormat(config.moneyFormat || "amount"),
    locale: config.locale || fallback.locale,
    taxDisplay: fallback.taxDisplay,
  };
}

function normalizeProperties(properties?: Record<string, string>) {
  if (!properties) return [];
  return Object.entries(properties)
    .filter(([_, value]) => value != null && value !== "")
    .map(([name, value]) => ({ name, value: String(value) }));
}

function normalizeSubscription(item: ShopifyCartItem) {
  const plan = item.selling_plan_allocation?.selling_plan;
  if (!plan?.name) return undefined;
  const options = plan.options ?? [];
  const interval = options.map((opt) => opt.value).join(" / ") || "Subscription";
  return { planName: plan.name, interval };
}

function mapShopifyItems(items: ShopifyCartItem[]): CartItem[] {
  return items.map((item, index) => {
    const finalPrice = item.final_price ?? item.price ?? 0;
    const originalPrice = item.original_price ?? item.price ?? 0;
    return {
      id: item.key,
      line: index + 1,
      productId: item.product_id ? String(item.product_id) : undefined,
      variantId: item.variant_id ? String(item.variant_id) : undefined,
      productTitle: item.product_title || "Untitled",
      variantTitle: item.variant_title || "",
      optionsWithValues: item.options_with_values || [],
      quantity: item.quantity,
      priceMinor: finalPrice,
      compareAtMinor: originalPrice > finalPrice ? originalPrice : null,
      image: item.featured_image?.url || item.image || "",
      vendor: item.vendor,
      properties: normalizeProperties(item.properties),
      subscription: normalizeSubscription(item),
    };
  });
}

class AjaxCartApi {
  root: string;
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
  url(path: string) {
    const p = String(path || "").replace(/^\/+/, "");
    return `${this.root}${p}`;
  }
  async getCart(): Promise<ShopifyCart> {
    const res = await fetch(this.url("cart.js"), { credentials: "same-origin" });
    if (!res.ok) throw new Error(`GET /cart.js failed: ${res.status}`);
    return res.json();
  }
  async add(body: Record<string, unknown>) {
    return fetch(this.url("cart/add.js"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {}),
    });
  }
  async change(body: Record<string, unknown>) {
    return fetch(this.url("cart/change.js"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {}),
    });
  }
  async update(body: Record<string, unknown>) {
    return fetch(this.url("cart/update.js"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {}),
    });
  }
}

function looksLikeCartContainer(el: HTMLElement | null) {
  if (!el || !el.querySelector) return false;
  if (el.querySelector('form[action*="/cart"]')) return true;
  if (el.querySelector('[name="updates[]"], [name^="updates["]')) return true;
  if (el.querySelector('a[href*="/cart"], button[name="checkout"]')) return true;
  if (el.querySelector("[data-cart-items], .cart__items, .cart-items")) return true;
  return false;
}

function isElementVisible(el: HTMLElement | null) {
  if (!el || typeof window.getComputedStyle !== "function") return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function dedupeMounts(mounts: HTMLElement[]) {
  const unique = Array.from(new Set(mounts)).filter((el) => el && el.isConnected);
  return unique.filter(
    (el) => !unique.some((other) => other !== el && other.contains(el)),
  );
}

function resolveShadowTarget(host: HTMLElement) {
  if (!host.shadowRoot) return null;
  const root = host.shadowRoot;
  const shadowTarget =
    root.querySelector(".cart-items__wrapper") ||
    root.querySelector(".cart-drawer__content") ||
    root.querySelector("cart-items-component") ||
    root.querySelector(".cart-items-component") ||
    root.querySelector("dialog[open]") ||
    root.querySelector("dialog");
  return shadowTarget as HTMLElement | null;
}

function findMountPoints() {
  const mounts: HTMLElement[] = [];
  const openDialog = document.querySelector("dialog[open]");
  if (openDialog) {
    const dialogTarget =
      openDialog.querySelector("scroll-hint.cart-drawer__content") ||
      openDialog.querySelector("scroll-hint[aria-label]") ||
      openDialog.querySelector(".cart-drawer__content") ||
      openDialog.querySelector(".cart-items__wrapper") ||
      openDialog.querySelector("cart-items-component") ||
      openDialog.querySelector(".cart-items-component");
    if (dialogTarget) {
      mounts.push(dialogTarget as HTMLElement);
    } else {
      mounts.push(openDialog as HTMLElement);
    }
    return dedupeMounts(mounts);
  }

  const isCartPage =
    String(window.location.pathname || "").includes("/cart") ||
    String(document.body && (document.body as HTMLElement).dataset?.template) === "cart";
  if (isCartPage) {
    const cartForm = document.querySelector('form[action*="/cart"]');
    if (cartForm) {
      const host = cartForm.parentElement || cartForm;
      mounts.push(host as HTMLElement);
    }
  }

  const drawerCandidates = [
    document.querySelector("cart-drawer"),
    document.querySelector("#CartDrawer"),
    document.querySelector(".cart-drawer"),
    document.querySelector("[data-cart-drawer]"),
    document.querySelector('[role="dialog"][open]'),
    document.querySelector("dialog[open]"),
  ].filter(Boolean) as HTMLElement[];

  for (const node of drawerCandidates) {
    if (
      node.matches("cart-drawer") ||
      node.matches("#CartDrawer") ||
      node.matches(".cart-drawer") ||
      node.matches("[data-cart-drawer]") ||
      looksLikeCartContainer(node)
    ) {
      const shadowTarget = resolveShadowTarget(node);
      mounts.push(shadowTarget ?? resolveMountTarget(node));
    }
  }

  return dedupeMounts(mounts);
}

function resolveMountTarget(host: HTMLElement) {
  const inner =
    host.querySelector("scroll-hint.cart-drawer__content") ||
    host.querySelector("scroll-hint[aria-label]") ||
    host.querySelector(".cart-drawer__content") ||
    host.querySelector("cart-items-component") ||
    host.querySelector(".cart-items-component") ||
    host.querySelector(".cart-drawer__inner") ||
    host.querySelector(".drawer__inner") ||
    host.querySelector(".cart__contents") ||
    host.querySelector("[data-cart-drawer-inner]") ||
    host.querySelector("[data-cart-drawer-content]");
  const baseTarget = (inner || host) as HTMLElement;
  if (!isElementVisible(baseTarget) && (baseTarget as HTMLElement).shadowRoot) {
    const shadowRoot = (baseTarget as HTMLElement).shadowRoot as ShadowRoot;
    const visible = shadowRoot.querySelector(".cart-drawer__content, .cart-items__wrapper");
    if (visible) return visible as HTMLElement;
  }
  return baseTarget;
}

function patchFetchForCart(refresh: () => void) {
  const originalFetch = window.fetch;
  if ((originalFetch as any).__ciwiPatched) return;
  const patched = async (...args: Parameters<typeof fetch>) => {
    const res = await originalFetch(...args);
    try {
      const input = args[0] as RequestInfo;
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : "";
      if (url.includes("/cart/") || url.includes("/cart.js")) {
        window.setTimeout(() => refresh(), 60);
      }
    } catch {
      // ignore
    }
    return res;
  };
  (patched as any).__ciwiPatched = true;
  window.fetch = patched;
}

function buildOverrides(settings: CartSettingsFormValues & { upsellOverrides?: CartUpsellOverrides }): {
  timerOverrides: CartTimerOverrides;
  promotionsOverrides: CartPromotionsOverrides;
  upsellOverrides: CartUpsellOverrides;
} {
  return {
    timerOverrides: {
      enabled: settings.modules.timer.enabled,
      durationSeconds: settings.modules.timer.durationSeconds,
      textTemplate: settings.modules.timer.textTemplate,
    },
    promotionsOverrides: {
      enabled: settings.modules.promotions.enabled,
      freeShippingThresholdMinor: settings.modules.promotions.freeShippingThresholdMinor,
      successMessage: settings.modules.promotions.successMessage,
      progressMessage: settings.modules.promotions.progressMessage,
    },
    upsellOverrides: settings.upsellOverrides ?? {},
  };
}

function createInitialState(config: CartRuntimeConfig): CartState {
  return {
    market: normalizeCartMarket(config),
    items: [],
    overrides: buildOverrides(config.settings),
  };
}

function mountCartRuntime(config: CartRuntimeConfig) {
  const api = new AjaxCartApi();
  const store = createCartStore(createInitialState(config));
  const roots = new Map<HTMLElement, Root>();

  const refreshCart = async () => {
    try {
      const cart = await api.getCart();
      store.dispatch({ type: "items/set", payload: mapShopifyItems(cart.items || []) });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[ciwi-cart] cart refresh failed", error);
    }
  };

  const handleQuantityChange = async (id: string, nextQty: number) => {
    const { items } = store.getState();
    const target = items.find((item) => item.id === id);
    if (!target) return;
    if (config.settings.ajax.optimisticUpdate) {
      store.dispatch({
        type: "items/update",
        payload: { id, item: { ...target, quantity: nextQty } },
      });
    }
    try {
      await api.change({ id, quantity: nextQty });
      await refreshCart();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[ciwi-cart] quantity change failed", error);
      await refreshCart();
    }
  };

  const handleRemove = async (id: string) => {
    await handleQuantityChange(id, 0);
  };

  const handleUpsellAdd = async (item: CartUpsellItem) => {
    const variantId = item.variantId || item.id;
    if (!variantId) return;
    try {
      await api.add({ items: [{ id: Number(variantId), quantity: 1 }] });
      await refreshCart();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[ciwi-cart] upsell add failed", error);
    }
  };

  const handleClose = () => {
    const dialog = document.querySelector("dialog[open]") as HTMLDialogElement | null;
    if (dialog && typeof dialog.close === "function") {
      dialog.close();
    }
    const drawer = document.querySelector("cart-drawer") as HTMLElement | null;
    if (drawer && typeof (drawer as any).close === "function") {
      (drawer as any).close();
    }
    document.dispatchEvent(new CustomEvent("ciwi:cart-close"));
  };

  const renderInto = (host: HTMLElement) => {
    const target = resolveMountTarget(host);
    target.setAttribute("data-ciwi-cart-host", "true");
    const existingRoot = target.querySelector<HTMLElement>("[data-ciwi-cart-root]");
    const rootEl = existingRoot || document.createElement("div");
    rootEl.setAttribute("data-ciwi-cart-root", "true");
    if (
      !existingRoot ||
      rootEl.parentElement !== target ||
      target.childNodes.length !== 1 ||
      target.firstChild !== rootEl
    ) {
      target.replaceChildren(rootEl);
    }

    const reactRoot = roots.get(rootEl) ?? createRoot(rootEl);
    roots.set(rootEl, reactRoot);
    reactRoot.render(
      <CartStoreProvider store={store}>
        <CartRenderer
          rules={config.settings}
          styles={config.settings}
          onQuantityChange={handleQuantityChange}
          onRemove={handleRemove}
          onUpsellAdd={(upsell) => handleUpsellAdd(upsell)}
          onClose={handleClose}
          onCheckout={() => {
            window.location.href = "/checkout";
          }}
          onContinueShopping={() => {
            window.location.href = "/collections/all";
          }}
        />
      </CartStoreProvider>,
    );
  };

  const mountOnce = () => {
    for (const [rootEl] of roots) {
      if (!rootEl.isConnected) roots.delete(rootEl);
    }
    const mounts = findMountPoints();
    if (!mounts.length) return false;
    mounts.forEach((host) => renderInto(host));
    return true;
  };

  const observer = new MutationObserver(() => {
    if (mountOnce()) return;
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });

  document.addEventListener("shopify:section:load", () => mountOnce());
  window.addEventListener("pageshow", () => mountOnce());
  patchFetchForCart(refreshCart);

  void refreshCart();
  if (!mountOnce()) {
    const retry = () => {
      if (mountOnce()) return;
      window.setTimeout(retry, 250);
    };
    window.setTimeout(retry, 250);
  }
}

function main() {
  const configEl = document.getElementById("ciwi-cart-enhancer-config");
  if (!configEl) return;
  const raw = configEl.textContent || "";
  const config = parseJsonLoose(raw) as CartRuntimeConfig | null;
  if (!config) return;
  if (!config.settings) return;
  (window as any).__CIWI_CART_RUNTIME_ACTIVE__ = true;
  mountCartRuntime(config);
}

main();
