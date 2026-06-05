import React, { createContext, useContext, useCallback, useEffect, useState } from "react";

const ShopifyContext = createContext(null);

export function useShopify() {
  return useContext(ShopifyContext) || {
    isEmbedded: false,
    authenticatedFetch: window.fetch.bind(window),
    app: null,
    loading: false,
    host: null,
    shop: null,
  };
}

function getQueryParam(name) {
  try {
    return new URL(window.location.href).searchParams.get(name);
  } catch {
    return null;
  }
}

export function ShopifyProvider({ children }) {
  const [bridgeReady, setBridgeReady] = useState(false);
  const [shop, setShop] = useState(null);

  const host = getQueryParam("host");
  const isEmbedded = typeof window !== "undefined" && window.top !== window.self;

  // 等待 App Bridge 全局 shopify 对象就绪
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (window.shopify && typeof window.shopify.idToken === "function") {
        // 提取 shop 域名
        try {
          const cfg = window.shopify.config;
          if (cfg && cfg.shop) setShop(cfg.shop);
        } catch {}
        setBridgeReady(true);
      } else {
        setTimeout(tick, 50);
      }
    };
    tick();
    return () => { cancelled = true; };
  }, []);

  const authenticatedFetch = useCallback(
    async (url, options = {}) => {
      const headers = { ...(options.headers || {}) };

      // 如果 App Bridge 可用,获取 session token 并加到 Authorization
      if (typeof window !== "undefined" && window.shopify && typeof window.shopify.idToken === "function") {
        try {
          const token = await window.shopify.idToken();
          if (token) headers["Authorization"] = "Bearer " + token;
        } catch (e) {
          // 拿不到 token 就走普通请求
        }
      }

      // 把 shop / host 透传到后端,用作 fallback
      let finalUrl = url;
      try {
        const u = new URL(url, window.location.origin);
        if (shop && !u.searchParams.get("shop")) u.searchParams.set("shop", shop);
        if (host && !u.searchParams.get("host")) u.searchParams.set("host", host);
        finalUrl = u.pathname + u.search;
      } catch {}

      const response = await window.fetch(finalUrl, {
        ...options,
        headers,
        credentials: "include",
      });

      // 嵌入式情况下后端返回 401 表示需要重新认证
      if (response.status === 401) {
        const reauthHeader = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
        if (reauthHeader && window.shopify && typeof window.shopify.toast?.show === "function") {
          window.shopify.toast.show("会话已过期,请刷新应用", { isError: true });
        }
        // 把 response 交回给 caller,让其读 JSON 错误消息(而不是抛"网络失败"这种误导)
        return response;
      }
      if (response.status === 302) {
        const loc = response.headers.get("location");
        if (loc && window.top && window.top !== window) {
          window.top.location.href = loc;
        }
        // 同上,把 response 还给 caller 自行解析
        return response;
      }
      // 其他非 2xx 也直接返回 response,由调用方根据 json.status 判断
      return response;
    },
    [shop, host]
  );

  return React.createElement(
    ShopifyContext.Provider,
    {
      value: {
        isEmbedded,
        app: typeof window !== "undefined" ? window.shopify || null : null,
        authenticatedFetch,
        loading: isEmbedded && !bridgeReady,
        host,
        shop,
      },
    },
    children
  );
}
