import { renderToString } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import {
  type EntryContext,
} from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "./i18n";
import { createInstance } from "i18next";
import Backend from "i18next-fs-backend";
import { resolve } from "node:path";
import { ConfigProvider } from "antd";
import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import { renderHeadToString } from 'remix-island';
import { Head } from './root'
import {
  BOOT_HTML_PROBE,
  bootMark,
  bootRequestShape,
  startBootDocument,
} from "./server/bootTrace.server";
import { normalizeEnvValue } from "./config/runtimeEnv.server";
import { startBillingReconcileLoop } from "./server/billing/reconcileLoop.server";

startBillingReconcileLoop();

const APP_BRIDGE_SRC = "https://cdn.shopify.com/shopifycloud/app-bridge.js";

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Admin 嵌入页必须在首屏 HTML 里带 App Bridge，不能等 /app 鉴权成功后再注入。 */
function appBridgeHeadTags(): string {
  const apiKey = normalizeEnvValue(process.env.SHOPIFY_API_KEY);
  if (!apiKey) {
    bootMark("document warn", "SHOPIFY_API_KEY missing; App Bridge not injected");
    return "";
  }
  return `<meta name="shopify-api-key" content="${escapeHtmlAttr(apiKey)}"/><script src="${APP_BRIDGE_SRC}"></script>`;
}

function ensureFrameAncestors(headers: Headers): void {
  headers.delete("X-Frame-Options");
  const csp = headers.get("Content-Security-Policy") ?? "";
  if (csp.includes("frame-ancestors")) return;
  headers.set(
    "Content-Security-Policy",
    "frame-ancestors https://admin.shopify.com https://*.myshopify.com https://admin.shop.dev https://*.spin.dev;",
  );
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const language =
    request.headers.get("Accept-Language")?.split(",")[0] || "en";
  const languageCode = language.split("-")[0];
  let i18nCode;
  switch (true) {
    case language === "fr" || (languageCode && languageCode === "fr"):
      i18nCode = "fr";
      break;
    case language === "de" || (languageCode && languageCode === "de"):
      i18nCode = "de";
      break;
    case language === "es" || (languageCode && languageCode === "es"):
      i18nCode = "es";
      break;
    case language === "it" || (languageCode && languageCode === "it"):
      i18nCode = "it";
      break;
    case language === "nl" || (languageCode && languageCode === "nl"):
      i18nCode = "nl";
      break;
    case language === "pt" || (languageCode && languageCode === "pt"):
      i18nCode = "pt";
      break;
    case language === "sv" || (languageCode && languageCode === "sv"):
      i18nCode = "sv";
      break;
    case language === "ja" || (languageCode && languageCode === "ja"):
      i18nCode = "ja";
      break;
    case language === "ko" || (languageCode && languageCode === "ko"):
      i18nCode = "ko";
      break;
    case language === "ru" || (languageCode && languageCode === "ru"):
      i18nCode = "ru";
      break;
    case language === "tr" || (languageCode && languageCode === "tr"):
      i18nCode = "tr";
      break;
    case language === "uk" || (languageCode && languageCode === "uk"):
      i18nCode = "uk";
      break;
    case language === "zh-TW" || language === "zh-HK" || language === "zh-MO" || language === "zh-SG":
      i18nCode = "zh-TW";
      break;
    case language === "zh-CN" || language === "zh":
      i18nCode = "zh-CN";
      break;
    default:
      i18nCode = "en";
  }

  addDocumentResponseHeaders(request, responseHeaders);
  ensureFrameAncestors(responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const isBotRequest = isbot(userAgent ?? "");
  const callbackName = isBotRequest ? "onAllReady" : "onShellReady";
  const trace = startBootDocument(request);
  const shape = bootRequestShape(request);

  let instance = createInstance();
  try {
  await instance
    .use(Backend)
    .use(initReactI18next)
    .init({
      ...i18n,
      fallbackLng: i18nCode,
      backend: {
        loadPath: resolve("./public/locales/{{lng}}/{{ns}}.json"),
        requestOptions: {
          cache: 'no-store',
        },
      },
    });
  bootMark("document i18n", `${shape} ${trace.elapsed()}ms lng=${i18nCode}`);

  const cache = createCache();

  function MainApp() {
    return (
      <I18nextProvider i18n={instance}>
        <StyleProvider cache={cache}>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#007F61", // 设置主色
              },
            }}
          >
            <RemixServer
              context={remixContext}
              url={request.url}
            />
          </ConfigProvider>
        </StyleProvider>
      </I18nextProvider>
    );
  }

  let markup = renderToString(<MainApp />);

  let head = renderHeadToString({ request, remixContext, Head })

  const styleText = extractStyle(cache);

  const appBridge = appBridgeHeadTags();
  const html = `<!DOCTYPE html><html lang="${language}"><head>${head}${appBridge}${styleText}</head><body>${BOOT_HTML_PROBE}<div id="root">${markup}</div></body></html>`;

  responseHeaders.set("Content-Type", "text/html");
  bootMark(
    "document html",
    `${shape} ${trace.elapsed()}ms status=${responseStatusCode} bytes=${html.length} shell=${callbackName} appBridge=${appBridge ? "yes" : "no"}`,
  );

  return new Response(html, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    bootMark("document fail", `${shape} ${trace.elapsed()}ms ${message.slice(0, 200)}`);
    throw error;
  } finally {
    trace.stop();
  }
}
