// scripts/seed-flows.mjs
// 一次性脚本:写入两个预设 Flow(处方优先 / 镜片优先)到数据库
// 数据格式严格遵循 admin-ui/src/pages/FlowEditor.jsx 中 getDefaultNode 的结构,
// 这样 Admin 后台才能正确编辑每个节点。
//
// 关键设计:
//  - 每个处方表单(单光/老花/渐进)是"互斥"分支,通过 displayCondition 控制只显示对应表单
//  - 用 jumpRules 让 prescription_type 选择后直接跳到对应表单,跳过 submit_method 选择
//  - submit_method 仅在选择"upload"时进入 upload_step,否则继续到表单
//  - non_prescription(平光)直接跳到 lens_step,完全跳过表单与上传

import { flowRepo } from "../dist/src/db/index.js";

// ---- 帮助函数:与 FlowEditor.jsx 中的 getDefaultNode 完全一致 ----
function buildNode(type, ref, overrides) {
  const titleOverride = overrides && overrides.title;
  const content = {
    title: titleOverride || defaultTitle(type),
    subtitle: (overrides && overrides.subtitle) || "",
    description: (overrides && overrides.description) || "",
  };
  const base = { type, ref, content, translations: {} };
  let node;
  switch (type) {
    case "prescription_type":
      // 字段名严格遵循 PrescriptionTypeEditor.jsx 中 emptyOption 的结构:
      // type(必填,内部 key) / name(必填,展示名) / description / imageUrl / price /
      // leadsTo / lensGroupIds / enabled / sortOrder
      node = {
        ...base,
        options: [
          { type: "non_prescription", name: "平光 / Non-Prescription", description: "No vision correction needed", imageUrl: "", price: 0, leadsTo: "", lensGroupIds: [], enabled: true, sortOrder: 0 },
          { type: "single_vision", name: "单光 / Single Vision", description: "For nearsightedness, farsightedness, or astigmatism", imageUrl: "", price: 0, leadsTo: "", lensGroupIds: [], enabled: true, sortOrder: 1 },
          { type: "reading", name: "老花 / Reading", description: "For reading and close-up tasks", imageUrl: "", price: 0, leadsTo: "", lensGroupIds: [], enabled: true, sortOrder: 2 },
          { type: "progressive", name: "渐进多焦点 / Progressive", description: "See far + near in one lens", imageUrl: "", price: 0, leadsTo: "", lensGroupIds: [], enabled: true, sortOrder: 3 },
        ],
        config: { showImages: true, showPrices: true },
      };
      break;
    case "submit_method":
      // 字段名严格遵循 SubmitMethodEditor.jsx 中 emptyMethod 的结构:
      // id / type(必填) / name / description / leadsTo / enabled
      node = {
        ...base,
        options: [
          { id: "manual", type: "manual", name: "手动填写 / Enter Manually", description: "Type in your prescription values", leadsTo: "", enabled: true },
          { id: "upload", type: "upload", name: "上传处方 / Upload Prescription", description: "Upload an image or PDF of your prescription", leadsTo: "", enabled: true },
          { id: "later", type: "later", name: "稍后提交 / Send Later", description: "We will contact you later for your prescription", leadsTo: "", enabled: true },
        ],
        config: { allowManual: true, allowUpload: true, allowLater: true },
      };
      break;
    case "single_vision_form":
      node = {
        ...base,
        config: {
          sph: { field: "sph", label: "SPH", min: -20, max: 20, step: 0.25, required: true },
          cyl: { field: "cyl", label: "CYL", min: -6, max: 6, step: 0.25, required: false },
          axis: { field: "axis", label: "Axis", min: 0, max: 180, step: 1, required: false },
          add: { field: "add", label: "ADD", min: 0, max: 4, step: 0.25, required: false },
          pd: { field: "pd", label: "PD", min: 45, max: 85, step: 0.5, required: true },
          showPrism: false,
          showOcHt: false,
        },
      };
      break;
    case "progressive_form":
      node = {
        ...base,
        config: {
          sph: { field: "sph", label: "SPH", min: -20, max: 20, step: 0.25, required: true },
          cyl: { field: "cyl", label: "CYL", min: -6, max: 6, step: 0.25, required: false },
          axis: { field: "axis", label: "Axis", min: 0, max: 180, step: 1, required: false },
          add: { field: "add", label: "ADD", min: 0.75, max: 4, step: 0.25, required: true },
          pd: { field: "pd", label: "PD", min: 45, max: 85, step: 0.5, required: true },
          showPrism: false,
          showOcHt: false,
        },
      };
      break;
    case "reading_form":
      node = { ...base, config: { maxMagnification: 4, step: 0.25 } };
      break;
    case "upload_step":
      node = { ...base, config: { allowPdSelector: true, acceptTypes: ["image/*", "application/pdf"] } };
      break;
    case "lens_step":
      node = { ...base, pages: [] };
      break;
    case "review_order":
      node = {
        ...base,
        config: {
          showFrameInfo: true,
          showLensInfo: true,
          showPrescriptionInfo: true,
          showAddToCart: true,
        },
      };
      break;
    default:
      node = base;
  }
  // 注入 displayCondition(让 storefront 自动跳过不匹配的分支节点)
  if (overrides && overrides.displayCondition) {
    node.displayCondition = overrides.displayCondition;
  }
  return node;
}

function defaultTitle(type) {
  return {
    prescription_type: "Choose Prescription Type",
    submit_method: "How to Provide Prescription",
    single_vision_form: "Single Vision Prescription",
    progressive_form: "Progressive Prescription",
    reading_form: "Reading Prescription",
    upload_step: "Upload Prescription",
    lens_step: "Choose Your Lens",
    review_order: "Review Your Order",
  }[type] || "Step";
}

