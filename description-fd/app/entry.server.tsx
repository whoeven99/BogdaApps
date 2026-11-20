import { PassThrough } from "stream";
import { renderToPipeableStream, renderToString } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import {
  createReadableStreamFromReadable,
  type EntryContext,
} from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";
import { renderHeadToString } from "remix-island";
import { Head } from "./root";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { resolve } from "path";
import i18n from "./i18n";
import { createInstance } from "i18next";
import Backend from "i18next-fs-backend";
export const streamTimeout = 5000;

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
    case language === "zh-TW" ||
      language === "zh-HK" ||
      language === "zh-MO" ||
      language === "zh-SG":
      i18nCode = "zh-TW";
      break;
    case language === "zh-CN" || language === "zh":
      i18nCode = "zh-CN";
      break;
    default:
      i18nCode = "en";
  }

  let instance = createInstance();
  await instance
    .use(Backend)
    .use(initReactI18next)
    .init({
      ...i18n,
      fallbackLng: i18nCode,
      backend: {
        loadPath: resolve("./public/locales/{{lng}}/{{ns}}.json"),
        requestOptions: {
          cache: "no-store",
        },
      },
    });

  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  function MainApp() {
    return (
      <I18nextProvider i18n={instance}>
        <RemixServer context={remixContext} url={request.url} />
      </I18nextProvider>
    );
  }

  let markup = renderToString(<MainApp />);

  let head = renderHeadToString({ request, remixContext, Head });

  const html = `<!DOCTYPE html>${head}<body><div id="root">${markup}</div></body></html>`;

  responseHeaders.set("Content-Type", "text/html");

  return new Response(html, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
