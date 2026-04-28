var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a;
import { jsx, jsxs } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, UNSAFE_withComponentProps, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useActionData, Form, redirect, Link, UNSAFE_withErrorBoundaryProps, useRouteError } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import "@shopify/shopify-app-react-router/adapters/node";
import { shopifyApp, AppDistribution, ApiVersion, LoginErrorType, boundary } from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import { NavMenu } from "@shopify/app-bridge-react";
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}
const prisma = global.prismaGlobal ?? new PrismaClient();
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
ApiVersion.October25;
const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
const login = shopify.login;
shopify.registerWebhooks;
shopify.sessionStorage;
const streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, reactRouterContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        ServerRouter,
        {
          context: reactRouterContext,
          url: request.url
        }
      ),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width,initial-scale=1"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://cdn.shopify.com/"
      }), /* @__PURE__ */ jsx("link", {
        rel: "stylesheet",
        href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: root
}, Symbol.toStringTag, { value: "Module" }));
function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function toAxis(value) {
  const axis = toNumber(value);
  if (axis === null || axis < 0 || axis > 180) {
    return null;
  }
  return axis;
}
function hasDistanceCorrection(exam) {
  var _a2, _b, _c, _d;
  const values = [
    (_a2 = exam.leftEye) == null ? void 0 : _a2.sphere,
    (_b = exam.leftEye) == null ? void 0 : _b.cylinder,
    (_c = exam.rightEye) == null ? void 0 : _c.sphere,
    (_d = exam.rightEye) == null ? void 0 : _d.cylinder
  ];
  return values.some((value) => typeof value === "number" && Math.abs(value) > 0);
}
function inferPrescriptionType$1(exam) {
  if (exam.prescriptionType) {
    return exam.prescriptionType;
  }
  const addPower = toNumber(exam.addPower);
  if (addPower !== null && addPower > 0) {
    return hasDistanceCorrection(exam) ? "progressive" : "reading";
  }
  if (hasDistanceCorrection(exam)) {
    return "single_vision";
  }
  return "non_prescription";
}
function maxPrescriptionMagnitude(exam) {
  return Math.max(
    Math.abs(exam.leftEye.sphere),
    Math.abs(exam.leftEye.cylinder),
    Math.abs(exam.rightEye.sphere),
    Math.abs(exam.rightEye.cylinder)
  );
}
function isHighIndexRecommended(exam) {
  return maxPrescriptionMagnitude(exam) >= 4;
}
function hasHighIndexLens(product) {
  const pattern = /(高折射|超薄|advanced|premium|pro|thin|high index)/i;
  return product.lensOptions.some((option) => pattern.test(option.name));
}
function normalizeEyeExamInput(exam) {
  var _a2, _b, _c, _d, _e, _f;
  return {
    prescriptionType: inferPrescriptionType$1(exam),
    leftEye: {
      sphere: toNumber((_a2 = exam.leftEye) == null ? void 0 : _a2.sphere) ?? 0,
      cylinder: toNumber((_b = exam.leftEye) == null ? void 0 : _b.cylinder) ?? 0,
      axis: toAxis((_c = exam.leftEye) == null ? void 0 : _c.axis)
    },
    rightEye: {
      sphere: toNumber((_d = exam.rightEye) == null ? void 0 : _d.sphere) ?? 0,
      cylinder: toNumber((_e = exam.rightEye) == null ? void 0 : _e.cylinder) ?? 0,
      axis: toAxis((_f = exam.rightEye) == null ? void 0 : _f.axis)
    },
    addPower: toNumber(exam.addPower),
    pd: toNumber(exam.pd)
  };
}
function buildSummaryMessages(exam) {
  const messages = [];
  if (exam.prescriptionType === "progressive") {
    messages.push("已按渐进/多焦点需求筛选商品。");
  } else if (exam.prescriptionType === "reading") {
    messages.push("已按老花阅读需求筛选商品。");
  } else if (exam.prescriptionType === "single_vision") {
    messages.push("已按单光配镜需求筛选商品。");
  } else {
    messages.push("已按平光/无度数需求筛选商品。");
  }
  if (isHighIndexRecommended(exam)) {
    messages.push("当前度数较高，建议优先选择超薄或高折射率镜片。");
  }
  if (exam.addPower !== null && exam.addPower > 0) {
    messages.push(`检测到 ADD ${exam.addPower}，推荐支持近用补偿的配镜方案。`);
  }
  if (exam.pd !== null) {
    messages.push(`已记录瞳距 PD ${exam.pd}。`);
  }
  return messages;
}
function buildRecommendation(product, exam) {
  const reasons = [`商品支持 ${product.prescriptionType} 配镜类型。`];
  let score = 100;
  const highIndexRecommended = isHighIndexRecommended(exam);
  if (highIndexRecommended && hasHighIndexLens(product)) {
    reasons.push("商品已配置超薄/高折射率镜片选项，更适合较高度数。");
    score += 20;
  } else if (highIndexRecommended) {
    reasons.push("商品可匹配当前处方类型，但建议确认是否支持更高折射率镜片。");
  } else {
    reasons.push("当前度数范围可优先使用标准镜片方案。");
    score += 10;
  }
  if (exam.prescriptionType === "reading" && product.tags.includes("reading")) {
    reasons.push("商品标签明确标记了 reading 场景。");
    score += 10;
  }
  if (exam.prescriptionType === "progressive" && product.tags.includes("progressive")) {
    reasons.push("商品标签明确标记了 progressive 场景。");
    score += 10;
  }
  return {
    productId: product.id,
    title: product.title,
    handle: product.handle,
    productType: product.productType,
    prescriptionType: product.prescriptionType,
    lensOptions: product.lensOptions,
    reasons,
    recommendedLensTier: highIndexRecommended ? "high_index" : "standard",
    score
  };
}
function recommendProductsForEyeExam(products, examInput) {
  const exam = normalizeEyeExamInput(examInput);
  const recommendations = products.filter(
    (product) => product.status === "ACTIVE" && product.prescriptionType === exam.prescriptionType
  ).map((product) => buildRecommendation(product, exam)).sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
  return {
    exam,
    summaryMessages: buildSummaryMessages(exam),
    recommendations
  };
}
const DEFAULT_LENS_OPTIONS = [
  {
    id: "lens-basic",
    name: "基础镜片",
    basePrice: 0
  },
  {
    id: "lens-pro",
    name: "高级镜片",
    basePrice: 80
  }
];
const PRODUCTS_QUERY = `#graphql
  query LensDashboardProducts($first: Int!) {
    products(first: $first, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        productType
        tags
        status
        prescriptionTypeMetafield: metafield(namespace: "lens", key: "prescription_type") {
          value
        }
        lensOptionsMetafield: metafield(namespace: "lens", key: "lens_options") {
          value
        }
        subscriptionPlansMetafield: metafield(namespace: "lens", key: "subscription_plans") {
          value
        }
        variants(first: 10) {
          nodes {
            id
            displayName
            sku
            inventoryQuantity
          }
        }
      }
    }
  }
`;
const PRODUCT_BY_ID_QUERY = `#graphql
  query LensDashboardProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      productType
      tags
      status
      prescriptionTypeMetafield: metafield(namespace: "lens", key: "prescription_type") {
        value
      }
      lensOptionsMetafield: metafield(namespace: "lens", key: "lens_options") {
        value
      }
      subscriptionPlansMetafield: metafield(namespace: "lens", key: "subscription_plans") {
        value
      }
      variants(first: 20) {
        nodes {
          id
          displayName
          sku
          inventoryQuantity
        }
      }
    }
  }
`;
function inferPrescriptionType(tags) {
  if (tags.includes("single_vision")) {
    return "single_vision";
  }
  if (tags.includes("progressive")) {
    return "progressive";
  }
  if (tags.includes("reading")) {
    return "reading";
  }
  return "non_prescription";
}
function parsePrescriptionType$1(product) {
  var _a2;
  const value = (_a2 = product.prescriptionTypeMetafield) == null ? void 0 : _a2.value;
  if (value === "non_prescription" || value === "single_vision" || value === "progressive" || value === "reading") {
    return value;
  }
  return inferPrescriptionType(product.tags);
}
function isLensOptionMetafieldValue(value) {
  return Array.isArray(value) && value.every(
    (item) => typeof item === "object" && item !== null && typeof item.id === "string" && typeof item.name === "string" && typeof item.basePrice === "number"
  );
}
function isSubscriptionPlanMetafieldValue(value) {
  return Array.isArray(value) && value.every(
    (item) => {
      var _a2;
      return typeof item === "object" && item !== null && typeof item.id === "string" && typeof item.name === "string" && (item.interval === "day" || item.interval === "week" || item.interval === "month") && typeof item.intervalCount === "number" && (item.discountPercentage === void 0 || typeof item.discountPercentage === "number") && (item.sellingPlanId === void 0 || typeof item.sellingPlanId === "string") && (item.sellingPlanGroupId === void 0 || typeof item.sellingPlanGroupId === "string") && (item.variantIds === void 0 || Array.isArray(item.variantIds) && ((_a2 = item.variantIds) == null ? void 0 : _a2.every(
        (variantId) => typeof variantId === "string"
      )));
    }
  );
}
function toLensOptions(product) {
  var _a2;
  const rawValue = (_a2 = product.lensOptionsMetafield) == null ? void 0 : _a2.value;
  if (!rawValue) {
    return DEFAULT_LENS_OPTIONS;
  }
  try {
    const parsed = JSON.parse(rawValue);
    if (!isLensOptionMetafieldValue(parsed)) {
      return DEFAULT_LENS_OPTIONS;
    }
    return parsed.map((item) => ({
      id: item.id,
      name: item.name,
      basePrice: item.basePrice
    }));
  } catch {
    return DEFAULT_LENS_OPTIONS;
  }
}
function getProductConfiguration(product) {
  var _a2, _b, _c, _d, _e, _f;
  const subscriptionOffering = toSubscriptionOffering(product);
  return {
    prescriptionTypeRaw: ((_a2 = product.prescriptionTypeMetafield) == null ? void 0 : _a2.value) ?? null,
    lensOptionsRaw: ((_b = product.lensOptionsMetafield) == null ? void 0 : _b.value) ?? null,
    subscriptionPlansRaw: ((_c = product.subscriptionPlansMetafield) == null ? void 0 : _c.value) ?? null,
    prescriptionTypeConfigured: Boolean((_d = product.prescriptionTypeMetafield) == null ? void 0 : _d.value),
    lensOptionsConfigured: Boolean((_e = product.lensOptionsMetafield) == null ? void 0 : _e.value),
    subscriptionPlansConfigured: Boolean((_f = product.subscriptionPlansMetafield) == null ? void 0 : _f.value),
    subscriptionPlansRequiresSellingPlanIntegration: subscriptionOffering.requiresSellingPlanIntegration
  };
}
function toSubscriptionOffering(product) {
  var _a2;
  const rawValue = (_a2 = product.subscriptionPlansMetafield) == null ? void 0 : _a2.value;
  if (!rawValue) {
    return {
      enabled: false,
      source: "none",
      plans: [],
      requiresSellingPlanIntegration: true
    };
  }
  try {
    const parsed = JSON.parse(rawValue);
    if (!isSubscriptionPlanMetafieldValue(parsed)) {
      return {
        enabled: false,
        source: "none",
        plans: [],
        requiresSellingPlanIntegration: true
      };
    }
    return {
      enabled: parsed.length > 0,
      source: "metafield",
      plans: parsed.map((plan) => ({
        id: plan.id,
        name: plan.name,
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        discountPercentage: plan.discountPercentage,
        sellingPlanId: plan.sellingPlanId,
        sellingPlanGroupId: plan.sellingPlanGroupId,
        variantIds: plan.variantIds
      })),
      requiresSellingPlanIntegration: parsed.some((plan) => !plan.sellingPlanId)
    };
  } catch {
    return {
      enabled: false,
      source: "none",
      plans: [],
      requiresSellingPlanIntegration: true
    };
  }
}
function serializeSubscriptionPlans(plans) {
  return JSON.stringify(
    plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
      discountPercentage: plan.discountPercentage,
      sellingPlanId: plan.sellingPlanId,
      sellingPlanGroupId: plan.sellingPlanGroupId,
      variantIds: plan.variantIds ?? []
    }))
  );
}
function filterSubscriptionOfferingByVariant(offering, selectedVariantId) {
  if (!selectedVariantId) {
    return offering;
  }
  const filteredPlans = offering.plans.filter(
    (plan) => !plan.variantIds || plan.variantIds.length === 0 || plan.variantIds.includes(selectedVariantId)
  );
  return {
    ...offering,
    enabled: filteredPlans.length > 0,
    plans: filteredPlans,
    requiresSellingPlanIntegration: filteredPlans.some(
      (plan) => !plan.sellingPlanId
    )
  };
}
function toVariantSummaries(product) {
  return product.variants.nodes.map((variant) => ({
    id: variant.id,
    title: variant.displayName,
    sku: variant.sku ?? variant.displayName,
    inventoryAvailable: (variant.inventoryQuantity ?? 0) > 0
  }));
}
function toShopifyResourceId(gid) {
  const match = gid.match(/\/(\d+)$/);
  return (match == null ? void 0 : match[1]) ?? null;
}
async function fetchShopifyProducts(admin, first = 15) {
  var _a2, _b;
  const response = await admin.graphql(PRODUCTS_QUERY, {
    variables: {
      first
    }
  });
  const json = await response.json();
  return ((_b = (_a2 = json.data) == null ? void 0 : _a2.products) == null ? void 0 : _b.nodes) ?? [];
}
async function fetchShopifyProduct(admin, id) {
  var _a2;
  const response = await admin.graphql(PRODUCT_BY_ID_QUERY, {
    variables: {
      id
    }
  });
  const json = await response.json();
  return ((_a2 = json.data) == null ? void 0 : _a2.product) ?? void 0;
}
function toProductSummary(product) {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    productType: product.productType ?? void 0,
    tags: product.tags,
    status: product.status
  };
}
function toProductContext(product) {
  return {
    productId: product.id,
    productType: product.productType ?? void 0,
    tags: product.tags,
    prescriptionType: parsePrescriptionType$1(product),
    variants: product.variants.nodes.map((variant) => ({
      id: variant.id,
      sku: variant.sku ?? variant.displayName,
      isDeleted: false,
      inventoryAvailable: (variant.inventoryQuantity ?? 0) > 0
    }))
  };
}
function toRecommendableProduct(product) {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    tags: product.tags,
    productType: product.productType ?? void 0,
    prescriptionType: parsePrescriptionType$1(product),
    lensOptions: toLensOptions(product)
  };
}
function parseNumber$1(value) {
  if (value === null || value.trim() === "") {
    return void 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function parseExamInput$1(url) {
  const prescriptionType = url.searchParams.get("prescriptionType");
  return {
    prescriptionType: prescriptionType === "non_prescription" || prescriptionType === "single_vision" || prescriptionType === "progressive" || prescriptionType === "reading" ? prescriptionType : void 0,
    leftEye: {
      sphere: parseNumber$1(url.searchParams.get("leftSphere")),
      cylinder: parseNumber$1(url.searchParams.get("leftCylinder")),
      axis: parseNumber$1(url.searchParams.get("leftAxis"))
    },
    rightEye: {
      sphere: parseNumber$1(url.searchParams.get("rightSphere")),
      cylinder: parseNumber$1(url.searchParams.get("rightCylinder")),
      axis: parseNumber$1(url.searchParams.get("rightAxis"))
    },
    addPower: parseNumber$1(url.searchParams.get("addPower")),
    pd: parseNumber$1(url.searchParams.get("pd"))
  };
}
const loader$f = async ({
  request
}) => {
  const {
    admin
  } = await authenticate.public.appProxy(request);
  if (!admin) {
    return Response.json({
      error: "当前店铺未建立可用的 app proxy session"
    }, {
      status: 401
    });
  }
  const url = new URL(request.url);
  const examInput = parseExamInput$1(url);
  const products = await fetchShopifyProducts(admin, 50);
  const result = recommendProductsForEyeExam(products.map(toRecommendableProduct), examInput);
  return Response.json(result);
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$f
}, Symbol.toStringTag, { value: "Module" }));
const action$8 = async ({
  request
}) => {
  const {
    payload,
    session,
    topic,
    shop
  } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;
  if (session) {
    await prisma.session.update({
      where: {
        id: session.id
      },
      data: {
        scope: current.toString()
      }
    });
  }
  return new Response();
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$8
}, Symbol.toStringTag, { value: "Module" }));
const action$7 = async ({
  request
}) => {
  const {
    shop,
    session,
    topic
  } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  if (session) {
    await prisma.session.deleteMany({
      where: {
        shop
      }
    });
  }
  return new Response();
};
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$7
}, Symbol.toStringTag, { value: "Module" }));
const DEMO_SHOP$3 = "demo-shop.myshopify.com";
function isParameterInputValue$2(value) {
  return value === null || value === void 0 || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value) && value.every((item) => typeof item === "string");
}
function isParameterValueRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every((item) => isParameterInputValue$2(item));
}
function parsePurchaseRecordValuesJson(text2) {
  const parsed = JSON.parse(text2);
  if (!isParameterValueRecord(parsed)) {
    throw new Error("参数记录格式不正确");
  }
  return parsed;
}
function mapPurchaseRecord(record) {
  return {
    id: record.id,
    source: record.source,
    status: record.status,
    purchaseMode: record.purchaseMode,
    shopifyProductId: record.shopifyProductId,
    productTitle: record.productTitle ?? void 0,
    shopifyVariantId: record.shopifyVariantId,
    variantTitle: record.variantTitle ?? void 0,
    parameterTemplateName: record.parameterTemplateName ?? void 0,
    signature: record.signature ?? void 0,
    parameterValues: parsePurchaseRecordValuesJson(record.parameterValuesJson),
    subscriptionPlanId: record.subscriptionPlanId ?? void 0,
    subscriptionPlanName: record.subscriptionPlanName ?? void 0,
    sellingPlanId: record.sellingPlanId ?? void 0,
    priceAdjustment: record.priceAdjustment ?? void 0,
    notes: record.notes ?? void 0,
    createdAt: record.createdAt.toISOString()
  };
}
async function createPurchaseRecord(input2) {
  return prisma.purchaseRecord.create({
    data: {
      shop: input2.shop ?? DEMO_SHOP$3,
      source: input2.source ?? "theme_widget",
      status: input2.status,
      purchaseMode: input2.purchaseMode,
      shopifyProductId: input2.shopifyProductId,
      productTitle: input2.productTitle,
      shopifyVariantId: input2.shopifyVariantId,
      variantTitle: input2.variantTitle,
      parameterTemplateName: input2.parameterTemplateName,
      signature: input2.signature,
      parameterValuesJson: JSON.stringify(input2.parameterValues),
      subscriptionPlanId: input2.subscriptionPlanId,
      subscriptionPlanName: input2.subscriptionPlanName,
      sellingPlanId: input2.sellingPlanId,
      priceAdjustment: input2.priceAdjustment,
      notes: input2.notes
    }
  });
}
async function listPurchaseRecords(input2) {
  const records = await prisma.purchaseRecord.findMany({
    where: {
      shop: (input2 == null ? void 0 : input2.shop) ?? DEMO_SHOP$3,
      ...(input2 == null ? void 0 : input2.shopifyProductId) ? { shopifyProductId: input2.shopifyProductId } : {},
      ...(input2 == null ? void 0 : input2.purchaseMode) && input2.purchaseMode !== "all" ? { purchaseMode: input2.purchaseMode } : {},
      ...(input2 == null ? void 0 : input2.status) && input2.status !== "all" ? { status: input2.status } : {}
    },
    orderBy: {
      createdAt: "desc"
    },
    take: (input2 == null ? void 0 : input2.limit) ?? 50
  });
  return records.map(mapPurchaseRecord);
}
function summarizePurchaseRecords(records) {
  return records.reduce(
    (summary, record) => {
      summary.total += 1;
      if (record.purchaseMode === "subscription") {
        summary.subscriptionCount += 1;
      } else {
        summary.oneTimeCount += 1;
      }
      if (record.status === "cart_added") {
        summary.cartAddedCount += 1;
      } else if (record.status === "checkout_started") {
        summary.checkoutStartedCount += 1;
      } else if (record.status === "cart_add_failed") {
        summary.failedCount += 1;
      }
      return summary;
    },
    {
      total: 0,
      oneTimeCount: 0,
      subscriptionCount: 0,
      cartAddedCount: 0,
      checkoutStartedCount: 0,
      failedCount: 0
    }
  );
}
const DEMO_SHOP$2 = "demo-shop.myshopify.com";
function mapNotificationLog(record) {
  return {
    id: record.id,
    channel: record.channel,
    provider: record.provider,
    category: record.category,
    recipient: record.recipient,
    subject: record.subject,
    status: record.status,
    error: record.error ?? void 0,
    payloadJson: record.payloadJson ?? void 0,
    createdAt: record.createdAt.toISOString()
  };
}
async function createNotificationLog(input2) {
  return prisma.notificationLog.create({
    data: {
      shop: input2.shop ?? DEMO_SHOP$2,
      channel: input2.channel,
      provider: input2.provider,
      category: input2.category,
      recipient: input2.recipient,
      subject: input2.subject,
      status: input2.status,
      error: input2.error,
      payloadJson: input2.payload ? JSON.stringify(input2.payload) : void 0
    }
  });
}
async function listNotificationLogs(input2) {
  const records = await prisma.notificationLog.findMany({
    where: {
      shop: (input2 == null ? void 0 : input2.shop) ?? DEMO_SHOP$2,
      ...(input2 == null ? void 0 : input2.category) ? { category: input2.category } : {},
      ...(input2 == null ? void 0 : input2.status) && input2.status !== "all" ? { status: input2.status } : {}
    },
    orderBy: {
      createdAt: "desc"
    },
    take: input2 == null ? void 0 : input2.limit
  });
  return records.map(mapNotificationLog);
}
function getEmailProviderConfig() {
  return {
    provider: "tencent-cloud-smtp",
    host: process.env.TENCENT_SES_SMTP_HOST || "sg-smtp.qcloudmail.com",
    port: Number(process.env.TENCENT_SES_SMTP_PORT || "465"),
    secure: String(process.env.TENCENT_SES_SMTP_SECURE || "true") !== "false",
    user: process.env.TENCENT_SES_SMTP_USER || "",
    pass: process.env.TENCENT_SES_SMTP_PASS || "",
    from: process.env.TENCENT_SES_FROM_EMAIL || "",
    merchantTo: process.env.MERCHANT_ALERT_EMAIL || "",
    enabled: Boolean(
      process.env.TENCENT_SES_SMTP_USER && process.env.TENCENT_SES_SMTP_PASS && process.env.TENCENT_SES_FROM_EMAIL
    )
  };
}
async function sendEmail(input2) {
  const config = getEmailProviderConfig();
  if (!config.enabled) {
    await createNotificationLog({
      channel: "email",
      provider: config.provider,
      category: input2.category,
      recipient: input2.to,
      subject: input2.subject,
      status: "skipped",
      error: "腾讯云 SMTP 未配置完成",
      payload: input2.payload
    });
    return {
      ok: false,
      skipped: true,
      error: "腾讯云 SMTP 未配置完成"
    };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
    const info = await transporter.sendMail({
      from: config.from,
      to: input2.to,
      subject: input2.subject,
      text: input2.text,
      html: input2.html
    });
    await createNotificationLog({
      channel: "email",
      provider: config.provider,
      category: input2.category,
      recipient: input2.to,
      subject: input2.subject,
      status: "sent",
      payload: {
        ...input2.payload,
        messageId: info.messageId
      }
    });
    return {
      ok: true,
      messageId: info.messageId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "邮件发送失败";
    await createNotificationLog({
      channel: "email",
      provider: config.provider,
      category: input2.category,
      recipient: input2.to,
      subject: input2.subject,
      status: "failed",
      error: message,
      payload: input2.payload
    });
    return {
      ok: false,
      error: message
    };
  }
}
async function sendMerchantAlertEmail(input2) {
  const config = getEmailProviderConfig();
  if (!config.merchantTo) {
    await createNotificationLog({
      channel: "email",
      provider: config.provider,
      category: input2.category,
      recipient: "MERCHANT_ALERT_EMAIL",
      subject: input2.subject,
      status: "skipped",
      error: "未配置商家提醒邮箱",
      payload: input2.payload
    });
    return {
      ok: false,
      skipped: true,
      error: "未配置商家提醒邮箱"
    };
  }
  return sendEmail({
    to: config.merchantTo,
    subject: input2.subject,
    html: input2.html,
    text: input2.text,
    category: input2.category,
    payload: input2.payload
  });
}
async function sendTestEmail(to) {
  return sendEmail({
    to,
    subject: "Shopify 眼镜应用邮件通道测试",
    text: "这是一封测试邮件，用于验证腾讯云 SMTP 配置是否可用。",
    html: "<p>这是一封测试邮件，用于验证腾讯云 SMTP 配置是否可用。</p>",
    category: "test_email",
    payload: {
      kind: "manual_test"
    }
  });
}
function isPurchaseMode(value) {
  return value === "one_time" || value === "subscription";
}
function isPurchaseRecordStatus(value) {
  return value === "cart_added" || value === "checkout_started" || value === "cart_add_failed";
}
function isParameterInputValue$1(value) {
  return value === null || value === void 0 || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value) && value.every((item) => typeof item === "string");
}
function isParameterValuesRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every((item) => isParameterInputValue$1(item));
}
const action$6 = async ({
  request
}) => {
  const {
    admin
  } = await authenticate.public.appProxy(request);
  if (!admin) {
    return Response.json({
      error: "当前店铺未建立可用的 app proxy session"
    }, {
      status: 401
    });
  }
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return Response.json({
      error: "请求体必须是合法 JSON"
    }, {
      status: 400
    });
  }
  const shopifyProductId = String(payload.productId ?? "").trim();
  const shopifyVariantId = String(payload.variantId ?? "").trim();
  const purchaseMode = payload.purchaseMode;
  const status = payload.status;
  const parameterValues = payload.submittedValues;
  if (!shopifyProductId || !shopifyVariantId) {
    return Response.json({
      error: "缺少商品或变体 ID"
    }, {
      status: 400
    });
  }
  if (!isPurchaseMode(purchaseMode)) {
    return Response.json({
      error: "购买方式无效"
    }, {
      status: 400
    });
  }
  if (!isPurchaseRecordStatus(status)) {
    return Response.json({
      error: "记录状态无效"
    }, {
      status: 400
    });
  }
  if (!isParameterValuesRecord(parameterValues)) {
    return Response.json({
      error: "参数快照格式无效"
    }, {
      status: 400
    });
  }
  await createPurchaseRecord({
    source: "theme_widget",
    status,
    purchaseMode,
    shopifyProductId,
    productTitle: String(payload.productTitle ?? "").trim() || void 0,
    shopifyVariantId,
    variantTitle: String(payload.variantTitle ?? "").trim() || void 0,
    parameterTemplateName: String(payload.templateName ?? "").trim() || void 0,
    signature: String(payload.signature ?? "").trim() || void 0,
    parameterValues,
    subscriptionPlanId: String(payload.subscriptionPlanId ?? "").trim() || void 0,
    subscriptionPlanName: String(payload.subscriptionPlanName ?? "").trim() || void 0,
    sellingPlanId: String(payload.sellingPlanId ?? "").trim() || void 0,
    priceAdjustment: typeof payload.priceAdjustment === "number" ? payload.priceAdjustment : void 0,
    notes: String(payload.notes ?? "").trim() || void 0
  });
  if (status === "cart_add_failed") {
    await sendMerchantAlertEmail({
      category: "cart_add_failed",
      subject: `参数化商品加购失败：${String(payload.productTitle ?? shopifyProductId)}`,
      text: ["参数化商品加购失败。", `商品：${String(payload.productTitle ?? shopifyProductId)}`, `变体：${String(payload.variantTitle ?? shopifyVariantId)}`, `购买方式：${purchaseMode === "subscription" ? "订阅购买" : "一次性购买"}`, `备注：${String(payload.notes ?? "无")}`].join("\n"),
      html: `
        <p>参数化商品加购失败。</p>
        <p>商品：${String(payload.productTitle ?? shopifyProductId)}</p>
        <p>变体：${String(payload.variantTitle ?? shopifyVariantId)}</p>
        <p>购买方式：${purchaseMode === "subscription" ? "订阅购买" : "一次性购买"}</p>
        <p>备注：${String(payload.notes ?? "无")}</p>
      `,
      payload
    });
  }
  if (status === "checkout_started" && purchaseMode === "subscription") {
    await sendMerchantAlertEmail({
      category: "subscription_checkout_started",
      subject: `订阅购买已发起：${String(payload.productTitle ?? shopifyProductId)}`,
      text: ["消费者已发起订阅购买。", `商品：${String(payload.productTitle ?? shopifyProductId)}`, `变体：${String(payload.variantTitle ?? shopifyVariantId)}`, `订阅方案：${String(payload.subscriptionPlanName ?? "未记录")}`, `Selling Plan：${String(payload.sellingPlanId ?? "未记录")}`].join("\n"),
      html: `
        <p>消费者已发起订阅购买。</p>
        <p>商品：${String(payload.productTitle ?? shopifyProductId)}</p>
        <p>变体：${String(payload.variantTitle ?? shopifyVariantId)}</p>
        <p>订阅方案：${String(payload.subscriptionPlanName ?? "未记录")}</p>
        <p>Selling Plan：${String(payload.sellingPlanId ?? "未记录")}</p>
      `,
      payload
    });
  }
  return Response.json({
    ok: true
  });
};
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6
}, Symbol.toStringTag, { value: "Module" }));
const VALID_PARAMETER_TYPES = /* @__PURE__ */ new Set([
  "number",
  "text",
  "select",
  "multi_select",
  "boolean"
]);
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
function isParameterDefinition(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value;
  return typeof item.code === "string" && typeof item.label === "string" && typeof item.required === "boolean" && typeof item.position === "number" && typeof item.type === "string" && VALID_PARAMETER_TYPES.has(item.type) && (item.unitCode === void 0 || typeof item.unitCode === "string") && (item.options === void 0 || isStringArray(item.options)) && (item.min === void 0 || typeof item.min === "number") && (item.max === void 0 || typeof item.max === "number") && (item.step === void 0 || typeof item.step === "number") && (item.helpText === void 0 || typeof item.helpText === "string") && (item.dependsOn === void 0 || typeof item.dependsOn === "object" && item.dependsOn !== null && typeof item.dependsOn.code === "string" && isStringArray(item.dependsOn.values));
}
function parseParameterDefinitionsJson(text2) {
  const parsed = JSON.parse(text2);
  if (!Array.isArray(parsed) || !parsed.every(isParameterDefinition)) {
    throw new Error("参数定义 JSON 格式不正确");
  }
  return parsed;
}
function parseParameterConfigJson(text2) {
  if (!text2) {
    return {
      options: [],
      min: null,
      max: null,
      step: null,
      helpText: null,
      dependsOn: null
    };
  }
  const parsed = JSON.parse(text2);
  return {
    options: isStringArray(parsed.options) ? parsed.options : [],
    min: typeof parsed.min === "number" ? parsed.min : null,
    max: typeof parsed.max === "number" ? parsed.max : null,
    step: typeof parsed.step === "number" ? parsed.step : null,
    helpText: typeof parsed.helpText === "string" ? parsed.helpText : null,
    dependsOn: typeof parsed.dependsOn === "object" && parsed.dependsOn !== null && typeof parsed.dependsOn.code === "string" && isStringArray(parsed.dependsOn.values) ? {
      code: parsed.dependsOn.code,
      values: parsed.dependsOn.values
    } : null
  };
}
function isParameterInputValue(value) {
  return value === null || value === void 0 || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || isStringArray(value);
}
function parseParameterValuesJson(text2) {
  const parsed = JSON.parse(text2);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("参数组合 JSON 必须是对象");
  }
  const record = parsed;
  for (const value of Object.values(record)) {
    if (!isParameterInputValue(value)) {
      throw new Error("参数组合 JSON 中包含不支持的值类型");
    }
  }
  return record;
}
const DEFAULT_PARAMETER_UNITS = [
  { code: "D", label: "Diopter", precision: 2, step: 0.25 },
  { code: "mm", label: "Millimeter", precision: 2, step: 0.1 },
  { code: "%", label: "Percent", precision: 0, step: 1 },
  { code: "pcs", label: "Pieces", precision: 0, step: 1 },
  { code: "box", label: "Box", precision: 0, step: 1 },
  { code: "pair", label: "Pair", precision: 0, step: 1 },
  { code: "degree", label: "Degree", precision: 0, step: 1 }
];
const DEFAULT_LENS_PARAMETER_TEMPLATE = {
  name: "标准镜片参数模板",
  productCategory: "lens",
  description: "适用于框架眼镜镜片的标准参数模板",
  parameters: [
    {
      code: "prescription_type",
      label: "处方类型",
      type: "select",
      required: true,
      position: 10,
      options: ["non_prescription", "single_vision", "progressive", "reading"]
    },
    {
      code: "left_sph",
      label: "左眼 SPH",
      type: "number",
      required: false,
      unitCode: "D",
      position: 20,
      min: -20,
      max: 20,
      step: 0.25
    },
    {
      code: "right_sph",
      label: "右眼 SPH",
      type: "number",
      required: false,
      unitCode: "D",
      position: 30,
      min: -20,
      max: 20,
      step: 0.25
    },
    {
      code: "left_cyl",
      label: "左眼 CYL",
      type: "number",
      required: false,
      unitCode: "D",
      position: 40,
      min: -8,
      max: 8,
      step: 0.25
    },
    {
      code: "right_cyl",
      label: "右眼 CYL",
      type: "number",
      required: false,
      unitCode: "D",
      position: 50,
      min: -8,
      max: 8,
      step: 0.25
    },
    {
      code: "left_axis",
      label: "左眼 AXIS",
      type: "number",
      required: false,
      unitCode: "degree",
      position: 60,
      min: 0,
      max: 180,
      step: 1
    },
    {
      code: "right_axis",
      label: "右眼 AXIS",
      type: "number",
      required: false,
      unitCode: "degree",
      position: 70,
      min: 0,
      max: 180,
      step: 1
    },
    {
      code: "add_power",
      label: "ADD",
      type: "number",
      required: false,
      unitCode: "D",
      position: 80,
      min: 0,
      max: 4,
      step: 0.25
    },
    {
      code: "pd",
      label: "PD",
      type: "number",
      required: false,
      unitCode: "mm",
      position: 90,
      min: 40,
      max: 80,
      step: 0.5
    }
  ]
};
const DEFAULT_CONTACT_LENS_PARAMETER_TEMPLATE = {
  name: "标准隐形眼镜参数模板",
  productCategory: "contact_lens",
  description: "适用于隐形眼镜的标准参数模板",
  parameters: [
    {
      code: "sph",
      label: "SPH",
      type: "number",
      required: true,
      unitCode: "D",
      position: 10,
      min: -20,
      max: 20,
      step: 0.25
    },
    {
      code: "cyl",
      label: "CYL",
      type: "number",
      required: false,
      unitCode: "D",
      position: 20,
      min: -8,
      max: 8,
      step: 0.25
    },
    {
      code: "axis",
      label: "AXIS",
      type: "number",
      required: false,
      unitCode: "degree",
      position: 30,
      min: 0,
      max: 180,
      step: 1
    },
    {
      code: "bc",
      label: "BC",
      type: "number",
      required: true,
      unitCode: "mm",
      position: 40,
      min: 6,
      max: 10,
      step: 0.1
    },
    {
      code: "dia",
      label: "DIA",
      type: "number",
      required: true,
      unitCode: "mm",
      position: 50,
      min: 10,
      max: 20,
      step: 0.1
    },
    {
      code: "replacement_cycle",
      label: "更换周期",
      type: "select",
      required: true,
      position: 60,
      options: ["daily", "biweekly", "monthly"]
    },
    {
      code: "pack_size",
      label: "包装片数",
      type: "number",
      required: true,
      unitCode: "pcs",
      position: 70,
      min: 1,
      max: 180,
      step: 1
    }
  ]
};
function normalizeSignatureValue(value) {
  if (Array.isArray(value)) {
    return [...value].sort().join(",");
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (value === null || value === void 0) {
    return "";
  }
  return String(value).trim();
}
function buildParameterSignature(values) {
  return Object.keys(values).sort().map((key) => `${key}=${normalizeSignatureValue(values[key])}`).join("|");
}
const DEMO_SHOP$1 = "demo-shop.myshopify.com";
function mapProductConfig(record) {
  return {
    id: record.id,
    shopifyProductId: record.shopifyProductId,
    templateId: record.templateId,
    productType: record.productType ?? void 0,
    allowOneTimePurchase: record.allowOneTimePurchase,
    allowSubscription: record.allowSubscription,
    parameterOverridesJson: record.parameterOverridesJson ?? void 0,
    template: {
      id: record.template.id,
      name: record.template.name,
      productCategory: record.template.productCategory,
      description: record.template.description ?? void 0,
      parameters: record.template.parameters.map((parameter) => {
        var _a2, _b;
        const config = parseParameterConfigJson(parameter.configJson);
        return {
          code: parameter.code,
          label: parameter.label,
          type: parameter.type,
          required: parameter.required,
          position: parameter.position,
          unitCode: ((_a2 = parameter.unit) == null ? void 0 : _a2.code) ?? void 0,
          unitLabel: ((_b = parameter.unit) == null ? void 0 : _b.label) ?? void 0,
          options: config.options,
          min: config.min,
          max: config.max,
          step: config.step,
          helpText: config.helpText,
          dependsOn: config.dependsOn
        };
      })
    },
    valueMappings: record.valueMappings.map((mapping) => ({
      id: mapping.id,
      signature: mapping.signature,
      shopifyVariantId: mapping.shopifyVariantId,
      inventoryPolicy: mapping.inventoryPolicy ?? void 0,
      priceAdjustment: mapping.priceAdjustment ?? void 0
    }))
  };
}
async function ensureDefaultParameterUnits(shop = DEMO_SHOP$1) {
  for (const unit of DEFAULT_PARAMETER_UNITS) {
    await prisma.parameterUnit.upsert({
      where: {
        shop_code: {
          shop,
          code: unit.code
        }
      },
      update: {
        label: unit.label,
        precision: unit.precision,
        step: unit.step
      },
      create: {
        shop,
        code: unit.code,
        label: unit.label,
        precision: unit.precision,
        step: unit.step
      }
    });
  }
}
async function resolveUnitId(unitCode, shop) {
  if (!unitCode) {
    return void 0;
  }
  const unit = await prisma.parameterUnit.findUnique({
    where: {
      shop_code: {
        shop,
        code: unitCode
      }
    }
  });
  return unit == null ? void 0 : unit.id;
}
async function upsertTemplateDefinition(template, shop) {
  const existing = await prisma.parameterTemplate.findUnique({
    where: {
      shop_name: {
        shop,
        name: template.name
      }
    }
  });
  const savedTemplate = existing ? await prisma.parameterTemplate.update({
    where: { id: existing.id },
    data: {
      productCategory: template.productCategory,
      description: template.description,
      active: true
    }
  }) : await prisma.parameterTemplate.create({
    data: {
      shop,
      name: template.name,
      productCategory: template.productCategory,
      description: template.description
    }
  });
  await prisma.parameterDefinition.deleteMany({
    where: {
      templateId: savedTemplate.id
    }
  });
  for (const parameter of template.parameters) {
    const unitId = await resolveUnitId(parameter.unitCode, shop);
    await prisma.parameterDefinition.create({
      data: {
        templateId: savedTemplate.id,
        code: parameter.code,
        label: parameter.label,
        type: parameter.type,
        required: parameter.required,
        position: parameter.position,
        unitId,
        configJson: JSON.stringify({
          options: parameter.options ?? [],
          min: parameter.min ?? null,
          max: parameter.max ?? null,
          step: parameter.step ?? null,
          helpText: parameter.helpText ?? null,
          dependsOn: parameter.dependsOn ?? null
        })
      }
    });
  }
  return savedTemplate;
}
async function saveParameterTemplate(template, shop = DEMO_SHOP$1) {
  await ensureDefaultParameterUnits(shop);
  return upsertTemplateDefinition(template, shop);
}
async function ensureDefaultParameterTemplates(shop = DEMO_SHOP$1) {
  await ensureDefaultParameterUnits(shop);
  await upsertTemplateDefinition(DEFAULT_LENS_PARAMETER_TEMPLATE, shop);
  await upsertTemplateDefinition(DEFAULT_CONTACT_LENS_PARAMETER_TEMPLATE, shop);
}
async function listParameterUnits(shop = DEMO_SHOP$1) {
  return prisma.parameterUnit.findMany({
    where: { shop },
    orderBy: { code: "asc" }
  });
}
async function listParameterTemplates(shop = DEMO_SHOP$1) {
  return prisma.parameterTemplate.findMany({
    where: { shop },
    include: {
      parameters: {
        include: {
          unit: true
        },
        orderBy: {
          position: "asc"
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });
}
async function createProductParameterConfig(input2) {
  return prisma.productParameterConfig.upsert({
    where: {
      shop_shopifyProductId: {
        shop: input2.shop ?? DEMO_SHOP$1,
        shopifyProductId: input2.shopifyProductId
      }
    },
    update: {
      templateId: input2.templateId,
      productType: input2.productType,
      allowOneTimePurchase: input2.allowOneTimePurchase,
      allowSubscription: input2.allowSubscription,
      parameterOverridesJson: input2.parameterOverrides ? JSON.stringify(input2.parameterOverrides) : null
    },
    create: {
      shop: input2.shop ?? DEMO_SHOP$1,
      shopifyProductId: input2.shopifyProductId,
      templateId: input2.templateId,
      productType: input2.productType,
      allowOneTimePurchase: input2.allowOneTimePurchase,
      allowSubscription: input2.allowSubscription,
      parameterOverridesJson: input2.parameterOverrides ? JSON.stringify(input2.parameterOverrides) : null
    },
    include: {
      template: {
        include: {
          parameters: {
            include: {
              unit: true
            },
            orderBy: {
              position: "asc"
            }
          }
        }
      },
      valueMappings: true
    }
  });
}
async function listProductParameterConfigs(shop = DEMO_SHOP$1) {
  const configs = await prisma.productParameterConfig.findMany({
    where: { shop },
    include: {
      template: {
        include: {
          parameters: {
            include: {
              unit: true
            },
            orderBy: {
              position: "asc"
            }
          }
        }
      },
      valueMappings: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
  return configs.map(mapProductConfig);
}
async function getProductParameterConfig(shopifyProductId, shop = DEMO_SHOP$1) {
  const config = await prisma.productParameterConfig.findUnique({
    where: {
      shop_shopifyProductId: {
        shop,
        shopifyProductId
      }
    },
    include: {
      template: {
        include: {
          parameters: {
            include: {
              unit: true
            },
            orderBy: {
              position: "asc"
            }
          }
        }
      },
      valueMappings: true
    }
  });
  return config ? mapProductConfig(config) : null;
}
async function createParameterValueMapping(input2) {
  const signature = buildParameterSignature(input2.values);
  return prisma.parameterValueMapping.upsert({
    where: {
      productConfigId_signature: {
        productConfigId: input2.productConfigId,
        signature
      }
    },
    update: {
      shopifyVariantId: input2.shopifyVariantId,
      inventoryPolicy: input2.inventoryPolicy,
      priceAdjustment: input2.priceAdjustment,
      metadataJson: input2.metadata ? JSON.stringify(input2.metadata) : null
    },
    create: {
      productConfigId: input2.productConfigId,
      signature,
      shopifyVariantId: input2.shopifyVariantId,
      inventoryPolicy: input2.inventoryPolicy,
      priceAdjustment: input2.priceAdjustment,
      metadataJson: input2.metadata ? JSON.stringify(input2.metadata) : null
    }
  });
}
async function findMappedVariantByValues(input2) {
  const config = await prisma.productParameterConfig.findUnique({
    where: {
      shop_shopifyProductId: {
        shop: input2.shop ?? DEMO_SHOP$1,
        shopifyProductId: input2.shopifyProductId
      }
    },
    include: {
      valueMappings: true
    }
  });
  if (!config) {
    return null;
  }
  const signature = buildParameterSignature(input2.values);
  return config.valueMappings.find((mapping) => mapping.signature === signature) ?? null;
}
const RESERVED_QUERY_KEYS = /* @__PURE__ */ new Set(["productId", "selectedVariantId", "purchaseMode", "subscriptionPlanId"]);
function normalizeShopifyGid(type, raw) {
  if (raw.startsWith("gid://shopify/")) {
    return raw;
  }
  return `gid://shopify/${type}/${raw}`;
}
function parseValueByType(rawValue, type) {
  if (type === "number") {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : rawValue;
  }
  if (type === "boolean") {
    return rawValue === "true";
  }
  if (type === "multi_select") {
    return rawValue.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return rawValue;
}
const loader$e = async ({
  request
}) => {
  const {
    admin
  } = await authenticate.public.appProxy(request);
  if (!admin) {
    return Response.json({
      error: "当前店铺未建立可用的 app proxy session"
    }, {
      status: 401
    });
  }
  const url = new URL(request.url);
  const rawProductId = String(url.searchParams.get("productId") ?? "").trim();
  if (!rawProductId) {
    return Response.json({
      error: "缺少 productId"
    }, {
      status: 400
    });
  }
  const productId = normalizeShopifyGid("Product", rawProductId);
  const rawSelectedVariantId = String(url.searchParams.get("selectedVariantId") ?? "").trim();
  const selectedVariantId = rawSelectedVariantId ? normalizeShopifyGid("ProductVariant", rawSelectedVariantId) : "";
  const config = await getProductParameterConfig(productId);
  if (!config) {
    return Response.json({
      error: "当前商品还没有参数模板配置",
      configured: false
    }, {
      status: 404
    });
  }
  const product = await fetchShopifyProduct(admin, productId);
  if (!product) {
    return Response.json({
      error: "未找到商品"
    }, {
      status: 404
    });
  }
  const submittedValues = {};
  for (const parameter of config.template.parameters) {
    const rawValue = url.searchParams.get(parameter.code);
    if (rawValue === null || rawValue.trim() === "") {
      continue;
    }
    submittedValues[parameter.code] = parseValueByType(rawValue, parameter.type);
  }
  const hasSubmittedValues = Object.keys(submittedValues).length > 0;
  const mapping = hasSubmittedValues ? await findMappedVariantByValues({
    shopifyProductId: productId,
    values: submittedValues
  }) : null;
  const matchedVariant = mapping ? product.variants.nodes.find((variant) => variant.id === mapping.shopifyVariantId) ?? null : null;
  const purchaseMode = url.searchParams.get("purchaseMode") ?? "one_time";
  const matchedOrSelectedVariantId = (matchedVariant == null ? void 0 : matchedVariant.id) ?? (selectedVariantId || void 0);
  const subscriptionOffering = config.allowSubscription ? filterSubscriptionOfferingByVariant(toSubscriptionOffering(product), matchedOrSelectedVariantId) : {
    enabled: false,
    source: "none",
    plans: [],
    requiresSellingPlanIntegration: false
  };
  const selectedSubscriptionPlanId = String(url.searchParams.get("subscriptionPlanId") ?? "").trim();
  const selectedSubscriptionPlan = subscriptionOffering.plans.find((plan) => plan.id === selectedSubscriptionPlanId) ?? null;
  return Response.json({
    configured: true,
    product: {
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status
    },
    template: config.template,
    allowOneTimePurchase: config.allowOneTimePurchase,
    allowSubscription: config.allowSubscription,
    selectedVariantId,
    purchaseMode,
    submittedValues,
    hasSubmittedValues,
    subscriptionOffering,
    selectedSubscriptionPlanId,
    selectedSubscriptionPlan,
    availableVariants: product.variants.nodes.map((variant) => ({
      id: variant.id,
      title: variant.displayName,
      sku: variant.sku ?? variant.displayName,
      inventoryQuantity: variant.inventoryQuantity ?? 0
    })),
    match: mapping ? {
      matched: true,
      signature: mapping.signature,
      variantId: mapping.shopifyVariantId,
      cartVariantId: toShopifyResourceId(mapping.shopifyVariantId),
      variantTitle: (matchedVariant == null ? void 0 : matchedVariant.displayName) ?? mapping.shopifyVariantId,
      sku: (matchedVariant == null ? void 0 : matchedVariant.sku) ?? null,
      inventoryQuantity: (matchedVariant == null ? void 0 : matchedVariant.inventoryQuantity) ?? 0,
      inventoryAvailable: ((matchedVariant == null ? void 0 : matchedVariant.inventoryQuantity) ?? 0) > 0,
      inventoryPolicy: mapping.inventoryPolicy ?? null,
      priceAdjustment: mapping.priceAdjustment ?? null,
      sellingPlanEligible: subscriptionOffering.plans.length > 0
    } : {
      matched: false
    },
    messages: hasSubmittedValues ? mapping ? [matchedVariant && (matchedVariant.inventoryQuantity ?? 0) > 0 ? "已找到匹配货品，可继续下单。" : "已找到匹配货品，但当前库存不足，请提醒商家处理。", ...purchaseMode === "subscription" && subscriptionOffering.plans.length === 0 ? ["当前匹配货品没有可用订阅方案，请切换为一次性购买。"] : [], ...purchaseMode === "subscription" && selectedSubscriptionPlanId && !selectedSubscriptionPlan ? ["当前订阅方案不适用于该货品，请重新选择。"] : [], ...purchaseMode === "subscription" && selectedSubscriptionPlan && !selectedSubscriptionPlan.sellingPlanId ? ["当前订阅方案尚未绑定真实 Selling Plan，暂时不能提交订阅订单。"] : []] : ["当前参数组合没有命中已配置货品，请调整参数或联系商家。"] : [],
    ignoredQueryKeys: [...url.searchParams.keys()].filter((key) => !RESERVED_QUERY_KEYS.has(key) && !config.template.parameters.some((parameter) => parameter.code === key))
  });
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$e
}, Symbol.toStringTag, { value: "Module" }));
function getInitialDecision(lensOptionId) {
  return {
    lensOptionId,
    state: "hidden",
    reasonCodes: ["RULE_NOT_MATCHED"],
    messages: [],
    appliedRuleIds: []
  };
}
function replaceReasons(current, reasons) {
  current.reasonCodes = reasons;
}
function variantExists(context, variantId) {
  if (!variantId) {
    return true;
  }
  return context.variants.some(
    (variant) => variant.id === variantId && !variant.isDeleted
  );
}
function matchesSelectedVariant(context, variantId) {
  if (!variantId || !context.selectedVariantId) {
    return true;
  }
  return context.selectedVariantId === variantId;
}
function matchesCondition(context, condition) {
  switch (condition.field) {
    case "prescriptionType": {
      const currentValue = context.prescriptionType ?? "";
      return condition.operator === "eq" ? currentValue === condition.value : currentValue !== condition.value;
    }
    case "productType": {
      const currentValue = context.productType ?? "";
      return condition.operator === "eq" ? currentValue === condition.value : currentValue !== condition.value;
    }
    case "tags": {
      const hasTag = context.tags.includes(condition.value);
      return condition.operator === "includes" ? hasTag : !hasTag;
    }
    case "variantExists": {
      const exists = variantExists(context, condition.value);
      return condition.operator === "eq" ? exists : !exists;
    }
    default:
      return false;
  }
}
function applyAction(context, decisions, ruleId, action2) {
  const current = decisions[action2.lensOptionId] ?? getInitialDecision(action2.lensOptionId);
  if (!variantExists(context, action2.variantId)) {
    current.state = "hidden";
    replaceReasons(current, ["SHOPIFY_VARIANT_MISSING"]);
    current.messages.push(action2.message ?? "关联 Shopify 变体不存在");
    current.appliedRuleIds.push(ruleId);
    decisions[action2.lensOptionId] = current;
    return;
  }
  if (!matchesSelectedVariant(context, action2.variantId)) {
    decisions[action2.lensOptionId] = current;
    return;
  }
  if (action2.type === "show") {
    current.state = "visible";
    replaceReasons(current, ["LENS_VISIBLE"]);
  } else if (action2.type === "disable") {
    current.state = "disabled";
    replaceReasons(current, ["LENS_DISABLED"]);
  } else {
    current.state = "hidden";
    replaceReasons(current, ["LENS_HIDDEN"]);
  }
  if (action2.message) {
    current.messages.push(action2.message);
  }
  current.appliedRuleIds.push(ruleId);
  decisions[action2.lensOptionId] = current;
}
function getMismatchReason(conditions) {
  const prescriptionCondition = conditions.find(
    (condition) => condition.field === "prescriptionType"
  );
  if (prescriptionCondition) {
    return "PRESCRIPTION_TYPE_NOT_MATCH";
  }
  return "RULE_NOT_MATCHED";
}
function evaluateLensRules(context, rules) {
  const sortedRules = [...rules].filter((rule) => rule.enabled).sort((left, right) => right.priority - left.priority);
  const decisions = {};
  const traces = [];
  for (const rule of sortedRules) {
    const matched = rule.conditions.every(
      (condition) => matchesCondition(context, condition)
    );
    traces.push({
      ruleId: rule.id,
      matched,
      reason: matched ? "RULE_MATCHED" : getMismatchReason(rule.conditions)
    });
    if (!matched) {
      continue;
    }
    for (const action2 of rule.actions) {
      applyAction(context, decisions, rule.id, action2);
    }
  }
  return {
    decisions,
    traces
  };
}
function buildOptionView(lensOption, decision) {
  return {
    ...lensOption,
    state: (decision == null ? void 0 : decision.state) ?? "hidden",
    messages: (decision == null ? void 0 : decision.messages) ?? [],
    reasonCodes: (decision == null ? void 0 : decision.reasonCodes) ?? ["RULE_NOT_MATCHED"]
  };
}
function buildProductLensOptions(context, rules, lensOptions) {
  const evaluation = evaluateLensRules(context, rules);
  const availableLensOptions = [];
  const disabledLensOptions = [];
  const hiddenLensOptions = [];
  const messages = /* @__PURE__ */ new Set();
  const reasonCodes = /* @__PURE__ */ new Set();
  for (const lensOption of lensOptions) {
    const decision = evaluation.decisions[lensOption.id];
    const view = buildOptionView(lensOption, decision);
    for (const message of view.messages) {
      messages.add(message);
    }
    for (const reasonCode of view.reasonCodes) {
      reasonCodes.add(reasonCode);
    }
    if (view.state === "visible") {
      availableLensOptions.push(view);
    } else if (view.state === "disabled") {
      disabledLensOptions.push(view);
    } else {
      hiddenLensOptions.push(view);
    }
  }
  return {
    availableLensOptions,
    disabledLensOptions,
    hiddenLensOptions,
    messages: [...messages],
    priceAdjustments: availableLensOptions.map((option) => ({
      lensOptionId: option.id,
      amount: option.basePrice
    })),
    reasonCodes: [...reasonCodes]
  };
}
function buildLensVisibilityDiagnostic(context, rules) {
  const evaluation = evaluateLensRules(context, rules);
  const visibleLensOptionIds = [];
  const disabledLensOptionIds = [];
  const hiddenLensOptionIds = [];
  const summaryMessages = [];
  for (const decision of Object.values(evaluation.decisions)) {
    if (decision.state === "visible") {
      visibleLensOptionIds.push(decision.lensOptionId);
    } else if (decision.state === "disabled") {
      disabledLensOptionIds.push(decision.lensOptionId);
    } else {
      hiddenLensOptionIds.push(decision.lensOptionId);
    }
    if (decision.messages.length > 0) {
      summaryMessages.push(...decision.messages);
    }
  }
  if (summaryMessages.length === 0 && visibleLensOptionIds.length === 0) {
    summaryMessages.push("当前条件下没有可展示的镜片选项");
  }
  return {
    visibleLensOptionIds,
    disabledLensOptionIds,
    hiddenLensOptionIds,
    summaryMessages,
    traces: evaluation.traces
  };
}
const DEMO_SHOP = "demo-shop.myshopify.com";
function mapRule(record) {
  return {
    id: record.id,
    name: record.name,
    priority: record.priority,
    enabled: record.enabled,
    conditions: record.conditions.map((condition) => ({
      field: condition.field,
      operator: condition.operator,
      value: condition.value
    })),
    actions: record.actions.map((action2) => ({
      type: action2.type,
      lensOptionId: action2.lensOptionId,
      message: action2.message ?? void 0,
      variantId: action2.variantId ?? void 0
    }))
  };
}
async function ensureDefaultLensRules(productId) {
  const existingCount = await prisma.lensRule.count({
    where: {
      productId,
      shop: DEMO_SHOP
    }
  });
  if (existingCount > 0) {
    return;
  }
  await prisma.lensRule.create({
    data: {
      shop: DEMO_SHOP,
      productId,
      name: "无度数显示基础镜片",
      priority: 100,
      enabled: true,
      conditions: {
        create: [
          {
            field: "prescriptionType",
            operator: "eq",
            value: "non_prescription"
          }
        ]
      },
      actions: {
        create: [
          {
            type: "show",
            lensOptionId: "lens-basic",
            message: "当前处方支持基础镜片",
            variantId: "variant-1"
          }
        ]
      }
    }
  });
  await prisma.lensRule.create({
    data: {
      shop: DEMO_SHOP,
      productId,
      name: "非无度数隐藏基础镜片",
      priority: 90,
      enabled: true,
      conditions: {
        create: [
          {
            field: "prescriptionType",
            operator: "neq",
            value: "non_prescription"
          }
        ]
      },
      actions: {
        create: [
          {
            type: "hide",
            lensOptionId: "lens-basic",
            message: "该镜片仅支持无度数"
          }
        ]
      }
    }
  });
}
async function listLensRulesByProduct(productId) {
  const rules = await prisma.lensRule.findMany({
    where: {
      productId,
      shop: DEMO_SHOP
    },
    include: {
      conditions: true,
      actions: true
    },
    orderBy: {
      priority: "desc"
    }
  });
  return rules.map(mapRule);
}
async function createLensRule(input2) {
  const created = await prisma.lensRule.create({
    data: {
      shop: DEMO_SHOP,
      productId: input2.productId,
      name: input2.name,
      priority: input2.priority,
      enabled: input2.enabled,
      conditions: {
        create: [
          {
            field: "prescriptionType",
            operator: "eq",
            value: input2.prescriptionType
          }
        ]
      },
      actions: {
        create: [
          {
            type: input2.actionType,
            lensOptionId: input2.lensOptionId,
            message: input2.message,
            variantId: input2.variantId
          }
        ]
      }
    },
    include: {
      conditions: true,
      actions: true
    }
  });
  return mapRule(created);
}
async function updateLensRule(input2) {
  const updated = await prisma.lensRule.update({
    where: {
      id: input2.id
    },
    data: {
      name: input2.name,
      priority: input2.priority,
      enabled: input2.enabled,
      conditions: {
        deleteMany: {},
        create: [
          {
            field: "prescriptionType",
            operator: "eq",
            value: input2.prescriptionType
          }
        ]
      },
      actions: {
        deleteMany: {},
        create: [
          {
            type: input2.actionType,
            lensOptionId: input2.lensOptionId,
            message: input2.message,
            variantId: input2.variantId
          }
        ]
      }
    },
    include: {
      conditions: true,
      actions: true
    }
  });
  return mapRule(updated);
}
async function setLensRuleEnabled(id, enabled) {
  const updated = await prisma.lensRule.update({
    where: {
      id
    },
    data: {
      enabled
    },
    include: {
      conditions: true,
      actions: true
    }
  });
  return mapRule(updated);
}
async function deleteLensRule(id) {
  await prisma.lensRule.delete({
    where: {
      id
    }
  });
}
function withSelectedVariant(context, variantId) {
  return {
    ...context,
    selectedVariantId: variantId
  };
}
async function buildStorefrontLensWidgetData(product, options) {
  const context = toProductContext(product);
  const lensOptions = toLensOptions(product);
  const subscriptionOffering = filterSubscriptionOfferingByVariant(
    toSubscriptionOffering(product),
    options == null ? void 0 : options.selectedVariantId
  );
  await ensureDefaultLensRules(context.productId);
  const rules = await listLensRulesByProduct(context.productId);
  const currentContext = {
    ...withSelectedVariant(context, options == null ? void 0 : options.selectedVariantId),
    prescriptionType: (options == null ? void 0 : options.prescriptionType) ?? context.prescriptionType
  };
  return {
    productId: context.productId,
    selectedVariantId: options == null ? void 0 : options.selectedVariantId,
    prescriptionType: currentContext.prescriptionType,
    currentLensOptions: buildProductLensOptions(
      currentContext,
      rules,
      lensOptions
    ),
    currentDiagnostic: buildLensVisibilityDiagnostic(currentContext, rules),
    variants: toVariantSummaries(product).map((variant) => ({
      ...variant,
      lensOptions: buildProductLensOptions(
        {
          ...withSelectedVariant(context, variant.id),
          prescriptionType: currentContext.prescriptionType
        },
        rules,
        lensOptions
      )
    })),
    subscriptionOffering
  };
}
function parsePrescriptionType(value) {
  if (value === "non_prescription" || value === "single_vision" || value === "progressive" || value === "reading") {
    return value;
  }
  return void 0;
}
const loader$d = async ({
  request
}) => {
  const {
    admin
  } = await authenticate.public.appProxy(request);
  if (!admin) {
    return Response.json({
      error: "当前店铺未建立可用的 app proxy session"
    }, {
      status: 401
    });
  }
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId") ?? "";
  const variantId = url.searchParams.get("variantId") ?? void 0;
  const prescriptionType = parsePrescriptionType(url.searchParams.get("prescriptionType"));
  if (!productId) {
    return Response.json({
      error: "缺少 productId 参数"
    }, {
      status: 400
    });
  }
  const product = await fetchShopifyProduct(admin, productId);
  if (!product) {
    return Response.json({
      error: "未找到对应商品"
    }, {
      status: 404
    });
  }
  const data = await buildStorefrontLensWidgetData(product, {
    selectedVariantId: variantId,
    prescriptionType
  });
  return Response.json(data);
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$d
}, Symbol.toStringTag, { value: "Module" }));
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
const loader$c = async ({
  request
}) => {
  const errors = loginErrorMessage(await login(request));
  return {
    errors
  };
};
const action$5 = async ({
  request
}) => {
  const errors = loginErrorMessage(await login(request));
  return {
    errors
  };
};
const route$1 = UNSAFE_withComponentProps(function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const {
    errors
  } = actionData || loaderData;
  return /* @__PURE__ */ jsx(AppProvider, {
    embedded: false,
    children: /* @__PURE__ */ jsx("s-page", {
      heading: "登录 Shopify 店铺",
      children: /* @__PURE__ */ jsx(Form, {
        method: "post",
        children: /* @__PURE__ */ jsxs("s-section", {
          heading: "开始安装与登录",
          children: [/* @__PURE__ */ jsx("s-paragraph", {
            children: "输入你的店铺域名，进入标准 Shopify App 安装与授权流程。"
          }), /* @__PURE__ */ jsx("s-text-field", {
            name: "shop",
            label: "店铺域名",
            details: "example.myshopify.com",
            value: shop,
            onChange: (e) => setShop(e.currentTarget.value),
            autocomplete: "on",
            error: errors.shop
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: "登录并安装"
          })]
        })
      })
    })
  });
});
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  default: route$1,
  loader: loader$c
}, Symbol.toStringTag, { value: "Module" }));
const index = "_index_12o3y_1";
const heading = "_heading_12o3y_11";
const text = "_text_12o3y_12";
const content = "_content_12o3y_22";
const form = "_form_12o3y_27";
const label = "_label_12o3y_35";
const input = "_input_12o3y_43";
const button = "_button_12o3y_47";
const list = "_list_12o3y_51";
const styles = {
  index,
  heading,
  text,
  content,
  form,
  label,
  input,
  button,
  list
};
const loader$b = async ({
  request
}) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return {
    showForm: Boolean(login)
  };
};
const route = UNSAFE_withComponentProps(function App2() {
  const {
    showForm
  } = useLoaderData();
  return /* @__PURE__ */ jsx("div", {
    className: styles.index,
    children: /* @__PURE__ */ jsxs("div", {
      className: styles.content,
      children: [/* @__PURE__ */ jsx("h1", {
        className: styles.heading,
        children: "A short heading about [your app]"
      }), /* @__PURE__ */ jsx("p", {
        className: styles.text,
        children: "A tagline about [your app] that describes your value proposition."
      }), showForm && /* @__PURE__ */ jsxs(Form, {
        className: styles.form,
        method: "post",
        action: "/auth/login",
        children: [/* @__PURE__ */ jsxs("label", {
          className: styles.label,
          children: [/* @__PURE__ */ jsx("span", {
            children: "Shop domain"
          }), /* @__PURE__ */ jsx("input", {
            className: styles.input,
            type: "text",
            name: "shop"
          }), /* @__PURE__ */ jsx("span", {
            children: "e.g: my-shop-domain.myshopify.com"
          })]
        }), /* @__PURE__ */ jsx("button", {
          className: styles.button,
          type: "submit",
          children: "Log in"
        })]
      }), /* @__PURE__ */ jsxs("ul", {
        className: styles.list,
        children: [/* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        }), /* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        }), /* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        })]
      })]
    })
  });
});
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: route,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
const loader$a = async ({
  request
}) => {
  await authenticate.admin(request);
  return null;
};
const headers$2 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$2,
  loader: loader$a
}, Symbol.toStringTag, { value: "Module" }));
const loader$9 = async ({
  request
}) => {
  await authenticate.admin(request);
  return {
    apiKey: process.env.SHOPIFY_API_KEY || ""
  };
};
const app = UNSAFE_withComponentProps(function App3() {
  const {
    apiKey
  } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider, {
    embedded: true,
    apiKey,
    children: [/* @__PURE__ */ jsxs(NavMenu, {
      children: [/* @__PURE__ */ jsx(Link, {
        to: "/app",
        rel: "home",
        children: "仪表盘"
      }), /* @__PURE__ */ jsx(Link, {
        to: "/app/rules",
        children: "规则配置"
      }), /* @__PURE__ */ jsx(Link, {
        to: "/app/parameter-templates",
        children: "参数模板"
      }), /* @__PURE__ */ jsx(Link, {
        to: "/app/product-configs",
        children: "商品参数"
      }), /* @__PURE__ */ jsx(Link, {
        to: "/app/orders",
        children: "下单记录"
      }), /* @__PURE__ */ jsx(Link, {
        to: "/app/subscription-contracts",
        children: "订阅合同"
      }), /* @__PURE__ */ jsx(Link, {
        to: "/app/notifications",
        children: "提醒中心"
      }), /* @__PURE__ */ jsx(Link, {
        to: "/app/recommendations",
        children: "配镜推荐"
      }), /* @__PURE__ */ jsx(Link, {
        to: "/app/subscriptions",
        children: "订阅方案"
      })]
    }), /* @__PURE__ */ jsx(Outlet, {})]
  });
});
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2() {
  return boundary.error(useRouteError());
});
const headers$1 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: app,
  headers: headers$1,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
const SUBSCRIPTION_CONTRACTS_QUERY = `#graphql
  query SubscriptionContractsDashboard($first: Int!, $query: String) {
    subscriptionContracts(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id
        status
        createdAt
        updatedAt
        customer {
          id
          displayName
        }
        lines(first: 5) {
          edges {
            node {
              id
              productId
              title
              quantity
            }
          }
        }
        billingAttempts(first: 5, reverse: true) {
          edges {
            node {
              id
              ready
              order {
                id
              }
              errorMessage
              errorCode
            }
          }
        }
      }
    }
  }
`;
function buildSubscriptionContractsQuery(input2) {
  if (!(input2 == null ? void 0 : input2.status) || input2.status === "ALL") {
    return void 0;
  }
  return `status:${input2.status}`;
}
function mapSubscriptionContract(contract) {
  var _a2, _b, _c, _d;
  return {
    id: contract.id,
    status: contract.status,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    customer: contract.customer ?? void 0,
    lines: ((_b = (_a2 = contract.lines) == null ? void 0 : _a2.edges) == null ? void 0 : _b.map((edge) => edge.node).filter(
      (line) => Boolean(line)
    ).map((line) => ({
      id: line.id,
      productId: line.productId ?? void 0,
      title: line.title,
      quantity: line.quantity
    }))) ?? [],
    billingAttempts: ((_d = (_c = contract.billingAttempts) == null ? void 0 : _c.edges) == null ? void 0 : _d.map((edge) => edge.node).filter(
      (attempt) => Boolean(attempt)
    ).map((attempt) => {
      var _a3;
      return {
        id: attempt.id,
        ready: attempt.ready,
        orderId: ((_a3 = attempt.order) == null ? void 0 : _a3.id) ?? void 0,
        errorMessage: attempt.errorMessage ?? void 0,
        errorCode: attempt.errorCode ?? void 0
      };
    })) ?? []
  };
}
async function listSubscriptionContracts(admin, input2) {
  var _a2, _b, _c;
  const response = await admin.graphql(SUBSCRIPTION_CONTRACTS_QUERY, {
    variables: {
      first: input2 == null ? void 0 : input2.limit,
      query: buildSubscriptionContractsQuery(input2)
    }
  });
  const json = await response.json();
  return ((_c = (_b = (_a2 = json.data) == null ? void 0 : _a2.subscriptionContracts) == null ? void 0 : _b.nodes) == null ? void 0 : _c.map(mapSubscriptionContract)) ?? [];
}
function summarizeSubscriptionContracts(contracts) {
  return contracts.reduce(
    (summary, contract) => {
      summary.total += 1;
      summary[contract.status] = (summary[contract.status] ?? 0) + 1;
      summary.billingAttemptCount += contract.billingAttempts.length;
      summary.failedBillingAttemptCount += contract.billingAttempts.filter(
        (attempt) => Boolean(attempt.errorCode || attempt.errorMessage)
      ).length;
      return summary;
    },
    {
      total: 0,
      ACTIVE: 0,
      PAUSED: 0,
      FAILED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
      billingAttemptCount: 0,
      failedBillingAttemptCount: 0
    }
  );
}
function formatDateTime$2(value) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}
function getStatusTone$2(status) {
  if (status === "FAILED" || status === "CANCELLED" || status === "EXPIRED") {
    return "critical";
  }
  if (status === "PAUSED") {
    return "warning";
  }
  return "success";
}
function findRelatedPurchaseNotes(contract, localRecords) {
  return localRecords.filter((record) => contract.lines.some((line) => line.productId && line.productId === record.shopifyProductId));
}
const loader$8 = async ({
  request
}) => {
  const {
    admin
  } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "ALL";
  const contracts = await listSubscriptionContracts(admin, {
    status,
    limit: 20
  });
  const localSubscriptionRecords = await listPurchaseRecords({
    purchaseMode: "subscription",
    limit: 100
  });
  return {
    status,
    contracts,
    summary: summarizeSubscriptionContracts(contracts),
    localSubscriptionRecords
  };
};
const app_subscriptionContracts = UNSAFE_withComponentProps(function SubscriptionContractsPage() {
  const {
    status,
    contracts,
    summary,
    localSubscriptionRecords
  } = useLoaderData();
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "订阅合同",
    children: [/* @__PURE__ */ jsx("s-section", {
      heading: "筛选条件",
      children: /* @__PURE__ */ jsx(Form, {
        method: "get",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "inline",
          gap: "base",
          "align-items": "end",
          children: [/* @__PURE__ */ jsxs("s-select", {
            name: "status",
            label: "合同状态",
            value: status,
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "ALL",
              children: "全部"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "ACTIVE",
              children: "ACTIVE"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "PAUSED",
              children: "PAUSED"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "FAILED",
              children: "FAILED"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "CANCELLED",
              children: "CANCELLED"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "EXPIRED",
              children: "EXPIRED"
            })]
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: "应用筛选"
          })]
        })
      })
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "概览",
      children: /* @__PURE__ */ jsxs("s-stack", {
        direction: "inline",
        gap: "base",
        children: [/* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "合同总数"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.total
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "ACTIVE"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.ACTIVE
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "PAUSED"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.PAUSED
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "FAILED"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.FAILED
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "账单尝试"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.billingAttemptCount
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "失败账单"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.failedBillingAttemptCount
          })]
        })]
      })
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "合同列表",
      children: contracts.length === 0 ? /* @__PURE__ */ jsx("s-paragraph", {
        children: "当前没有读取到订阅合同。请确认应用 scope 已包含 `read_own_subscription_contracts` 或 `write_own_subscription_contracts`，且店铺内已有订阅订单转成合同。"
      }) : /* @__PURE__ */ jsx("s-stack", {
        direction: "block",
        gap: "base",
        children: contracts.map((contract) => {
          var _a2, _b;
          const relatedRecords = findRelatedPurchaseNotes(contract, localSubscriptionRecords);
          return /* @__PURE__ */ jsx("s-box", {
            padding: "base",
            border: "base",
            "border-radius": "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              direction: "block",
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: contract.id
              }), /* @__PURE__ */ jsxs("s-paragraph", {
                children: ["状态：", /* @__PURE__ */ jsx("s-badge", {
                  tone: getStatusTone$2(contract.status),
                  children: contract.status
                })]
              }), /* @__PURE__ */ jsxs("s-paragraph", {
                children: ["客户：", /* @__PURE__ */ jsx("s-text", {
                  children: ((_a2 = contract.customer) == null ? void 0 : _a2.displayName) ?? ((_b = contract.customer) == null ? void 0 : _b.id) ?? "未返回"
                })]
              }), /* @__PURE__ */ jsxs("s-paragraph", {
                children: ["创建时间：", /* @__PURE__ */ jsx("s-text", {
                  children: formatDateTime$2(contract.createdAt)
                })]
              }), /* @__PURE__ */ jsxs("s-paragraph", {
                children: ["更新时间：", /* @__PURE__ */ jsx("s-text", {
                  children: formatDateTime$2(contract.updatedAt)
                })]
              }), /* @__PURE__ */ jsxs("s-box", {
                padding: "base",
                background: "subdued",
                "border-radius": "base",
                children: [/* @__PURE__ */ jsx("s-heading", {
                  children: "合同商品"
                }), /* @__PURE__ */ jsx("s-unordered-list", {
                  children: contract.lines.map((line) => /* @__PURE__ */ jsxs("s-list-item", {
                    children: [line.title, " x ", line.quantity, line.productId ? ` / ${line.productId}` : ""]
                  }, line.id))
                })]
              }), /* @__PURE__ */ jsxs("s-box", {
                padding: "base",
                background: "subdued",
                "border-radius": "base",
                children: [/* @__PURE__ */ jsx("s-heading", {
                  children: "账单尝试"
                }), contract.billingAttempts.length === 0 ? /* @__PURE__ */ jsx("s-paragraph", {
                  children: "当前合同还没有账单尝试记录。"
                }) : /* @__PURE__ */ jsx("s-unordered-list", {
                  children: contract.billingAttempts.map((attempt) => /* @__PURE__ */ jsxs("s-list-item", {
                    children: [attempt.id, attempt.orderId ? ` / 订单 ${attempt.orderId}` : "", attempt.errorCode || attempt.errorMessage ? ` / 失败：${attempt.errorCode ?? ""} ${attempt.errorMessage ?? ""}` : attempt.ready ? " / 已就绪" : " / 处理中"]
                  }, attempt.id))
                })]
              }), /* @__PURE__ */ jsxs("s-box", {
                padding: "base",
                background: "subdued",
                "border-radius": "base",
                children: [/* @__PURE__ */ jsx("s-heading", {
                  children: "本地订阅线索"
                }), relatedRecords.length === 0 ? /* @__PURE__ */ jsx("s-paragraph", {
                  children: "当前没有匹配到本地下单记录。"
                }) : /* @__PURE__ */ jsx("s-unordered-list", {
                  children: relatedRecords.slice(0, 5).map((record) => /* @__PURE__ */ jsxs("s-list-item", {
                    children: [record.createdAt, " / ", record.subscriptionPlanName ?? "未记录方案", " /", " ", record.variantTitle ?? record.shopifyVariantId]
                  }, record.id))
                })]
              })]
            })
          }, contract.id);
        })
      })
    })]
  });
});
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_subscriptionContracts,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
const SAMPLE_PARAMETERS_JSON = JSON.stringify([{
  code: "blue_light_level",
  label: "防蓝光等级",
  type: "select",
  required: false,
  position: 10,
  options: ["standard", "plus", "max"]
}, {
  code: "edge_thickness",
  label: "边厚等级",
  type: "number",
  required: false,
  position: 20,
  unitCode: "mm",
  min: 0,
  max: 10,
  step: 0.1
}], null, 2);
const loader$7 = async ({
  request
}) => {
  await authenticate.admin(request);
  await ensureDefaultParameterTemplates();
  return {
    units: await listParameterUnits(),
    templates: await listParameterTemplates()
  };
};
const action$4 = async ({
  request
}) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "create");
  if (intent === "seed_defaults") {
    await ensureDefaultParameterTemplates();
    return {
      ok: true,
      message: "已写入默认镜片和隐形眼镜参数模板。"
    };
  }
  const name = String(formData.get("name") ?? "").trim();
  const productCategory = String(formData.get("productCategory") ?? "custom").trim();
  const description = String(formData.get("description") ?? "").trim();
  const parametersJson = String(formData.get("parametersJson") ?? "").trim();
  if (!name || !parametersJson) {
    return {
      ok: false,
      error: "请输入模板名称和参数定义 JSON。"
    };
  }
  try {
    const parameters = parseParameterDefinitionsJson(parametersJson);
    await saveParameterTemplate({
      name,
      productCategory: productCategory === "lens" || productCategory === "contact_lens" || productCategory === "care" || productCategory === "custom" ? productCategory : "custom",
      description: description || void 0,
      parameters
    });
    return {
      ok: true,
      message: "参数模板已保存。"
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "保存参数模板失败"
    };
  }
};
const app_parameterTemplates = UNSAFE_withComponentProps(function ParameterTemplatesPage() {
  const {
    units,
    templates
  } = useLoaderData();
  const actionData = useActionData();
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "参数模板管理",
    children: [/* @__PURE__ */ jsxs("s-section", {
      heading: "快捷初始化",
      children: [(actionData == null ? void 0 : actionData.ok) && /* @__PURE__ */ jsx("s-banner", {
        tone: "success",
        heading: "操作成功",
        children: actionData.message
      }), (actionData == null ? void 0 : actionData.ok) === false && actionData.error && /* @__PURE__ */ jsx("s-banner", {
        tone: "critical",
        heading: "操作失败",
        children: actionData.error
      }), /* @__PURE__ */ jsxs(Form, {
        method: "post",
        children: [/* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "intent",
          value: "seed_defaults"
        }), /* @__PURE__ */ jsx("s-button", {
          type: "submit",
          variant: "primary",
          children: "写入默认模板与单位"
        })]
      })]
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "新增自定义模板",
      children: /* @__PURE__ */ jsx(Form, {
        method: "post",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "block",
          gap: "base",
          children: [/* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "intent",
            value: "create"
          }), /* @__PURE__ */ jsx("s-text-field", {
            name: "name",
            label: "模板名称",
            value: ""
          }), /* @__PURE__ */ jsxs("s-select", {
            name: "productCategory",
            label: "商品分类",
            value: "custom",
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "lens",
              children: "lens"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "contact_lens",
              children: "contact_lens"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "care",
              children: "care"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "custom",
              children: "custom"
            })]
          }), /* @__PURE__ */ jsx("s-text-area", {
            name: "description",
            label: "模板说明",
            value: ""
          }), /* @__PURE__ */ jsx("s-text-area", {
            name: "parametersJson",
            label: "参数定义 JSON",
            value: SAMPLE_PARAMETERS_JSON
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: "说明：每个参数至少需要 `code`、`label`、`type`、`required`、`position`。"
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: "保存模板"
          })]
        })
      })
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "单位规格",
      children: /* @__PURE__ */ jsx("s-stack", {
        direction: "block",
        gap: "base",
        children: units.map((unit) => /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: unit.code
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["名称：", unit.label]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["精度：", unit.precision]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["步进：", unit.step ?? "未设置"]
          })]
        }, unit.id))
      })
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "当前模板",
      children: /* @__PURE__ */ jsx("s-stack", {
        direction: "block",
        gap: "base",
        children: templates.map((template) => /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: template.name
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["分类：", template.productCategory]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["参数数：", template.parameters.length]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["说明：", template.description ?? "无"]
          }), /* @__PURE__ */ jsx("s-unordered-list", {
            children: template.parameters.map((parameter) => {
              var _a2;
              return /* @__PURE__ */ jsxs("s-list-item", {
                children: [parameter.label, " / ", parameter.code, " / ", parameter.type, ((_a2 = parameter.unit) == null ? void 0 : _a2.code) ? ` / ${parameter.unit.code}` : "", parameter.required ? " / required" : ""]
              }, parameter.id);
            })
          })]
        }, template.id))
      })
    })]
  });
});
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: app_parameterTemplates,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
const SAMPLE_VALUES_JSON = JSON.stringify({
  prescription_type: "single_vision",
  left_sph: -1,
  right_sph: -1.25,
  pd: 63
}, null, 2);
const loader$6 = async ({
  request
}) => {
  var _a2;
  const {
    admin
  } = await authenticate.admin(request);
  await ensureDefaultParameterTemplates();
  const products = await fetchShopifyProducts(admin, 50);
  const templates = await listParameterTemplates();
  const configs = await listProductParameterConfigs();
  const url = new URL(request.url);
  const selectedProductId = url.searchParams.get("productId") ?? ((_a2 = products[0]) == null ? void 0 : _a2.id) ?? "";
  const selectedConfig = configs.find((config) => config.shopifyProductId === selectedProductId) ?? null;
  return {
    products,
    templates,
    configs,
    selectedProductId,
    selectedConfig
  };
};
const action$3 = async ({
  request
}) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "save_config");
  if (intent === "save_config") {
    const shopifyProductId = String(formData.get("shopifyProductId") ?? "").trim();
    const templateId = String(formData.get("templateId") ?? "").trim();
    const productType = String(formData.get("productType") ?? "").trim();
    const allowOneTimePurchase = String(formData.get("allowOneTimePurchase") ?? "true") === "true";
    const allowSubscription = String(formData.get("allowSubscription") ?? "false") === "true";
    const parameterOverridesJson = String(formData.get("parameterOverridesJson") ?? "").trim();
    if (!shopifyProductId || !templateId) {
      return {
        ok: false,
        error: "请选择商品和参数模板。"
      };
    }
    let parameterOverrides;
    if (parameterOverridesJson) {
      try {
        parameterOverrides = JSON.parse(parameterOverridesJson);
      } catch {
        return {
          ok: false,
          error: "参数覆盖 JSON 格式不正确。"
        };
      }
    }
    await createProductParameterConfig({
      shopifyProductId,
      templateId,
      productType: productType || void 0,
      allowOneTimePurchase,
      allowSubscription,
      parameterOverrides
    });
    return {
      ok: true,
      message: "商品参数配置已保存。"
    };
  }
  if (intent === "add_mapping") {
    const productConfigId = String(formData.get("productConfigId") ?? "").trim();
    const shopifyVariantId = String(formData.get("shopifyVariantId") ?? "").trim();
    const valuesJson = String(formData.get("valuesJson") ?? "").trim();
    const inventoryPolicy = String(formData.get("inventoryPolicy") ?? "").trim();
    const priceAdjustmentValue = String(formData.get("priceAdjustment") ?? "").trim();
    if (!productConfigId || !shopifyVariantId || !valuesJson) {
      return {
        ok: false,
        error: "请填写映射配置、目标变体和参数组合 JSON。"
      };
    }
    try {
      const values = parseParameterValuesJson(valuesJson);
      await createParameterValueMapping({
        productConfigId,
        values,
        shopifyVariantId,
        inventoryPolicy: inventoryPolicy || void 0,
        priceAdjustment: priceAdjustmentValue === "" ? void 0 : Number(priceAdjustmentValue)
      });
      return {
        ok: true,
        message: "参数组合映射已保存。"
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "保存映射失败"
      };
    }
  }
  return {
    ok: false,
    error: "不支持的操作。"
  };
};
const app_productConfigs = UNSAFE_withComponentProps(function ProductConfigsPage() {
  var _a2;
  const {
    products,
    templates,
    configs,
    selectedProductId,
    selectedConfig
  } = useLoaderData();
  const actionData = useActionData();
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  if (!selectedProduct) {
    return /* @__PURE__ */ jsx("s-page", {
      heading: "商品参数配置",
      children: /* @__PURE__ */ jsx("s-section", {
        heading: "未找到商品",
        children: /* @__PURE__ */ jsx("s-paragraph", {
          children: "当前店铺还没有可用商品，请先在 Shopify 后台创建商品。"
        })
      })
    });
  }
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "商品参数配置",
    children: [/* @__PURE__ */ jsx("s-section", {
      heading: "切换商品",
      children: /* @__PURE__ */ jsx(Form, {
        method: "get",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "inline",
          gap: "base",
          "align-items": "end",
          children: [/* @__PURE__ */ jsx("s-select", {
            name: "productId",
            label: "当前商品",
            value: selectedProductId,
            children: products.map((product) => /* @__PURE__ */ jsx("s-option", {
              value: product.id,
              children: product.title
            }, product.id))
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: "切换商品"
          })]
        })
      })
    }), /* @__PURE__ */ jsxs("s-section", {
      heading: "商品模板绑定",
      children: [(actionData == null ? void 0 : actionData.ok) && /* @__PURE__ */ jsx("s-banner", {
        tone: "success",
        heading: "操作成功",
        children: actionData.message
      }), (actionData == null ? void 0 : actionData.ok) === false && actionData.error && /* @__PURE__ */ jsx("s-banner", {
        tone: "critical",
        heading: "操作失败",
        children: actionData.error
      }), /* @__PURE__ */ jsx(Form, {
        method: "post",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "block",
          gap: "base",
          children: [/* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "intent",
            value: "save_config"
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "shopifyProductId",
            value: selectedProductId
          }), /* @__PURE__ */ jsx("s-text-field", {
            name: "productTitlePreview",
            label: "商品名称",
            value: selectedProduct.title,
            disabled: true
          }), /* @__PURE__ */ jsx("s-select", {
            name: "templateId",
            label: "参数模板",
            value: (selectedConfig == null ? void 0 : selectedConfig.templateId) ?? ((_a2 = templates[0]) == null ? void 0 : _a2.id) ?? "",
            children: templates.map((template) => /* @__PURE__ */ jsx("s-option", {
              value: template.id,
              children: template.name
            }, template.id))
          }), /* @__PURE__ */ jsx("s-text-field", {
            name: "productType",
            label: "商品类型覆盖",
            value: (selectedConfig == null ? void 0 : selectedConfig.productType) ?? selectedProduct.productType ?? ""
          }), /* @__PURE__ */ jsxs("s-select", {
            name: "allowOneTimePurchase",
            label: "允许一次性购买",
            value: (selectedConfig == null ? void 0 : selectedConfig.allowOneTimePurchase) === false ? "false" : "true",
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "true",
              children: "true"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "false",
              children: "false"
            })]
          }), /* @__PURE__ */ jsxs("s-select", {
            name: "allowSubscription",
            label: "允许订阅购买",
            value: (selectedConfig == null ? void 0 : selectedConfig.allowSubscription) ? "true" : "false",
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "false",
              children: "false"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "true",
              children: "true"
            })]
          }), /* @__PURE__ */ jsx("s-text-area", {
            name: "parameterOverridesJson",
            label: "参数覆盖 JSON",
            value: (selectedConfig == null ? void 0 : selectedConfig.parameterOverridesJson) ?? "{}"
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: "保存商品配置"
          })]
        })
      })]
    }), selectedConfig && /* @__PURE__ */ jsxs("s-section", {
      heading: "参数组合映射",
      children: [/* @__PURE__ */ jsx(Form, {
        method: "post",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "block",
          gap: "base",
          children: [/* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "intent",
            value: "add_mapping"
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "productConfigId",
            value: selectedConfig.id
          }), /* @__PURE__ */ jsx("s-text-field", {
            name: "shopifyVariantId",
            label: "目标 Shopify Variant ID",
            value: ""
          }), /* @__PURE__ */ jsx("s-text-area", {
            name: "valuesJson",
            label: "参数组合 JSON",
            value: SAMPLE_VALUES_JSON
          }), /* @__PURE__ */ jsx("s-text-field", {
            name: "inventoryPolicy",
            label: "库存策略",
            value: ""
          }), /* @__PURE__ */ jsx("s-number-field", {
            name: "priceAdjustment",
            label: "价格附加",
            value: ""
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: "保存参数组合映射"
          })]
        })
      }), /* @__PURE__ */ jsx("s-stack", {
        direction: "block",
        gap: "base",
        children: selectedConfig.valueMappings.length === 0 ? /* @__PURE__ */ jsx("s-paragraph", {
          children: "当前商品还没有参数组合映射。"
        }) : selectedConfig.valueMappings.map((mapping) => /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: mapping.shopifyVariantId
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["签名：", mapping.signature]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["价格附加：", mapping.priceAdjustment ?? "未设置"]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["库存策略：", mapping.inventoryPolicy ?? "未设置"]
          })]
        }, mapping.id))
      })]
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "当前配置概览",
      children: /* @__PURE__ */ jsx("s-stack", {
        direction: "block",
        gap: "base",
        children: configs.map((config) => /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: config.shopifyProductId
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["模板：", config.template.name]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["映射数：", config.valueMappings.length]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["一次性购买：", config.allowOneTimePurchase ? "开启" : "关闭"]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["订阅购买：", config.allowSubscription ? "开启" : "关闭"]
          })]
        }, config.id))
      })
    })]
  });
});
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: app_productConfigs,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
function parseNumber(value) {
  if (!value || value.trim() === "") {
    return void 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function parseExamInput(url) {
  const prescriptionType = url.searchParams.get("prescriptionType");
  return {
    prescriptionType: prescriptionType === "non_prescription" || prescriptionType === "single_vision" || prescriptionType === "progressive" || prescriptionType === "reading" ? prescriptionType : void 0,
    leftEye: {
      sphere: parseNumber(url.searchParams.get("leftSphere")),
      cylinder: parseNumber(url.searchParams.get("leftCylinder")),
      axis: parseNumber(url.searchParams.get("leftAxis"))
    },
    rightEye: {
      sphere: parseNumber(url.searchParams.get("rightSphere")),
      cylinder: parseNumber(url.searchParams.get("rightCylinder")),
      axis: parseNumber(url.searchParams.get("rightAxis"))
    },
    addPower: parseNumber(url.searchParams.get("addPower")),
    pd: parseNumber(url.searchParams.get("pd"))
  };
}
const loader$5 = async ({
  request
}) => {
  const {
    admin
  } = await authenticate.admin(request);
  const url = new URL(request.url);
  const examInput = parseExamInput(url);
  const products = await fetchShopifyProducts(admin, 50);
  return {
    examInput,
    result: recommendProductsForEyeExam(products.map(toRecommendableProduct), examInput)
  };
};
const app_recommendations = UNSAFE_withComponentProps(function RecommendationsPage() {
  var _a2, _b, _c, _d, _e, _f;
  const {
    examInput,
    result
  } = useLoaderData();
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "配镜推荐",
    children: [/* @__PURE__ */ jsx("s-section", {
      heading: "输入验光结果",
      children: /* @__PURE__ */ jsx(Form, {
        method: "get",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "block",
          gap: "base",
          children: [/* @__PURE__ */ jsxs("s-select", {
            name: "prescriptionType",
            label: "处方类型",
            value: examInput.prescriptionType ?? "",
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "",
              children: "自动判断"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "non_prescription",
              children: "non_prescription"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "single_vision",
              children: "single_vision"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "progressive",
              children: "progressive"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "reading",
              children: "reading"
            })]
          }), /* @__PURE__ */ jsxs("s-stack", {
            direction: "inline",
            gap: "base",
            children: [/* @__PURE__ */ jsx("s-number-field", {
              name: "leftSphere",
              label: "左眼 SPH",
              value: String(((_a2 = examInput.leftEye) == null ? void 0 : _a2.sphere) ?? "")
            }), /* @__PURE__ */ jsx("s-number-field", {
              name: "leftCylinder",
              label: "左眼 CYL",
              value: String(((_b = examInput.leftEye) == null ? void 0 : _b.cylinder) ?? "")
            }), /* @__PURE__ */ jsx("s-number-field", {
              name: "leftAxis",
              label: "左眼 AXIS",
              value: String(((_c = examInput.leftEye) == null ? void 0 : _c.axis) ?? "")
            })]
          }), /* @__PURE__ */ jsxs("s-stack", {
            direction: "inline",
            gap: "base",
            children: [/* @__PURE__ */ jsx("s-number-field", {
              name: "rightSphere",
              label: "右眼 SPH",
              value: String(((_d = examInput.rightEye) == null ? void 0 : _d.sphere) ?? "")
            }), /* @__PURE__ */ jsx("s-number-field", {
              name: "rightCylinder",
              label: "右眼 CYL",
              value: String(((_e = examInput.rightEye) == null ? void 0 : _e.cylinder) ?? "")
            }), /* @__PURE__ */ jsx("s-number-field", {
              name: "rightAxis",
              label: "右眼 AXIS",
              value: String(((_f = examInput.rightEye) == null ? void 0 : _f.axis) ?? "")
            })]
          }), /* @__PURE__ */ jsxs("s-stack", {
            direction: "inline",
            gap: "base",
            children: [/* @__PURE__ */ jsx("s-number-field", {
              name: "addPower",
              label: "ADD",
              value: String(examInput.addPower ?? "")
            }), /* @__PURE__ */ jsx("s-number-field", {
              name: "pd",
              label: "PD",
              value: String(examInput.pd ?? "")
            })]
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: "开始匹配商品"
          })]
        })
      })
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "匹配结果",
      children: /* @__PURE__ */ jsxs("s-stack", {
        direction: "block",
        gap: "base",
        children: [/* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "系统判断"
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["当前处方类型：", /* @__PURE__ */ jsx("s-badge", {
              tone: "success",
              children: result.exam.prescriptionType
            })]
          }), result.summaryMessages.length > 0 && /* @__PURE__ */ jsx("s-unordered-list", {
            children: result.summaryMessages.map((message) => /* @__PURE__ */ jsx("s-list-item", {
              children: message
            }, message))
          })]
        }), result.recommendations.length === 0 ? /* @__PURE__ */ jsx("s-banner", {
          tone: "warning",
          heading: "暂无匹配商品",
          children: "当前店铺还没有与该验光结果匹配的商品，请先补充支持对应处方类型的商品配置。"
        }) : result.recommendations.map((item) => /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: item.title
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["处方类型：", /* @__PURE__ */ jsx("s-text", {
              children: item.prescriptionType
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["建议镜片等级：", /* @__PURE__ */ jsx("s-badge", {
              tone: item.recommendedLensTier === "high_index" ? "warning" : "success",
              children: item.recommendedLensTier === "high_index" ? "高折射率/超薄" : "标准镜片"
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["匹配分数：", item.score]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["商品链接：", /* @__PURE__ */ jsx("s-link", {
              href: `/products/${item.handle}`,
              target: "_blank",
              children: item.handle
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["可选镜片：", item.lensOptions.map((option) => option.name).join(" / ") || "未配置"]
          }), /* @__PURE__ */ jsx("s-unordered-list", {
            children: item.reasons.map((reason) => /* @__PURE__ */ jsx("s-list-item", {
              children: reason
            }, reason))
          })]
        }, item.productId))]
      })
    })]
  });
});
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_recommendations,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
function formatDateTime$1(value) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}
function getStatusTone$1(status) {
  if (status === "failed") {
    return "critical";
  }
  if (status === "skipped") {
    return "warning";
  }
  return "success";
}
const loader$4 = async ({
  request
}) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "all";
  return {
    status,
    emailConfig: getEmailProviderConfig(),
    logs: await listNotificationLogs({
      status,
      limit: 50
    })
  };
};
const action$2 = async ({
  request
}) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "send_test");
  if (intent === "send_test") {
    const to = String(formData.get("to") ?? "").trim();
    if (!to) {
      return {
        ok: false,
        error: "请输入测试收件邮箱"
      };
    }
    const result = await sendTestEmail(to);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error ?? "测试邮件发送失败"
      };
    }
    return {
      ok: true,
      message: `测试邮件已发送，messageId: ${result.messageId ?? "unknown"}`
    };
  }
  return {
    ok: false,
    error: "不支持的操作"
  };
};
const app_notifications = UNSAFE_withComponentProps(function NotificationsPage() {
  const {
    status,
    emailConfig,
    logs
  } = useLoaderData();
  const actionData = useActionData();
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "提醒中心",
    children: [/* @__PURE__ */ jsxs("s-section", {
      heading: "邮件通道配置",
      children: [(actionData == null ? void 0 : actionData.ok) && /* @__PURE__ */ jsx("s-banner", {
        tone: "success",
        heading: "发送成功",
        children: actionData.message
      }), (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("s-banner", {
        tone: "critical",
        heading: "发送失败",
        children: actionData.error
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["通道：", /* @__PURE__ */ jsx("s-badge", {
          tone: emailConfig.enabled ? "success" : "warning",
          children: emailConfig.provider
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["SMTP Host：", /* @__PURE__ */ jsx("s-text", {
          children: emailConfig.host
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["发信地址：", /* @__PURE__ */ jsx("s-text", {
          children: emailConfig.from || "未配置"
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["商家提醒邮箱：", /* @__PURE__ */ jsx("s-text", {
          children: emailConfig.merchantTo || "未配置"
        })]
      }), /* @__PURE__ */ jsx(Form, {
        method: "post",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "inline",
          gap: "base",
          "align-items": "end",
          children: [/* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "intent",
            value: "send_test"
          }), /* @__PURE__ */ jsx("s-text-field", {
            name: "to",
            label: "测试收件邮箱",
            value: ""
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: "发送测试邮件"
          })]
        })
      })]
    }), /* @__PURE__ */ jsxs("s-section", {
      heading: "发送日志",
      children: [/* @__PURE__ */ jsx(Form, {
        method: "get",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "inline",
          gap: "base",
          "align-items": "end",
          children: [/* @__PURE__ */ jsxs("s-select", {
            name: "status",
            label: "日志状态",
            value: status,
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "all",
              children: "全部"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "sent",
              children: "sent"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "failed",
              children: "failed"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "skipped",
              children: "skipped"
            })]
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "secondary",
            children: "筛选"
          })]
        })
      }), logs.length === 0 ? /* @__PURE__ */ jsx("s-paragraph", {
        children: "当前还没有提醒日志。"
      }) : /* @__PURE__ */ jsx("s-stack", {
        direction: "block",
        gap: "base",
        children: logs.map((log) => /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsxs("s-paragraph", {
            children: ["状态：", /* @__PURE__ */ jsx("s-badge", {
              tone: getStatusTone$1(log.status),
              children: log.status
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["分类：", /* @__PURE__ */ jsx("s-text", {
              children: log.category
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["收件人：", /* @__PURE__ */ jsx("s-text", {
              children: log.recipient
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["标题：", /* @__PURE__ */ jsx("s-text", {
              children: log.subject
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["时间：", /* @__PURE__ */ jsx("s-text", {
              children: formatDateTime$1(log.createdAt)
            })]
          }), log.error && /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["错误：", /* @__PURE__ */ jsx("s-text", {
              children: log.error
            })]
          })]
        }, log.id))
      })]
    })]
  });
});
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: app_notifications,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
function getSubscriptionRepairMode(plan, diagnostic) {
  if (!diagnostic) {
    return plan.sellingPlanId ? "none" : "bind";
  }
  const issueCodes = new Set(diagnostic.issues.map((issue) => issue.code));
  if (issueCodes.has("REMOTE_GROUP_MISSING")) {
    return "recreate_missing";
  }
  if (issueCodes.has("REMOTE_PLAN_MISMATCH") || issueCodes.has("REMOTE_PRODUCT_SCOPE_MISMATCH") || issueCodes.has("REMOTE_VARIANT_SCOPE_MISMATCH")) {
    return "rebind";
  }
  if (issueCodes.has("NOT_BOUND")) {
    return "bind";
  }
  return "none";
}
function getRepairableSubscriptionPlans(plans, diagnostics) {
  return plans.map((plan) => {
    const diagnostic = diagnostics.plans.find((item) => item.planId === plan.id);
    const mode = getSubscriptionRepairMode(plan, diagnostic);
    return {
      plan,
      diagnostic,
      mode
    };
  }).filter((item) => item.mode !== "none");
}
const SELLING_PLAN_GROUP_DIAGNOSTIC_QUERY = `#graphql
  query SubscriptionPlanGroupDiagnostic($id: ID!, $productId: ID!) {
    sellingPlanGroup(id: $id) {
      id
      appliesToProduct(productId: $productId)
      appliesToProductVariants(productId: $productId)
      sellingPlans(first: 20) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`;
const SELLING_PLAN_GROUP_VARIANT_QUERY = `#graphql
  query SubscriptionPlanGroupVariantDiagnostic($id: ID!, $productVariantId: ID!) {
    sellingPlanGroup(id: $id) {
      appliesToProductVariant(productVariantId: $productVariantId)
    }
  }
`;
function getStatusFromIssues$1(issues) {
  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }
  if (issues.length > 0) {
    return "warning";
  }
  return "healthy";
}
function buildSummary(plans) {
  const healthyPlans = plans.filter((plan) => plan.status === "healthy").length;
  const warningPlans = plans.filter((plan) => plan.status === "warning").length;
  const errorPlans = plans.filter((plan) => plan.status === "error").length;
  const issueCount = plans.reduce((count, plan) => count + plan.issues.length, 0);
  return {
    status: errorPlans > 0 ? "error" : warningPlans > 0 ? "warning" : "healthy",
    totalPlans: plans.length,
    healthyPlans,
    warningPlans,
    errorPlans,
    issueCount
  };
}
async function fetchSellingPlanGroupSnapshot(admin, productId, sellingPlanGroupId) {
  var _a2, _b, _c;
  const response = await admin.graphql(SELLING_PLAN_GROUP_DIAGNOSTIC_QUERY, {
    variables: {
      id: sellingPlanGroupId,
      productId
    }
  });
  const json = await response.json();
  const group = (_a2 = json.data) == null ? void 0 : _a2.sellingPlanGroup;
  if (!group) {
    return null;
  }
  return {
    id: group.id,
    appliesToProduct: group.appliesToProduct,
    appliesToProductVariants: group.appliesToProductVariants,
    sellingPlanIds: ((_c = (_b = group.sellingPlans) == null ? void 0 : _b.edges) == null ? void 0 : _c.map((edge) => {
      var _a3;
      return (_a3 = edge.node) == null ? void 0 : _a3.id;
    }).filter((id) => Boolean(id))) ?? []
  };
}
async function fetchVariantScopeMismatchIds(admin, sellingPlanGroupId, variantIds) {
  var _a2, _b;
  const mismatchIds = [];
  for (const variantId of variantIds) {
    const response = await admin.graphql(SELLING_PLAN_GROUP_VARIANT_QUERY, {
      variables: {
        id: sellingPlanGroupId,
        productVariantId: variantId
      }
    });
    const json = await response.json();
    if (!((_b = (_a2 = json.data) == null ? void 0 : _a2.sellingPlanGroup) == null ? void 0 : _b.appliesToProductVariant)) {
      mismatchIds.push(variantId);
    }
  }
  return mismatchIds;
}
async function buildPlanDiagnostic(admin, productId, plan) {
  const issues = [];
  if (!plan.sellingPlanGroupId || !plan.sellingPlanId) {
    issues.push({
      code: "NOT_BOUND",
      severity: "warning",
      message: "当前方案尚未绑定远端 Selling Plan Group 或 Selling Plan。",
      relatedVariantIds: []
    });
    return {
      planId: plan.id,
      planName: plan.name,
      status: getStatusFromIssues$1(issues),
      remoteSellingPlanGroupId: plan.sellingPlanGroupId,
      remoteSellingPlanIds: [],
      issues
    };
  }
  const snapshot = await fetchSellingPlanGroupSnapshot(
    admin,
    productId,
    plan.sellingPlanGroupId
  );
  if (!snapshot) {
    issues.push({
      code: "REMOTE_GROUP_MISSING",
      severity: "error",
      message: "当前方案引用的远端 Selling Plan Group 不存在或不可访问。",
      relatedVariantIds: []
    });
    return {
      planId: plan.id,
      planName: plan.name,
      status: getStatusFromIssues$1(issues),
      remoteSellingPlanGroupId: plan.sellingPlanGroupId,
      remoteSellingPlanIds: [],
      issues
    };
  }
  if (!snapshot.sellingPlanIds.includes(plan.sellingPlanId)) {
    issues.push({
      code: "REMOTE_PLAN_MISMATCH",
      severity: "error",
      message: "本地保存的 Selling Plan ID 与远端 Group 中的实际方案不一致。",
      relatedVariantIds: []
    });
  }
  if (!plan.variantIds || plan.variantIds.length === 0) {
    if (!snapshot.appliesToProduct) {
      issues.push({
        code: "REMOTE_PRODUCT_SCOPE_MISMATCH",
        severity: "warning",
        message: "当前方案应适用于整个商品，但远端 Group 没有直接绑定到该商品。",
        relatedVariantIds: []
      });
    }
  } else {
    const mismatchIds = await fetchVariantScopeMismatchIds(
      admin,
      plan.sellingPlanGroupId,
      plan.variantIds
    );
    if (mismatchIds.length > 0) {
      issues.push({
        code: "REMOTE_VARIANT_SCOPE_MISMATCH",
        severity: "error",
        message: "当前方案的部分适用变体没有正确绑定到远端 Selling Plan Group。",
        relatedVariantIds: mismatchIds
      });
    }
  }
  return {
    planId: plan.id,
    planName: plan.name,
    status: getStatusFromIssues$1(issues),
    remoteSellingPlanGroupId: snapshot.id,
    remoteSellingPlanIds: snapshot.sellingPlanIds,
    issues
  };
}
async function buildProductSubscriptionDiagnostics(admin, productId, offering, _variants) {
  const diagnostics = await Promise.all(
    offering.plans.map((plan) => buildPlanDiagnostic(admin, productId, plan))
  );
  return {
    summary: buildSummary(diagnostics),
    plans: diagnostics
  };
}
const METAFIELDS_SET_MUTATION = `#graphql
  mutation UpdateProductSubscriptionPlans($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;
const SELLING_PLAN_GROUP_CREATE_MUTATION = `#graphql
  mutation CreateSellingPlanGroup(
    $input: SellingPlanGroupInput!
    $resources: SellingPlanGroupResourceInput
  ) {
    sellingPlanGroupCreate(input: $input, resources: $resources) {
      sellingPlanGroup {
        id
        sellingPlans(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;
const SELLING_PLAN_GROUP_UPDATE_MUTATION = `#graphql
  mutation UpdateSellingPlanGroup($id: ID!, $input: SellingPlanGroupInput!) {
    sellingPlanGroupUpdate(id: $id, input: $input) {
      sellingPlanGroup {
        id
        sellingPlans(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;
const SELLING_PLAN_GROUP_DELETE_MUTATION = `#graphql
  mutation DeleteSellingPlanGroup($id: ID!) {
    sellingPlanGroupDelete(id: $id) {
      deletedSellingPlanGroupId
      userErrors {
        field
        message
      }
    }
  }
`;
function createPlanId() {
  return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function toSellingPlanInterval(interval) {
  if (interval === "day") return "DAY";
  if (interval === "week") return "WEEK";
  return "MONTH";
}
function buildMerchantCode(plan) {
  return plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || plan.id.toLowerCase();
}
function buildPricingPolicies(plan) {
  return typeof plan.discountPercentage === "number" ? [
    {
      fixed: {
        adjustmentType: "PERCENTAGE",
        adjustmentValue: {
          percentage: plan.discountPercentage
        }
      }
    }
  ] : [];
}
function buildSellingPlanPayload(plan, options) {
  const optionLabel = `${plan.intervalCount} ${plan.interval}`;
  const pricingPolicies = buildPricingPolicies(plan);
  return {
    ...(options == null ? void 0 : options.includeId) && plan.sellingPlanId ? { id: plan.sellingPlanId } : {},
    name: plan.name,
    options: [optionLabel],
    category: "SUBSCRIPTION",
    billingPolicy: {
      recurring: {
        interval: toSellingPlanInterval(plan.interval),
        intervalCount: plan.intervalCount
      }
    },
    deliveryPolicy: {
      recurring: {
        interval: toSellingPlanInterval(plan.interval),
        intervalCount: plan.intervalCount
      }
    },
    ...pricingPolicies.length > 0 ? { pricingPolicies } : {}
  };
}
function normalizeVariantIds(variantIds) {
  return [...variantIds ?? []].sort();
}
function hasSameVariantScope(left, right) {
  const normalizedLeft = normalizeVariantIds(left);
  const normalizedRight = normalizeVariantIds(right);
  return normalizedLeft.length === normalizedRight.length && normalizedLeft.every((variantId, index2) => variantId === normalizedRight[index2]);
}
function buildSellingPlanGroupCreateVariables(productId, plan) {
  return {
    input: {
      name: plan.name,
      merchantCode: buildMerchantCode(plan),
      options: [`${plan.intervalCount} ${plan.interval}`],
      sellingPlansToCreate: [buildSellingPlanPayload(plan)]
    },
    resources: plan.variantIds && plan.variantIds.length > 0 ? {
      productIds: [],
      productVariantIds: plan.variantIds
    } : {
      productIds: [productId],
      productVariantIds: []
    }
  };
}
function buildSellingPlanGroupUpdateVariables(plan) {
  if (!plan.sellingPlanGroupId || !plan.sellingPlanId) {
    throw new Error("缺少已绑定的 Selling Plan Group 或 Selling Plan ID");
  }
  return {
    id: plan.sellingPlanGroupId,
    input: {
      name: plan.name,
      merchantCode: buildMerchantCode(plan),
      options: [`${plan.intervalCount} ${plan.interval}`],
      sellingPlansToUpdate: [buildSellingPlanPayload(plan, { includeId: true })]
    }
  };
}
function parseVariantIds(value) {
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}
async function listProductSubscriptionPlans(admin, productId) {
  const product = await fetchShopifyProduct(admin, productId);
  if (!product) {
    return [];
  }
  return toSubscriptionOffering(product).plans;
}
async function updateProductSubscriptionPlans(admin, productId, plans) {
  var _a2, _b;
  const response = await admin.graphql(METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: [
        {
          ownerId: productId,
          namespace: "lens",
          key: "subscription_plans",
          type: "json",
          value: serializeSubscriptionPlans(plans)
        }
      ]
    }
  });
  const json = await response.json();
  const userErrors = ((_b = (_a2 = json.data) == null ? void 0 : _a2.metafieldsSet) == null ? void 0 : _b.userErrors) ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join("; "));
  }
}
async function createSellingPlanBinding(admin, productId, plan) {
  var _a2, _b, _c, _d, _e, _f, _g, _h;
  const variables = buildSellingPlanGroupCreateVariables(productId, plan);
  const response = await admin.graphql(SELLING_PLAN_GROUP_CREATE_MUTATION, {
    variables
  });
  const json = await response.json();
  const userErrors = ((_b = (_a2 = json.data) == null ? void 0 : _a2.sellingPlanGroupCreate) == null ? void 0 : _b.userErrors) ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join("; "));
  }
  const sellingPlanGroup = ((_d = (_c = json.data) == null ? void 0 : _c.sellingPlanGroupCreate) == null ? void 0 : _d.sellingPlanGroup) ?? null;
  const sellingPlanId = ((_h = (_g = (_f = (_e = sellingPlanGroup == null ? void 0 : sellingPlanGroup.sellingPlans) == null ? void 0 : _e.edges) == null ? void 0 : _f[0]) == null ? void 0 : _g.node) == null ? void 0 : _h.id) ?? void 0;
  if (!(sellingPlanGroup == null ? void 0 : sellingPlanGroup.id) || !sellingPlanId) {
    throw new Error("创建 Selling Plan 成功响应不完整");
  }
  return {
    ...plan,
    sellingPlanId,
    sellingPlanGroupId: sellingPlanGroup.id
  };
}
async function updateSellingPlanBinding(admin, plan) {
  var _a2, _b, _c, _d, _e, _f, _g, _h;
  const variables = buildSellingPlanGroupUpdateVariables(plan);
  const response = await admin.graphql(SELLING_PLAN_GROUP_UPDATE_MUTATION, {
    variables
  });
  const json = await response.json();
  const userErrors = ((_b = (_a2 = json.data) == null ? void 0 : _a2.sellingPlanGroupUpdate) == null ? void 0 : _b.userErrors) ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join("; "));
  }
  const sellingPlanGroup = ((_d = (_c = json.data) == null ? void 0 : _c.sellingPlanGroupUpdate) == null ? void 0 : _d.sellingPlanGroup) ?? null;
  const sellingPlanId = ((_h = (_g = (_f = (_e = sellingPlanGroup == null ? void 0 : sellingPlanGroup.sellingPlans) == null ? void 0 : _e.edges) == null ? void 0 : _f[0]) == null ? void 0 : _g.node) == null ? void 0 : _h.id) ?? plan.sellingPlanId;
  if (!(sellingPlanGroup == null ? void 0 : sellingPlanGroup.id) || !sellingPlanId) {
    throw new Error("更新 Selling Plan 成功响应不完整");
  }
  return {
    ...plan,
    sellingPlanId,
    sellingPlanGroupId: sellingPlanGroup.id
  };
}
async function deleteSellingPlanGroup(admin, sellingPlanGroupId) {
  var _a2, _b;
  const response = await admin.graphql(SELLING_PLAN_GROUP_DELETE_MUTATION, {
    variables: {
      id: sellingPlanGroupId
    }
  });
  const json = await response.json();
  const userErrors = ((_b = (_a2 = json.data) == null ? void 0 : _a2.sellingPlanGroupDelete) == null ? void 0 : _b.userErrors) ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join("; "));
  }
}
async function syncBoundSellingPlan(admin, productId, currentPlan, nextPlan) {
  if (!currentPlan.sellingPlanGroupId || !currentPlan.sellingPlanId) {
    return createSellingPlanBinding(admin, productId, {
      ...nextPlan,
      sellingPlanId: void 0,
      sellingPlanGroupId: void 0
    });
  }
  if (!hasSameVariantScope(currentPlan.variantIds, nextPlan.variantIds)) {
    await deleteSellingPlanGroup(admin, currentPlan.sellingPlanGroupId);
    return createSellingPlanBinding(admin, productId, {
      ...nextPlan,
      sellingPlanId: void 0,
      sellingPlanGroupId: void 0
    });
  }
  return updateSellingPlanBinding(admin, {
    ...nextPlan,
    sellingPlanId: currentPlan.sellingPlanId,
    sellingPlanGroupId: currentPlan.sellingPlanGroupId
  });
}
async function upsertProductSubscriptionPlan(admin, productId, input2) {
  const currentPlans = await listProductSubscriptionPlans(admin, productId);
  const nextId = input2.id || createPlanId();
  const currentPlan = currentPlans.find((plan) => plan.id === nextId);
  const draftPlan = {
    id: nextId,
    name: input2.name,
    interval: input2.interval,
    intervalCount: input2.intervalCount,
    discountPercentage: input2.discountPercentage,
    sellingPlanId: input2.sellingPlanId ?? (currentPlan == null ? void 0 : currentPlan.sellingPlanId),
    sellingPlanGroupId: input2.sellingPlanGroupId ?? (currentPlan == null ? void 0 : currentPlan.sellingPlanGroupId),
    variantIds: input2.variantIds
  };
  const nextPlan = (currentPlan == null ? void 0 : currentPlan.sellingPlanId) || (currentPlan == null ? void 0 : currentPlan.sellingPlanGroupId) ? await syncBoundSellingPlan(admin, productId, currentPlan, draftPlan) : draftPlan;
  const nextPlans = currentPlans.some((plan) => plan.id === nextId) ? currentPlans.map((plan) => plan.id === nextId ? nextPlan : plan) : [...currentPlans, nextPlan];
  await updateProductSubscriptionPlans(admin, productId, nextPlans);
}
async function deleteProductSubscriptionPlan(admin, productId, planId) {
  const currentPlans = await listProductSubscriptionPlans(admin, productId);
  const targetPlan = currentPlans.find((plan) => plan.id === planId);
  if (targetPlan == null ? void 0 : targetPlan.sellingPlanGroupId) {
    await deleteSellingPlanGroup(admin, targetPlan.sellingPlanGroupId);
  }
  const nextPlans = currentPlans.filter((plan) => plan.id !== planId);
  await updateProductSubscriptionPlans(admin, productId, nextPlans);
}
async function createAndBindSellingPlan(admin, productId, planId, options) {
  const currentPlans = await listProductSubscriptionPlans(admin, productId);
  const targetPlan = currentPlans.find((plan) => plan.id === planId);
  if (!targetPlan) {
    throw new Error("未找到待绑定的订阅方案");
  }
  if (targetPlan.sellingPlanGroupId && !(options == null ? void 0 : options.skipDelete) && ((options == null ? void 0 : options.force) || !targetPlan.sellingPlanId)) {
    await deleteSellingPlanGroup(admin, targetPlan.sellingPlanGroupId);
  }
  if (targetPlan.sellingPlanId && !(options == null ? void 0 : options.force) && !(options == null ? void 0 : options.skipDelete)) {
    return targetPlan;
  }
  const boundPlan = await createSellingPlanBinding(admin, productId, {
    ...targetPlan,
    sellingPlanId: void 0,
    sellingPlanGroupId: void 0
  });
  const nextPlans = currentPlans.map(
    (plan) => plan.id === planId ? boundPlan : plan
  );
  await updateProductSubscriptionPlans(admin, productId, nextPlans);
  return nextPlans.find((plan) => plan.id === planId);
}
function parseInterval(value) {
  const interval = String(value ?? "month");
  if (interval === "day" || interval === "week" || interval === "month") {
    return interval;
  }
  return "month";
}
function getVariantLabelMap(product) {
  return new Map((product == null ? void 0 : product.variants.nodes.map((variant) => [variant.id, variant.sku ?? variant.displayName])) ?? []);
}
const loader$3 = async ({
  request
}) => {
  var _a2;
  const {
    admin
  } = await authenticate.admin(request);
  const products = await fetchShopifyProducts(admin);
  const url = new URL(request.url);
  const selectedProductId = url.searchParams.get("productId") ?? ((_a2 = products[0]) == null ? void 0 : _a2.id) ?? "";
  const editPlanId = url.searchParams.get("editPlanId") ?? "";
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const subscriptionOffering = selectedProduct ? toSubscriptionOffering(selectedProduct) : {
    enabled: false,
    source: "none",
    plans: [],
    requiresSellingPlanIntegration: true
  };
  const selectedPlan = subscriptionOffering.plans.find((plan) => plan.id === editPlanId);
  const diagnostics = selectedProduct ? await buildProductSubscriptionDiagnostics(admin, selectedProduct.id, subscriptionOffering, selectedProduct.variants.nodes) : {
    summary: {
      status: "healthy",
      totalPlans: 0,
      healthyPlans: 0,
      warningPlans: 0,
      errorPlans: 0,
      issueCount: 0
    },
    plans: []
  };
  return {
    products,
    selectedProduct,
    selectedProductId,
    editPlanId,
    selectedPlan,
    subscriptionOffering,
    diagnostics,
    variantLabelMap: Object.fromEntries(getVariantLabelMap(selectedProduct))
  };
};
const action$1 = async ({
  request
}) => {
  const {
    admin
  } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "save");
  const productId = String(formData.get("productId") ?? "");
  if (!productId) {
    return {
      ok: false,
      error: "缺少 productId"
    };
  }
  if (intent === "delete") {
    const planId = String(formData.get("planId") ?? "");
    if (!planId) {
      return {
        ok: false,
        error: "缺少待删除的方案 ID"
      };
    }
    await deleteProductSubscriptionPlan(admin, productId, planId);
    return {
      ok: true
    };
  }
  if (intent === "bind") {
    const planId = String(formData.get("planId") ?? "");
    const repairMode = String(formData.get("repairMode") ?? "bind");
    if (!planId) {
      return {
        ok: false,
        error: "缺少待绑定的方案 ID"
      };
    }
    try {
      await createAndBindSellingPlan(admin, productId, planId, {
        force: repairMode === "rebind",
        skipDelete: repairMode === "recreate_missing"
      });
      return {
        ok: true,
        message: "已完成订阅方案修复与远端绑定同步"
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "创建 Selling Plan 失败"
      };
    }
  }
  if (intent === "repair_all") {
    const product = await fetchShopifyProduct(admin, productId);
    if (!product) {
      return {
        ok: false,
        error: "未找到当前商品，无法执行批量修复"
      };
    }
    const offering = toSubscriptionOffering(product);
    const diagnostics = await buildProductSubscriptionDiagnostics(admin, productId, offering, product.variants.nodes);
    const repairablePlans = getRepairableSubscriptionPlans(offering.plans, diagnostics);
    for (const item of repairablePlans) {
      await createAndBindSellingPlan(admin, productId, item.plan.id, {
        force: item.mode === "rebind",
        skipDelete: item.mode === "recreate_missing"
      });
    }
    return {
      ok: true,
      message: repairablePlans.length > 0 ? `已批量修复 ${repairablePlans.length} 个订阅方案` : "当前商品没有需要修复的订阅方案"
    };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return {
      ok: false,
      error: "请输入方案名称"
    };
  }
  await upsertProductSubscriptionPlan(admin, productId, {
    id: String(formData.get("planId") ?? "").trim() || void 0,
    name,
    interval: parseInterval(formData.get("interval")),
    intervalCount: Number(formData.get("intervalCount") ?? 1) || 1,
    discountPercentage: String(formData.get("discountPercentage") ?? "").trim() === "" ? void 0 : Number(formData.get("discountPercentage")),
    variantIds: parseVariantIds(formData.get("variantIds"))
  });
  return {
    ok: true,
    message: "订阅方案已保存，并已同步远端绑定状态。"
  };
};
const app_subscriptions = UNSAFE_withComponentProps(function SubscriptionsPage() {
  var _a2;
  const {
    products,
    selectedProduct,
    selectedProductId,
    selectedPlan,
    subscriptionOffering,
    diagnostics,
    variantLabelMap
  } = useLoaderData();
  const actionData = useActionData();
  if (!selectedProduct) {
    return /* @__PURE__ */ jsx("s-page", {
      heading: "订阅方案管理",
      children: /* @__PURE__ */ jsx("s-section", {
        heading: "未找到商品",
        children: /* @__PURE__ */ jsx("s-paragraph", {
          children: "当前店铺还没有可读取的商品，请先在 Shopify 后台创建商品。"
        })
      })
    });
  }
  const intervalCount = String((selectedPlan == null ? void 0 : selectedPlan.intervalCount) ?? 1);
  const discountPercentage = String((selectedPlan == null ? void 0 : selectedPlan.discountPercentage) ?? "");
  const variantIds = ((_a2 = selectedPlan == null ? void 0 : selectedPlan.variantIds) == null ? void 0 : _a2.join(", ")) ?? "";
  const repairablePlans = getRepairableSubscriptionPlans(subscriptionOffering.plans, diagnostics);
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "订阅方案管理",
    children: [/* @__PURE__ */ jsx("s-section", {
      heading: "商品选择",
      children: /* @__PURE__ */ jsx(Form, {
        method: "get",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "inline",
          gap: "base",
          "align-items": "end",
          children: [/* @__PURE__ */ jsx("s-select", {
            name: "productId",
            label: "当前商品",
            value: selectedProductId,
            children: products.map((product) => /* @__PURE__ */ jsx("s-option", {
              value: product.id,
              children: product.title
            }, product.id))
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: "切换商品"
          })]
        })
      })
    }), /* @__PURE__ */ jsxs("s-section", {
      heading: selectedPlan ? "编辑订阅方案" : "新增订阅方案",
      children: [(actionData == null ? void 0 : actionData.ok) && /* @__PURE__ */ jsx("s-banner", {
        tone: "success",
        heading: "保存成功",
        children: actionData.message ?? "当前商品的订阅方案已同步到 Shopify Product Metafield。"
      }), (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("s-banner", {
        tone: "critical",
        heading: "保存失败",
        children: actionData.error
      }), /* @__PURE__ */ jsx(Form, {
        method: "post",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "block",
          gap: "base",
          children: [/* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "intent",
            value: "save"
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "productId",
            value: selectedProductId
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "planId",
            value: (selectedPlan == null ? void 0 : selectedPlan.id) ?? ""
          }), /* @__PURE__ */ jsx("s-text-field", {
            name: "name",
            label: "方案名称",
            value: (selectedPlan == null ? void 0 : selectedPlan.name) ?? ""
          }), /* @__PURE__ */ jsxs("s-stack", {
            direction: "inline",
            gap: "base",
            children: [/* @__PURE__ */ jsxs("s-select", {
              name: "interval",
              label: "周期单位",
              value: (selectedPlan == null ? void 0 : selectedPlan.interval) ?? "month",
              children: [/* @__PURE__ */ jsx("s-option", {
                value: "day",
                children: "day"
              }), /* @__PURE__ */ jsx("s-option", {
                value: "week",
                children: "week"
              }), /* @__PURE__ */ jsx("s-option", {
                value: "month",
                children: "month"
              })]
            }), /* @__PURE__ */ jsx("s-number-field", {
              name: "intervalCount",
              label: "周期数",
              value: intervalCount
            })]
          }), /* @__PURE__ */ jsx("s-number-field", {
            name: "discountPercentage",
            label: "折扣百分比",
            value: discountPercentage
          }), /* @__PURE__ */ jsx("s-text-area", {
            name: "variantIds",
            label: "适用变体 ID 列表",
            value: variantIds
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: "请输入逗号分隔的 Shopify Variant ID。留空表示适用于当前商品所有变体。"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: "远端绑定 ID 由系统自动维护。若当前方案已绑定，保存时会自动同步 Shopify Selling Plan Group。"
          }), (selectedPlan == null ? void 0 : selectedPlan.sellingPlanId) && /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["当前 Selling Plan：", /* @__PURE__ */ jsx("s-text", {
              children: selectedPlan.sellingPlanId
            })]
          }), (selectedPlan == null ? void 0 : selectedPlan.sellingPlanGroupId) && /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["当前 Selling Plan Group：", /* @__PURE__ */ jsx("s-text", {
              children: selectedPlan.sellingPlanGroupId
            })]
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: selectedPlan ? "更新方案" : "新增方案"
          })]
        })
      }), selectedPlan && /* @__PURE__ */ jsxs(Form, {
        method: "get",
        children: [/* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "productId",
          value: selectedProductId
        }), /* @__PURE__ */ jsx("s-button", {
          type: "submit",
          variant: "secondary",
          children: "取消编辑"
        })]
      })]
    }), /* @__PURE__ */ jsxs("s-section", {
      heading: "当前商品方案",
      children: [/* @__PURE__ */ jsxs("s-paragraph", {
        children: ["同步诊断：", /* @__PURE__ */ jsx("s-badge", {
          tone: diagnostics.summary.status === "error" ? "critical" : diagnostics.summary.status === "warning" ? "warning" : "success",
          children: diagnostics.summary.status
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["方案数 ", diagnostics.summary.totalPlans, "，正常 ", diagnostics.summary.healthyPlans, "，警告", " ", diagnostics.summary.warningPlans, "，错误 ", diagnostics.summary.errorPlans, "，问题总数", " ", diagnostics.summary.issueCount]
      }), repairablePlans.length > 0 && /* @__PURE__ */ jsxs(Form, {
        method: "post",
        children: [/* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "intent",
          value: "repair_all"
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "productId",
          value: selectedProductId
        }), /* @__PURE__ */ jsx("s-button", {
          type: "submit",
          variant: "primary",
          children: "一键修复异常方案"
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["配置来源：", /* @__PURE__ */ jsx("s-badge", {
          tone: subscriptionOffering.source === "metafield" ? "success" : "info",
          children: subscriptionOffering.source
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["绑定状态：", /* @__PURE__ */ jsx("s-badge", {
          tone: subscriptionOffering.requiresSellingPlanIntegration ? "warning" : "success",
          children: subscriptionOffering.requiresSellingPlanIntegration ? "部分或全部方案未绑定" : "已绑定"
        })]
      }), subscriptionOffering.plans.length === 0 ? /* @__PURE__ */ jsx("s-paragraph", {
        children: "当前商品还没有订阅方案配置。"
      }) : /* @__PURE__ */ jsx("s-stack", {
        direction: "block",
        gap: "base",
        children: subscriptionOffering.plans.map((plan) => {
          const planDiagnostic = diagnostics.plans.find((item) => item.planId === plan.id);
          const repairMode = getSubscriptionRepairMode(plan, planDiagnostic);
          return /* @__PURE__ */ jsxs("s-box", {
            padding: "base",
            border: "base",
            "border-radius": "base",
            children: [/* @__PURE__ */ jsx("s-heading", {
              children: plan.name
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["诊断状态：", /* @__PURE__ */ jsx("s-badge", {
                tone: (planDiagnostic == null ? void 0 : planDiagnostic.status) === "error" ? "critical" : (planDiagnostic == null ? void 0 : planDiagnostic.status) === "warning" ? "warning" : "success",
                children: (planDiagnostic == null ? void 0 : planDiagnostic.status) ?? "healthy"
              })]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["周期：每 ", plan.intervalCount, " ", plan.interval]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["折扣：", typeof plan.discountPercentage === "number" ? `${plan.discountPercentage}%` : "未配置"]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["Selling Plan：", /* @__PURE__ */ jsx("s-text", {
                children: plan.sellingPlanId ?? "未绑定"
              })]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["Selling Plan Group：", /* @__PURE__ */ jsx("s-text", {
                children: plan.sellingPlanGroupId ?? "未绑定"
              })]
            }), !planDiagnostic || planDiagnostic.issues.length === 0 ? /* @__PURE__ */ jsx("s-paragraph", {
              children: "诊断结果：当前方案的本地配置与远端绑定状态一致。"
            }) : /* @__PURE__ */ jsx("s-stack", {
              direction: "block",
              gap: "base",
              children: planDiagnostic.issues.map((issue) => /* @__PURE__ */ jsxs("s-banner", {
                tone: issue.severity === "error" ? "critical" : "warning",
                heading: issue.code,
                children: [issue.message, issue.relatedVariantIds.length > 0 ? ` 受影响变体：${issue.relatedVariantIds.map((variantId) => variantLabelMap[variantId] ?? variantId).join(", ")}` : ""]
              }, `${plan.id}-${issue.code}`))
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["适用变体：", /* @__PURE__ */ jsx("s-text", {
                children: plan.variantIds && plan.variantIds.length > 0 ? plan.variantIds.map((variantId) => variantLabelMap[variantId] ?? variantId).join(", ") : "全部变体"
              })]
            }), /* @__PURE__ */ jsxs("s-stack", {
              direction: "inline",
              gap: "base",
              children: [/* @__PURE__ */ jsxs(Form, {
                method: "get",
                children: [/* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "productId",
                  value: selectedProductId
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "editPlanId",
                  value: plan.id
                }), /* @__PURE__ */ jsx("s-button", {
                  type: "submit",
                  variant: "secondary",
                  children: "编辑"
                })]
              }), /* @__PURE__ */ jsxs(Form, {
                method: "post",
                children: [/* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "intent",
                  value: "bind"
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "productId",
                  value: selectedProductId
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "planId",
                  value: plan.id
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "repairMode",
                  value: repairMode
                }), /* @__PURE__ */ jsx("s-button", {
                  type: "submit",
                  variant: "primary",
                  children: repairMode === "rebind" ? "重新绑定" : repairMode === "recreate_missing" ? "重建绑定" : "创建并绑定"
                })]
              }), /* @__PURE__ */ jsxs(Form, {
                method: "post",
                children: [/* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "intent",
                  value: "delete"
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "productId",
                  value: selectedProductId
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "planId",
                  value: plan.id
                }), /* @__PURE__ */ jsx("s-button", {
                  type: "submit",
                  variant: "secondary",
                  children: "删除"
                })]
              })]
            })]
          }, plan.id);
        })
      })]
    })]
  });
});
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: app_subscriptions,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const app_additional = UNSAFE_withComponentProps(function AdditionalPage() {
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Additional page",
    children: [/* @__PURE__ */ jsxs("s-section", {
      heading: "Multiple pages",
      children: [/* @__PURE__ */ jsxs("s-paragraph", {
        children: ["The app template comes with an additional page which demonstrates how to create multiple pages within app navigation using", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://shopify.dev/docs/apps/tools/app-bridge",
          target: "_blank",
          children: "App Bridge"
        }), "."]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["To create your own page and have it show up in the app navigation, add a page inside ", /* @__PURE__ */ jsx("code", {
          children: "app/routes"
        }), ", and a link to it in the", " ", /* @__PURE__ */ jsx("code", {
          children: "<ui-nav-menu>"
        }), " component found in", " ", /* @__PURE__ */ jsx("code", {
          children: "app/routes/app.jsx"
        }), "."]
      })]
    }), /* @__PURE__ */ jsx("s-section", {
      slot: "aside",
      heading: "Resources",
      children: /* @__PURE__ */ jsx("s-unordered-list", {
        children: /* @__PURE__ */ jsx("s-list-item", {
          children: /* @__PURE__ */ jsx("s-link", {
            href: "https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav",
            target: "_blank",
            children: "App nav best practices"
          })
        })
      })
    })]
  });
});
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_additional
}, Symbol.toStringTag, { value: "Module" }));
function getReferencedVariantIds(rules) {
  return rules.flatMap(
    (rule) => rule.actions.map((action2) => action2.variantId).filter((variantId) => Boolean(variantId))
  );
}
function getStatusFromIssues(issues) {
  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }
  if (issues.length > 0) {
    return "warning";
  }
  return "healthy";
}
function buildProductHealthReport(input2) {
  const issues = [];
  const { configuration, context, rules } = input2;
  if (configuration && !configuration.prescriptionTypeConfigured) {
    issues.push({
      code: "MISSING_PRESCRIPTION_TYPE_METAFIELD",
      severity: "warning",
      message: "当前商品缺少处方类型 Metafield，系统已回退为标签推断或默认值",
      relatedRuleIds: [],
      relatedVariantIds: []
    });
  }
  if (configuration && !configuration.lensOptionsConfigured) {
    issues.push({
      code: "MISSING_LENS_OPTIONS_METAFIELD",
      severity: "warning",
      message: "当前商品缺少镜片选项 Metafield，系统已回退为默认镜片配置",
      relatedRuleIds: [],
      relatedVariantIds: []
    });
  }
  if (configuration && !configuration.subscriptionPlansConfigured) {
    issues.push({
      code: "MISSING_SUBSCRIPTION_PLANS_METAFIELD",
      severity: "warning",
      message: "当前商品缺少订阅方案 Metafield，前台不会展示周期购买方案",
      relatedRuleIds: [],
      relatedVariantIds: []
    });
  }
  if ((configuration == null ? void 0 : configuration.subscriptionPlansConfigured) && configuration.subscriptionPlansRequiresSellingPlanIntegration) {
    issues.push({
      code: "SUBSCRIPTION_PLAN_NOT_BOUND",
      severity: "warning",
      message: "当前商品存在订阅方案配置，但部分方案尚未绑定正式 Selling Plan",
      relatedRuleIds: [],
      relatedVariantIds: []
    });
  }
  if (rules.length === 0) {
    issues.push({
      code: "MISSING_RULES",
      severity: "error",
      message: "当前商品未配置任何镜片规则",
      relatedRuleIds: [],
      relatedVariantIds: []
    });
  }
  const referencedVariantIds = getReferencedVariantIds(rules);
  const missingVariantIds = referencedVariantIds.filter(
    (variantId) => !context.variants.some((variant) => variant.id === variantId)
  );
  const deletedVariantIds = referencedVariantIds.filter(
    (variantId) => context.variants.some(
      (variant) => variant.id === variantId && variant.isDeleted
    )
  );
  if (missingVariantIds.length > 0) {
    issues.push({
      code: "MISSING_VARIANT",
      severity: "error",
      message: "存在规则引用了未同步到本地上下文的 Shopify 变体",
      relatedRuleIds: rules.filter(
        (rule) => rule.actions.some(
          (action2) => action2.variantId !== void 0 && missingVariantIds.includes(action2.variantId)
        )
      ).map((rule) => rule.id),
      relatedVariantIds: missingVariantIds
    });
  }
  if (deletedVariantIds.length > 0) {
    issues.push({
      code: "DELETED_VARIANT_REFERENCED",
      severity: "error",
      message: "存在规则引用了已删除的 Shopify 变体",
      relatedRuleIds: rules.filter(
        (rule) => rule.actions.some(
          (action2) => action2.variantId !== void 0 && deletedVariantIds.includes(action2.variantId)
        )
      ).map((rule) => rule.id),
      relatedVariantIds: deletedVariantIds
    });
  }
  const priorities = /* @__PURE__ */ new Map();
  for (const rule of rules) {
    const group = priorities.get(rule.priority) ?? [];
    group.push(rule.id);
    priorities.set(rule.priority, group);
  }
  for (const [priority, ruleIds] of priorities) {
    if (ruleIds.length > 1) {
      issues.push({
        code: "RULE_PRIORITY_CONFLICT",
        severity: "warning",
        message: `存在多个规则使用相同优先级 ${priority}`,
        relatedRuleIds: ruleIds,
        relatedVariantIds: []
      });
    }
  }
  const diagnostic = buildLensVisibilityDiagnostic(context, rules);
  if (rules.length > 0 && diagnostic.visibleLensOptionIds.length === 0) {
    issues.push({
      code: "NO_VISIBLE_LENS",
      severity: "warning",
      message: "当前商品在给定条件下没有可展示的镜片选项",
      relatedRuleIds: rules.map((rule) => rule.id),
      relatedVariantIds: []
    });
  }
  return {
    productId: context.productId,
    status: getStatusFromIssues(issues),
    issues
  };
}
const seedProductContexts = [
  {
    productId: "product-1",
    productType: "glasses",
    tags: ["frame", "acetate"],
    prescriptionType: "non_prescription",
    variants: [
      {
        id: "variant-1",
        sku: "SKU-1",
        isDeleted: false,
        inventoryAvailable: true
      },
      {
        id: "variant-2",
        sku: "SKU-2",
        isDeleted: true,
        inventoryAvailable: false
      }
    ]
  }
];
const seedRules = [
  {
    productId: "product-1",
    rule: {
      id: "rule-show-non-prescription",
      name: "无度数显示基础镜片",
      priority: 100,
      enabled: true,
      conditions: [
        {
          field: "prescriptionType",
          operator: "eq",
          value: "non_prescription"
        }
      ],
      actions: [
        {
          type: "show",
          lensOptionId: "lens-basic",
          variantId: "variant-1",
          message: "当前处方支持基础镜片"
        }
      ]
    }
  },
  {
    productId: "product-1",
    rule: {
      id: "rule-hide-other-prescription",
      name: "非无度数隐藏基础镜片",
      priority: 90,
      enabled: true,
      conditions: [
        {
          field: "prescriptionType",
          operator: "neq",
          value: "non_prescription"
        }
      ],
      actions: [
        {
          type: "hide",
          lensOptionId: "lens-basic",
          message: "该镜片仅支持无度数"
        }
      ]
    }
  }
];
const seedLensOptions = /* @__PURE__ */ new Map([
  [
    "product-1",
    [
      {
        id: "lens-basic",
        name: "基础镜片",
        basePrice: 0
      },
      {
        id: "lens-pro",
        name: "高级镜片",
        basePrice: 80
      }
    ]
  ]
]);
const defaultLensOptions = [
  {
    id: "lens-basic",
    name: "基础镜片",
    basePrice: 0
  },
  {
    id: "lens-pro",
    name: "高级镜片",
    basePrice: 80
  }
];
class InMemoryLensRepository {
  constructor(productContexts = seedProductContexts, storedRules = seedRules) {
    __publicField(this, "productContexts", /* @__PURE__ */ new Map());
    __publicField(this, "rules", /* @__PURE__ */ new Map());
    __publicField(this, "lensOptions", /* @__PURE__ */ new Map());
    for (const context of productContexts) {
      this.productContexts.set(context.productId, structuredClone(context));
    }
    for (const item of storedRules) {
      const currentRules = this.rules.get(item.productId) ?? [];
      currentRules.push(structuredClone(item.rule));
      this.rules.set(item.productId, currentRules);
    }
    for (const [productId, lensOptions] of seedLensOptions.entries()) {
      this.lensOptions.set(productId, structuredClone(lensOptions));
    }
  }
  listRules(productId) {
    if (productId) {
      return (this.rules.get(productId) ?? []).map((rule) => ({
        productId,
        rule: structuredClone(rule)
      }));
    }
    return [...this.rules.entries()].flatMap(
      ([currentProductId, rules]) => rules.map((rule) => ({
        productId: currentProductId,
        rule: structuredClone(rule)
      }))
    );
  }
  getProductContext(productId) {
    const context = this.productContexts.get(productId);
    return context ? structuredClone(context) : void 0;
  }
  getLensOptions(productId) {
    return structuredClone(this.lensOptions.get(productId) ?? defaultLensOptions);
  }
  saveRule(productId, rule) {
    const currentRules = this.rules.get(productId) ?? [];
    const existingIndex = currentRules.findIndex(
      (currentRule) => currentRule.id === rule.id
    );
    if (existingIndex >= 0) {
      currentRules[existingIndex] = structuredClone(rule);
    } else {
      currentRules.push(structuredClone(rule));
    }
    this.rules.set(productId, currentRules);
    return structuredClone(rule);
  }
}
new InMemoryLensRepository();
async function getLensDashboardDataWithOptions(context, lensOptions, configuration) {
  await ensureDefaultLensRules(context.productId);
  const rules = await listLensRulesByProduct(context.productId);
  return {
    context,
    rules,
    lensOptions: buildProductLensOptions(context, rules, lensOptions),
    diagnostic: buildLensVisibilityDiagnostic(context, rules),
    health: buildProductHealthReport({
      context,
      rules,
      configuration
    }),
    configuration
  };
}
const loader$2 = async ({
  request
}) => {
  var _a2;
  const {
    admin
  } = await authenticate.admin(request);
  const products = await fetchShopifyProducts(admin);
  const url = new URL(request.url);
  const selectedProductId = url.searchParams.get("productId") ?? ((_a2 = products[0]) == null ? void 0 : _a2.id);
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const dashboard = selectedProduct ? await getLensDashboardDataWithOptions(toProductContext(selectedProduct), toLensOptions(selectedProduct), getProductConfiguration(selectedProduct)) : void 0;
  return {
    dashboard,
    products: products.map(toProductSummary),
    selectedProductId,
    subscriptionOffering: selectedProduct ? toSubscriptionOffering(selectedProduct) : void 0
  };
};
const app__index = UNSAFE_withComponentProps(function Index() {
  const {
    dashboard,
    products,
    selectedProductId,
    subscriptionOffering
  } = useLoaderData();
  if (!dashboard) {
    return /* @__PURE__ */ jsx("s-page", {
      heading: "镜片规则仪表盘",
      children: /* @__PURE__ */ jsx("s-section", {
        heading: "未找到商品",
        children: /* @__PURE__ */ jsx("s-paragraph", {
          children: "当前店铺还没有可读取的商品，请先在 Shopify 后台创建商品。"
        })
      })
    });
  }
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "镜片规则仪表盘",
    children: [/* @__PURE__ */ jsx("s-section", {
      heading: "商品选择",
      children: /* @__PURE__ */ jsx(Form, {
        method: "get",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "inline",
          gap: "base",
          "align-items": "end",
          children: [/* @__PURE__ */ jsx("s-select", {
            name: "productId",
            label: "当前商品",
            value: selectedProductId ?? "",
            children: products.map((product) => /* @__PURE__ */ jsx("s-option", {
              value: product.id,
              children: product.title
            }, product.id))
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: "切换商品"
          })]
        })
      })
    }), /* @__PURE__ */ jsxs("s-section", {
      heading: "当前商品",
      children: [/* @__PURE__ */ jsxs("s-paragraph", {
        children: ["商品 ID：", /* @__PURE__ */ jsx("s-text", {
          type: "strong",
          children: dashboard.context.productId
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["商品类型：", /* @__PURE__ */ jsx("s-text", {
          children: dashboard.context.productType ?? "未设置"
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["当前处方类型：", /* @__PURE__ */ jsx("s-badge", {
          tone: "success",
          children: dashboard.context.prescriptionType
        })]
      })]
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "配置来源",
      children: /* @__PURE__ */ jsxs("s-stack", {
        direction: "block",
        gap: "base",
        children: [/* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "处方类型 Metafield"
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["配置状态：", /* @__PURE__ */ jsx("s-badge", {
              tone: dashboard.configuration.prescriptionTypeConfigured ? "success" : "warning",
              children: dashboard.configuration.prescriptionTypeConfigured ? "已配置" : "缺失，已回退"
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["原始值：", /* @__PURE__ */ jsx("s-text", {
              children: dashboard.configuration.prescriptionTypeRaw ?? "未配置"
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["当前解析结果：", /* @__PURE__ */ jsx("s-text", {
              type: "strong",
              children: dashboard.context.prescriptionType
            })]
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "镜片选项 Metafield"
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["配置状态：", /* @__PURE__ */ jsx("s-badge", {
              tone: dashboard.configuration.lensOptionsConfigured ? "success" : "warning",
              children: dashboard.configuration.lensOptionsConfigured ? "已配置" : "缺失，已回退默认镜片"
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["原始值：", /* @__PURE__ */ jsx("s-text", {
              children: dashboard.configuration.lensOptionsRaw ?? "未配置"
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["解析后镜片数：", /* @__PURE__ */ jsx("s-text", {
              type: "strong",
              children: dashboard.lensOptions.availableLensOptions.length + dashboard.lensOptions.disabledLensOptions.length + dashboard.lensOptions.hiddenLensOptions.length
            })]
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "订阅方案 Metafield"
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["配置状态：", /* @__PURE__ */ jsx("s-badge", {
              tone: dashboard.configuration.subscriptionPlansConfigured ? "success" : "warning",
              children: dashboard.configuration.subscriptionPlansConfigured ? "已配置" : "缺失，前台不会展示周期购买"
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["原始值：", /* @__PURE__ */ jsx("s-text", {
              children: dashboard.configuration.subscriptionPlansRaw ?? "未配置"
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["解析后方案数：", /* @__PURE__ */ jsx("s-text", {
              type: "strong",
              children: (subscriptionOffering == null ? void 0 : subscriptionOffering.plans.length) ?? 0
            })]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["Selling Plan 绑定状态：", /* @__PURE__ */ jsx("s-badge", {
              tone: subscriptionOffering && !subscriptionOffering.requiresSellingPlanIntegration ? "success" : "warning",
              children: subscriptionOffering && !subscriptionOffering.requiresSellingPlanIntegration ? "已绑定" : "部分或全部未绑定"
            })]
          })]
        })]
      })
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "镜片展示结果",
      children: /* @__PURE__ */ jsxs("s-stack", {
        direction: "block",
        gap: "base",
        children: [dashboard.lensOptions.availableLensOptions.map((option) => /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: option.name
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: "状态：可见"
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["价格：", option.basePrice]
          })]
        }, option.id)), dashboard.lensOptions.disabledLensOptions.map((option) => /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: option.name
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: "状态：禁用"
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["价格：", option.basePrice]
          })]
        }, option.id)), dashboard.lensOptions.hiddenLensOptions.map((option) => /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: option.name
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: "状态：隐藏"
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["价格：", option.basePrice]
          })]
        }, option.id))]
      })
    }), /* @__PURE__ */ jsxs("s-section", {
      heading: "健康检查",
      children: [/* @__PURE__ */ jsxs("s-paragraph", {
        children: ["健康状态：", /* @__PURE__ */ jsx("s-badge", {
          children: dashboard.health.status
        })]
      }), dashboard.health.issues.length === 0 ? /* @__PURE__ */ jsx("s-paragraph", {
        children: "当前商品未发现健康问题。"
      }) : /* @__PURE__ */ jsx("s-unordered-list", {
        children: dashboard.health.issues.map((issue) => /* @__PURE__ */ jsxs("s-list-item", {
          children: [/* @__PURE__ */ jsx("s-text", {
            type: "strong",
            children: issue.code
          }), "：", issue.message]
        }, `${issue.code}-${issue.message}`))
      })]
    })]
  });
});
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app__index,
  headers,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
function formatDateTime(value) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}
function formatParameterValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}
function getStatusTone(status) {
  if (status === "cart_add_failed") {
    return "critical";
  }
  if (status === "checkout_started") {
    return "success";
  }
  return "info";
}
function getStatusLabel(status) {
  if (status === "cart_add_failed") {
    return "加入购物车失败";
  }
  if (status === "checkout_started") {
    return "已跳转结账";
  }
  return "已加入购物车";
}
function getPurchaseModeLabel(mode) {
  return mode === "subscription" ? "订阅购买" : "一次性购买";
}
const loader$1 = async ({
  request
}) => {
  const {
    admin
  } = await authenticate.admin(request);
  const products = await fetchShopifyProducts(admin);
  const url = new URL(request.url);
  const selectedProductId = url.searchParams.get("productId") ?? "all";
  const purchaseMode = url.searchParams.get("purchaseMode") ?? "all";
  const status = url.searchParams.get("status") ?? "all";
  const records = await listPurchaseRecords({
    shopifyProductId: selectedProductId === "all" ? void 0 : selectedProductId,
    purchaseMode,
    status
  });
  return {
    products,
    selectedProductId,
    purchaseMode,
    status,
    records,
    summary: summarizePurchaseRecords(records)
  };
};
const app_orders = UNSAFE_withComponentProps(function OrdersPage() {
  const {
    products,
    selectedProductId,
    purchaseMode,
    status,
    records,
    summary
  } = useLoaderData();
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "下单记录",
    children: [/* @__PURE__ */ jsx("s-section", {
      heading: "筛选条件",
      children: /* @__PURE__ */ jsx(Form, {
        method: "get",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "inline",
          gap: "base",
          "align-items": "end",
          children: [/* @__PURE__ */ jsxs("s-select", {
            name: "productId",
            label: "商品",
            value: selectedProductId,
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "all",
              children: "全部商品"
            }), products.map((product) => /* @__PURE__ */ jsx("s-option", {
              value: product.id,
              children: product.title
            }, product.id))]
          }), /* @__PURE__ */ jsxs("s-select", {
            name: "purchaseMode",
            label: "购买方式",
            value: purchaseMode,
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "all",
              children: "全部方式"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "one_time",
              children: "一次性购买"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "subscription",
              children: "订阅购买"
            })]
          }), /* @__PURE__ */ jsxs("s-select", {
            name: "status",
            label: "状态",
            value: status,
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "all",
              children: "全部状态"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "cart_added",
              children: "已加入购物车"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "checkout_started",
              children: "已跳转结账"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "cart_add_failed",
              children: "加入购物车失败"
            })]
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "primary",
            children: "应用筛选"
          })]
        })
      })
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "统计概览",
      children: /* @__PURE__ */ jsxs("s-stack", {
        direction: "inline",
        gap: "base",
        children: [/* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "总记录"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.total
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "一次性购买"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.oneTimeCount
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "订阅购买"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.subscriptionCount
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "加购成功"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.cartAddedCount
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "已跳转结账"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.checkoutStartedCount
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "失败"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: summary.failedCount
          })]
        })]
      })
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "最近记录",
      children: records.length === 0 ? /* @__PURE__ */ jsx("s-paragraph", {
        children: "当前还没有记录。消费者通过主题插件加入购物车或结账后会出现在这里。"
      }) : /* @__PURE__ */ jsx("s-stack", {
        direction: "block",
        gap: "base",
        children: records.map((record) => /* @__PURE__ */ jsx("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: /* @__PURE__ */ jsxs("s-stack", {
            direction: "block",
            gap: "base",
            children: [/* @__PURE__ */ jsx("s-heading", {
              children: record.productTitle ?? record.shopifyProductId
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["状态：", /* @__PURE__ */ jsx("s-badge", {
                tone: getStatusTone(record.status),
                children: getStatusLabel(record.status)
              })]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["购买方式：", /* @__PURE__ */ jsx("s-badge", {
                tone: record.purchaseMode === "subscription" ? "warning" : "info",
                children: getPurchaseModeLabel(record.purchaseMode)
              })]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["时间：", /* @__PURE__ */ jsx("s-text", {
                children: formatDateTime(record.createdAt)
              })]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["变体：", /* @__PURE__ */ jsx("s-text", {
                children: record.variantTitle ?? record.shopifyVariantId
              })]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["参数模板：", /* @__PURE__ */ jsx("s-text", {
                children: record.parameterTemplateName ?? "未记录"
              })]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["参数签名：", /* @__PURE__ */ jsx("s-text", {
                children: record.signature ?? "未记录"
              })]
            }), typeof record.priceAdjustment === "number" && /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["价格附加：", /* @__PURE__ */ jsx("s-text", {
                children: record.priceAdjustment
              })]
            }), record.subscriptionPlanName && /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["订阅方案：", /* @__PURE__ */ jsx("s-text", {
                children: record.subscriptionPlanName
              })]
            }), record.sellingPlanId && /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["Selling Plan：", /* @__PURE__ */ jsx("s-text", {
                children: record.sellingPlanId
              })]
            }), record.notes && /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["备注：", /* @__PURE__ */ jsx("s-text", {
                children: record.notes
              })]
            }), /* @__PURE__ */ jsxs("s-box", {
              padding: "base",
              background: "subdued",
              "border-radius": "base",
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: "参数快照"
              }), /* @__PURE__ */ jsx("s-unordered-list", {
                children: Object.entries(record.parameterValues).map(([key, value]) => /* @__PURE__ */ jsxs("s-list-item", {
                  children: [key, ": ", formatParameterValue(value)]
                }, `${record.id}-${key}`))
              })]
            })]
          })
        }, record.id))
      })
    })]
  });
});
const route19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_orders,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
function parsePreviewPrescriptionType(value) {
  if (value === "non_prescription" || value === "single_vision" || value === "progressive" || value === "reading") {
    return value;
  }
  return "original";
}
function buildPreviewContext(context, previewPrescriptionType) {
  if (previewPrescriptionType === "original") {
    return context;
  }
  return {
    ...context,
    prescriptionType: previewPrescriptionType
  };
}
const loader = async ({
  request
}) => {
  var _a2;
  const {
    admin
  } = await authenticate.admin(request);
  const products = await fetchShopifyProducts(admin);
  const url = new URL(request.url);
  const selectedProductId = url.searchParams.get("productId") ?? ((_a2 = products[0]) == null ? void 0 : _a2.id) ?? "";
  const editRuleId = url.searchParams.get("editRuleId") ?? "";
  const previewVariantId = url.searchParams.get("previewVariantId") ?? "";
  const previewPrescriptionType = parsePreviewPrescriptionType(url.searchParams.get("previewPrescriptionType"));
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const rawLensOptions = selectedProduct ? toLensOptions(selectedProduct) : [];
  const productContext = selectedProduct ? {
    ...buildPreviewContext(toProductContext(selectedProduct), previewPrescriptionType),
    selectedVariantId: previewVariantId || void 0
  } : void 0;
  const dashboard = selectedProduct ? await getLensDashboardDataWithOptions(productContext, rawLensOptions, getProductConfiguration(selectedProduct)) : void 0;
  const rules = (dashboard == null ? void 0 : dashboard.rules) ?? [];
  const selectedRule = rules.find((rule) => rule.id === editRuleId);
  return {
    dashboard,
    rules,
    products: products.map(toProductSummary),
    lensOptions: rawLensOptions,
    selectedProductId,
    selectedRule,
    previewVariantId,
    previewPrescriptionType
  };
};
const action = async ({
  request
}) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "create");
  const productId = String(formData.get("productId") ?? "").trim();
  const ruleId = String(formData.get("ruleId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const priority = Number(formData.get("priority") ?? "0");
  const prescriptionType = String(formData.get("prescriptionType") ?? "non_prescription");
  const actionType = String(formData.get("actionType") ?? "show");
  const lensOptionId = String(formData.get("lensOptionId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const variantId = String(formData.get("variantId") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "true") === "true";
  if (intent === "delete" && ruleId) {
    await deleteLensRule(ruleId);
    return {
      ok: true
    };
  }
  if (intent === "toggle" && ruleId) {
    const enabled2 = String(formData.get("enabled") ?? "false") === "true";
    await setLensRuleEnabled(ruleId, enabled2);
    return {
      ok: true
    };
  }
  if (!productId || !name || !lensOptionId || Number.isNaN(priority)) {
    return {
      ok: false,
      error: "请填写完整的商品、规则名称、优先级和目标镜片。"
    };
  }
  if (intent === "update" && ruleId) {
    await updateLensRule({
      id: ruleId,
      name,
      priority,
      enabled,
      prescriptionType,
      actionType,
      lensOptionId,
      message: message || void 0,
      variantId: variantId || void 0
    });
  } else {
    await createLensRule({
      productId,
      name,
      priority,
      enabled,
      prescriptionType,
      actionType,
      lensOptionId,
      message: message || void 0,
      variantId: variantId || void 0
    });
  }
  return {
    ok: true
  };
};
const app_rules = UNSAFE_withComponentProps(function RulesPage() {
  var _a2;
  const {
    dashboard,
    rules,
    products,
    lensOptions,
    selectedProductId,
    selectedRule,
    previewVariantId,
    previewPrescriptionType
  } = useLoaderData();
  const actionData = useActionData();
  const selectedCondition = selectedRule == null ? void 0 : selectedRule.conditions[0];
  const selectedAction = selectedRule == null ? void 0 : selectedRule.actions[0];
  const traceMap = new Map((dashboard == null ? void 0 : dashboard.diagnostic.traces.map((trace) => [trace.ruleId, trace])) ?? []);
  const formIntent = selectedRule ? "update" : "create";
  const submitLabel = selectedRule ? "更新规则" : "保存规则";
  const sectionHeading = selectedRule ? "编辑规则" : "新增规则";
  const initialLensOptionId = (selectedAction == null ? void 0 : selectedAction.lensOptionId) ?? ((_a2 = lensOptions[0]) == null ? void 0 : _a2.id) ?? "";
  const initialVariantId = (selectedAction == null ? void 0 : selectedAction.variantId) ?? "";
  const initialMessage = (selectedAction == null ? void 0 : selectedAction.message) ?? "";
  const initialPrescriptionType = (selectedCondition == null ? void 0 : selectedCondition.field) === "prescriptionType" ? selectedCondition.value : "non_prescription";
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "规则配置",
    children: [/* @__PURE__ */ jsxs("s-section", {
      heading: sectionHeading,
      children: [(actionData == null ? void 0 : actionData.ok) && /* @__PURE__ */ jsx("s-banner", {
        tone: "success",
        heading: "保存成功",
        children: selectedRule ? "规则已更新到 Prisma 数据库。" : "规则已写入 Prisma 数据库。"
      }), (actionData == null ? void 0 : actionData.ok) === false && actionData.error && /* @__PURE__ */ jsx("s-banner", {
        tone: "critical",
        heading: "保存失败",
        children: actionData.error
      }), /* @__PURE__ */ jsx(Form, {
        method: "post",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "block",
          gap: "base",
          children: [/* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "intent",
            value: formIntent
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "productId",
            value: selectedProductId
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "ruleId",
            value: (selectedRule == null ? void 0 : selectedRule.id) ?? ""
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "enabled",
            value: (selectedRule == null ? void 0 : selectedRule.enabled) === false ? "false" : "true"
          }), /* @__PURE__ */ jsx("s-select", {
            name: "selectedProductPreview",
            label: "当前商品",
            value: selectedProductId,
            disabled: true,
            children: products.map((product) => /* @__PURE__ */ jsx("s-option", {
              value: product.id,
              children: product.title
            }, product.id))
          }), /* @__PURE__ */ jsx("s-text-field", {
            name: "name",
            label: "规则名称",
            value: (selectedRule == null ? void 0 : selectedRule.name) ?? ""
          }), /* @__PURE__ */ jsx("s-number-field", {
            name: "priority",
            label: "优先级",
            value: String((selectedRule == null ? void 0 : selectedRule.priority) ?? 100)
          }), /* @__PURE__ */ jsxs("s-select", {
            name: "prescriptionType",
            label: "处方类型",
            value: initialPrescriptionType,
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "non_prescription",
              children: "non_prescription"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "single_vision",
              children: "single_vision"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "progressive",
              children: "progressive"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "reading",
              children: "reading"
            })]
          }), /* @__PURE__ */ jsxs("s-select", {
            name: "actionType",
            label: "动作类型",
            value: (selectedAction == null ? void 0 : selectedAction.type) ?? "show",
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "show",
              children: "show"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "hide",
              children: "hide"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "disable",
              children: "disable"
            })]
          }), /* @__PURE__ */ jsx("s-select", {
            name: "lensOptionId",
            label: "目标镜片",
            value: initialLensOptionId,
            children: lensOptions.map((option) => /* @__PURE__ */ jsx("s-option", {
              value: option.id,
              children: option.name
            }, option.id))
          }), /* @__PURE__ */ jsx("s-text-field", {
            name: "variantId",
            label: "绑定变体 ID",
            value: initialVariantId
          }), /* @__PURE__ */ jsx("s-text-area", {
            name: "message",
            label: "提示文案",
            value: initialMessage
          }), /* @__PURE__ */ jsx("s-stack", {
            direction: "inline",
            gap: "base",
            children: /* @__PURE__ */ jsx("s-button", {
              type: "submit",
              variant: "primary",
              children: submitLabel
            })
          })]
        })
      }, (selectedRule == null ? void 0 : selectedRule.id) ?? `create-${selectedProductId}`), selectedRule && /* @__PURE__ */ jsxs(Form, {
        method: "get",
        children: [/* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "productId",
          value: selectedProductId
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "previewPrescriptionType",
          value: previewPrescriptionType
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "previewVariantId",
          value: previewVariantId
        }), /* @__PURE__ */ jsx("s-button", {
          type: "submit",
          variant: "secondary",
          children: "取消编辑"
        })]
      })]
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "切换商品",
      children: /* @__PURE__ */ jsx(Form, {
        method: "get",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "inline",
          gap: "base",
          "align-items": "end",
          children: [/* @__PURE__ */ jsx("s-select", {
            name: "productId",
            label: "商品",
            value: selectedProductId,
            children: products.map((product) => /* @__PURE__ */ jsx("s-option", {
              value: product.id,
              children: product.title
            }, product.id))
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "previewPrescriptionType",
            value: previewPrescriptionType
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "previewVariantId",
            value: previewVariantId
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "secondary",
            children: "切换"
          })]
        })
      })
    }), /* @__PURE__ */ jsxs("s-section", {
      heading: "模拟预览",
      children: [/* @__PURE__ */ jsx(Form, {
        method: "get",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "inline",
          gap: "base",
          "align-items": "end",
          children: [/* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "productId",
            value: selectedProductId
          }), selectedRule && /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "editRuleId",
            value: selectedRule.id
          }), /* @__PURE__ */ jsxs("s-select", {
            name: "previewVariantId",
            label: "模拟变体",
            value: previewVariantId,
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "",
              children: "不指定变体"
            }), dashboard == null ? void 0 : dashboard.context.variants.map((variant) => /* @__PURE__ */ jsx("s-option", {
              value: variant.id,
              children: variant.sku
            }, variant.id))]
          }), /* @__PURE__ */ jsxs("s-select", {
            name: "previewPrescriptionType",
            label: "模拟处方类型",
            value: previewPrescriptionType,
            children: [/* @__PURE__ */ jsx("s-option", {
              value: "original",
              children: "使用商品当前解析值"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "non_prescription",
              children: "non_prescription"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "single_vision",
              children: "single_vision"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "progressive",
              children: "progressive"
            }), /* @__PURE__ */ jsx("s-option", {
              value: "reading",
              children: "reading"
            })]
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            variant: "secondary",
            children: "应用预览"
          })]
        })
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["当前预览处方类型：", /* @__PURE__ */ jsx("s-badge", {
          tone: previewPrescriptionType === "original" ? "info" : "success",
          children: previewPrescriptionType === "original" ? "商品原始解析值" : previewPrescriptionType
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["当前预览变体：", /* @__PURE__ */ jsx("s-badge", {
          tone: previewVariantId ? "success" : "info",
          children: previewVariantId || "未指定"
        })]
      })]
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "当前商品规则",
      children: /* @__PURE__ */ jsx("s-stack", {
        direction: "block",
        gap: "base",
        children: rules.map((rule) => {
          var _a3, _b, _c, _d;
          return /* @__PURE__ */ jsxs("s-box", {
            padding: "base",
            border: "base",
            "border-radius": "base",
            children: [traceMap.get(rule.id) && /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["命中状态：", /* @__PURE__ */ jsx("s-badge", {
                tone: ((_a3 = traceMap.get(rule.id)) == null ? void 0 : _a3.matched) ? "success" : "warning",
                children: ((_b = traceMap.get(rule.id)) == null ? void 0 : _b.matched) ? "matched" : "not_matched"
              })]
            }), /* @__PURE__ */ jsx("s-heading", {
              children: rule.name
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["优先级：", rule.priority]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["状态：", rule.enabled ? "启用" : "停用"]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["条件数：", rule.conditions.length]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["动作数：", rule.actions.length]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["目标镜片：", ((_c = rule.actions[0]) == null ? void 0 : _c.lensOptionId) ?? "未设置"]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["Trace 原因：", ((_d = traceMap.get(rule.id)) == null ? void 0 : _d.reason) ?? "未参与计算"]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["条件：", rule.conditions.map((condition) => `${condition.field} ${condition.operator} ${condition.value}`).join(" / ")]
            }), /* @__PURE__ */ jsxs("s-paragraph", {
              children: ["动作：", rule.actions.map((action2) => `${action2.type} ${action2.lensOptionId}${action2.variantId ? ` @ ${action2.variantId}` : ""}`).join(" / ")]
            }), /* @__PURE__ */ jsxs("s-stack", {
              direction: "inline",
              gap: "base",
              children: [/* @__PURE__ */ jsxs(Form, {
                method: "get",
                children: [/* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "productId",
                  value: selectedProductId
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "previewPrescriptionType",
                  value: previewPrescriptionType
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "previewVariantId",
                  value: previewVariantId
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "editRuleId",
                  value: rule.id
                }), /* @__PURE__ */ jsx("s-button", {
                  type: "submit",
                  variant: "secondary",
                  children: "编辑"
                })]
              }), /* @__PURE__ */ jsxs(Form, {
                method: "post",
                children: [/* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "intent",
                  value: "toggle"
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "ruleId",
                  value: rule.id
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "enabled",
                  value: rule.enabled ? "false" : "true"
                }), /* @__PURE__ */ jsx("s-button", {
                  type: "submit",
                  variant: "secondary",
                  children: rule.enabled ? "停用" : "启用"
                })]
              }), /* @__PURE__ */ jsxs(Form, {
                method: "post",
                children: [/* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "intent",
                  value: "delete"
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "ruleId",
                  value: rule.id
                }), /* @__PURE__ */ jsx("s-button", {
                  type: "submit",
                  tone: "critical",
                  variant: "secondary",
                  children: "删除"
                })]
              })]
            })]
          }, rule.id);
        })
      })
    }), dashboard && /* @__PURE__ */ jsx("s-section", {
      heading: "规则命中预览",
      children: /* @__PURE__ */ jsxs("s-stack", {
        direction: "block",
        gap: "base",
        children: [/* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "当前上下文"
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["处方类型：", dashboard.context.prescriptionType ?? "未设置"]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["商品类型：", dashboard.context.productType ?? "未设置"]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["选中变体：", dashboard.context.selectedVariantId ?? "未指定"]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["变体数量：", dashboard.context.variants.length]
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "镜片结果"
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["可见：", dashboard.lensOptions.availableLensOptions.length]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["禁用：", dashboard.lensOptions.disabledLensOptions.length]
          }), /* @__PURE__ */ jsxs("s-paragraph", {
            children: ["隐藏：", dashboard.lensOptions.hiddenLensOptions.length]
          }), /* @__PURE__ */ jsxs("s-unordered-list", {
            children: [dashboard.lensOptions.availableLensOptions.map((option) => /* @__PURE__ */ jsxs("s-list-item", {
              children: [option.name, " / visible"]
            }, `available-${option.id}`)), dashboard.lensOptions.disabledLensOptions.map((option) => /* @__PURE__ */ jsxs("s-list-item", {
              children: [option.name, " / disabled"]
            }, `disabled-${option.id}`)), dashboard.lensOptions.hiddenLensOptions.map((option) => /* @__PURE__ */ jsxs("s-list-item", {
              children: [option.name, " / hidden"]
            }, `hidden-${option.id}`))]
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "命中摘要"
          }), dashboard.diagnostic.summaryMessages.length === 0 ? /* @__PURE__ */ jsx("s-paragraph", {
            children: "当前没有额外提示文案。"
          }) : /* @__PURE__ */ jsx("s-unordered-list", {
            children: dashboard.diagnostic.summaryMessages.map((message) => /* @__PURE__ */ jsx("s-list-item", {
              children: message
            }, message))
          })]
        }), /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          border: "base",
          "border-radius": "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "规则 Trace"
          }), /* @__PURE__ */ jsx("s-unordered-list", {
            children: dashboard.diagnostic.traces.map((trace) => /* @__PURE__ */ jsxs("s-list-item", {
              children: [trace.ruleId, " / ", trace.matched ? "matched" : "not_matched", " /", " ", trace.reason]
            }, trace.ruleId))
          })]
        })]
      })
    })]
  });
});
const route20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: app_rules,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-CMLplmA0.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/root-DYp8BrV8.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/proxy.prescription-recommendations": { "id": "routes/proxy.prescription-recommendations", "parentId": "root", "path": "proxy/prescription-recommendations", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/proxy.prescription-recommendations-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.app.scopes_update": { "id": "routes/webhooks.app.scopes_update", "parentId": "root", "path": "webhooks/app/scopes_update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.scopes_update-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.app.uninstalled": { "id": "routes/webhooks.app.uninstalled", "parentId": "root", "path": "webhooks/app/uninstalled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.uninstalled-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/proxy.purchase-records": { "id": "routes/proxy.purchase-records", "parentId": "root", "path": "proxy/purchase-records", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/proxy.purchase-records-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/proxy.product-match": { "id": "routes/proxy.product-match", "parentId": "root", "path": "proxy/product-match", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/proxy.product-match-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/proxy.lens-options": { "id": "routes/proxy.lens-options", "parentId": "root", "path": "proxy/lens-options", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/proxy.lens-options-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/route-BjG60V0P.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js", "/assets/AppProxyProvider-BKaM_T9R.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/route-uz9FvcZc.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": ["/assets/route-Xpdx9QZl.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/app-bcPdq2Nx.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js", "/assets/AppProxyProvider-BKaM_T9R.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.subscription-contracts": { "id": "routes/app.subscription-contracts", "parentId": "routes/app", "path": "subscription-contracts", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.subscription-contracts-KFWNqMjj.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.parameter-templates": { "id": "routes/app.parameter-templates", "parentId": "routes/app", "path": "parameter-templates", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.parameter-templates-DE0gkPpO.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.product-configs": { "id": "routes/app.product-configs", "parentId": "routes/app", "path": "product-configs", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.product-configs-CMwKSH9Y.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.recommendations": { "id": "routes/app.recommendations", "parentId": "routes/app", "path": "recommendations", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.recommendations-aQlRGt0y.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.notifications": { "id": "routes/app.notifications", "parentId": "routes/app", "path": "notifications", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.notifications-T0a2gFyV.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.subscriptions": { "id": "routes/app.subscriptions", "parentId": "routes/app", "path": "subscriptions", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.subscriptions-BmiQMYjj.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.additional": { "id": "routes/app.additional", "parentId": "routes/app", "path": "additional", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.additional-C6Y3mPoD.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app._index-DJAE1JrB.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.orders": { "id": "routes/app.orders", "parentId": "routes/app", "path": "orders", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.orders-CRd9urU0.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.rules": { "id": "routes/app.rules", "parentId": "routes/app", "path": "rules", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.rules-Dc8IkGJC.js", "imports": ["/assets/chunk-EVOBXE3Y-DOhgBjg1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-f2265759.js", "version": "f2265759", "sri": void 0 };
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "unstable_passThroughRequests": false, "unstable_subResourceIntegrity": false, "unstable_trailingSlashAwareDataRequests": false, "unstable_previewServerPrerendering": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/proxy.prescription-recommendations": {
    id: "routes/proxy.prescription-recommendations",
    parentId: "root",
    path: "proxy/prescription-recommendations",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/webhooks.app.scopes_update": {
    id: "routes/webhooks.app.scopes_update",
    parentId: "root",
    path: "webhooks/app/scopes_update",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/webhooks.app.uninstalled": {
    id: "routes/webhooks.app.uninstalled",
    parentId: "root",
    path: "webhooks/app/uninstalled",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/proxy.purchase-records": {
    id: "routes/proxy.purchase-records",
    parentId: "root",
    path: "proxy/purchase-records",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/proxy.product-match": {
    id: "routes/proxy.product-match",
    parentId: "root",
    path: "proxy/product-match",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/proxy.lens-options": {
    id: "routes/proxy.lens-options",
    parentId: "root",
    path: "proxy/lens-options",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route8
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/app.subscription-contracts": {
    id: "routes/app.subscription-contracts",
    parentId: "routes/app",
    path: "subscription-contracts",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app.parameter-templates": {
    id: "routes/app.parameter-templates",
    parentId: "routes/app",
    path: "parameter-templates",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/app.product-configs": {
    id: "routes/app.product-configs",
    parentId: "routes/app",
    path: "product-configs",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/app.recommendations": {
    id: "routes/app.recommendations",
    parentId: "routes/app",
    path: "recommendations",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/app.notifications": {
    id: "routes/app.notifications",
    parentId: "routes/app",
    path: "notifications",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/app.subscriptions": {
    id: "routes/app.subscriptions",
    parentId: "routes/app",
    path: "subscriptions",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/app.additional": {
    id: "routes/app.additional",
    parentId: "routes/app",
    path: "additional",
    index: void 0,
    caseSensitive: void 0,
    module: route17
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route18
  },
  "routes/app.orders": {
    id: "routes/app.orders",
    parentId: "routes/app",
    path: "orders",
    index: void 0,
    caseSensitive: void 0,
    module: route19
  },
  "routes/app.rules": {
    id: "routes/app.rules",
    parentId: "routes/app",
    path: "rules",
    index: void 0,
    caseSensitive: void 0,
    module: route20
  }
};
const allowedActionOrigins = false;
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