// ---- Flow A: 处方优先 ----
// 流程: 处方类型 → [按选择分支] → 提交方式(仅有处方时) → 对应表单 OR 上传 → 镜片选择 → 订单确认
const flowA = {
  name: "Flow A: Prescription First (处方优先)",
  type: "prescription_first",
  config: {
    description: "先确认处方类型与参数,再选择适配的镜片",
    icon: "📋",
    settings: {
      layoutMode: "modal",
      buttonMode: "append",
      displayMode: "always",
      hideOutOfStockLenses: false,
    },
    nodes: [
      buildNode("prescription_type", "rx_type"),
      // 提交方式只在选了"需要处方"时显示;无处方直接跳过
      buildNode("submit_method", "submit_method", {
        displayCondition: { field: "prescriptionType", operator: "neq", value: "non_prescription" },
      }),
      // 上传步骤只在选了 upload 时显示
      buildNode("upload_step", "upload", {
        displayCondition: [
          { field: "submitMethod", operator: "eq", value: "upload" },
        ],
      }),
      // 三个表单互斥,各自只在对应处方类型时显示;且 submitMethod 不是 upload 时
      buildNode("single_vision_form", "form_sv", {
        displayCondition: [
          { field: "prescriptionType", operator: "eq", value: "single_vision" },
          { field: "submitMethod", operator: "eq", value: "manual" },
        ],
      }),
      buildNode("reading_form", "form_reading", {
        displayCondition: [
          { field: "prescriptionType", operator: "eq", value: "reading" },
          { field: "submitMethod", operator: "eq", value: "manual" },
        ],
      }),
      buildNode("progressive_form", "form_progressive", {
        displayCondition: [
          { field: "prescriptionType", operator: "eq", value: "progressive" },
          { field: "submitMethod", operator: "eq", value: "manual" },
        ],
      }),
      buildNode("lens_step", "lens"),
      buildNode("review_order", "review"),
    ],
    jumpRules: [
      // 平光顾客:从处方类型选择直接跳到镜片选择,完全跳过表单与上传
      {
        fromNodeRef: "rx_type",
        toNodeRef: "lens",
        condition: { field: "prescriptionType", operator: "eq", value: "non_prescription" },
      },
    ],
  },
};

// ---- Flow B: 镜片优先 ----
// 流程: 镜片选择 → 处方类型 → [按选择分支] → 提交方式 → 表单/上传 → 订单确认
const flowB = {
  name: "Flow B: Lens First (镜片优先)",
  type: "lens_first",
  config: {
    description: "先选择镜片款式,再填写处方参数",
    icon: "🔍",
    settings: {
      layoutMode: "modal",
      buttonMode: "append",
      displayMode: "always",
      hideOutOfStockLenses: false,
    },
    nodes: [
      buildNode("lens_step", "lens"),
      buildNode("prescription_type", "rx_type"),
      buildNode("submit_method", "submit_method", {
        displayCondition: { field: "prescriptionType", operator: "neq", value: "non_prescription" },
      }),
      buildNode("upload_step", "upload", {
        displayCondition: [
          { field: "submitMethod", operator: "eq", value: "upload" },
        ],
      }),
      buildNode("single_vision_form", "form_sv", {
        displayCondition: [
          { field: "prescriptionType", operator: "eq", value: "single_vision" },
          { field: "submitMethod", operator: "eq", value: "manual" },
        ],
      }),
      buildNode("reading_form", "form_reading", {
        displayCondition: [
          { field: "prescriptionType", operator: "eq", value: "reading" },
          { field: "submitMethod", operator: "eq", value: "manual" },
        ],
      }),
      buildNode("progressive_form", "form_progressive", {
        displayCondition: [
          { field: "prescriptionType", operator: "eq", value: "progressive" },
          { field: "submitMethod", operator: "eq", value: "manual" },
        ],
      }),
      buildNode("review_order", "review"),
    ],
    jumpRules: [
      {
        fromNodeRef: "rx_type",
        toNodeRef: "review",
        condition: { field: "prescriptionType", operator: "eq", value: "non_prescription" },
      },
    ],
  },
};

const flows = [flowA, flowB];

// ---- 写入数据库 ----
console.log("=== LensFlow Seed Flows ===");

// 先清掉旧的同名 Flow
const existing = flowRepo.all();
let cleaned = 0;
existing.forEach((f) => {
  if (f.name && (f.name.startsWith("Flow A:") || f.name.startsWith("Flow B:"))) {
    flowRepo.remove(f.id);
    cleaned++;
  }
});
if (cleaned > 0) console.log(`✓ Cleaned ${cleaned} old preset flow(s)`);

for (const f of flows) {
  await new Promise((resolve) => setTimeout(resolve, 5));
  const created = flowRepo.create({ name: f.name, type: f.type });
  flowRepo.update(created.id, {
    name: f.name,
    type: f.type,
    config: f.config,
    productIds: [],
  });
  console.log(`✓ Created Flow: ${created.id} - ${f.name}`);
}

console.log("\n操作完成!");
console.log("流程的关键改进:");
console.log("  - 平光顾客:rx_type → 直接跳到镜片选择,跳过所有表单");
console.log("  - 选了 upload:跳过手填表单,直接进入上传步骤");
console.log("  - 单光/老花/渐进:三选一,只显示选中的对应表单");
console.log("");
console.log("接下来在 Admin:");
console.log("1. LensFlow → Flows 中可以看到两个新流程");
console.log("2. 进入编辑器 → Lens 节点添加镜片选项 + 绑定真实店铺产品");
console.log("3. 产品绑定中加上你要测试的镜框产品");
console.log("4. 状态改为 Published 即可在 storefront 生效");
process.exit(0);
