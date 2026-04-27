import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import {
  getRepairableSubscriptionPlans,
  getSubscriptionRepairMode,
} from "../lib/subscription-diagnostics";
import { authenticate } from "../shopify.server";
import type { ProductSubscriptionPlan } from "../services/shopify-products.server";
import {
  buildProductSubscriptionDiagnostics,
} from "../services/subscription-diagnostics.server";
import {
  fetchShopifyProducts,
  fetchShopifyProduct,
  toSubscriptionOffering,
  type ShopifyProductNode,
  type ShopifyVariantNode,
} from "../services/shopify-products.server";
import {
  createAndBindSellingPlan,
  deleteProductSubscriptionPlan,
  parseVariantIds,
  upsertProductSubscriptionPlan,
} from "../services/subscription-plans.server";

function parseInterval(value: FormDataEntryValue | null): ProductSubscriptionPlan["interval"] {
  const interval = String(value ?? "month");
  if (interval === "day" || interval === "week" || interval === "month") {
    return interval;
  }

  return "month";
}

function getVariantLabelMap(product?: ShopifyProductNode) {
  return new Map(
    product?.variants.nodes.map((variant: ShopifyVariantNode) => [
      variant.id,
      variant.sku ?? variant.displayName,
    ]) ?? [],
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const products = await fetchShopifyProducts(admin);
  const url = new URL(request.url);
  const selectedProductId = url.searchParams.get("productId") ?? products[0]?.id ?? "";
  const editPlanId = url.searchParams.get("editPlanId") ?? "";
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const subscriptionOffering = selectedProduct
    ? toSubscriptionOffering(selectedProduct)
    : {
        enabled: false,
        source: "none" as const,
        plans: [],
        requiresSellingPlanIntegration: true,
      };
  const selectedPlan = subscriptionOffering.plans.find(
    (plan) => plan.id === editPlanId,
  );
  const diagnostics = selectedProduct
    ? await buildProductSubscriptionDiagnostics(
        admin,
        selectedProduct.id,
        subscriptionOffering,
        selectedProduct.variants.nodes,
      )
    : {
        summary: {
          status: "healthy" as const,
          totalPlans: 0,
          healthyPlans: 0,
          warningPlans: 0,
          errorPlans: 0,
          issueCount: 0,
        },
        plans: [],
      };

  return {
    products,
    selectedProduct,
    selectedProductId,
    editPlanId,
    selectedPlan,
    subscriptionOffering,
    diagnostics,
    variantLabelMap: Object.fromEntries(getVariantLabelMap(selectedProduct)),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "save");
  const productId = String(formData.get("productId") ?? "");

  if (!productId) {
    return { ok: false, error: "缺少 productId" };
  }

  if (intent === "delete") {
    const planId = String(formData.get("planId") ?? "");
    if (!planId) {
      return { ok: false, error: "缺少待删除的方案 ID" };
    }

    await deleteProductSubscriptionPlan(admin, productId, planId);
    return { ok: true };
  }

  if (intent === "bind") {
    const planId = String(formData.get("planId") ?? "");
    const repairMode = String(formData.get("repairMode") ?? "bind");
    if (!planId) {
      return { ok: false, error: "缺少待绑定的方案 ID" };
    }

    try {
      await createAndBindSellingPlan(admin, productId, planId, {
        force: repairMode === "rebind",
        skipDelete: repairMode === "recreate_missing",
      });
      return { ok: true, message: "已完成订阅方案修复与远端绑定同步" };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "创建 Selling Plan 失败",
      };
    }
  }

  if (intent === "repair_all") {
    const product = await fetchShopifyProduct(admin, productId);
    if (!product) {
      return { ok: false, error: "未找到当前商品，无法执行批量修复" };
    }

    const offering = toSubscriptionOffering(product);
    const diagnostics = await buildProductSubscriptionDiagnostics(
      admin,
      productId,
      offering,
      product.variants.nodes,
    );
    const repairablePlans = getRepairableSubscriptionPlans(
      offering.plans,
      diagnostics,
    );

    for (const item of repairablePlans) {
      await createAndBindSellingPlan(admin, productId, item.plan.id, {
        force: item.mode === "rebind",
        skipDelete: item.mode === "recreate_missing",
      });
    }

    return {
      ok: true,
      message:
        repairablePlans.length > 0
          ? `已批量修复 ${repairablePlans.length} 个订阅方案`
          : "当前商品没有需要修复的订阅方案",
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "请输入方案名称" };
  }

  await upsertProductSubscriptionPlan(admin, productId, {
    id: String(formData.get("planId") ?? "").trim() || undefined,
    name,
    interval: parseInterval(formData.get("interval")),
    intervalCount: Number(formData.get("intervalCount") ?? 1) || 1,
    discountPercentage:
      String(formData.get("discountPercentage") ?? "").trim() === ""
        ? undefined
        : Number(formData.get("discountPercentage")),
    variantIds: parseVariantIds(formData.get("variantIds")),
  });

  return { ok: true, message: "订阅方案已保存，并已同步远端绑定状态。" };
};

