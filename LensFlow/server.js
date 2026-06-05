import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3001);
const NODE_ENV = process.env.NODE_ENV || "development";
const STORE_FILE = process.env.LENSFLOW_STORE_FILE || path.join(__dirname, "data", "store.json");
const UPLOADS_DIR = process.env.LENSFLOW_UPLOAD_DIR || path.join(__dirname, "uploads");
const ADMIN_DIST_DIR = path.join(__dirname, "admin-ui", "dist");

const SAMPLE_PRODUCTS = [
  {
    id: "gid://shopify/Product/1001",
    title: "Avery Classic Frame",
    handle: "avery-classic-frame",
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80",
    productType: "Frames",
    vendor: "LensFlow",
    status: "active",
    tags: ["prescription-ready", "classic"],
    tracksInventory: true,
    variants: [
      {
        id: "gid://shopify/ProductVariant/2001",
        title: "Black / Medium",
        price: 129,
        compareAtPrice: 149,
        sku: "LF-AVERY-BLK-M",
        inventoryQuantity: 12,
        inventoryPolicy: "deny",
        availableForSale: true,
        inventoryAvailable: true,
      },
      {
        id: "gid://shopify/ProductVariant/2002",
        title: "Tortoise / Medium",
        price: 129,
        compareAtPrice: 0,
        sku: "LF-AVERY-TOR-M",
        inventoryQuantity: 4,
        inventoryPolicy: "deny",
        availableForSale: true,
        inventoryAvailable: true,
      },
    ],
  },
  {
    id: "gid://shopify/Product/1002",
    title: "Milo Air Frame",
    handle: "milo-air-frame",
    image: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=900&q=80",
    productType: "Frames",
    vendor: "LensFlow",
    status: "active",
    tags: ["lightweight", "prescription-ready"],
    tracksInventory: true,
    variants: [
      {
        id: "gid://shopify/ProductVariant/2003",
        title: "Gunmetal / Large",
        price: 149,
        compareAtPrice: 0,
        sku: "LF-MILO-GUN-L",
        inventoryQuantity: 7,
        inventoryPolicy: "deny",
        availableForSale: true,
        inventoryAvailable: true,
      },
    ],
  },
  {
    id: "gid://shopify/Product/1101",
    title: "Essential Clear Lens",
    handle: "essential-clear-lens",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
    productType: "Lens",
    vendor: "LensFlow",
    status: "active",
    tags: ["single_vision", "reading", "budget"],
    tracksInventory: true,
    variants: [
      {
        id: "gid://shopify/ProductVariant/2101",
        title: "Standard",
        price: 39,
        compareAtPrice: 0,
        sku: "LF-LENS-CLR-STD",
        inventoryQuantity: 50,
        inventoryPolicy: "deny",
        availableForSale: true,
        inventoryAvailable: true,
      },
    ],
  },
  {
    id: "gid://shopify/Product/1102",
    title: "Blue Light Plus Lens",
    handle: "blue-light-plus-lens",
    image: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=80",
    productType: "Lens",
    vendor: "LensFlow",
    status: "active",
    tags: ["single_vision", "reading", "blue_light"],
    tracksInventory: true,
    variants: [
      {
        id: "gid://shopify/ProductVariant/2102",
        title: "Standard",
        price: 69,
        compareAtPrice: 0,
        sku: "LF-LENS-BLUE-STD",
        inventoryQuantity: 18,
        inventoryPolicy: "deny",
        availableForSale: true,
        inventoryAvailable: true,
      },
    ],
  },
  {
    id: "gid://shopify/Product/1103",
    title: "Progressive Ultra Lens",
    handle: "progressive-ultra-lens",
    image: "https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=900&q=80",
    productType: "Lens",
    vendor: "LensFlow",
    status: "active",
    tags: ["progressive", "premium"],
    tracksInventory: true,
    variants: [
      {
        id: "gid://shopify/ProductVariant/2103",
        title: "Premium",
        price: 129,
        compareAtPrice: 149,
        sku: "LF-LENS-PROG-PRM",
        inventoryQuantity: 9,
        inventoryPolicy: "deny",
        availableForSale: true,
        inventoryAvailable: true,
      },
    ],
  },
  {
    id: "gid://shopify/Product/1104",
    title: "Reader Ease Lens",
    handle: "reader-ease-lens",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
    productType: "Lens",
    vendor: "LensFlow",
    status: "active",
    tags: ["reading", "comfort"],
    tracksInventory: true,
    variants: [
      {
        id: "gid://shopify/ProductVariant/2104",
        title: "Comfort",
        price: 49,
        compareAtPrice: 0,
        sku: "LF-LENS-READ-COM",
        inventoryQuantity: 21,
        inventoryPolicy: "deny",
        availableForSale: true,
        inventoryAvailable: true,
      },
    ],
  },
];

