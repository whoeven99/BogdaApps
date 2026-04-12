import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from "react-router";
import "antd/dist/reset.css";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("Root boundary error:", error);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
          <h1>App Error</h1>
          <p>Sorry, an unexpected error occurred.</p>
          <pre style={{ backgroundColor: "#f4f4f4", padding: "15px", overflow: "auto" }}>
            {isRouteErrorResponse(error) 
              ? `${error.status} ${error.statusText}`
              : error instanceof Error ? error.message : JSON.stringify(error)}
          </pre>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
