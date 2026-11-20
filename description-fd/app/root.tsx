import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import "./style.css";
import { Provider } from "react-redux";
import store from "./store";
import { createHead } from "remix-island";

export default function App() {
  return (
    <Provider store={store}>
      <Head />
      <Outlet />
      <ScrollRestoration />
      <Scripts />
      <script
        src="//code.tidio.co/inl4rrmds8vvbldv1k6gyc2nzxongl3p.js"
        async
      ></script>
    </Provider>
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
