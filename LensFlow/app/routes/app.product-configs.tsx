import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { parseParameterValuesJson } from "../../src/lib/product-parameters.js";
import { authenticate } from "../shopify.server";
import {
  createParameterValueMapping,
  createProductParameterConfig,
  ensureDefaultParameterTemplates,
  listParameterTemplates,
  listProductParameterConfigs,
} from "../models/product-parameters.server";
import {
  fetchShopifyProducts,
  type ShopifyProductNode,
} from "../services/shopify-products.server";

const SAMPLE_VALUES_JSON = JSON.stringify(
  {
    prescription_type: "single_vision",
    left_sph: -1.0,
    right_sph: -1.25,
    pd: 63,
  },
  null,
  2,
);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  await ensureDefaultParameterTemplates();

  const products = await fetchShopifyProducts(admin, 50);
  const templates = await listParameterTemplates();
  const configs = await listProductParameterConfigs();
  const url = new URL(request.url);
  const selectedProductId = url.searchParams.get("productId") ?? products[0]?.id ?? "";
  const selectedConfig =
    configs.find((config) => config.shopifyProductId === selectedProductId) ?? null;

  return {
    products,
    templates,
    configs,
    selectedProductId,
    selectedConfig,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "save_config");

  if (intent === "save_config") {
    const shopifyProductId = String(formData.get("shopifyProductId") ?? "").trim();
    const templateId = String(formData.get("templateId") ?? "").trim();
    const productType = String(formData.get("productType") ?? "").trim();
    const allowOneTimePurchase =
      String(formData.get("allowOneTimePurchase") ?? "true") === "true";
    const allowSubscription =
      String(formData.get("allowSubscription") ?? "false") === "true";
    const parameterOverridesJson = String(
      formData.get("parameterOverridesJson") ?? "",
    ).trim();

    if (!shopifyProductId || !templateId) {
      return { ok: false, error: "请选择商品和参数模板。" };
    }

    let parameterOverrides: Record<string, unknown> | undefined;
    if (parameterOverridesJson) {
      try {
        parameterOverrides = JSON.parse(parameterOverridesJson) as Record<
          string,
          unknown
        >;
      } catch {
        return { ok: false, error: "参数覆盖 JSON 格式不正确。" };
      }
    }

    await createProductParameterConfig({
      shopifyProductId,
      templateId,
      productType: productType || undefined,
      allowOneTimePurchase,
      allowSubscription,
      parameterOverrides,
    });

    return { ok: true, message: "商品参数配置已保存。" };
  }

  if (intent === "add_mapping") {
    const productConfigId = String(formData.get("productConfigId") ?? "").trim();
    const shopifyVariantId = String(formData.get("shopifyVariantId") ?? "").trim();
    const valuesJson = String(formData.get("valuesJson") ?? "").trim();
    const inventoryPolicy = String(formData.get("inventoryPolicy") ?? "").trim();
    const priceAdjustmentValue = String(formData.get("priceAdjustment") ?? "").trim();

    if (!productConfigId || !shopifyVariantId || !valuesJson) {
      return { ok: false, error: "请填写映射配置、目标变体和参数组合 JSON。" };
    }

    try {
      const values = parseParameterValuesJson(valuesJson);
      await createParameterValueMapping({
        productConfigId,
        values,
        shopifyVariantId,
        inventoryPolicy: inventoryPolicy || undefined,
        priceAdjustment:
          priceAdjustmentValue === "" ? undefined : Number(priceAdjustmentValue),
      });

      return { ok: true, message: "参数组合映射已保存。" };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "保存映射失败",
      };
    }
  }

  return { ok: false, error: "不支持的操作。" };
};

