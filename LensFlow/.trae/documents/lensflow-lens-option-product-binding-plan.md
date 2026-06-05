# LensFlow 镜片选项产品绑定功能实施计划

## 摘要

根据更新后的 PRD.md 和 TODO.md，为 LensFlow 的镜片选项编辑器新增产品绑定功能。包括扩展数据模型（类型定义）、创建 3 个新组件（LensOptionDetailEditor、ProductSelector、ProductInfoCard）、重构现有 LensOptionEditor 组件以支持展开式详细配置面板、扩展后端产品查询 API 以返回更多产品详情（Tags、Prices、Variants）、更新 i18n 翻译文件。

## 当前状态分析

### 项目类型
- **App Type**: Shopify Admin App (Embedded, React + App Bridge)
- **Runtime**: Node.js (Express 5)
- **Framework**: 非标准架构 — 后端 Express (`dist/src/` 作为源码目录) + 前端 Admin UI (`admin-ui/`, Vite + React 18)
- **DB**: InMemory 存储（生产环境将切换 Prisma + Postgres）
- **Confidence**: High

### 现有镜片选项相关文件

| 文件 | 当前用途 |
|------|----------|
| [flow.d.ts](file:///d:/下载/Shopify APP/LensFlow/dist/src/types/flow.d.ts#L81-L90) | `LensOption` 类型：仅 `id, lensOptionId, enabled, badge, modalDescription, isSkipOption, leadsTo, displayCondition` |
| [lens.d.ts](file:///d:/下载/Shopify APP/LensFlow/dist/src/types/lens.d.ts#L15-L24) | 核心 `LensOption` 类型：`id, name, basePrice, badge, description, modalDescription, imageUrl, isSkipOption` |
| [LensOptionEditor.jsx](file:///d:/下载/Shopify APP/LensFlow/admin-ui/src/components/LensOptionEditor.jsx) | 简单 Modal 弹窗编辑：lensOptionId, badge(text+style), modalDescription, isSkipOption, leadsTo |
| [LensPageEditor.jsx](file:///d:/下载/Shopify APP/LensFlow/admin-ui/src/components/LensPageEditor.jsx) | 镜片页面管理：名称/类型/布局切换，使用 LensOptionEditor 内嵌 |

### 后端产品 API 现状
- `GET /api/admin/products/search?q=xxx` — 返回 `{ id, title, image }`
- `POST /api/admin/products/batch` — 批量查询，返回 `{ id, title, image }`
- **缺失**: 不返回 Tags、Prices、Variants（库存）信息

### 组件通信模式
- FlowEditor → LensPageEditor（通过 `pages` prop 传入页面列表，`onChange` 回调传出）
- LensPageEditor 仅管理页面级别的元数据，不直接管理 options
- LensOptionEditor 当前内嵌在 FlowEditor 的 lens_step 分支中（TODO.md 中推荐独立组件）

---

## 提议的变更

### 变更 1：类型定义更新

####文件: `dist/src/types/flow.d.ts`

**变更内容**：扩展 `LensOption` 类型，新增产品绑定和翻译相关字段。

```typescript
// 83-90 行，现有 LensOption 扩展为：
export type LensOption = {
  id: string;
  lensOptionId: string;
  enabled?: boolean;
  
  // 徽章 — 扩展现有字段
  badge?: { text: string; style: string };
  badgeTranslations?: LocaleTranslations;
  
  // 标题 — 新增
  title?: string;                     // 自定义标题，留空则使用绑定的产品标题
  titleTranslations?: LocaleTranslations;
  
  // 描述 — 新增（带 HTML 支持，模态显示）
  description?: string;
  descriptionTranslations?: LocaleTranslations;
  
  // 产品绑定 — 新增
  productId?: string;                  // Shopify 产品 GID
  productTitle?: string;
  productTags?: string[];
  productPrices?: { title: string; price: number }[];
  
  // 显示条件 — 已有但增强
  displayCondition?: RuleCondition[];
  
  // 保留现有字段
  modalDescription?: string;
  isSkipOption?: boolean;
  leadsTo?: string;
};
```

**向后兼容性**：添加字段均为可选 (`?`)，不影响已有数据和代码。

#### 文件: `dist/src/types/lens.d.ts`

**变更内容**：扩展核心领域 `LensOption` 类型以匹配新的产品绑定模型。

```typescript
// 15-24 行，现有 LensOption 扩展为：
export type LensOption = {
  id: string;
  name: string;
  basePrice: number;
  badge?: { text: string; style?: "default" | "premium" | "custom" };
  description?: string;
  modalDescription?: string;
  imageUrl?: string;
  isSkipOption?: boolean;
  
  // 新增 — 产品绑定字段
  productId?: string;
  productTitle?: string;
  productTags?: string[];
  productPrices?: { title: string; price: number }[];
};
```

---

### 变更 2：后端 API 扩展

#### 文件: `dist/src/index.js`

**变更 1**：扩展 `POST /api/admin/products/batch` (约 380-411 行)

将 GraphQL 查询从仅返回 `id, title, featuredImage` 扩展为同时返回 `tags, variants` (含价格和库存)：

```graphql
query batchProducts($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Product {
      id
      title
      featuredImage { url }
      tags
      variants(first: 10) {
        edges {
          node {
            id
            title
            price
            inventoryQuantity
          }
        }
      }
    }
  }
}
```

响应格式扩展为：
```json
{
  "id": "gid://shopify/Product/1001",
  "title": "Blue Light Block Lenses",
  "image": "https://...",
  "tags": ["lens", "blue-light"],
  "prices": [
    { "title": "Default", "price": 39.99 },
    { "title": "1.67 High Index", "price": 59.99 }
  ],
  "variants": [
    { "id": "...", "title": "Default", "inventoryAvailable": true }
  ]
}
```

**变更 2**：新增 `GET /api/admin/products/:id/detail`

获取单个产品的完整详情（Tags, Variants含价格/库存），供 ProductInfoCard 使用。

**变更 3**：扩展 `/api/admin/products/search` (约 346-378 行)

搜索也返回 tags 以支持产品选择器中的筛选。

---

### 变更 3：新建组件 `LensOptionDetailEditor.jsx`

#### 文件: `admin-ui/src/components/LensOptionDetailEditor.jsx`（新建）

**职责**：镜片选项的展开式详细配置面板，集成产品绑定、显示条件、翻译。

**UI 结构**（基于 PRD 第二十三节和 TODO 第七节）：

```
┌─ LensOptionDetailEditor ───────────────────────────────────────┐
│ ┌─ 徽章配置 ──────────────────────────────────────────────┐     │
│ │  Badge Text: [____________] [添加翻译]                    │     │
│ └──────────────────────────────────────────────────────────┘     │
│ ┌─ 标题配置 ──────────────────────────────────────────────┐     │
│ │  自定义标题: [____________] [添加翻译]                    │     │
│ │  ℹ️ 如果留空，将自动使用绑定的产品标题                     │     │
│ └──────────────────────────────────────────────────────────┘     │
│ ┌─ 描述配置 ──────────────────────────────────────────────┐     │
│ │  描述（支持HTML）: [____________] [添加翻译]              │     │
│ └──────────────────────────────────────────────────────────┘     │
│ ┌─ 产品绑定 ──────────────────────────────────────────────┐     │
│ │  ┌──────────────────────────────────────────────┐        │     │
│ │  │  [ProductInfoCard] 产品标题 / Tags / Prices  │        │     │
│ │  │  [编辑镜片产品]  [更换镜片产品]                │        │     │
│ │  └──────────────────────────────────────────────┘        │     │
│ └──────────────────────────────────────────────────────────┘     │
│ ┌─ 显示条件 ──────────────────────────────────────────────┐     │
│ │  [DisplayConditionBuilder 复用]                          │     │
│ └──────────────────────────────────────────────────────────┘     │
│ ┌─ 教程链接 ──────────────────────────────────────────────┐     │
│ │  🔗 如何为选项添加描述？                                  │     │
│ │  🔗 如何为选项添加图片？                                  │     │
│ │  🔗 如何修改选项卡的模版样式？                             │     │
│ └──────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

**Props**：
```typescript
{
  option: LensOption;                    // 当前选项数据
  onChange: (option: LensOption) => void; // 变更回调
  onProductSelect: (optionId: string) => void; // 触发产品选择器
  nodeRefs?: string[];                   // 页面 ref 列表（用于 leadsTo）
}
```

**内部状态**：
- `productDetail` — 选中产品后通过 API 获取的详情
- `translationModalOpen` — 翻译编辑弹窗状态

**关键行为**：
- "编辑镜片产品"按钮 → `window.open('shopify://admin/products/' + productId)` 或 Shopify Admin URL
- "更换镜片产品"按钮 → 触发父组件打开 ProductSelector
- 如果产品标题为 "Default title"（默认标题），显示 "修复显示问题" 按钮
- 库存检测：通过 variant `inventoryQuantity` 判断，自动标记隐藏建议

---

### 变更 4：新建组件 `ProductSelector.jsx`

#### 文件: `admin-ui/src/components/ProductSelector.jsx`（新建）

**职责**：弹出产品搜索/筛选/选择弹窗。

**UI 结构**（基于 TODO.md P0-7）：

```
┌─ Modal: "选择镜片产品" ───────────────────────────────────────┐
│ ┌─ 搜索栏 ──────────────────────────────────────────────┐     │
│ │  [🔍 搜索产品...                  ]                    │     │
│ └───────────────────────────────────────────────────────┘     │
│ ┌─ 筛选条件 ────────────────────────────────────────────┐     │
│ │  搜索依据: [全部 ▾]    [+ 添加筛选条件+]              │     │
│ └───────────────────────────────────────────────────────┘     │
│ ┌─ 产品列表 ────────────────────────────────────────────┐     │
│ │  ☐ [图片] 产品标题 1                                  │     │
│ │  ☐ [图片] 产品标题 2                                  │     │
│ │  ☐ [图片] 产品标题 3                                  │     │
│ │  ...（滚动列表）                                       │     │
│ └───────────────────────────────────────────────────────┘     │
│                                                               │
│  下部状态：已选 0/1 个产品                                    │
│  [取消]                                    [选择]             │
└───────────────────────────────────────────────────────────────┘
```

**Props**：
```typescript
{
  open: boolean;
  onClose: () => void;
  onSelect: (product: SelectedProduct) => void;
  currentProductId?: string;   // 当前已绑定的产品 ID（用于预选）
}
```

**内部状态**：
- `searchQuery` — 搜索关键词
- `products` — 搜索结果列表
- `selectedProductId` — 当前选中的产品
- `loading` — 加载状态

**行为**：
- 打开时自动调用 `GET /api/admin/products/search` 加载初始列表
- 搜索防抖 300ms
- 单选模式（每个选项只能绑定一个产品）
- "选择"按钮关闭弹窗并回传选中的产品
- 选中产品后调用 `POST /api/admin/products/batch` 获取完整信息（Tags, Prices）

---

### 变更 5：新建组件 `ProductInfoCard.jsx`

#### 文件: `admin-ui/src/components/ProductInfoCard.jsx`（新建）

**职责**：展示已绑定产品的信息卡片（标题/Tags/Prices/默认标题检测/库存状态）。

**UI 结构**（基于 PRD 第二十三节）：

```
┌─ Card ───────────────────────────────────────────────────┐
│  ┌──────────────────────┐                                │
│  │  [产品图片]           │  产品标题                      │
│  │                      │  Tags: lens, blue-light        │
│  │                      │  价格:                         │
│  │                      │  · Default — $39.99            │
│  │                      │  · 1.67 High Index — $59.99    │
│  │                      │                                │
│  │                      │  [编辑镜片产品] [更换镜片产品]  │
│  └──────────────────────┘                                │
│  ⚠️ 检测到产品标题为默认标题，[修复显示问题]               │
│  ⚠️ 该产品无库存，此选项将被自动隐藏                       │
└──────────────────────────────────────────────────────────┘
```

**Props**：
```typescript
{
  productId?: string;
  productTitle?: string;
  productTags?: string[];
  productPrices?: { title: string; price: number }[];
  productImage?: string;
  hasInventory?: boolean;
  onEditProduct?: () => void;
  onChangeProduct?: () => void;
}
```

**行为**：
- 无产品绑定时显示占位状态："尚未绑定产品"
- 检测到 `productTitle === "Default Title"` 时显示修复按钮
- 检测到 `hasInventory === false` 时显示库存警告
- "编辑镜片产品" → 跳转 Shopify Admin 产品编辑页
- "更换镜片产品" → 触发 ProductSelector

---

### 变更 6：重构 `LensOptionEditor.jsx`

#### 文件: `admin-ui/src/components/LensOptionEditor.jsx`

**变更内容**：

1. **从表格模式改为 Accordion/Collapse 模式**：每个镜片选项显示为可展开的折叠面板
2. **折叠面板头部**：显示选项概览信息（ID、Badge、产品标题预览）
3. **展开面板内容**：嵌入 `LensOptionDetailEditor` 组件
4. **集成 ProductSelector**：管理 ProductSelector 弹窗的开关状态
5. **集成 DisplayConditionBuilder**：嵌入已有的显示条件编辑器

**新的 Props 接口**（保持向后兼容）：
```typescript
{
  options: LensOption[];
  onChange: (options: LensOption[]) => void;
  nodeRefs?: string[];
}
```

**UI 结构**：
```
┌─ LensOptionEditor ───────────────────────────────────────┐
│  [+ 添加选项]                                            │
│                                                          │
│  ▾ 选项 1: lens-pro  [Badge: "推荐"] [产品: "Pro Lens"]  │  ← 折叠面板头部
│  │ ┌─ 基本配置 ─────────────────────────────────────┐    │
│  │ │  内部引用: [____________]                       │    │
│  │ │  Leads To: [选择节点 ▾]                         │    │
│  │ │  跳过选项: [Switch]                             │    │
│  │ └────────────────────────────────────────────────┘    │
│  │ ┌─ 详细配置 ─────────────────────────────────────┐    │  ← LensOptionDetailEditor
│  │ │  [LensOptionDetailEditor component]             │    │
│  │ └────────────────────────────────────────────────┘    │
│                                                          │
│  ▸ 选项 2: lens-basic  [Badge: —] [产品: "Basic Lens"]  │
│                                                          │
│  ▸ 选项 3: lens-blue  [Badge: "New"] [产品: 未绑定]     │
└──────────────────────────────────────────────────────────┘
```

---

### 变更 7：更新 `FlowEditor.jsx`

#### 文件: `admin-ui/src/pages/FlowEditor.jsx`

**变更内容**（约 234-245 行）：

`lens_step` 节点渲染时，将 `LensPageEditor` 的 onChange 传递给 `LensOptionEditor`，使选项数据通过页面向下传递：

```jsx
{selectedNode.type === "lens_step" && (
  <div>
    <LensPageEditor pages={selectedNode.pages || []} nodeRefs={nodeRefs}
      onChange={(pages) => updateNode(selectedNode.ref, { pages })} />
    {/* LensOptionEditor 集成在 LensPageEditor 内部（每个页面内） */}
  </div>
)}
```

实际上，LensPageEditor 当前只管理页面元数据，不管理 options。按 PRD 设计，options 应该属于 `LensPageConfig`。当前 `LensPageConfig` 类型已有 `options: LensOption[]` 字段（flow.d.ts 第 99 行）。

**变更**：在 LensPageEditor 的编辑 Modal 底部增加 LensOptionEditor 组件（或在页面列表中增加"管理选项"按钮）。

---

### 变更 8：i18n 翻译扩充

#### 文件: `admin-ui/src/locales/en.json`

新增 key paths：
```json
"lensOptionDetail": {
  "badge": "Badge",
  "badgeHelp": "Display a badge on this option (e.g. 'Best Value', 'Popular').",
  "badgeTextPlaceholder": "e.g. Best Value",
  "addTranslation": "Add Translation",
  "title": "Title",
  "titleHelp": "Custom title. Leave blank to use the bound product title.",
  "titlePlaceholder": "Custom title or leave blank",
  "description": "Description",
  "descriptionHelp": "Description shown in modal (HTML supported). If filled, a question mark icon appears.",
  "descriptionPlaceholder": "HTML description content",
  "productBinding": "Product Binding",
  "editProduct": "Edit Lens Product",
  "changeProduct": "Change Lens Product",
  "noProduct": "No product bound yet",
  "defaultTitleWarning": "Product title is 'Default Title'.",
  "fixDisplayIssue": "Fix display issue",
  "noInventoryWarning": "This product has no inventory. The option will be automatically hidden.",
  "displayCondition": "Display Conditions",
  "displayConditionHelp": "Show this option only when certain prescription conditions are met.",
  "tutorialLinks": "Tutorials",
  "tutorialDescription": "How to add a description to an option?",
  "tutorialImage": "How to add an image to an option?",
  "tutorialTemplate": "How to modify the template styles?"
},
"productSelector": {
  "title": "Select Lens Product",
  "searchPlaceholder": "Search products...",
  "searchBy": "Search by",
  "all": "All",
  "addFilter": "+ Add filter",
  "selectedCount": "Selected {count}/1 products",
  "select": "Select",
  "noResults": "No products found",
  "loading": "Searching..."
},
"productInfoCard": {
  "noProduct": "No product bound yet. Click 'Change Lens Product' to bind one.",
  "tags": "Tags",
  "prices": "Prices",
  "editProduct": "Edit Lens Product",
  "changeProduct": "Change Lens Product",
  "defaultTitle": "Default Title",
  "fixDisplayIssue": "Fix display issue"
}
```

#### 文件: `admin-ui/src/locales/zh-CN.json`

对应中文翻译：
```json
"lensOptionDetail": {
  "badge": "徽章",
  "badgeHelp": "在此选项上显示徽章（如「热销」、「推荐」）。",
  "badgeTextPlaceholder": "如：热销",
  "addTranslation": "添加翻译",
  "title": "标题",
  "titleHelp": "自定义标题。留空则使用绑定产品的标题。",
  "titlePlaceholder": "自定义标题或留空",
  "description": "描述",
  "descriptionHelp": "弹窗中显示的描述（支持 HTML）。填写后选项左侧会出现问号图标。",
  "descriptionPlaceholder": "HTML 描述内容",
  "productBinding": "产品绑定",
  "editProduct": "编辑镜片产品",
  "changeProduct": "更换镜片产品",
  "noProduct": "尚未绑定产品",
  "defaultTitleWarning": "产品标题为「默认标题」。",
  "fixDisplayIssue": "修复显示问题",
  "noInventoryWarning": "该产品无库存，此选项将被自动隐藏。",
  "displayCondition": "显示条件",
  "displayConditionHelp": "仅当满足特定处方条件时显示此选项。",
  "tutorialLinks": "教程链接",
  "tutorialDescription": "如何为选项添加描述？",
  "tutorialImage": "如何为选项添加图片？",
  "tutorialTemplate": "如何修改选项卡的模版样式？"
},
"productSelector": {
  "title": "选择镜片产品",
  "searchPlaceholder": "搜索产品...",
  "searchBy": "搜索依据",
  "all": "全部",
  "addFilter": "+ 添加筛选条件",
  "selectedCount": "已选 {count}/1 个产品",
  "select": "选择",
  "noResults": "未找到产品",
  "loading": "搜索中..."
},
"productInfoCard": {
  "noProduct": "尚未绑定产品，点击「更换镜片产品」进行绑定。",
  "tags": "标签",
  "prices": "价格",
  "editProduct": "编辑镜片产品",
  "changeProduct": "更换镜片产品",
  "defaultTitle": "默认标题",
  "fixDisplayIssue": "修复显示问题"
}
```

---

## 假设与决策

1. **单选模式**：产品选择器采用单选，因为 PRD 明确"每个选项只能绑定一个产品"。
2. **翻译实现**：翻译存储为 `LocaleTranslations`（即 `Record<string, Record<string, string>>`），与项目现有的翻译模式保持一致。
3. **产品编辑跳转**：使用 `shopify://admin/products/{id}` 协议或 Shopify Admin URL。
4. **库存检测**：通过 variant 的 `inventoryQuantity` 字段判断，而非仅通过 `inventoryAvailable` 布尔值。
5. **教程链接**：使用占位 URL，后续可替换为实际文档链接。
6. **显示条件复用**：直接复用已有的 `DisplayConditionBuilder` 组件，传入 `displayConditions` 数组。
7. **组件通信**：遵循现有的单向数据流 — 子组件通过 `onChange` 回调报告变更，父组件负责合并状态。
8. **向后兼容**：所有新增字段均为可选(`?`)，不破坏现有数据结构和 API 契约。

## 实施步骤

### Step 1: 更新类型定义
- 修改 `dist/src/types/flow.d.ts` (LensOption 类型)
- 修改 `dist/src/types/lens.d.ts` (LensOption 类型)
- 修改 `dist/src/index.js` (后端产品查询 API)

### Step 2: 创建 ProductInfoCard 组件
- 创建 `admin-ui/src/components/ProductInfoCard.jsx`
- 实现产品信息展示（标题/Tags/Prices）
- 实现默认标题检测警告
- 实现无库存警告

### Step 3: 创建 ProductSelector 组件
- 创建 `admin-ui/src/components/ProductSelector.jsx`
- 实现产品搜索框（防抖）
- 实现产品列表（图片/标题）
- 实现选择/取消逻辑

### Step 4: 创建 LensOptionDetailEditor 组件
- 创建 `admin-ui/src/components/LensOptionDetailEditor.jsx`
- 实现徽章配置
- 实现标题配置
- 实现描述配置（HTML 支持）
- 集成 ProductInfoCard
- 集成 ProductSelector 弹窗
- 集成 DisplayConditionBuilder
- 实现教程链接

### Step 5: 重构 LensOptionEditor 组件
- 修改 `admin-ui/src/components/LensOptionEditor.jsx`
- 从表格模式改为折叠面板模式
- 集成 LensOptionDetailEditor
- 集成 ProductSelector 弹窗管理

### Step 6: 更新 i18n 文件
- 修改 `admin-ui/src/locales/en.json`
- 修改 `admin-ui/src/locales/zh-CN.json`

### Step 7: 验证
- 检查 TypeScript 类型一致性
- 确认所有组件正确导入/导出
- 确认向后兼容性

## 验证计划

1. **类型检查**：确认 `flow.d.ts` 和 `lens.d.ts` 的类型定义一致且无冲突。
2. **组件渲染**：确认新组件在 FlowEditor 中正确渲染，不报错。
3. **数据流**：确认 LensOptionEditor → LensOptionDetailEditor → ProductSelector 的数据传递链完整。
4. **API 测试**：扩展后的后端 API 返回正确的产品信息（Tags, Prices, Variants）。
5. **i18n**：确认新增翻译 key 在中英文下均能正常显示。
