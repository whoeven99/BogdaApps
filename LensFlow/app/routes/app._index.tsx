import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getLensDashboardDataWithOptions } from "../lib/lens.server";
import {
  fetchShopifyProducts,
  getProductConfiguration,
  toLensOptions,
  toSubscriptionOffering,
  type ShopifyProductNode,
  type ShopifyProductSummary,
  toProductContext,
  toProductSummary,
} from "../services/shopify-products.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const products = await fetchShopifyProducts(admin);
  const url = new URL(request.url);
  const selectedProductId = url.searchParams.get("productId") ?? products[0]?.id;
  const selectedProduct = products.find(
    (product: ShopifyProductNode) => product.id === selectedProductId,
  );
  const dashboard = selectedProduct
    ? await getLensDashboardDataWithOptions(
        toProductContext(selectedProduct),
        toLensOptions(selectedProduct),
        getProductConfiguration(selectedProduct),
      )
    : undefined;

  return {
    dashboard,
    products: products.map(toProductSummary),
    selectedProductId,
    subscriptionOffering: selectedProduct
      ? toSubscriptionOffering(selectedProduct)
      : undefined,
  };
};

export default function Index() {
  const { dashboard, products, selectedProductId, subscriptionOffering } =
    useLoaderData<typeof loader>();

  if (!dashboard) {
    return (
      <s-page heading="镜片规则仪表盘">
        <s-section heading="未找到商品">
          <s-paragraph>当前店铺还没有可读取的商品，请先在 Shopify 后台创建商品。</s-paragraph>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="镜片规则仪表盘">
      <s-section heading="商品选择">
        <Form method="get">
          <s-stack direction="inline" gap="base" align-items="end">
            <s-select name="productId" label="当前商品" value={selectedProductId ?? ""}>
              {products.map((product: ShopifyProductSummary) => (
                <s-option key={product.id} value={product.id}>
                  {product.title}
                </s-option>
              ))}
            </s-select>
            <s-button type="submit" variant="primary">切换商品</s-button>
          </s-stack>
        </Form>
      </s-section>
      <s-section heading="当前商品">
        <s-paragraph>
          商品 ID：<s-text type="strong">{dashboard.context.productId}</s-text>
        </s-paragraph>
        <s-paragraph>
          商品类型：<s-text>{dashboard.context.productType ?? "未设置"}</s-text>
        </s-paragraph>
        <s-paragraph>
          当前处方类型：
          <s-badge tone="success">{dashboard.context.prescriptionType}</s-badge>
        </s-paragraph>
      </s-section>

      <s-section heading="配置来源">
        <s-stack direction="block" gap="base">
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>处方类型 Metafield</s-heading>
            <s-paragraph>
              配置状态：
              <s-badge
                tone={
                  dashboard.configuration.prescriptionTypeConfigured
                    ? "success"
                    : "warning"
                }
              >
                {dashboard.configuration.prescriptionTypeConfigured
                  ? "已配置"
                  : "缺失，已回退"}
              </s-badge>
            </s-paragraph>
            <s-paragraph>
              原始值：
              <s-text>
                {dashboard.configuration.prescriptionTypeRaw ?? "未配置"}
              </s-text>
            </s-paragraph>
            <s-paragraph>
              当前解析结果：
              <s-text type="strong">{dashboard.context.prescriptionType}</s-text>
            </s-paragraph>
          </s-box>

          <s-box padding="base" border="base" border-radius="base">
            <s-heading>镜片选项 Metafield</s-heading>
            <s-paragraph>
              配置状态：
              <s-badge
                tone={
                  dashboard.configuration.lensOptionsConfigured
                    ? "success"
                    : "warning"
                }
              >
                {dashboard.configuration.lensOptionsConfigured
                  ? "已配置"
                  : "缺失，已回退默认镜片"}
              </s-badge>
            </s-paragraph>
            <s-paragraph>
              原始值：
              <s-text>{dashboard.configuration.lensOptionsRaw ?? "未配置"}</s-text>
            </s-paragraph>
            <s-paragraph>
              解析后镜片数：
              <s-text type="strong">
                {dashboard.lensOptions.availableLensOptions.length +
                  dashboard.lensOptions.disabledLensOptions.length +
                  dashboard.lensOptions.hiddenLensOptions.length}
              </s-text>
            </s-paragraph>
          </s-box>

          <s-box padding="base" border="base" border-radius="base">
            <s-heading>订阅方案 Metafield</s-heading>
            <s-paragraph>
              配置状态：
              <s-badge
                tone={
                  dashboard.configuration.subscriptionPlansConfigured
                    ? "success"
                    : "warning"
                }
              >
                {dashboard.configuration.subscriptionPlansConfigured
                  ? "已配置"
                  : "缺失，前台不会展示周期购买"}
              </s-badge>
            </s-paragraph>
            <s-paragraph>
              原始值：
              <s-text>
                {dashboard.configuration.subscriptionPlansRaw ?? "未配置"}
              </s-text>
            </s-paragraph>
            <s-paragraph>
              解析后方案数：
              <s-text type="strong">
                {subscriptionOffering?.plans.length ?? 0}
              </s-text>
            </s-paragraph>
            <s-paragraph>
              Selling Plan 绑定状态：
              <s-badge
                tone={
                  subscriptionOffering &&
                  !subscriptionOffering.requiresSellingPlanIntegration
                    ? "success"
                    : "warning"
                }
              >
                {subscriptionOffering &&
                !subscriptionOffering.requiresSellingPlanIntegration
                  ? "已绑定"
                  : "部分或全部未绑定"}
              </s-badge>
            </s-paragraph>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="镜片展示结果">
        <s-stack direction="block" gap="base">
          {dashboard.lensOptions.availableLensOptions.map((option) => (
            <s-box key={option.id} padding="base" border="base" border-radius="base">
              <s-heading>{option.name}</s-heading>
              <s-paragraph>状态：可见</s-paragraph>
              <s-paragraph>价格：{option.basePrice}</s-paragraph>
            </s-box>
          ))}
          {dashboard.lensOptions.disabledLensOptions.map((option) => (
            <s-box key={option.id} padding="base" border="base" border-radius="base">
              <s-heading>{option.name}</s-heading>
              <s-paragraph>状态：禁用</s-paragraph>
              <s-paragraph>价格：{option.basePrice}</s-paragraph>
            </s-box>
          ))}
          {dashboard.lensOptions.hiddenLensOptions.map((option) => (
            <s-box key={option.id} padding="base" border="base" border-radius="base">
              <s-heading>{option.name}</s-heading>
              <s-paragraph>状态：隐藏</s-paragraph>
              <s-paragraph>价格：{option.basePrice}</s-paragraph>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      <s-section heading="健康检查">
        <s-paragraph>
          健康状态：<s-badge>{dashboard.health.status}</s-badge>
        </s-paragraph>
        {dashboard.health.issues.length === 0 ? (
          <s-paragraph>当前商品未发现健康问题。</s-paragraph>
        ) : (
          <s-unordered-list>
            {dashboard.health.issues.map((issue) => (
              <s-list-item key={`${issue.code}-${issue.message}`}>
                <s-text type="strong">{issue.code}</s-text>：{issue.message}
              </s-list-item>
            ))}
          </s-unordered-list>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