export default function ProductConfigsPage() {
  const { products, templates, configs, selectedProductId, selectedConfig } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const selectedProduct =
    products.find((product: ShopifyProductNode) => product.id === selectedProductId) ??
    null;

  if (!selectedProduct) {
    return (
      <s-page heading="商品参数配置">
        <s-section heading="未找到商品">
          <s-paragraph>当前店铺还没有可用商品，请先在 Shopify 后台创建商品。</s-paragraph>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="商品参数配置">
      <s-section heading="切换商品">
        <Form method="get">
          <s-stack direction="inline" gap="base" align-items="end">
            <s-select name="productId" label="当前商品" value={selectedProductId}>
              {products.map((product: ShopifyProductNode) => (
                <s-option key={product.id} value={product.id}>
                  {product.title}
                </s-option>
              ))}
            </s-select>
            <s-button type="submit" variant="primary">
              切换商品
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="商品模板绑定">
        {actionData?.ok && (
          <s-banner tone="success" heading="操作成功">
            {actionData.message}
          </s-banner>
        )}
        {actionData?.ok === false && actionData.error && (
          <s-banner tone="critical" heading="操作失败">
            {actionData.error}
          </s-banner>
        )}
        <Form method="post">
          <s-stack direction="block" gap="base">
            <input type="hidden" name="intent" value="save_config" />
            <input type="hidden" name="shopifyProductId" value={selectedProductId} />
            <s-text-field
              name="productTitlePreview"
              label="商品名称"
              value={selectedProduct.title}
              disabled
            />
            <s-select
              name="templateId"
              label="参数模板"
              value={selectedConfig?.templateId ?? templates[0]?.id ?? ""}
            >
              {templates.map((template) => (
                <s-option key={template.id} value={template.id}>
                  {template.name}
                </s-option>
              ))}
            </s-select>
            <s-text-field
              name="productType"
              label="商品类型覆盖"
              value={selectedConfig?.productType ?? selectedProduct.productType ?? ""}
            />
            <s-select
              name="allowOneTimePurchase"
              label="允许一次性购买"
              value={selectedConfig?.allowOneTimePurchase === false ? "false" : "true"}
            >
              <s-option value="true">true</s-option>
              <s-option value="false">false</s-option>
            </s-select>
            <s-select
              name="allowSubscription"
              label="允许订阅购买"
              value={selectedConfig?.allowSubscription ? "true" : "false"}
            >
              <s-option value="false">false</s-option>
              <s-option value="true">true</s-option>
            </s-select>
            <s-text-area
              name="parameterOverridesJson"
              label="参数覆盖 JSON"
              value={selectedConfig?.parameterOverridesJson ?? "{}"}
            />
            <s-button type="submit" variant="primary">
              保存商品配置
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      {selectedConfig && (
        <s-section heading="参数组合映射">
          <Form method="post">
            <s-stack direction="block" gap="base">
              <input type="hidden" name="intent" value="add_mapping" />
              <input
                type="hidden"
                name="productConfigId"
                value={selectedConfig.id}
              />
              <s-text-field
                name="shopifyVariantId"
                label="目标 Shopify Variant ID"
                value=""
              />
              <s-text-area
                name="valuesJson"
                label="参数组合 JSON"
                value={SAMPLE_VALUES_JSON}
              />
              <s-text-field
                name="inventoryPolicy"
                label="库存策略"
                value=""
              />
              <s-number-field
                name="priceAdjustment"
                label="价格附加"
                value=""
              />
              <s-button type="submit" variant="primary">
                保存参数组合映射
              </s-button>
            </s-stack>
          </Form>

          <s-stack direction="block" gap="base">
            {selectedConfig.valueMappings.length === 0 ? (
              <s-paragraph>当前商品还没有参数组合映射。</s-paragraph>
            ) : (
              selectedConfig.valueMappings.map((mapping) => (
                <s-box
                  key={mapping.id}
                  padding="base"
                  border="base"
                  border-radius="base"
                >
                  <s-heading>{mapping.shopifyVariantId}</s-heading>
                  <s-paragraph>签名：{mapping.signature}</s-paragraph>
                  <s-paragraph>
                    价格附加：{mapping.priceAdjustment ?? "未设置"}
                  </s-paragraph>
                  <s-paragraph>
                    库存策略：{mapping.inventoryPolicy ?? "未设置"}
                  </s-paragraph>
                </s-box>
              ))
            )}
          </s-stack>
        </s-section>
      )}

      <s-section heading="当前配置概览">
        <s-stack direction="block" gap="base">
          {configs.map((config) => (
            <s-box key={config.id} padding="base" border="base" border-radius="base">
              <s-heading>{config.shopifyProductId}</s-heading>
              <s-paragraph>模板：{config.template.name}</s-paragraph>
              <s-paragraph>映射数：{config.valueMappings.length}</s-paragraph>
              <s-paragraph>
                一次性购买：{config.allowOneTimePurchase ? "开启" : "关闭"}
              </s-paragraph>
              <s-paragraph>
                订阅购买：{config.allowSubscription ? "开启" : "关闭"}
              </s-paragraph>
            </s-box>
          ))}
        </s-stack>
      </s-section>
    </s-page>
  );
}
