import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          仪表盘
        </Link>
        <Link to="/app/rules">规则配置
        </Link>
        <Link to="/app/parameter-templates">参数模板
        </Link>
        <Link to="/app/product-configs">商品参数
        </Link>
        <Link to="/app/orders">下单记录
        </Link>
        <Link to="/app/subscription-contracts">订阅合同
        </Link>
        <Link to="/app/notifications">提醒中心
        </Link>
        <Link to="/app/recommendations">配镜推荐
        </Link>
        <Link to="/app/subscriptions">订阅方案
        </Link>
        <Link to="/app/prototype">交互原型
        </Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
