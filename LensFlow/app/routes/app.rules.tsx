import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { getLensDashboardDataWithOptions } from "../lib/lens.server";
import {
  buildPreviewContext,
  parsePreviewPrescriptionType,
} from "../lib/rules-preview.server";
import { authenticate } from "../shopify.server";
import {
  createLensRule,
  deleteLensRule,
  setLensRuleEnabled,
  updateLensRule,
} from "../models/lens-rules.server";
import {
  fetchShopifyProducts,
  getProductConfiguration,
  toLensOptions,
  type ShopifyProductNode,
  type ShopifyProductSummary,
  toProductContext,
  toProductSummary,
} from "../services/shopify-products.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const products = await fetchShopifyProducts(admin);
  const url = new URL(request.url);
  const selectedProductId = url.searchParams.get("productId") ?? products[0]?.id ?? "";
  const editRuleId = url.searchParams.get("editRuleId") ?? "";
  const previewVariantId = url.searchParams.get("previewVariantId") ?? "";
  const previewPrescriptionType = parsePreviewPrescriptionType(
    url.searchParams.get("previewPrescriptionType"),
  );
  const selectedProduct = products.find(
    (product: ShopifyProductNode) => product.id === selectedProductId,
  );
  const rawLensOptions = selectedProduct ? toLensOptions(selectedProduct) : [];
  const productContext = selectedProduct
    ? {
        ...buildPreviewContext(
          toProductContext(selectedProduct),
          previewPrescriptionType,
        ),
        selectedVariantId: previewVariantId || undefined,
      }
    : undefined;
  const dashboard = selectedProduct
    ? await getLensDashboardDataWithOptions(
        productContext!,
        rawLensOptions,
        getProductConfiguration(selectedProduct),
      )
    : undefined;
  const rules = dashboard?.rules ?? [];
  const selectedRule = rules.find((rule) => rule.id === editRuleId);

  return {
    dashboard,
    rules,
    products: products.map(toProductSummary),
    lensOptions: rawLensOptions,
    selectedProductId,
    selectedRule,
    previewVariantId,
    previewPrescriptionType,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "create");
  const productId = String(formData.get("productId") ?? "").trim();
  const ruleId = String(formData.get("ruleId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const priority = Number(formData.get("priority") ?? "0");
  const prescriptionType = String(
    formData.get("prescriptionType") ?? "non_prescription",
  );
  const actionType = String(formData.get("actionType") ?? "show");
  const lensOptionId = String(formData.get("lensOptionId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const variantId = String(formData.get("variantId") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "true") === "true";

  if (intent === "delete" && ruleId) {
    await deleteLensRule(ruleId);
    return { ok: true };
  }

  if (intent === "toggle" && ruleId) {
    const enabled = String(formData.get("enabled") ?? "false") === "true";
    await setLensRuleEnabled(ruleId, enabled);
    return { ok: true };
  }

  if (!productId || !name || !lensOptionId || Number.isNaN(priority)) {
    return {
      ok: false,
      error: "请填写完整的商品、规则名称、优先级和目标镜片。",
    };
  }

  if (intent === "update" && ruleId) {
    await updateLensRule({
      id: ruleId,
      name,
      priority,
      enabled,
      prescriptionType,
      actionType: actionType as "show" | "hide" | "disable",
      lensOptionId,
      message: message || undefined,
      variantId: variantId || undefined,
    });
  } else {
    await createLensRule({
      productId,
      name,
      priority,
      enabled,
      prescriptionType,
      actionType: actionType as "show" | "hide" | "disable",
      lensOptionId,
      message: message || undefined,
      variantId: variantId || undefined,
    });
  }

  return {
    ok: true,
  };
};

export default function RulesPage() {
  const {
    dashboard,
    rules,
    products,
    lensOptions,
    selectedProductId,
    selectedRule,
    previewVariantId,
    previewPrescriptionType,
  } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const selectedCondition = selectedRule?.conditions[0];
  const selectedAction = selectedRule?.actions[0];
  const traceMap = new Map(
    dashboard?.diagnostic.traces.map((trace) => [trace.ruleId, trace]) ?? [],
  );
  const formIntent = selectedRule ? "update" : "create";
  const submitLabel = selectedRule ? "更新规则" : "保存规则";
  const sectionHeading = selectedRule ? "编辑规则" : "新增规则";
  const initialLensOptionId = selectedAction?.lensOptionId ?? lensOptions[0]?.id ?? "";
  const initialVariantId = selectedAction?.variantId ?? "";
  const initialMessage = selectedAction?.message ?? "";
  const initialPrescriptionType =
    selectedCondition?.field === "prescriptionType"
      ? selectedCondition.value
      : "non_prescription";

  return (
    <s-page heading="规则配置">
      <s-section heading={sectionHeading}>
        {actionData?.ok && (
          <s-banner tone="success" heading="保存成功">
            {selectedRule ? "规则已更新到 Prisma 数据库。" : "规则已写入 Prisma 数据库。"}
          </s-banner>
        )}
        {actionData?.ok === false && actionData.error && (
          <s-banner tone="critical" heading="保存失败">
            {actionData.error}
          </s-banner>
        )}
        <Form
          key={selectedRule?.id ?? `create-${selectedProductId}`}
          method="post"
        >
          <s-stack direction="block" gap="base">
            <input type="hidden" name="intent" value={formIntent} />
            <input type="hidden" name="productId" value={selectedProductId} />
            <input type="hidden" name="ruleId" value={selectedRule?.id ?? ""} />
            <input
              type="hidden"
              name="enabled"
              value={selectedRule?.enabled === false ? "false" : "true"}
            />
            <s-select name="selectedProductPreview" label="当前商品" value={selectedProductId} disabled>
              {products.map((product: ShopifyProductSummary) => (
                <s-option key={product.id} value={product.id}>
                  {product.title}
                </s-option>
              ))}
            </s-select>
            <s-text-field
              name="name"
              label="规则名称"
              value={selectedRule?.name ?? ""}
            ></s-text-field>
            <s-number-field
              name="priority"
              label="优先级"
              value={String(selectedRule?.priority ?? 100)}
            ></s-number-field>
            <s-select
              name="prescriptionType"
              label="处方类型"
              value={initialPrescriptionType}
            >
              <s-option value="non_prescription">non_prescription</s-option>
              <s-option value="single_vision">single_vision</s-option>
              <s-option value="progressive">progressive</s-option>
              <s-option value="reading">reading</s-option>
            </s-select>
            <s-select
              name="actionType"
              label="动作类型"
              value={selectedAction?.type ?? "show"}
            >
              <s-option value="show">show</s-option>
              <s-option value="hide">hide</s-option>
              <s-option value="disable">disable</s-option>
            </s-select>
            <s-select
              name="lensOptionId"
              label="目标镜片"
              value={initialLensOptionId}
            >
              {lensOptions.map((option) => (
                <s-option key={option.id} value={option.id}>
                  {option.name}
                </s-option>
              ))}
            </s-select>
            <s-text-field
              name="variantId"
              label="绑定变体 ID"
              value={initialVariantId}
            ></s-text-field>
            <s-text-area
              name="message"
              label="提示文案"
              value={initialMessage}
            ></s-text-area>
            <s-stack direction="inline" gap="base">
              <s-button type="submit" variant="primary">
                {submitLabel}
              </s-button>
            </s-stack>
          </s-stack>
        </Form>
        {selectedRule && (
          <Form method="get">
            <input type="hidden" name="productId" value={selectedProductId} />
            <input
              type="hidden"
              name="previewPrescriptionType"
              value={previewPrescriptionType}
            />
            <input
              type="hidden"
              name="previewVariantId"
              value={previewVariantId}
            />
            <s-button type="submit" variant="secondary">
              取消编辑
            </s-button>
          </Form>
        )}
      </s-section>
      <s-section heading="切换商品">
        <Form method="get">
          <s-stack direction="inline" gap="base" align-items="end">
            <s-select name="productId" label="商品" value={selectedProductId}>
              {products.map((product: ShopifyProductSummary) => (
                <s-option key={product.id} value={product.id}>
                  {product.title}
                </s-option>
              ))}
            </s-select>
            <input
              type="hidden"
              name="previewPrescriptionType"
              value={previewPrescriptionType}
            />
            <input
              type="hidden"
              name="previewVariantId"
              value={previewVariantId}
            />
            <s-button type="submit" variant="secondary">
              切换
            </s-button>
          </s-stack>
        </Form>
      </s-section>
      <s-section heading="模拟预览">
        <Form method="get">
          <s-stack direction="inline" gap="base" align-items="end">
            <input type="hidden" name="productId" value={selectedProductId} />
            {selectedRule && (
              <input type="hidden" name="editRuleId" value={selectedRule.id} />
            )}
            <s-select
              name="previewVariantId"
              label="模拟变体"
              value={previewVariantId}
            >
              <s-option value="">不指定变体</s-option>
              {dashboard?.context.variants.map((variant) => (
                <s-option key={variant.id} value={variant.id}>
                  {variant.sku}
                </s-option>
              ))}
            </s-select>
            <s-select
              name="previewPrescriptionType"
              label="模拟处方类型"
              value={previewPrescriptionType}
            >
              <s-option value="original">使用商品当前解析值</s-option>
              <s-option value="non_prescription">non_prescription</s-option>
              <s-option value="single_vision">single_vision</s-option>
              <s-option value="progressive">progressive</s-option>
              <s-option value="reading">reading</s-option>
            </s-select>
            <s-button type="submit" variant="secondary">
              应用预览
            </s-button>
          </s-stack>
        </Form>
        <s-paragraph>
          当前预览处方类型：
          <s-badge tone={previewPrescriptionType === "original" ? "info" : "success"}>
            {previewPrescriptionType === "original"
              ? "商品原始解析值"
              : previewPrescriptionType}
          </s-badge>
        </s-paragraph>
        <s-paragraph>
          当前预览变体：
          <s-badge tone={previewVariantId ? "success" : "info"}>
            {previewVariantId || "未指定"}
          </s-badge>
        </s-paragraph>
      </s-section>
      <s-section heading="当前商品规则">
        <s-stack direction="block" gap="base">
          {rules.map((rule) => (
            <s-box key={rule.id} padding="base" border="base" border-radius="base">
              {traceMap.get(rule.id) && (
                <s-paragraph>
                  命中状态：
                  <s-badge
                    tone={traceMap.get(rule.id)?.matched ? "success" : "warning"}
                  >
                    {traceMap.get(rule.id)?.matched ? "matched" : "not_matched"}
                  </s-badge>
                </s-paragraph>
              )}
              <s-heading>{rule.name}</s-heading>
              <s-paragraph>优先级：{rule.priority}</s-paragraph>
              <s-paragraph>状态：{rule.enabled ? "启用" : "停用"}</s-paragraph>
              <s-paragraph>条件数：{rule.conditions.length}</s-paragraph>
              <s-paragraph>动作数：{rule.actions.length}</s-paragraph>
              <s-paragraph>
                目标镜片：{rule.actions[0]?.lensOptionId ?? "未设置"}
              </s-paragraph>
              <s-paragraph>
                Trace 原因：{traceMap.get(rule.id)?.reason ?? "未参与计算"}
              </s-paragraph>
              <s-paragraph>
                条件：
                {rule.conditions
                  .map(
                    (condition) =>
                      `${condition.field} ${condition.operator} ${condition.value}`,
                  )
                  .join(" / ")}
              </s-paragraph>
              <s-paragraph>
                动作：
                {rule.actions
                  .map(
                    (action) =>
                      `${action.type} ${action.lensOptionId}${
                        action.variantId ? ` @ ${action.variantId}` : ""
                      }`,
                  )
                  .join(" / ")}
              </s-paragraph>
              <s-stack direction="inline" gap="base">
                <Form method="get">
                  <input type="hidden" name="productId" value={selectedProductId} />
                  <input
                    type="hidden"
                    name="previewPrescriptionType"
                    value={previewPrescriptionType}
                  />
                  <input
                    type="hidden"
                    name="previewVariantId"
                    value={previewVariantId}
                  />
                  <input type="hidden" name="editRuleId" value={rule.id} />
                  <s-button type="submit" variant="secondary">
                    编辑
                  </s-button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="toggle" />
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <input
                    type="hidden"
                    name="enabled"
                    value={rule.enabled ? "false" : "true"}
                  />
                  <s-button type="submit" variant="secondary">
                    {rule.enabled ? "停用" : "启用"}
                  </s-button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <s-button type="submit" tone="critical" variant="secondary">
                    删除
                  </s-button>
                </Form>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>
      {dashboard && (
        <s-section heading="规则命中预览">
          <s-stack direction="block" gap="base">
            <s-box padding="base" border="base" border-radius="base">
              <s-heading>当前上下文</s-heading>
              <s-paragraph>
                处方类型：{dashboard.context.prescriptionType ?? "未设置"}
              </s-paragraph>
              <s-paragraph>
                商品类型：{dashboard.context.productType ?? "未设置"}
              </s-paragraph>
              <s-paragraph>
                选中变体：{dashboard.context.selectedVariantId ?? "未指定"}
              </s-paragraph>
              <s-paragraph>
                变体数量：{dashboard.context.variants.length}
              </s-paragraph>
            </s-box>

            <s-box padding="base" border="base" border-radius="base">
              <s-heading>镜片结果</s-heading>
              <s-paragraph>
                可见：{dashboard.lensOptions.availableLensOptions.length}
              </s-paragraph>
              <s-paragraph>
                禁用：{dashboard.lensOptions.disabledLensOptions.length}
              </s-paragraph>
              <s-paragraph>
                隐藏：{dashboard.lensOptions.hiddenLensOptions.length}
              </s-paragraph>
              <s-unordered-list>
                {dashboard.lensOptions.availableLensOptions.map((option) => (
                  <s-list-item key={`available-${option.id}`}>
                    {option.name} / visible
                  </s-list-item>
                ))}
                {dashboard.lensOptions.disabledLensOptions.map((option) => (
                  <s-list-item key={`disabled-${option.id}`}>
                    {option.name} / disabled
                  </s-list-item>
                ))}
                {dashboard.lensOptions.hiddenLensOptions.map((option) => (
                  <s-list-item key={`hidden-${option.id}`}>
                    {option.name} / hidden
                  </s-list-item>
                ))}
              </s-unordered-list>
            </s-box>

            <s-box padding="base" border="base" border-radius="base">
              <s-heading>命中摘要</s-heading>
              {dashboard.diagnostic.summaryMessages.length === 0 ? (
                <s-paragraph>当前没有额外提示文案。</s-paragraph>
              ) : (
                <s-unordered-list>
                  {dashboard.diagnostic.summaryMessages.map((message) => (
                    <s-list-item key={message}>{message}</s-list-item>
                  ))}
                </s-unordered-list>
              )}
            </s-box>

            <s-box padding="base" border="base" border-radius="base">
              <s-heading>规则 Trace</s-heading>
              <s-unordered-list>
                {dashboard.diagnostic.traces.map((trace) => (
                  <s-list-item key={trace.ruleId}>
                    {trace.ruleId} / {trace.matched ? "matched" : "not_matched"} /{" "}
                    {trace.reason}
                  </s-list-item>
                ))}
              </s-unordered-list>
            </s-box>
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}