export default function SubscriptionsPage() {
  const {
    products,
    selectedProduct,
    selectedProductId,
    selectedPlan,
    subscriptionOffering,
    diagnostics,
    variantLabelMap,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if (!selectedProduct) {
    return (
      <s-page heading="订阅方案管理">
        <s-section heading="未找到商品">
          <s-paragraph>当前店铺还没有可读取的商品，请先在 Shopify 后台创建商品。</s-paragraph>
        </s-section>
      </s-page>
    );
  }

  const intervalCount = String(selectedPlan?.intervalCount ?? 1);
  const discountPercentage = String(selectedPlan?.discountPercentage ?? "");
  const variantIds = selectedPlan?.variantIds?.join(", ") ?? "";
  const repairablePlans = getRepairableSubscriptionPlans(
    subscriptionOffering.plans,
    diagnostics,
  );

  return (
    <s-page heading="订阅方案管理">
      <s-section heading="商品选择">
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

      <s-section heading={selectedPlan ? "编辑订阅方案" : "新增订阅方案"}>
        {actionData?.ok && (
          <s-banner tone="success" heading="保存成功">
            {actionData.message ?? "当前商品的订阅方案已同步到 Shopify Product Metafield。"}
          </s-banner>
        )}
        {actionData?.error && (
          <s-banner tone="critical" heading="保存失败">
            {actionData.error}
          </s-banner>
        )}
        <Form method="post">
          <s-stack direction="block" gap="base">
            <input type="hidden" name="intent" value="save" />
            <input type="hidden" name="productId" value={selectedProductId} />
            <input type="hidden" name="planId" value={selectedPlan?.id ?? ""} />
            <s-text-field
              name="name"
              label="方案名称"
              value={selectedPlan?.name ?? ""}
            />
            <s-stack direction="inline" gap="base">
              <s-select
                name="interval"
                label="周期单位"
                value={selectedPlan?.interval ?? "month"}
              >
                <s-option value="day">day</s-option>
                <s-option value="week">week</s-option>
                <s-option value="month">month</s-option>
              </s-select>
              <s-number-field
                name="intervalCount"
                label="周期数"
                value={intervalCount}
              />
            </s-stack>
            <s-number-field
              name="discountPercentage"
              label="折扣百分比"
              value={discountPercentage}
            />
            <s-text-area
              name="variantIds"
              label="适用变体 ID 列表"
              value={variantIds}
            />
            <s-paragraph>
              请输入逗号分隔的 Shopify Variant ID。留空表示适用于当前商品所有变体。
            </s-paragraph>
            <s-paragraph>
              远端绑定 ID 由系统自动维护。若当前方案已绑定，保存时会自动同步 Shopify Selling Plan Group。
            </s-paragraph>
            {selectedPlan?.sellingPlanId && (
              <s-paragraph>
                当前 Selling Plan：<s-text>{selectedPlan.sellingPlanId}</s-text>
              </s-paragraph>
            )}
            {selectedPlan?.sellingPlanGroupId && (
              <s-paragraph>
                当前 Selling Plan Group：<s-text>{selectedPlan.sellingPlanGroupId}</s-text>
              </s-paragraph>
            )}
            <s-button type="submit" variant="primary">
              {selectedPlan ? "更新方案" : "新增方案"}
            </s-button>
          </s-stack>
        </Form>
        {selectedPlan && (
          <Form method="get">
            <input type="hidden" name="productId" value={selectedProductId} />
            <s-button type="submit" variant="secondary">
              取消编辑
            </s-button>
          </Form>
        )}
      </s-section>

      <s-section heading="当前商品方案">
        <s-paragraph>
          同步诊断：
          <s-badge
            tone={
              diagnostics.summary.status === "error"
                ? "critical"
                : diagnostics.summary.status === "warning"
                  ? "warning"
                  : "success"
            }
          >
            {diagnostics.summary.status}
          </s-badge>
        </s-paragraph>
        <s-paragraph>
          方案数 {diagnostics.summary.totalPlans}，正常 {diagnostics.summary.healthyPlans}，警告{" "}
          {diagnostics.summary.warningPlans}，错误 {diagnostics.summary.errorPlans}，问题总数{" "}
          {diagnostics.summary.issueCount}
        </s-paragraph>
        {repairablePlans.length > 0 && (
          <Form method="post">
            <input type="hidden" name="intent" value="repair_all" />
            <input type="hidden" name="productId" value={selectedProductId} />
            <s-button type="submit" variant="primary">
              一键修复异常方案
            </s-button>
          </Form>
        )}
        <s-paragraph>
          配置来源：
          <s-badge tone={subscriptionOffering.source === "metafield" ? "success" : "info"}>
            {subscriptionOffering.source}
          </s-badge>
        </s-paragraph>
        <s-paragraph>
          绑定状态：
          <s-badge
            tone={
              subscriptionOffering.requiresSellingPlanIntegration ? "warning" : "success"
            }
          >
            {subscriptionOffering.requiresSellingPlanIntegration
              ? "部分或全部方案未绑定"
              : "已绑定"}
          </s-badge>
        </s-paragraph>
        {subscriptionOffering.plans.length === 0 ? (
          <s-paragraph>当前商品还没有订阅方案配置。</s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {subscriptionOffering.plans.map((plan) => {
              const planDiagnostic = diagnostics.plans.find(
                (item) => item.planId === plan.id,
              );
              const repairMode = getSubscriptionRepairMode(plan, planDiagnostic);

              return (
              <s-box key={plan.id} padding="base" border="base" border-radius="base">
                <s-heading>{plan.name}</s-heading>
                <s-paragraph>
                  诊断状态：
                  <s-badge
                    tone={
                      planDiagnostic?.status === "error"
                        ? "critical"
                        : planDiagnostic?.status === "warning"
                          ? "warning"
                          : "success"
                    }
                  >
                    {planDiagnostic?.status ?? "healthy"}
                  </s-badge>
                </s-paragraph>
                <s-paragraph>
                  周期：每 {plan.intervalCount} {plan.interval}
                </s-paragraph>
                <s-paragraph>
                  折扣：{typeof plan.discountPercentage === "number" ? `${plan.discountPercentage}%` : "未配置"}
                </s-paragraph>
                <s-paragraph>
                  Selling Plan：
                  <s-text>{plan.sellingPlanId ?? "未绑定"}</s-text>
                </s-paragraph>
                <s-paragraph>
                  Selling Plan Group：
                  <s-text>{plan.sellingPlanGroupId ?? "未绑定"}</s-text>
                </s-paragraph>
                {!planDiagnostic || planDiagnostic.issues.length === 0 ? (
                  <s-paragraph>
                    诊断结果：当前方案的本地配置与远端绑定状态一致。
                  </s-paragraph>
                ) : (
                    <s-stack direction="block" gap="base">
                      {planDiagnostic.issues.map((issue) => (
                        <s-banner
                          key={`${plan.id}-${issue.code}`}
                          tone={issue.severity === "error" ? "critical" : "warning"}
                          heading={issue.code}
                        >
                          {issue.message}
                          {issue.relatedVariantIds.length > 0
                            ? ` 受影响变体：${issue.relatedVariantIds
                                .map((variantId) => variantLabelMap[variantId] ?? variantId)
                                .join(", ")}`
                            : ""}
                        </s-banner>
                      ))}
                    </s-stack>
                )}
                <s-paragraph>
                  适用变体：
                  <s-text>
                    {plan.variantIds && plan.variantIds.length > 0
                      ? plan.variantIds
                          .map((variantId) => variantLabelMap[variantId] ?? variantId)
                          .join(", ")
                      : "全部变体"}
                  </s-text>
                </s-paragraph>
                <s-stack direction="inline" gap="base">
                  <Form method="get">
                    <input type="hidden" name="productId" value={selectedProductId} />
                    <input type="hidden" name="editPlanId" value={plan.id} />
                    <s-button type="submit" variant="secondary">
                      编辑
                    </s-button>
                  </Form>
                  <Form method="post">
                    <input type="hidden" name="intent" value="bind" />
                    <input type="hidden" name="productId" value={selectedProductId} />
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="repairMode" value={repairMode} />
                    <s-button type="submit" variant="primary">
                      {repairMode === "rebind"
                        ? "重新绑定"
                        : repairMode === "recreate_missing"
                          ? "重建绑定"
                          : "创建并绑定"}
                    </s-button>
                  </Form>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="productId" value={selectedProductId} />
                    <input type="hidden" name="planId" value={plan.id} />
                    <s-button type="submit" variant="secondary">
                      删除
                    </s-button>
                  </Form>
                </s-stack>
              </s-box>
              );
            })}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}