function ensureRuntimeDirs() {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultNode(type, ref) {
  const content = { title: type.replaceAll("_", " "), subtitle: "", description: "" };
  const base = { type, ref, content, translations: {} };
  switch (type) {
    case "prescription_type":
      return {
        ...base,
        content: { ...content, title: "Choose Prescription Type" },
        options: [
          { type: "non_prescription", key: "non_prescription", name: "Non-Prescription", description: "No vision correction needed", imageUrl: "", price: 0, leadsTo: "lens", lensGroupIds: ["lens-basic", "lens-blue"], enabled: true, sortOrder: 0 },
          { type: "single_vision", key: "single_vision", name: "Single Vision", description: "Correct nearsightedness, farsightedness, or astigmatism", imageUrl: "", price: 0, leadsTo: "", lensGroupIds: ["lens-basic", "lens-blue"], enabled: true, sortOrder: 1 },
          { type: "reading", key: "reading", name: "Reading", description: "Comfortable close-up vision", imageUrl: "", price: 0, leadsTo: "", lensGroupIds: ["lens-basic", "lens-read"], enabled: true, sortOrder: 2 },
          { type: "progressive", key: "progressive", name: "Progressive", description: "Seamless near and far vision", imageUrl: "", price: 0, leadsTo: "", lensGroupIds: ["lens-progressive"], enabled: true, sortOrder: 3 },
        ],
        config: { showImages: true, showPrices: true },
      };
    case "submit_method":
      return {
        ...base,
        content: { ...content, title: "How to Provide Prescription" },
        options: [
          { id: "manual", type: "manual", name: "Enter Manually", description: "Type your prescription details", leadsTo: "", enabled: true },
          { id: "upload", type: "upload", name: "Upload Prescription", description: "Upload a JPG, PNG, or PDF", leadsTo: "", enabled: true },
          { id: "later", type: "later", name: "Send Later", description: "We will contact you later", leadsTo: "", enabled: true },
        ],
        config: { allowManual: true, allowUpload: true, allowLater: true },
      };
    case "single_vision_form":
    case "progressive_form":
      return {
        ...base,
        config: {
          sph: { field: "sph", label: "SPH", min: -20, max: 20, step: 0.25, required: true },
          cyl: { field: "cyl", label: "CYL", min: -6, max: 6, step: 0.25, required: false },
          axis: { field: "axis", label: "Axis", min: 0, max: 180, step: 1, required: false },
          add: { field: "add", label: "ADD", min: 0, max: 4, step: 0.25, required: type === "progressive_form" },
          pd: { field: "pd", label: "PD", min: 45, max: 85, step: 0.5, required: true },
          showPrism: false,
          showOcHt: false,
        },
      };
    case "reading_form":
      return { ...base, config: { maxMagnification: 4, step: 0.25 } };
    case "upload_step":
      return { ...base, config: { allowPdSelector: true, acceptTypes: ["image/*", "application/pdf"] } };
    case "lens_step":
      return {
        ...base,
        content: { ...content, title: "Choose Your Lens" },
        pages: [
          {
            id: "page_lenses",
            name: "Recommended Lenses",
            type: "standard",
            showImages: true,
            showPrices: true,
            allowLogicJumps: false,
            layout: "card",
            options: [
              {
                id: "lopt_basic",
                lensOptionId: "lens-basic",
                enabled: true,
                title: "Essential Clear Lens",
                description: "Everyday clear lens with lightweight comfort.",
                badge: { text: "Popular", style: "info" },
                leadsTo: "review",
                displayCondition: [],
                productId: "gid://shopify/Product/1101",
                productTitle: "Essential Clear Lens",
                productImage: SAMPLE_PRODUCTS.find((product) => product.id === "gid://shopify/Product/1101")?.image || "",
                productTags: ["single_vision", "reading", "budget"],
                productType: "Lens",
                vendor: "LensFlow",
                variantId: "gid://shopify/ProductVariant/2101",
                variantTitle: "Standard",
                variantPrice: 39,
                variantCompareAtPrice: 0,
                variantSku: "LF-LENS-CLR-STD",
              },
              {
                id: "lopt_blue",
                lensOptionId: "lens-blue",
                enabled: true,
                title: "Blue Light Plus Lens",
                description: "Blue-light filtering for screen-heavy days.",
                badge: { text: "Upgrade", style: "warning" },
                leadsTo: "review",
                displayCondition: [],
                productId: "gid://shopify/Product/1102",
                productTitle: "Blue Light Plus Lens",
                productImage: SAMPLE_PRODUCTS.find((product) => product.id === "gid://shopify/Product/1102")?.image || "",
                productTags: ["single_vision", "reading", "blue_light"],
                productType: "Lens",
                vendor: "LensFlow",
                variantId: "gid://shopify/ProductVariant/2102",
                variantTitle: "Standard",
                variantPrice: 69,
                variantCompareAtPrice: 0,
                variantSku: "LF-LENS-BLUE-STD",
              },
              {
                id: "lopt_read",
                lensOptionId: "lens-read",
                enabled: true,
                title: "Reader Ease Lens",
                description: "A relaxed reading lens tuned for close-up work.",
                badge: { text: "Reading", style: "success" },
                leadsTo: "review",
                displayCondition: [{ field: "prescriptionType", operator: "eq", value: "reading" }],
                productId: "gid://shopify/Product/1104",
                productTitle: "Reader Ease Lens",
                productImage: SAMPLE_PRODUCTS.find((product) => product.id === "gid://shopify/Product/1104")?.image || "",
                productTags: ["reading", "comfort"],
                productType: "Lens",
                vendor: "LensFlow",
                variantId: "gid://shopify/ProductVariant/2104",
                variantTitle: "Comfort",
                variantPrice: 49,
                variantCompareAtPrice: 0,
                variantSku: "LF-LENS-READ-COM",
              },
              {
                id: "lopt_progressive",
                lensOptionId: "lens-progressive",
                enabled: true,
                title: "Progressive Ultra Lens",
                description: "Premium progressive lens for all-day wear.",
                badge: { text: "Premium", style: "danger" },
                leadsTo: "review",
                displayCondition: [{ field: "prescriptionType", operator: "eq", value: "progressive" }],
                productId: "gid://shopify/Product/1103",
                productTitle: "Progressive Ultra Lens",
                productImage: SAMPLE_PRODUCTS.find((product) => product.id === "gid://shopify/Product/1103")?.image || "",
                productTags: ["progressive", "premium"],
                productType: "Lens",
                vendor: "LensFlow",
                variantId: "gid://shopify/ProductVariant/2103",
                variantTitle: "Premium",
                variantPrice: 129,
                variantCompareAtPrice: 149,
                variantSku: "LF-LENS-PROG-PRM",
              },
            ],
          },
        ],
      };
    case "review_order":
      return {
        ...base,
        content: { ...content, title: "Review Your Order" },
        config: { showFrameInfo: true, showLensInfo: true, showPrescriptionInfo: true, showAddToCart: true },
      };
    default:
      return base;
  }
}

function buildDefaultFlow(type, overrides = {}) {
  const settings = {
    flowKey: overrides.flowKey || `flow_${Math.random().toString(36).slice(2, 10)}`,
    name: overrides.name || (type === "lens_first" ? "Lens First Flow" : "Prescription First Flow"),
    templateType: "default",
    layoutMode: "modal",
    buttonMode: "append",
    buttonText: "Select Lenses",
    displayMode: "always",
    hideOutOfStockLenses: false,
    addToCartBehavior: "redirect_cart",
    saveCustomerPrescription: true,
    combineFrameAndLens: false,
    useBundleProduct: false,
    showOrderNotes: true,
    animationType: "none",
  };

  if (type === "lens_first") {
    return {
      description: "Customer chooses a lens before entering prescription details.",
      icon: "glasses",
      settings,
      nodes: [
        defaultNode("lens_step", "lens"),
        defaultNode("prescription_type", "rx_type"),
        defaultNode("submit_method", "submit_method"),
        defaultNode("upload_step", "upload"),
        defaultNode("single_vision_form", "form_sv"),
        defaultNode("reading_form", "form_reading"),
        defaultNode("progressive_form", "form_progressive"),
        defaultNode("review_order", "review"),
      ],
      jumpRules: [
        {
          fromNodeRef: "rx_type",
          toNodeRef: "review",
          condition: { field: "prescriptionType", operator: "eq", value: "non_prescription" },
        },
      ],
    };
  }

  return {
    description: "Customer enters prescription details before selecting a lens.",
    icon: "clipboard",
    settings,
    nodes: [
      defaultNode("prescription_type", "rx_type"),
      defaultNode("submit_method", "submit_method"),
      defaultNode("upload_step", "upload"),
      defaultNode("single_vision_form", "form_sv"),
      defaultNode("reading_form", "form_reading"),
      defaultNode("progressive_form", "form_progressive"),
      defaultNode("lens_step", "lens"),
      defaultNode("review_order", "review"),
    ],
    jumpRules: [
      {
        fromNodeRef: "rx_type",
        toNodeRef: "lens",
        condition: { field: "prescriptionType", operator: "eq", value: "non_prescription" },
      },
    ],
  };
}

function createInitialStore() {
  const flowAId = randomUUID();
  const flowBId = randomUUID();
  const createdAt = new Date().toISOString();
  return {
    version: 1,
    flows: [
      {
        id: flowAId,
        shopId: "dev",
        name: "Prescription First Demo",
        type: "prescription_first",
        status: "published",
        productIds: ["gid://shopify/Product/1001"],
        config: buildDefaultFlow("prescription_first", { flowKey: "flow_rx_first_demo", name: "Prescription First Demo" }),
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: flowBId,
        shopId: "dev",
        name: "Lens First Demo",
        type: "lens_first",
        status: "draft",
        productIds: ["gid://shopify/Product/1002"],
        config: buildDefaultFlow("lens_first", { flowKey: "flow_lens_first_demo", name: "Lens First Demo" }),
        createdAt,
        updatedAt: createdAt,
      },
    ],
    rules: [],
    prescriptions: [],
    bundles: [],
  };
}

function loadStore() {
  ensureRuntimeDirs();
  if (!fs.existsSync(STORE_FILE)) {
    const initial = createInitialStore();
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    return {
      version: parsed.version || 1,
      flows: Array.isArray(parsed.flows) ? parsed.flows : [],
      rules: Array.isArray(parsed.rules) ? parsed.rules : [],
      prescriptions: Array.isArray(parsed.prescriptions) ? parsed.prescriptions : [],
      bundles: Array.isArray(parsed.bundles) ? parsed.bundles : [],
    };
  } catch {
    const initial = createInitialStore();
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function saveStore(store) {
  ensureRuntimeDirs();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

function respondSuccess(res, body, extra = {}) {
  res.json({ status: "success", body, ...extra });
}

function respondError(res, statusCode, message, extra = {}) {
  res.status(statusCode).json({ status: "error", message, ...extra });
}

function normalizeFlow(flow) {
  const config = flow?.config && typeof flow.config === "object" ? flow.config : buildDefaultFlow(flow?.type || "prescription_first");
  const settings = { ...(config.settings || {}) };
  if (!settings.flowKey) {
    settings.flowKey = `flow_${String(flow?.id || randomUUID()).replaceAll("-", "").slice(0, 10)}`;
  }
  const normalized = {
    ...flow,
    status: flow?.status || "draft",
    type: flow?.type || "prescription_first",
    productIds: Array.isArray(flow?.productIds) ? flow.productIds : [],
    config: { ...config, settings },
  };
  return deepClone(normalized);
}

function normalizeRule(rule) {
  return {
    id: rule?.id || randomUUID(),
    name: rule?.name || "Untitled Rule",
    priority: Number.isFinite(Number(rule?.priority)) ? Number(rule.priority) : 50,
    enabled: rule?.enabled !== false,
    conditions: Array.isArray(rule?.conditions) ? rule.conditions : [],
    actions: Array.isArray(rule?.actions) ? rule.actions : [],
    createdAt: rule?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildProductIndex() {
  return new Map(SAMPLE_PRODUCTS.map((product) => [product.id, deepClone(product)]));
}

const PRODUCT_INDEX = buildProductIndex();

function getProductById(productId) {
  return PRODUCT_INDEX.get(productId) || null;
}

function getVariant(productId, variantId) {
  const product = getProductById(productId);
  if (!product) return null;
  return product.variants.find((variant) => variant.id === variantId) || null;
}

function listProducts(query) {
  let results = SAMPLE_PRODUCTS.map((product) => deepClone(product));
  const q = String(query.q || "").trim().toLowerCase();
  if (q) {
    results = results.filter((product) => {
      const haystack = [
        product.title,
        product.vendor,
        product.productType,
        ...(product.tags || []),
        ...product.variants.map((variant) => variant.title),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }

  if (query.product_type) {
    results = results.filter((product) => product.productType === query.product_type);
  }
  if (query.vendor) {
    results = results.filter((product) => product.vendor === query.vendor);
  }
  if (query.status) {
    results = results.filter((product) => product.status === query.status);
  }

  const first = Math.max(1, Number(query.first || 20));
  const offset = Math.max(0, Number(query.after || 0));
  const page = results.slice(offset, offset + first);
  return {
    body: page,
    pageInfo: {
      hasNextPage: offset + first < results.length,
      endCursor: offset + first < results.length ? String(offset + first) : null,
    },
  };
}

function coerceArrayConditions(input) {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
}

function evalCondition(ctx, condition) {
  if (!condition) return true;
  if (Array.isArray(condition)) {
    return condition.every((item) => evalCondition(ctx, item));
  }
  const actual = ctx?.[condition.field];
  const expected = condition.value;
  switch (condition.operator) {
    case "eq":
      return String(actual ?? "") === String(expected ?? "");
    case "neq":
      return String(actual ?? "") !== String(expected ?? "");
    case "contains":
      if (Array.isArray(actual)) {
        return actual.map(String).includes(String(expected));
      }
      return String(actual ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
    case "gt":
      return Number(actual) > Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    default:
      return true;
  }
}

function findPublishedFlowsForProduct(store, productId) {
  return store.flows
    .map(normalizeFlow)
    .filter((flow) => flow.status === "published" && flow.productIds.includes(productId));
}

function flattenLensOptions(flow) {
  const nodes = flow?.config?.nodes || [];
  const lensNodes = nodes.filter((node) => node.type === "lens_step");
  const items = [];
  lensNodes.forEach((node) => {
    (node.pages || []).forEach((page) => {
      (page.options || []).forEach((option) => {
        items.push({ nodeRef: node.ref, pageId: page.id, pageName: page.name, option });
      });
    });
  });
  return items;
}

function activeLensGroupIds(flow, prescriptionType) {
  const node = (flow?.config?.nodes || []).find((item) => item.type === "prescription_type");
  const match = (node?.options || []).find((item) => (item.type || item.key) === prescriptionType);
  return Array.isArray(match?.lensGroupIds) && match.lensGroupIds.length > 0 ? match.lensGroupIds : null;
}

function mergeProductDetails(option) {
  const product = option.productId ? getProductById(option.productId) : null;
  const chosenVariant = product?.variants.find((variant) => variant.id === option.variantId) || null;
  const fallbackVariant = chosenVariant || product?.variants?.[0] || null;
  const resolvedProductId = option.productId || product?.id || "";
  const resolvedVariantId = option.variantId || fallbackVariant?.id || "";
  const resolvedVariantPrice = Number(option.variantPrice ?? fallbackVariant?.price ?? 0);

  return {
    id: option.lensOptionId || option.id || randomUUID(),
    name: option.title || option.productTitle || product?.title || option.lensOptionId || "Lens Option",
    description: option.description || option.modalDescription || "",
    imageUrl: option.productImage || product?.image || "",
    basePrice: resolvedVariantPrice,
    badge: option.badge || null,
    features: option.features || [],
    products: resolvedProductId
      ? [
          {
            productId: resolvedProductId,
            variantId: resolvedVariantId,
            title: option.productTitle || product?.title || "",
            imageUrl: option.productImage || product?.image || "",
            price: resolvedVariantPrice,
          },
        ]
      : [],
    variants: option.variants || [],
    tracksInventory: product?.tracksInventory !== false,
    productType: option.productType || product?.productType || "",
    vendor: option.vendor || product?.vendor || "",
    tags: option.productTags || product?.tags || [],
    inventoryQuantity: fallbackVariant?.inventoryQuantity ?? null,
    inventoryPolicy: fallbackVariant?.inventoryPolicy || "deny",
    availableForSale: fallbackVariant?.availableForSale !== false,
  };
}

function computeLensOptions(store, flow, prescriptionType) {
  const ctx = { prescriptionType: prescriptionType || "non_prescription" };
  const allowedGroups = activeLensGroupIds(flow, ctx.prescriptionType);
  const rules = store.rules
    .map(normalizeRule)
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.priority - b.priority);

  const availableLensOptions = [];
  const disabledLensOptions = [];
  const hiddenLensOptions = [];

  flattenLensOptions(flow).forEach(({ option }) => {
    const optionId = option.lensOptionId || option.id;
    let state = option.enabled === false ? "disabled" : "available";
    const messages = [];

    if (allowedGroups && !allowedGroups.includes(optionId)) {
      state = "hidden";
    }

    if (state !== "hidden" && !evalCondition(ctx, coerceArrayConditions(option.displayCondition))) {
      state = "hidden";
    }

    rules.forEach((rule) => {
      if (!evalCondition(ctx, rule.conditions)) return;
      rule.actions.forEach((action) => {
        if (action.lensOptionId !== optionId) return;
        if (action.type === "hide") {
          state = "hidden";
          messages.push(`Hidden by rule: ${rule.name}`);
        }
        if (action.type === "disable" && state !== "hidden") {
          state = "disabled";
          messages.push(`Disabled by rule: ${rule.name}`);
        }
        if (action.type === "show" && state !== "hidden") {
          state = "available";
        }
      });
    });

    const lens = {
      ...mergeProductDetails(option),
      state,
      messages,
    };

    if (state === "hidden") {
      hiddenLensOptions.push(lens.id);
    } else if (state === "disabled") {
      disabledLensOptions.push(lens);
    } else {
      availableLensOptions.push(lens);
    }
  });

  return { availableLensOptions, disabledLensOptions, hiddenLensOptions };
}

const app = express();

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/health", (_req, res) => {
  const store = loadStore();
  const orphanFlows = store.flows.filter((flow) => flow.status === "published" && (!flow.productIds || flow.productIds.length === 0));
  const staleBundles = store.bundles.filter((bundle) => {
    if (!bundle.updatedAt) return false;
    return Date.now() - new Date(bundle.updatedAt).getTime() > 24 * 60 * 60 * 1000 && bundle.status !== "confirmed";
  });
  const checks = [
    {
      id: "api",
      name: "API server",
      status: "ok",
      message: "Express server is responding normally.",
    },
    {
      id: "flows",
      name: "Published flow coverage",
      status: orphanFlows.length > 0 ? "warning" : "ok",
      message: orphanFlows.length > 0 ? "Some published flows are missing assigned products." : "Published flows have product assignments.",
      details: { orphanFlows: orphanFlows.map((flow) => flow.name) },
    },
    {
      id: "bundles",
      name: "Bundle freshness",
      status: staleBundles.length > 0 ? "warning" : "ok",
      message: staleBundles.length > 0 ? "Some unconfirmed bundles are older than 24 hours." : "Bundle state looks healthy.",
      details: { staleCount: staleBundles.length },
    },
  ];
  const status = checks.some((check) => check.status === "error") ? "error" : checks.some((check) => check.status === "warning") ? "warning" : "ok";
  respondSuccess(res, {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    store: {
      flows: store.flows.length,
      rules: store.rules.length,
      prescriptions: store.prescriptions.length,
      bundles: store.bundles.length,
    },
    checks,
  });
});

app.get("/api/admin/flows", (_req, res) => {
  const store = loadStore();
  respondSuccess(res, store.flows.map(normalizeFlow));
});

app.post("/api/admin/flows", (req, res) => {
  const store = loadStore();
  const now = new Date().toISOString();
  const id = randomUUID();
  const type = req.body?.type === "lens_first" ? "lens_first" : "prescription_first";
  const flow = normalizeFlow({
    id,
    shopId: "dev",
    name: req.body?.name || `New ${type === "lens_first" ? "Lens First" : "Prescription First"} Flow`,
    type,
    status: "draft",
    productIds: [],
    config: buildDefaultFlow(type, { flowKey: `flow_${id.replaceAll("-", "").slice(0, 10)}` }),
    createdAt: now,
    updatedAt: now,
  });
  store.flows.push(flow);
  saveStore(store);
  respondSuccess(res, flow);
});

app.get("/api/admin/flows/:id", (req, res) => {
  const store = loadStore();
  const flow = store.flows.find((item) => item.id === req.params.id);
  if (!flow) {
    return respondError(res, 404, "Flow not found");
  }
  respondSuccess(res, normalizeFlow(flow));
});

app.put("/api/admin/flows/:id", (req, res) => {
  const store = loadStore();
  const index = store.flows.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return respondError(res, 404, "Flow not found");
  }
  const current = normalizeFlow(store.flows[index]);
  const next = normalizeFlow({
    ...current,
    ...req.body,
    config: req.body?.config ? { ...req.body.config, settings: { ...(req.body.config.settings || {}), flowKey: req.body.config.settings?.flowKey || current.config?.settings?.flowKey } } : current.config,
    productIds: Array.isArray(req.body?.productIds) ? req.body.productIds : current.productIds,
    updatedAt: new Date().toISOString(),
  });
  store.flows[index] = next;
  saveStore(store);
  respondSuccess(res, next);
});

app.delete("/api/admin/flows/:id", (req, res) => {
  const store = loadStore();
  const before = store.flows.length;
  store.flows = store.flows.filter((item) => item.id !== req.params.id);
  if (store.flows.length === before) {
    return respondError(res, 404, "Flow not found");
  }
  saveStore(store);
  respondSuccess(res, true);
});

app.post("/api/admin/flows/:id/publish", (req, res) => {
  const store = loadStore();
  const index = store.flows.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return respondError(res, 404, "Flow not found");
  }
  store.flows[index] = normalizeFlow({
    ...store.flows[index],
    status: "published",
    updatedAt: new Date().toISOString(),
  });
  saveStore(store);
  respondSuccess(res, store.flows[index]);
});

app.get("/api/admin/lens-rules", (_req, res) => {
  const store = loadStore();
  respondSuccess(res, store.rules.map(normalizeRule));
});

app.post("/api/admin/lens-rules", (req, res) => {
  const store = loadStore();
  const rule = normalizeRule(req.body);
  store.rules.push(rule);
  saveStore(store);
  respondSuccess(res, rule);
});

app.put("/api/admin/lens-rules/:id", (req, res) => {
  const store = loadStore();
  const index = store.rules.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return respondError(res, 404, "Rule not found");
  }
  const current = normalizeRule(store.rules[index]);
  const next = normalizeRule({ ...current, ...req.body, id: req.params.id, createdAt: current.createdAt });
  store.rules[index] = next;
  saveStore(store);
  respondSuccess(res, next);
});

app.delete("/api/admin/lens-rules/:id", (req, res) => {
  const store = loadStore();
  const before = store.rules.length;
  store.rules = store.rules.filter((item) => item.id !== req.params.id);
  if (store.rules.length === before) {
    return respondError(res, 404, "Rule not found");
  }
  saveStore(store);
  respondSuccess(res, true);
});

app.get("/api/admin/lens-options/manage", (_req, res) => {
  const store = loadStore();
  const grouped = new Map();
  store.flows.map(normalizeFlow).forEach((flow) => {
    flattenLensOptions(flow).forEach(({ option }) => {
      const id = option.lensOptionId || option.id;
      if (!id || grouped.has(id)) return;
      grouped.set(id, {
        id,
        name: option.title || option.productTitle || id,
        variantId: option.variantId || "",
      });
    });
  });
  respondSuccess(res, Array.from(grouped.values()));
});

app.get("/api/admin/product-usage/:productId", (req, res) => {
  const store = loadStore();
  const usage = [];
  store.flows.map(normalizeFlow).forEach((flow) => {
    flattenLensOptions(flow).forEach(({ pageName, option }) => {
      if (option.productId === req.params.productId) {
        usage.push({
          flowId: flow.id,
          flowName: flow.name,
          pageName,
          optionId: option.lensOptionId || option.id,
          optionTitle: option.title || option.productTitle || option.lensOptionId || option.id,
        });
      }
    });
  });
  respondSuccess(res, usage);
});

app.get("/api/admin/products/search", (req, res) => {
  const result = listProducts(req.query);
  respondSuccess(res, result.body, { pageInfo: result.pageInfo });
});

app.get("/api/admin/products/filters", (_req, res) => {
  respondSuccess(res, {
    productTypes: [...new Set(SAMPLE_PRODUCTS.map((product) => product.productType).filter(Boolean))].sort(),
    vendors: [...new Set(SAMPLE_PRODUCTS.map((product) => product.vendor).filter(Boolean))].sort(),
  });
});

app.post("/api/admin/products/batch", (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const body = ids.map((id) => getProductById(id)).filter(Boolean);
  respondSuccess(res, body);
});

app.get("/api/admin/orders", (_req, res) => {
  const store = loadStore();
  const orders = store.bundles
    .slice()
    .reverse()
    .map((bundle) => ({
      id: bundle.id,
      orderNumber: `#${String(bundle.id).slice(0, 6).toUpperCase()}`,
      customer: bundle.customer || "Guest Customer",
      flow: bundle.flowName || "LensFlow Bundle",
      total: `$${Number(bundle.totalPrice || 0).toFixed(2)}`,
      prescription: bundle.prescriptionType || "N/A",
      status: bundle.status === "confirmed" ? "fulfilled" : "pending",
      createdAt: bundle.createdAt ? new Date(bundle.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    }));
  respondSuccess(res, orders);
});

app.get("/api/admin/analytics", (_req, res) => {
  const store = loadStore();
  const flowStats = store.flows.map(normalizeFlow).map((flow) => {
    const relatedBundles = store.bundles.filter((bundle) => bundle.flowId === flow.id);
    const completed = relatedBundles.filter((bundle) => bundle.status === "confirmed").length;
    const total = relatedBundles.length;
    return {
      flowId: flow.id,
      name: flow.name,
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const lensDistributionMap = new Map();
  store.bundles.forEach((bundle) => {
    if (!bundle.lensOptionId) return;
    lensDistributionMap.set(bundle.lensOptionId, (lensDistributionMap.get(bundle.lensOptionId) || 0) + 1);
  });

  const prescriptionDistributionMap = new Map();
  store.prescriptions.forEach((prescription) => {
    const key = prescription.prescriptionType || "unknown";
    prescriptionDistributionMap.set(key, (prescriptionDistributionMap.get(key) || 0) + 1);
  });

  respondSuccess(res, {
    totalFlows: store.flows.length,
    totalPrescriptions: store.prescriptions.length,
    totalBundles: store.bundles.length,
    completedBundles: store.bundles.filter((bundle) => bundle.status === "confirmed").length,
    flowStats,
    lensDistribution: Array.from(lensDistributionMap.entries()).map(([lensOptionId, count]) => ({ lensOptionId, count })),
    prescriptionDistribution: Array.from(prescriptionDistributionMap.entries()).map(([type, count]) => ({ type, count })),
  });
});

app.get("/api/products/:productId/flows", (req, res) => {
  const store = loadStore();
  const flows = findPublishedFlowsForProduct(store, req.params.productId).map((flow) => ({
    id: flow.id,
    name: flow.name,
    type: flow.type,
  }));
  res.json({ flows });
});

app.get("/api/products/:productId/flow", (req, res) => {
  const store = loadStore();
  const requestedFlowId = String(req.query.flowId || "");
  const flows = findPublishedFlowsForProduct(store, req.params.productId);
  const flow = requestedFlowId ? flows.find((item) => item.id === requestedFlowId) : flows[0];
  if (!flow) {
    return res.json({ published: false, flow: null });
  }
  res.json({ published: true, flow });
});

app.get("/api/products/:productId/lens-options", (req, res) => {
  const store = loadStore();
  const flows = findPublishedFlowsForProduct(store, req.params.productId);
  const flow = req.query.flowId ? flows.find((item) => item.id === req.query.flowId) : flows[0];
  if (!flow) {
    return respondError(res, 404, "No published flow for this product");
  }
  const data = computeLensOptions(store, flow, String(req.query.prescriptionType || "non_prescription"));
  respondSuccess(res, data);
});

app.post("/api/prescriptions", (req, res) => {
  const store = loadStore();
  const id = randomUUID();
  const extension = path.extname(req.body?.fileName || "").replace(".", "") || "txt";
  const safeName = `${id}.${extension}`;
  const absolutePath = path.join(UPLOADS_DIR, safeName);
  if (req.body?.fileData) {
    fs.writeFileSync(absolutePath, Buffer.from(req.body.fileData, "base64"));
  }
  const prescription = {
    id,
    fileName: req.body?.fileName || safeName,
    filePath: `/uploads/${safeName}`,
    prescriptionType: req.body?.prescriptionType || "unknown",
    notes: req.body?.notes || "",
    createdAt: new Date().toISOString(),
  };
  store.prescriptions.push(prescription);
  saveStore(store);
  res.json(prescription);
});

app.post("/api/bundles", (req, res) => {
  const store = loadStore();
  const frameProduct = SAMPLE_PRODUCTS.find((product) => product.id === req.body?.productId);
  const lensProduct = req.body?.lensProductId ? getProductById(req.body.lensProductId) : null;
  const frameVariant = req.body?.productId ? getVariant(req.body.productId, req.body.frameVariantId) : null;
  const lensVariant = req.body?.lensProductId ? getVariant(req.body.lensProductId, req.body.lensVariantId) : null;
  const totalPrice = Number(frameVariant?.price || 0) + Number(lensVariant?.price || 0);
  const bundle = {
    id: randomUUID(),
    flowId: null,
    flowName: "LensFlow Bundle",
    productId: req.body?.productId || "",
    frameProductTitle: frameProduct?.title || "",
    frameVariantId: req.body?.frameVariantId || "",
    lensVariantId: req.body?.lensVariantId || "",
    lensProductId: req.body?.lensProductId || "",
    lensProductTitle: lensProduct?.title || "",
    lensOptionId: req.body?.lensOptionId || "",
    lensVariants: req.body?.lensVariants || "",
    status: "pending",
    totalPrice,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.bundles.push(bundle);
  saveStore(store);
  respondSuccess(res, bundle);
});

app.post("/api/bundles/:id/confirm", (req, res) => {
  const store = loadStore();
  const index = store.bundles.findIndex((bundle) => bundle.id === req.params.id);
  if (index === -1) {
    return respondError(res, 404, "Bundle not found");
  }
  const bundle = {
    ...store.bundles[index],
    status: "confirmed",
    updatedAt: new Date().toISOString(),
  };
  store.bundles[index] = bundle;
  saveStore(store);
  respondSuccess(res, {
    id: bundle.id,
    status: bundle.status,
    cartProperties: {
      _lensflow_bundle_id: bundle.id,
      _lensflow_bundle_price: String(bundle.totalPrice || 0),
      _lensflow_lens_option: bundle.lensOptionId || "",
    },
  });
});

if (fs.existsSync(ADMIN_DIST_DIR)) {
  app.use(express.static(ADMIN_DIST_DIR));
  const sendAdminIndex = (_req, res) => {
    res.sendFile(path.join(ADMIN_DIST_DIR, "index.html"));
  };
  app.get("/", sendAdminIndex);
  app.get(/^\/admin(?:\/.*)?$/, sendAdminIndex);
  app.get(/^(?!\/api\/|\/health|\/uploads\/).*/, (req, res, next) => {
    if (!req.accepts("html")) return next();
    return sendAdminIndex(req, res);
  });
} else {
  app.get("/", (_req, res) => {
    res.type("text/plain").send("LensFlow server is running. Build admin-ui to serve the dashboard.");
  });
}

app.use((req, res) => {
  respondError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
});

app.listen(PORT, () => {
  console.log(`LensFlow server listening on http://localhost:${PORT} (${NODE_ENV})`);
  console.log(`Store file: ${STORE_FILE}`);
});
