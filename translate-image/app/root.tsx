import {
  isRouteErrorResponse,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useFetcher,
  useRouteError,
} from "@remix-run/react";
import { Provider } from "react-redux";
// import store from "./store";
import { useEffect } from "react";
import { createHead } from "remix-island";

import "./styles.css";

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("Root Error:", error);
  let errorCode = "500";
  if (isRouteErrorResponse(error)) {
    errorCode = error.status.toString();
  }

  // 错误信息映射
  const errorMessages: {
    [key: string]: { title: string; message: string; solution: string };
  } = {
    "400": {
      title: "Bad Request",
      message:
        "The request could not be understood by the server due to malformed syntax.",
      solution: `Please click the Ciwi-Translator option in the app navigation bar again`,
    },
    "401": {
      title: "Unauthorized",
      message:
        "Authentication is required and has failed or has not been provided.",
      solution: `Please  click the Ciwi-Translator option in the app navigation bar again`,
    },
    "403": {
      title: "Forbidden",
      message: "You don't have permission to access this resource.",
      solution: `Please click the Ciwi-Translator option in the app navigation bar again`,
    },
    "404": {
      title: "Not Found",
      message: "The requested resource could not be found.",
      solution: `Please click the Ciwi-Translator option in the app navigation bar again`,
    },
    "500": {
      title: "Internal Server Error",
      message:
        "The server encountered an unexpected condition that prevented it from fulfilling the request.",
      solution: "Please refresh the page",
    },
    "502": {
      title: "Bad Gateway",
      message:
        "The server received an invalid response from the upstream server.",
      solution: "Please refresh the page",
    },
    "503": {
      title: "Service Unavailable",
      message: "The server is currently unavailable.",
      solution: "Please refresh the page",
    },
    "504": {
      title: "Gateway Timeout",
      message:
        "The server did not receive a timely response from the upstream server.",
      solution: "Please refresh the page",
    },
  };

  const currentError = errorMessages[errorCode] || errorMessages["500"];

  // 服务器端渲染时直接返回基础结构
  return (
    <html>
      <Head />
      <body>
        <div id="root">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "100vh",
              background: "#f5f5f5",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 500,
                textAlign: "center",
                padding: "24px",
              }}
            >
              <h1 style={{ fontSize: 72, margin: "24px 0" }}>{errorCode}</h1>
              <h2 style={{ margin: "24px 0" }}>{currentError.title}</h2>
              <p
                style={{
                  display: "block",
                  marginBottom: "24px",
                  fontSize: 16,
                }}
              >
                {currentError.message}
              </p>
              <p
                style={{
                  display: "block",
                  marginBottom: "24px",
                  fontSize: 16,
                }}
              >
                Please click the "Ciwi-Translator" option in the app navigation
                bar again
              </p>
            </div>
          </div>
          <ScrollRestoration />
          <Scripts />
          <script
            src="//code.tidio.co/inl4rrmds8vvbldv1k6gyc2nzxongl3p.js"
            async
          ></script>
        </div>
      </body>
    </html>
  );
}

export default function App() {
  return (
    // 使用 Redux Provider 包装整个应用（用于状态管理，必须）,删除后很多功能无法使用
    <>
      {/* <Provider store={store}>
        
      </Provider> */}
      <Head />
      <noscript>
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-NVPT5XDV"
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        ></iframe>
      </noscript>
      <Outlet />
      <ScrollRestoration />
      <Scripts />
      <script
        src="//code.tidio.co/inl4rrmds8vvbldv1k6gyc2nzxongl3p.js"
        async
      ></script>
    </>
  );
}

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <link rel="preconnect" href="https://cdn.shopify.com/" />
    <link
      rel="stylesheet"
      href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
    />
    <Meta />
    <Links />
  </>
));
