# LensFlow — Shopify 眼镜配镜 App（PRD）

> 本 PRD 基于 `LensFlow\dist\src` 已有代码，沿用其领域类型、Repository 接口、服务分层和 REST 风格。LensFlow 本质上是一个 **Shopify App**，通过 Admin UI 管理镜片规则与流程，通过 Theme App Extension + Storefront SDK 在店铺前台驱动用户配镜体验。

---

## 一、产品定位

LensFlow 是一款 **Shopify App**，面向眼镜行业商家，解决 Shopify 原生商品页无法处理镜框 + 镜片 + 处方一体化购买的问题。

- **App 类型**：Shopify Custom App / Public App（可上架 Shopify App Store）
- **适用范围**：Shopify 眼镜店铺（眼镜框 + 镜片 + 验光配镜）
- **核心价值**：在不改变 Shopify Checkout 的前提下，实现配镜流程的灵活配置与前端交互

---

## 二、Shopify App 架构

```text
┌─────────────────────────────────────────────�# LensFlow — Shopify 眼镜配镜 App（PRD）

> 本 PRD 基于 `LensFlow\dist\src` 已有代码，沿用其领域类型、Repository 接口、服务分层和 REST 风格。LensFlow 本质上是一个 **Shopify App**，通过 Admin UI 管理镜片规则与流程，通过 Theme App Extension + Storefront SDK 在店铺前台驱动用户配镜体验。

---

## 一、产品定位

LensFlow 是一款 **Shopify App**，面向眼镜行业商家，解决 Shopify 原生商品页无法处理镜框 + 镜片 + 处方一体化购买的问题。

- **App 类型**：Shopify Custom App / Public App（可上架 Shopify App Store）
- **适用范围**：Shopify 眼镜店铺（眼镜框 + 镜片 + 验光配镜）
- **核心价值**：在不改变 Shopify Checkout 的前提下，实现配镜流程的灵活配置与前端交互

---

## 二、Shopify App 架构

```text
┌──────────────────────────────────────────────┐
│               Shopify 商家后台                │
│  ┌────────────────────────────────────────┐  │
│  │   LensFlow Admin UI (React + 内联样式)   │  │
│  │   Flow Editor · 规则管理 · 健康诊断     │  │
│  └────────────────┬───────────────────────┘  │
│                   │ Session Token / SKIP_AUTH  │
└───────────────────┼──────────────────────────┘
                    │
      ┌─────────────▼──────────────────┐
      │   LensFlow Node.js 后端         │
      │  ┌──────────────────────────┐  │
      │  │ OAuth · Session Token     │  │
      │  │ Admin REST API            │  │
      │  │ Lens 规则引擎              │  │
      │  │ Flow / Prescription / Bundle │ │
      │  │ Shopify Sync (Webhook)    │  │
      │  └──────────────────────────┘  │
      └────┬──────────────┬────────────┘
           │              │
 Shopify Admin API   App Proxy (Storefront)
           │              │
┌──────────▼──┐  ┌───────▼───────────────────────┐
│ Shopify 平台  │  │  店铺前台 (Online Store 2.0)   │
│ Products     │  │  Theme App Extension          │
│ Variants     │  │  Storefront SDK (Vanilla JS)  │
│ Orders       │  │  Shopify Cart AJAX API        │
│ Themes       │  └───────────────────────────────┘
│ Webhooks     │
└──────────────┘
```

### 路由分发

| 路由前缀 | 用途 | 鉴权方式 |
| --- | --- | --- |
| `/api/admin/*` | Admin UI 调用 | Shopify Session Token |
| `/api/products/*` | 店铺前台 / SDK 调用 | App Proxy 签名 |
| `/api/bundles/*` | Bundle 创建/确认 | App Proxy 签名 |
| `/api/prescriptions/*` | 验光数据/文件上传 | App Proxy 签名 |
| `/api/webhooks/*` | 接收 Shopify Webhook | HMAC-SHA256 |
| `/auth/*` | Shopify OAuth 安装 | OAuth 标准流 |
---

## 三、现有代码资产

### 领域模型

- **ProductContext**：产品上下文，含 `productId`、`productType`、`tags`、`prescriptionType`、`variants`
- **LensOption**：镜片选项 `{ id, name, basePrice }`
- **ProductVariant**：Shopify 变体快照 `{ id, sku, isDeleted, inventoryAvailable }`
- **LensRule**：规则 `{ id, name, priority, enabled, conditions[], actions[] }`
- **RuleCondition**：`{ field, operator, value }` — field: `prescriptionType | productType | tags | variantExists`，operator: `eq | neq | includes`
- **RuleAction**：`{ type: show|hide|disable, lensOptionId, message?, variantId? }`
- **LensDecision**：`{ lensOptionId, state, reasonCodes[], messages[], appliedRuleIds[] }`

### 规则引擎 `domain/lensRuleEngine.js`

- `evaluateLensRules(context, rules)` — priority 降序，高优先级覆盖低优先级
- 返回 `{ decisions, traces }`

### 服务层

| 文件 | 函数 | 职责 |
| --- | --- | --- |
| `services/productLensOptions.js` | `buildProductLensOptions` | 镜片分 available/disabled/hidden 三类 |
| `services/healthCheck.js` | `buildProductHealthReport` | 健康诊断（缺规则/缺变体/已删变体/优先级冲突/无可视镜片/产品未上架） |
| `services/diagnostics.js` | `buildLensVisibilityDiagnostic` | 可见性诊断 + 追踪 |
| `services/shopifySync.js` | `diffVariantSnapshots` | Shopify 变体差分 |

### Repository 接口

```typescript
export interface LensRepository {
    listRules(productId?: string): StoredLensRule[];
    getProductContext(productId: string): ProductContext | undefined;
    getLensOptions(productId: string): LensOption[];
    saveRule(productId: string, rule: LensRule): LensRule;
}
```

当前实现: `InMemoryLensRepository`（含种子数据）

### 现有 REST API

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| `GET` | `/api/admin/lens-rules` | 查询规则列表 |
| `POST` | `/api/admin/lens-rules` | 创建/更新规则 |
| `POST` | `/api/admin/lens-rules/preview` | 预览规则影响 |
| `POST` | `/api/admin/diagnostics/lens-visibility` | 可见性诊断 |
| `GET` | `/api/products/:id/lens-options` | 门店端镜片选项 |
| `GET` | `/api/admin/health/products/:id` | 产品健康报告 |

---

## 四、Shopify App 所需权限

| Scope | 用途 |
| --- | --- |
| `read_products` | 读取镜框和镜片商品数据 |
| `write_products` | 更新商品 metafields |
| `read_themes` | 读取主题 |
| `write_themes` | 写入 Theme App Extension |
| `read_orders` | 读取 Bundle/Prescription 关联 |
| `read_inventory` | 读取库存驱动 variantExists |

---

## 五、安装入驻流程

```text
商家安装 App → Shopify OAuth 授权
→ 后端存储 access_token + shop 信息
→ 注册 Webhook (products/update, products/delete, inventory_levels/update)
→ 首次全量同步：拉取 Products → 构建 ProductContext
→ 注入 Theme App Extension (App Embed Block)
→ 商家在 Admin UI 开始配置 Flow
```

---

## 六、新增领域类型

在现有 `types/lens.d.ts` 基础上新增 Flow、Prescription、Bundle 类型：

```typescript
// types/flow.d.ts
export type FlowType = "prescription_first" | "lens_first";
export type FlowStatus = "draft" | "published";

export type PageContent = {
  title?: string;
  subtitle?: string;
  description?: string; // HTML 支持，模态框显示
  bottomDescription?: string; // 显示在最后一个选项下方
};

export type Translation = {
  [locale: string]: PageContent;
};

export type PrescriptionTypeOption = {
  id: string;
  type: 'single_vision' | 'progressive' | 'reading' | 'non_prescription';
  name: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  leadsTo?: string; // ref of target page
  enabled: boolean;
  displayOrder: number;
};

export type SubmitMethodOption = {
  id: string;
  type: 'manual' | 'upload' | 'later';
  name: string;
  description?: string;
  enabled: boolean;
  displayOrder: number;
};

export type FormFieldConfig = {
  min?: number;
  max?: number;
  displayDirection?: 'min_first' | 'max_first';
  step?: number;
  enabled: boolean;
};

export type PrescriptionFormConfig = {
  sph: FormFieldConfig;
  cyl: FormFieldConfig;
  axis?: FormFieldConfig;
  add?: FormFieldConfig; // 渐进专用
  pd: FormFieldConfig;
  prism?: boolean; // 启用棱镜值
  hideCylAxis?: boolean; // 隐藏散光值
  acceptEmptyPd?: boolean; // 接受空瞳距值
  acceptEmptyAdd?: boolean; // 接受空ADD值
  acceptBirthYear?: boolean; // 接受出生年份
  acceptSegmentHeight?: boolean; // 接受段高（买家非必选）
  defaultTwoPd?: boolean; // 默认接受2个（一左一右）瞳距值
};

export type ReadingFormConfig = {
  magnificationStrength: {
    max: number;
    step: number;
  };
};

export type UploadStepConfig = {
  title?: string;
  description?: string;
  showPdSelector?: boolean; // 显示瞳距(PD)值选择器
};

export type LensOption = {
  id: string;
  internalReference: string; // 内部引用
  
  // 徽章
  badge?: string;
  badgeTranslations?: Translation;
  
  // 标题
  title?: string;
  titleTranslations?: Translation;
  
  // 描述（模态显示）
  description?: string;
  descriptionTranslations?: Translation;
  
  // 绑定的产品
  productId?: string; // Shopify产品ID
  productTitle?: string;
  productTags?: string[];
  productPrices?: { title: string; price: number }[];
  
  // 显示条件
  displayConditions?: RuleCondition[];
};

export type LensPageConfig = {
  autoNext?: boolean; // 自动跳转到下一页
  options: LensOption[];
};

export type LogicJumpsConfig = {
  enabled: boolean;
  // 逻辑跳转配置
};

export type FlowNode =
  | {
      type: "prescription_type";
      ref: string;
      content: PageContent;
      translations?: Translation;
      options: PrescriptionTypeOption[];
      skipIfSingleOption: boolean;
      displayConditions?: RuleCondition[];
    }
  | {
      type: "submit_method";
      ref: string;
      content: PageContent;
      translations?: Translation;
      options: SubmitMethodOption[];
      skipIfSingleOption: boolean;
      displayConditions?: RuleCondition[];
      enableManual: boolean;
      enableUpload: boolean;
      enableLater: boolean;
    }
  | {
      type: "single_vision_form";
      ref: string;
      content: PageContent;
      translations?: Translation;
      formConfig: PrescriptionFormConfig;
      displayConditions?: RuleCondition[];
    }
  | {
      type: "progressive_form";
      ref: string;
      content: PageContent;
      translations?: Translation;
      formConfig: PrescriptionFormConfig;
      displayConditions?: RuleCondition[];
    }
  | {
      type: "reading_form";
      ref: string;
      content: PageContent;
      translations?: Translation;
      formConfig: ReadingFormConfig;
      displayConditions?: RuleCondition[];
    }
  | {
      type: "upload_step";
      ref: string;
      content: PageContent;
      translations?: Translation;
      uploadConfig: UploadStepConfig;
      displayConditions?: RuleCondition[];
    }
  | {
      type: "lens_step";
      ref: string;
      name: string;
      content?: PageContent;
      translations?: Translation;
      lensConfig: LensPageConfig;
      displayConditions?: RuleCondition[];
    }
  | {
      type: "review_order";
      ref: string;
      content: PageContent & {
        priceDescription?: string; // 描述显示在总价下方
      };
      translations?: Translation;
    }
  | {
      type: "custom_step";
      ref: string;
      name: string;
      content?: PageContent;
      translations?: Translation;
      customContent?: string; // HTML
      imageUrl?: string;
      displayConditions?: RuleCondition[];
    };

export type TranslationTexts = {
    // 基础内容
    none?: string;
    grand_total?: string;

    // 处方相关
    od?: string;
    od_description?: string;
    os?: string;
    os_description?: string;
    pd?: string;
    pd_description?: string;
    two_pd_numbers?: string;
    two_pd_numbers_description?: string;
    left_pd?: string;
    right_pd?: string;
    segment_height?: string;
    segment_height_description?: string;
    note?: string;
    note_help_text?: string;

    // 度数字段
    sph?: string;
    sph_description?: string;
    cyl?: string;
    cyl_description?: string;
    axis?: string;
    axis_description?: string;
    add?: string;
    add_description?: string;
    magnification_strength?: string;
    magnification_strength_description?: string;
    birth_year?: string;
    birth_year_description?: string;
    free?: string;

    // 按钮内容
    next_button?: string;
    add_to_cart_button?: string;
    ok_button?: string;
    use_prescription_data_button?: string;
    sold_out?: string;

    // Prism 内容
    add_prism?: string;
    add_prism_description?: string;
    prism_base_direction?: string;
    prism_vertical?: string;
    prism_in?: string;
    prism_out?: string;
    prism_up?: string;
    prism_down?: string;

    // 客户处方数据
    have_saved_prescription?: string;
    choose_saved_prescription?: string;
    sign_in?: string;

    // 消息
    axis_required?: string;
    add_required?: string;
    pd_required?: string;
    prism_required?: string;
    base_direction_required?: string;
    birth_year_required?: string;

    // 结账捆绑包
    bundle_title?: string;
};

export type LocaleTranslations = {
    [locale: string]: TranslationTexts;
};

export type GlobalStyleConfig = {
    // 页面整体
    page: {
        z_index?: number;
        max_width?: string;
        padding_top?: string;
        margin_top?: string;
        background_color?: string;
        text_color?: string;
    };
    // 页面标题
    title: {
        font?: string;
        font_size?: string;
        font_weight?: string;
        color?: string;
        letter_spacing?: string;
        margin?: string;
    };
    // 页面副标题
    subtitle: {
        font?: string;
        font_size?: string;
        font_weight?: string;
        color?: string;
        letter_spacing?: string;
        margin?: string;
    };
    // 选项卡
    option: {
        border_color?: string;
        selected_border_color?: string;
        background_color?: string;
        text_color?: string;
        image_size?: 'small' | 'medium' | 'large';
        badge_background_color?: string;
        badge_text_color?: string;
        price_font?: string;
        price_color?: string;
    };
    // 进度条
    progress: {
        base_color?: string;
        highlight_color?: string;
        height?: string;
    };
    // 按钮样式
    add_to_cart_button: ButtonStyleConfig;
    next_button: ButtonStyleConfig;
    confirm_button: ButtonStyleConfig;
};

export type ButtonStyleConfig = {
    font?: string;
    font_size?: string;
    font_weight?: string;
    text_color?: string;
    background_color?: string;
    letter_spacing?: string;
    padding_desktop?: string;
    border?: string;
    border_radius?: string;
    width_desktop?: string;
};

export type AnimationType = 
    'no_animation' |
    'fade_left' | 'fade_right' | 'fade_up' | 'fade_down' | 'fade' |
    'flip_left' | 'flip_right' | 'flip_up' | 'flip_down' |
    'zoom_in_left' | 'zoom_in_right' | 'zoom_in_up' | 'zoom_in_down' | 'zoom_in' |
    'zoom_out_left' | 'zoom_out_right' | 'zoom_out_up' | 'zoom_out_down' | 'zoom_out';

export type AddToCartBehavior = 'redirect_to_cart' | 'redirect_to_checkout';

export type GlobalSettingsConfig = {
    name?: string;
    flow_key?: string;
    template?: string;
    add_to_cart_behavior?: AddToCartBehavior;
    ignore_currency_format?: boolean;
    animation?: AnimationType;
    save_customer_prescription?: boolean;
    combine_frame_lens_products?: boolean;
    use_bundled_product?: boolean;
    show_order_notes?: boolean;
};

export type FlowConfig = {
    nodes: FlowNode[];
    jumpRules: FlowJumpRule[];
    translations: LocaleTranslations;
    globalStyles: GlobalStyleConfig;
    globalSettings: GlobalSettingsConfig;
};

export type FlowJumpRule = {
    fromNodeIndex: number;
    toNodeIndex: number;
    condition: RuleCondition;  // 复用现有
};

export type Flow = {
    id: string; shopDomain: string; name: string;
    type: FlowType; status: FlowStatus;
    config: FlowConfig; productIds: string[];
    themeId?: string; createdAt: string; updatedAt: string;
};

// 隐形眼镜表单相关类型
export type ContactLensFormConfig = {
    name: string;
    internalRef: string;
    // Power values
    powerMin: number; // -20.00 到 -15.25
    powerMax: number; // +3.25 到 +8.00
    powerStep: 0.25;
    powerDisplayDirection: 'min_first' | 'max_first';
    // Base Curve
    baseCurveOptions: number[];
    baseCurveDefault: number;
    // Diameter
    diameterOptions: number[];
    diameterDefault: number;
    // Quantity
    quantityMax: number;
    quantityDefault: number;
    // Advanced
    showCustom1: boolean;
    showCustom2: boolean;
    showCustom3: boolean;
    showUploader: boolean;
    showRightEyeLeft: boolean;
    // Translations, styles, etc.
    translations: LocaleTranslations;
    globalStyles: GlobalStyleConfig;
};

export type ContactLensForm = {
    id: string;
    shopDomain: string;
    name: string;
    status: FlowStatus;
    config: ContactLensFormConfig;
    createdAt: string;
    updatedAt: string;
};
```

```typescript
// types/prescription.d.ts
export type PrescriptionSubmitMethod = "manual" | "upload" | "later";

export type PrescriptionData = {
    prescriptionType: PrescriptionType;
    od_sph?: number; od_cyl?: number; od_axis?: number; od_add?: number;
    os_sph?: number; os_cyl?: number; os_axis?: number; os_add?: number;
    pd?: number;
};

export type Prescription = {
    id: string; shopDomain: string; customerId: string;
    submitMethod: PrescriptionSubmitMethod;
    data: PrescriptionData; fileUrls: string[];
    createdAt: string;
};
```

```typescript
// types/bundle.d.ts
export type BundleItem = {
    frameProductId: string; frameVariantId: string;
    lensProductId: string; lensVariantId: string;
    lensOptionId: string; lensPrice: number;
};

export type BundleState = "pending" | "confirmed" | "failed";

export type Bundle = {
    id: string; shopDomain: string; items: BundleItem;
    prescriptionId?: string; state: BundleState;
    cartToken?: string; createdAt: string;
};
```

---

## 七、Repository 接口扩展

延续现有 `LensRepository` 风格：

```typescript
export interface FlowRepository {
    listFlows(shopDomain: string): Flow[];
    getFlow(flowId: string): Flow | undefined;
    saveFlow(flow: Flow): Flow;
    deleteFlow(flowId: string): void;
}

export interface PrescriptionRepository {
    save(prescription: Prescription): Prescription;
    getByCustomerId(shopDomain: string, customerId: string): Prescription[];
}

export interface BundleRepository {
    create(bundle: Bundle): Bundle;
    getById(bundleId: string): Bundle | undefined;
    updateState(bundleId: string, state: BundleState): Bundle;
}
```

持久化：开发期 `InMemory*` → 正式环境 Postgres + Prisma。

---

## 八、新增 REST API

沿用现有路径约定和 `{ status, body }` 响应格式。

### Admin API（`/api/admin/*`，Shopify Session Token 鉴权）

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| `GET` | `/api/admin/flows` | 列出当前 Shop 的 Flow |
| `POST` | `/api/admin/flows` | 创建 Flow |
| `PUT` | `/api/admin/flows/:id` | 更新 Flow 配置 |
| `DELETE` | `/api/admin/flows/:id` | 删除 Flow |
| `POST` | `/api/admin/flows/:id/publish` | 发布 Flow → 写入 Theme |
| `POST` | `/api/admin/flows/:id/preview` | 预览 Flow 执行路径 |

### Storefront API（`/api/products/*`、`/api/bundles/*`，App Proxy 签名校验）

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| `GET` | `/api/products/:id/flow` | 获取产品绑定的 Flow + 镜片可见性决策 |
| `POST` | `/api/bundles` | 创建 Frame + Lens Bundle |
| `POST` | `/api/bundles/:id/confirm` | 确认 Bundle |
| `POST` | `/api/prescriptions` | 提交验光数据 |
| `POST` | `/api/prescriptions/upload` | 上传验光文件 |

### Webhook API（`/api/webhooks/*`，HMAC 校验）

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| `POST` | `/api/webhooks/products_update` | 产品更新 → 刷新 ProductContext |
| `POST` | `/api/webhooks/products_delete` | 产品删除 → 清理 + 健康报警 |
| `POST` | `/api/webhooks/inventory_update` | 库存变更 → 更新变体状态 |

### 复用现有端点（不变）

- `GET/POST /api/admin/lens-rules`
- `POST /api/admin/lens-rules/preview`
- `POST /api/admin/diagnostics/lens-visibility`
- `GET /api/products/:id/lens-options`
- `GET /api/admin/health/products/:id`

---

## 九、镜片可见性规则（对齐现有代码）

完全复用 `lensRuleEngine.js`。商家在 Flow Editor 中配置的条件最终映射为 `LensRule` 存储。

### 条件 DSL（RuleCondition）

| field | operator | 说明 |
| --- | --- | --- |
| `prescriptionType` | `eq` / `neq` | 匹配 `non_prescription`、`single_vision`、`progressive`、`reading` |
| `productType` | `eq` / `neq` | 匹配产品类型 |
| `tags` | `includes` / `neq` | 匹配产品标签 |
| `variantExists` | `eq` / `neq` | Shopify 变体是否存在且未删除 |

### 优先级策略

```text
Rule 内 conditions → AND（全部满足才匹配）
Rule 间 → 按 priority 降序，高优先级覆盖低优先级
Rule 内 actions → 全部执行
```

### Logic Jump（Flow Editor 内条件跳转）

```json
{ "fromNodeIndex": 0, "toNodeIndex": 3, "condition": { "field": "prescriptionType", "operator": "eq", "value": "non_prescription" } }
```

复用 `RuleCondition`，不引入新的条件 DSL。

---

## 十、Shopify 同步模块

### 现有实现

- `diffVariantSnapshots(prev, next)` — 差分 created/updated/deleted/inventory_changed
- `buildSyncJobResult(input)` — 聚合变更统计

### 同步策略

```text
App 安装时 → 全量同步（Admin REST API 拉取 Products + Variants）
运行时 → Webhook 增量更新
兜底 → 每 15 分钟全量同步
```

### 待扩展

- `shopifySync.js` 增加 `syncProducts(shopDomain, accessToken)`
- `healthCheck.js` 基于同步结果更新诊断

---

## 十一、Bundle 模块

Shopify 不支持原生 Bundle，实现方案：

1. Storefront SDK 调用 `POST /api/bundles`（App Proxy），传入 frameVariantId + lensVariantId + lensOptionId
2. 后端创建 `Bundle` 记录（含合并价格）
3. 前端使用 Shopify Cart AJAX API，以单一 Line Item 加入购物车，properties 中携带 frame/lens 元数据
4. `POST /api/bundles/:id/confirm` 标记确认

```text
Bundle 价格 = 镜框 variant.price + 镜片 basePrice
```

---

## 十二、Theme App Extension

### 注入方式

标准 Shopify Theme App Extension（App Embed Block），在 product 模板中自动注入。

```liquid
{% if product.type == "glasses" or product.tags contains "frame" %}
  <div id="lensflow-root" data-product-id="{{ product.id }}"></div>
  <script src="{{ "lensflow-storefront.js" | asset_url }}" defer></script>
{% endif %}
```

### Storefront SDK 行为

1. 检测 `#lensflow-root`，渲染 Select Lenses 按钮
2. 监听 variant 切换
3. 调用 `GET /api/products/:id/flow` 获取 Flow + 镜片决策
4. 弹出 Modal，按 `FlowNode[]` 驱动多步骤
5. 完成 → `POST /api/bundles` → Cart AJAX → 关闭

---

## 十三、Admin UI（React + 内联样式）

Admin UI 为独立 Vite + React 应用，运行时通过 Vite proxy 将 ``/api/admin/*`` 代理到后端。

### 页面结构

| 路由 | 功能 | 说明 |
| --- | --- | --- |
| ``/`` | Dashboard 概览 | 统计卡片 + 快捷入口 |
| ``/flows`` | Flow 列表 | 表格 + 新建/编辑 |
| ``/flows/:id`` | Flow Editor（核心） | 步骤编辑器 + 镜片分配 |
| ``/rules`` | 规则管理 | 规则 CRUD 表格 |
| ``/health`` | 全局健康面板 | 诊断卡片 + 问题列表 |
| ``/analytics`` | 数据分析 | 概览 + 镜片热度图表 |

### 技术栈
- **React 18** + **React Router 6**（BrowserRouter）
- **Vite** 构建，开发时 proxy ``/api`` 到后端 ``localhost:3001``
- 纯内联样式，不依赖 Shopify Polaris（因版本 API 不兼容）
- 自定义 ``useApi`` hook 封装 fetch 调用
- 自定义 ``useI18n`` hook 支持中英文切换

---
## 十四、安全

| 层级 | 方式 |
| --- | --- |
| App 安装 | Shopify OAuth 2.0 |
| Admin API | Session Token / SKIP_AUTH |
| Storefront API | App Proxy 签名校验（signature + timestamp） |
| Webhook | HMAC-SHA256 |
| Prescription 数据 | AES-256 加密存储，HTTPS 传输 |
| 文件上传 | 限 10MB，仅 jpg/png/pdf |

---

## 十五、异常处理

| 场景 | 处理 | 来源 |
| --- | --- | --- |
| 镜片变体无库存 | 规则引擎返回 `hidden`（`SHOPIFY_VARIANT_MISSING`） | `lensRuleEngine` |
| 商品已删除 | 健康检查报 `MISSING_VARIANT`/`DELETED_VARIANT_REFERENCED` | `healthCheck` |
| 镜片产品未上架 | 健康检查报 `PRODUCT_NOT_ACTIVE`（状态非 Active），前端提示商家 | `healthCheck` |
| Flow 未发布 | API 返回 `{ published: false }`，前端隐藏按钮 | `FlowRepository` |
| 上传失败 | 返回 400 + 可重试 | 新增 |
| 规则优先级冲突 | 健康检查 warning `RULE_PRIORITY_CONFLICT` | `healthCheck` |

---
## 十八、技术决策总结

| 决策项 | 选择 | 理由 |
| --- | --- | --- |
| App 类型 | Shopify Embedded App | 商家无需离开 Shopify 后台 |
| 后端框架 | Node.js 原生 HTTP | 保持现有代码零依赖风格 |
| Admin UI | 纯 React + 内联样式 | Polaris v13 API 不兼容，改用纯 React |
| Storefront SDK | Vanilla JS | 最小体积，兼容所有主题 |
| 数据库 | InMemory → Postgres + Prisma | 仓储接口支持无缝替换 |
| 规则引擎 | 复用 lensRuleEngine.js | 已完备 |
| 条件 DSL | 复用 RuleCondition | 已涵盖所有场景 |
| Shopify 同步 | Admin API + Webhook + 现有 shopifySync | 已有差分核心逻辑 |


### 环境变量

| 变量 | 说明 |
| --- | --- |
| `SKIP_AUTH=true` | 开发环境跳过 Shopify OAuth 鉴权 |
| `DATABASE_URL` | 存在时切换 Prisma（Postgres），否则使用 InMemory |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | Shopify App 凭证 |
| `HOST` | App 公网 URL（如 trycloudflare 域名） |

---

## 十九、竞品功能参考（来自 LOOL）

以下功能基于竞品调研，标注了是否纳入 LensFlow 当前规划以及对应优先级。

### 19.1 隐形眼镜验光表单

LOOL 支持 SPH（球镜）/ CYL（柱镜）/ ADD（下加）三个度数字段，商家可在 Translations 中自定义字段名。

**LensFlow 对齐**：已在 `PrescriptionData` 类型中定义 `od_sph/od_cyl/od_add` 等字段（见第六章），P1 阶段实现表单录入。隐形眼镜暂不在 MVP 范围。

### 19.2 镜片选项徽章（Badge）

LOOL 允许商家为镜片选项添加徽章，并自定义样式。

**LensFlow 对齐**：在 `LensOption` 类型中增加 `badge?: { text: string; style?: string }`，Storefront SDK 渲染时展示。P2 实现。

```typescript
// 扩展 LensOption
export type LensOption = {
    id: string;
    name: string;
    basePrice: number;
    badge?: { text: string; style?: "default" | "premium" | "custom" };
    description?: string;        // 简短描述
    modalDescription?: string;   // HTML 弹窗描述（支持图片/链接）
    imageUrl?: string;           // 镜片预览图
};
```

### 19.3 镜片描述与图片

LOOL 支持为镜片选项添加描述（两种模式：简短文本 / HTML 弹窗）和产品图片，多变体时分别设置。

**LensFlow 对齐**：已在扩展 `LensOption` 中加入 `description`、`modalDescription`、`imageUrl`。Storefront SDK 根据字段展示。P1 实现。

### 19.4 基于验光数据的可见性条件

LOOL 支持按 SPH 值等度数字段控制镜片是否显示（仅 Prescription-first 模式）。

**LensFlow 对齐**：扩展 `RuleCondition.field` 增加度数字段：

```typescript
// 扩展 RuleConditionField
export type RuleConditionField =
    | "prescriptionType" | "productType" | "tags" | "variantExists"
    | "od_sph" | "od_cyl" | "od_add"  // 右眼度数
    | "os_sph" | "os_cyl" | "os_add"  // 左眼度数
    | "submitMethod";                 // 提交方式
```

新增 `operator`：`gt`（大于）、`lt`（小于）、`gte`、`lte`。P2 实现。

### 19.5 Logic Jump（多步骤跳转）

LOOL 支持超过 1 个 Lens Step 时启用 Logic Jump，每个选项可指定 LeadsTo 目标页面。

**LensFlow 对齐**：已在 `FlowJumpRule` 中定义跳转规则（见第六章）。需要在 `FlowNode` 中增加 `ref` 内部标识，支持同名校验。P2 实现。

```typescript
// 扩展 FlowNode
export type FlowNode =
    | { type: "lens_step"; ref: string; name: string }  // 增加 ref + name
    | // ... 其他节点
```

### 19.6 布局模式

LOOL 提供 3 种镜片选项布局：Default、Disclosure（折叠面板）、Variant-as-product（每个变体独立卡片）。多变体时可选后两种。

**LensFlow 对齐**：在 `FlowConfig` 中增加 `layout` 字段，Storefront SDK 根据布局渲染不同 UI。P2 实现。

```typescript
export type OptionLayout = "default" | "disclosure" | "variant_as_product";
export type FlowConfig = {
    nodes: FlowNode[];
    jumpRules: FlowJumpRule[];
    layout?: OptionLayout;  // 新增
};
```

### 19.7 Combined Product（合并商品）

LOOL 提供将所有产品合并为一个商品的模式：复制镜框商品作为主商品，加入购物车时生成 combo 变体；下单后删除临时变体、扣减原始库存。

**LensFlow 对齐**：
```text
前提条件：主商品每个变体必须有唯一 SKU，且仅在一个位置出现
ATC 流程：
  1. 创建 combo 变体（SKU = frame_sku + "_" + lens_sku）
  2. 以 combo 变体作为 Line Item 加入购物车
下单后：
  1. 删除 combo 变体
  2. 扣减原始 frame + lens 变体库存
```
P2 实现。

### 19.8 自动触发/隐藏 Select Lenses 按钮

LOOL 通过 Shopify Metafield 控制：选择特定 variant 时自动触发点击或隐藏按钮。

**LensFlow 对齐**：定义两组 metafield：

| Metafield | 用途 |
| --- | --- |
| `lensflow.autoTriggerVariantIds` | 选中这些变体时自动弹出 Flow Modal |
| `lensflow.autoHideVariantIds` | 选中这些变体时隐藏 Select Lenses 按钮 |

Storefront SDK 监听 variant 切换时读取 metafield 值（逗号分隔 variantId）并执行对应行为。P1 实现。

### 19.9 Bundle Delete Action

LOOL 在 Theme App Extension 中提供"Bundle delete action"开关：删除镜框或镜片时自动级联删除关联商品。

**LensFlow 对齐**：在 App Embed Block 设置中增加 `bundleDeleteAction` 开关，Storefront SDK 监听 Cart API 的 remove 事件，同步删除 Bundle 中关联 Line Item。P2 实现。

### 19.10 Skip Step（跳过步骤）

LOOL 支持创建价格为 0 的商品作为"跳过"选项，买家选择后跳过该步骤。

**LensFlow 对齐**：在 `FlowNode` 中增加 `skippable?: boolean`，并在 `LensOption` 中增加 `isSkipOption?: boolean`。Storefront SDK 识别后自动跳转到下一步。P2 实现。

### 19.11 隐藏镜片商品

LOOL 通过将镜片商品 vendor 改为 `lool`、在 All collection 添加排除条件、设置搜索隐藏 metafield 来防止镜片商品独立出现在店铺前台。

**LensFlow 对齐**：在安装向导中引导商家：

1. 将镜片产品 vendor 统一设为 `lensflow-lens`
2. 自动在 All collection 添加条件 `vendor != lensflow-lens`（通过 Theme API）
3. 提供 `lensflow.hideFromSearch` metafield（值为 1 时隐藏），Storefront SDK 搜索过滤
P1 实现。

### 19.12 Flow 绑定到特定产品

LOOL 通过产品模板 + Select Lenses Block 实现 Flow 到产品的精确绑定，不同产品可使用不同模板。

**LensFlow 对齐**：已在 Flow 类型中包含 `productIds`，Theme App Extension 根据当前产品 ID 匹配对应 Flow。P1 实现。

### 19.13 变体同步

LOOL 中新增的变体不会自动出现在 App 中，需要商家手动重新绑定。

**LensFlow 对齐**：通过 Webhook (`products/update`) 自动检测新增变体，更新 `ProductContext.variants`，通过健康检查提醒商家更新规则。P1 实现。

---

## 二十、更新后的 MVP 范围

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| **P0** | 镜片规则引擎、规则 CRUD、镜片选项查询、健康检查、可见性诊断、变体差分 | ✅ 已完成 |
| **P1-已完成** | Shopify OAuth · Flow 管理 API · Flow Editor (React) · Prescription 录入/上传 · Bundle 创建+购物车 · Theme App Extension + Storefront SDK · Webhook · Flow 绑定特定产品 | ✅ 已完成 |
| **P1-待做** | 镜片描述/图片 · 自动触发/隐藏按钮 · 隐藏镜片商品 · 变体自动同步(Webhook) · Metafield API · Collection 管理 | 📋 待开发 |
| **P2-部分完成** | Logic Jump · Analytics · 多语言 | ✅ 已完成 |
| **P2-待做** | AI 镜片推荐(需API) · OCR 验光单识别(需API) · 度数字段可见性条件 · Badge 徽章 · 布局模式(Disclosure/Variant-as-product) · Combined Product · Bundle Delete Action · Skip Step | 📋 下期 |

---

## 二十一、服务模块总览（实际 vs 计划）

```text
dist/src/ （✅ 全部已实现）
├── auth/       shopifyOAuth.js         ✅ Shopify OAuth 安装/回调
├── domain/     lensRuleEngine.js       ✅ 规则引擎
│               flowExecutor.js         ✅ Flow 步骤驱动 + Logic Jump
│               bundleBuilder.js        ✅ Bundle 合算
├── services/   productLensOptions.js   ✅ 镜片选项分类
│               healthCheck.js          ✅ 健康诊断
│               diagnostics.js          ✅ 可见性诊断
│               analyticsService.js     ✅ Analytics 数据
│               shopifySync.js          ✅ 变体同步差分
│               flowService.js          ✅ Flow CRUD
│               prescriptionService.js  ✅ 验光数据管理
│               bundleService.js        ✅ Bundle 管理
├── repositories/ InMemory + Prisma     ✅ 双实现
├── api/         lensApi / flowApi /     ✅ 全部 REST API
│               prescriptionApi /
│               bundleApi / analyticsApi /
│               proxyApi / webhookHandler
├── types/       lens / flow /           ✅ 类型定义
│               prescription / bundle / sync
├── locales/     en.json / zh-CN.json    ✅ 中英双语
│
📋 计划新增（P1-待做）：
├── services/   metafieldService.js     📋 Shopify Metafield 读写
│               collectionService.js    📋 Collection 条件管理
├── api/        metafieldApi.js         📋 Metafield REST API
└── domain/     combinedProductBuilder.js 📋 P2：Combo 变体

admin-ui/ （✅ 已实现）
├── src/pages/  Dashboard / Flows /     ✅ 6 个页面
│               FlowEditor / Rules /
│               Analytics / Health
├── src/hooks/  useApi / useI18n        ✅ 自定义 hooks
└── src/locales/ en.json / zh-CN.json   ✅ 中英双语

extensions/theme-app-extension/ （✅ 已实现）
├── blocks/     lens-flow.liquid        ✅ App Embed Block
├── assets/     lens-flow.js / .css     ✅ Storefront SDK
└── locales/    en.json / zh-CN.json    ✅ 翻译
```
---

## 二十二、竞品关键差异对比

| 功能 | LOOL | LensFlow 策略 |
| --- | --- | --- |
| 规则引擎 | 黑盒条件 | 开放 DSL（RuleCondition），可复用、可诊断 |
| 后端框架 | 未知 | 零依赖 Node.js 原生 HTTP，轻量透明 |
| 仓储模式 | 未知 | Repository 接口 + InMemory/Prisma 双实现 |
| 健康诊断 | 无 | 内置 6 类健康检查，主动报警 |
| Bundle 模式 | Combined Product | Combined Product（P2）+ 标准 Bundle 双模式 |
| 价格 | 收费 SaaS | 开源核心 + 可自部署

---

## 二十三、基于UI截图的详细功能说明

### 23.1 Flow 类型对比

根据UI截图，系统支持两种核心Flow类型：

**Prescription-first 类型**
- 买家流程：选择处方类型 → 选择提交方式 → 填写处方表单 → 选择镜片 → 订单回顾
- 特点：先确定配镜需求，再选择镜片产品
- 支持镜片选择步骤的Logic Jump（逻辑跳转）

**Lens-first 类型（新增）**
- 买家流程：选择处方类型 → 选择镜片 → 选择提交方式 → 填写处方表单 → 订单回顾
- 特点：先选择镜片产品，再处理处方信息
- 支持镜片选择页面的Logic Jump

### 23.2 Flow 编辑器核心功能

#### 顶部导航标签页
Flow编辑器具有以下标签页：
1. **处方** - 配置处方相关页面
2. **镜片** - 配置镜片选择页面
3. **订单预览** - 配置订单回顾页面
4. **文本翻译** - 多语言翻译管理
5. **全局样式** - 全局样式配置
6. **全局设置** - 全局设置项
7. **发布** - 发布功能

#### 页面配置功能（通用）
每个页面支持以下配置：

**页面内容配置**
- 标题（Title）- 支持多语言翻译
- 副标题（Subtitle）- 支持多语言翻译
- 描述（Description）- HTML支持，模态框显示
- 底部描述（Bottom Description）- 显示在最后一个选项下方，HTML支持

**显示设置**
- 跳过（Skip if single option）- 如果只有一个选项，消费者将直接被推到下一步
- 显示条件（Display Conditions）- 只有满足特定条件时，该页面才显示给用户

#### 处方类型页面（prescription_type）
- **支持的处方类型**：
  - 单光（Single Vision）- 包含SPH度数、CYL散光、Axis轴位、Prism棱镜（可选）
  - 渐进/双光（Progressive/Bifocal）- 包含SPH、CYL、Axis、ADD、Prism
  - 老花（Reading）- 包含放大度数
  - 文件上传（Upload）- 可选

- **每个处方类型选项配置**：
  - 名称（Name）
  - 描述（Description）
  - 图片（Image URL）
  - 价格（Price）
  - Leads To - 选择该选项后跳转到的目标页面（ref）
  - 启用/禁用
  - 显示顺序（Display Order）

- **选项操作**：
  - 上移/下移
  - 删除

#### 提交方式页面（submit_method）
- **支持的提交方式**：
  - 手动输入（Manual）
  - 上传文件（Upload）
  - 稍后提供（Later/Email）

- **配置项**：
  - 启用手动输入方式
  - 启用上传处方文件方式
  - 启用发送邮件方式

#### 处方表单页面（single_vision_form / progressive_form / reading_form）
**单光/渐进表单字段配置**：
- **SPH（度数）值**：
  - 最小值（Min）
  - 最大值（Max）
  - 显示方向（Display Direction）- 值小的在上方 / 值大的在上方

- **CYL（散光）值**：
  - 最小值、最大值、显示方向

- **Axis（轴位）值**：
  - 固定包含1到180

- **ADD（下加光）值**（渐进专用）：
  - 最小值、最大值、步进（Step）

- **PD（瞳距）值**：
  - 最小值、最大值

**老花(Reading)表单字段配置**（简化版）：
- **Magnification strength（老花度数）值**：
  - 最大值（Max）
  - 步进（Step）

**高级设置**（单光/渐进）：
- 启用棱镜值（Prism values）
- 隐藏散光值（Hide CYL and Axis values）
- 接受空的瞳距值（Accept empty PD）
- 默认接受2个（一左一右）瞳距值
- 接受空的ADD值（渐进专用）
- 接受出生年份值
- 接受段高值（Segment Height，买家非必选）

#### 文件上传页面（upload_step）
- **上传组件配置**：
  - 标题
  - 描述
- **设置**：
  - 显示瞳距(PD)值选择器 - 对于上传处方，是否显示PD选择器

#### 镜片页面配置（lens tabs）
**镜片页面管理**：
- 支持添加多个镜片页面
- 页面类型下拉选择（Lens Type / Lens）
- 页面操作：左移、右移、删除

**镜片选项配置**：
- 支持添加多个选项（Add option）
- 每个选项配置：
  - 内部引用（Internal reference）- 供内部识别，客户看不到
  - 复制、删除、上移、下移操作
  - 编辑选项（Edit this option）- 展开详细配置

**镜片选项详细配置（展开后）**：
- **徽章（Badge）**：
  - 徽章文本（如"强烈推荐"）
  - 支持添加翻译

- **标题**：
  - 自定义标题（如果留空，将使用绑定的产品标题）
  - 支持添加翻译

- **描述（模态显示）**：
  - HTML支持
  - 如果填写了描述，选项左侧会出现问号图标，点击显示描述
  - 支持添加翻译

- **产品绑定**：
  - `编辑镜片产品` - 点击跳转到当前绑定产品的编辑页面
  - `更换镜片产品` - 点击弹出产品选择器
  - 每个选项只能绑定一个产品
  - 产品信息展示卡片（显示产品标题、Tags、Prices）
  - 如果产品显示为"默认标题"(Default title)，提供"修复显示问题"按钮
  - 如果产品没有库存，该选项会被隐藏

- **显示条件（Display Conditions）**：
  - 可根据买家提供的处方信息决定是否显示此选项
  - 支持Open/关闭切换

- **教程链接**：
  - 如何为选项添加描述？
  - 如何为选项添加图片？
  - 如何修改选项卡的模版样式？

**镜片页面设置**：
- 自动跳转到下一页 - 当消费者选择镜片产品后，自动跳转

**逻辑跳转(Logic Jumps)**：
- 开关控制启用/禁用
- 默认情况下按顺序查看镜片页面
- 启用后可根据选择的答案跳转特定页面
- 支持添加第一个镜片页面作为所有镜片步骤的开始
- 可根据不同处方类型或提交方式设置不同的镜片旅程

#### 订单预览页面（review_order）
- **页面内容配置**：
  - 标题
  - 副标题
  - 描述（显示在总价的下方）- HTML支持

### 23.3 Flow 列表页面功能
- 显示所有Flow的表格
- 列：名称、类型、产品数量、状态、操作
- 操作：编辑、发布、删除、复制
- 支持创建新Flow，选择类型（prescription_first / lens_first）

### 23.4 文本翻译（文本翻译标签页）

#### 内容区域（左侧面板）
所有表单字段和标签的翻译：

**基础内容：**
- `none` - "None" 标签
- `grand_total` - "Grand total" 标签

**处方相关内容：**
- `od` - "OD (Right)" 标签（右眼）
- `od_description` - OD 描述（支持 HTML）
- `os` - "OS (Left)" 标签（左眼）
- `os_description` - OS 描述（支持 HTML）
- `pd` - "PD" 标签（瞳距）
- `pd_description` - PD 描述（支持 HTML）
- `two_pd_numbers` - "2 PD numbers" 标签
- `two_pd_numbers_description` - 2 PD 描述（支持 HTML）
- `left_pd` - "Left PD" 标签
- `right_pd` - "Right PD" 标签
- `segment_height` - "Segment height" 标签
- `segment_height_description` - 段高描述（支持 HTML）
- `note` - "Note" 标签
- `note_help_text` - 备注帮助文本（仅文本，不支持 HTML）

**度数字段：**
- `sph` - "SPH" 标签
- `sph_description` - SPH 描述（支持 HTML）
- `cyl` - "CYL" 标签
- `cyl_description` - CYL 描述（支持 HTML）
- `axis` - "AXIS" 标签
- `axis_description` - AXIS 描述（支持 HTML）
- `add` - "ADD" 标签
- `add_description` - ADD 描述（支持 HTML）
- `magnification_strength` - "Magnification Strength" 标签（老花度数）
- `magnification_strength_description` - 老花度数描述（支持 HTML）
- `birth_year` - "Year of birth" 标签
- `birth_year_description` - 出生年份描述（支持 HTML）
- `free` - "FREE" 标签

#### 按钮内容（右侧面板）
- `next_button` - "Next" 按钮文本
- `add_to_cart_button` - "Add to cart" 按钮文本
- `ok_button` - "OK" / "Got it, thanks!" 按钮文本
- `use_prescription_data_button` - "Use this prescription data" 按钮文本
- `sold_out` - "Sold out" 文本

#### Prism 内容（棱镜相关）
- `add_prism` - "Add Prism" 文本
- `add_prism_description` - 添加棱镜描述（支持 HTML）
- `prism_base_direction` - "Base Direction" 标签
- `prism_vertical` - "Vertical (Δ)" 标签
- `prism_in` - "In" 标签
- `prism_out` - "Out" 标签
- `prism_up` - "Up" 标签
- `prism_down` - "Down" 标签

#### Customer Prescription data（客户处方数据）
- `have_saved_prescription` - "Have a saved prescription?" 文本
- `choose_saved_prescription` - "Choose a saved prescription" 文本
- `sign_in` - "Sign In" 文本

#### Messages（错误/提示消息）
- `axis_required` - Axis 必填消息 ("You chose CYL value, please add the Axis value")
- `add_required` - ADD 必填消息 ("You selected Progressive Lenses as primary use of your glasses, please input your ADD for the reading portion of your glasses")
- `pd_required` - PD 必填消息 ("Please choose the PD value")
- `prism_required` - Prism 必填消息 ("Please choose the prism value")
- `base_direction_required` - Base direction 必填消息 ("Please choose the base direction of your prism")
- `birth_year_required` - 出生年份必填消息 ("Please choose the year of birth")

#### Checkout bundle（结账捆绑包）
- `bundle_title` - "Frame + Lenses" 捆绑包标题

#### 翻译功能特性
- 每个文本项都有独立的"添加翻译"按钮
- 支持为每个字段配置多语言翻译
- 某些字段支持 HTML（描述类），某些仅支持纯文本
- 翻译配置与 Flow 一起保存和发布

### 23.5 全局样式（全局样式标签页）

#### 页面整体样式
- `z_index` - 页面层级 (Z Index)
- `max_width` - 最大宽度 (Max width)
- `padding_top` - 顶部内边距
- `margin_top` - 顶部外边距
- `background_color` - 背景颜色
- `text_color` - 文字颜色

#### 页面标题样式
- `title_font` - 字体
- `title_font_size` - 字体大小
- `title_font_weight` - 字体粗细
- `title_color` - 字体颜色
- `title_letter_spacing` - 字符间距
- `title_margin` - 外边距

#### 页面副标题样式
- `subtitle_font` - 字体
- `subtitle_font_size` - 字体大小
- `subtitle_font_weight` - 字体粗细
- `subtitle_color` - 字体颜色
- `subtitle_letter_spacing` - 字符间距
- `subtitle_margin` - 外边距

#### 选项卡样式
- `option_border_color` - 边框颜色
- `option_selected_border_color` - 选中边框颜色
- `option_background_color` - 背景颜色
- `option_text_color` - 文本颜色
- `option_image_size` - 图片尺寸（大/中/小）
- `option_badge_background_color` - 徽章背景颜色
- `option_badge_text_color` - 徽章文本颜色
- `option_price_font` - Price字体
- `option_price_color` - Price颜色

#### 进度条样式
- `progress_base_color` - 基础颜色
- `progress_highlight_color` - 高亮颜色
- `progress_height` - 高度

#### 按钮样式（通用按钮配置）
**加入购物车按钮 / 下一页按钮 / 确认按钮**
- `font` - 字体
- `font_size` - 字体大小
- `font_weight` - 字体粗细
- `text_color` - 文本颜色
- `background_color` - 背景颜色
- `letter_spacing` - 字符间距
- `padding_desktop` - 桌面端内边距
- `border` - 边框
- `border_radius` - 边框圆角
- `width_desktop` - 电脑端宽度（100%或具体值）

---

### 23.6 全局设置（全局设置标签页）

#### 基础设置
- `name` - Flow名称（内部使用，消费者看不到）
- `flow_key` - 流程密钥（用于在店面安装，含Copy按钮）

#### 模版
- `template` - 模版选择（如 Default）
- `preview` - 模版预览（可关闭预览窗口）

#### 加入购物车设置
- `add_to_cart_behavior` - 加入购物车按钮行为
  - `redirect_to_cart` - 跳转到购物车页面
  - `redirect_to_checkout` - 跳转到结账页面

#### 高级设置
- `ignore_currency_format` - 忽略货币格式（如果货币格式显示有问题）
- `animation` - 动画效果
  - `no_animation` - 无动画
  - `fade_left` / `fade_right` / `fade_up` / `fade_down` / `fade`
  - `flip_left` / `flip_right` / `flip_up` / `flip_down`
  - `zoom_in_left` / `zoom_in_right` / `zoom_in_up` / `zoom_in_down` / `zoom_in`
  - `zoom_out_left` / `zoom_out_right` / `zoom_out_up` / `zoom_out_down` / `zoom_out`
- `save_customer_prescription` - 保存买家处方信息（买家可在已保存处方中选择）
- `combine_frame_lens_products` - 组合镜框和镜片产品（会复制镜框产品）
- `use_bundled_product` - 使用捆绑产品（购物车显示为一个产品，Checkout显示为组合产品，可在文本翻译标签修改名称）
- `show_order_notes` - 显示订单备注（在手动输入处方、上传处方文件、订单预览页面显示备注输入框）

#### 升级提示
- 显示"升级到任意套餐解锁下列功能"提示横幅

---

### 23.7 发布标签页
- 显示配镜流程状态（草稿/已发布）
- 显示"发布"按钮
- 首次发布时显示提示弹窗
  - 提示完成发布任务
  - 说明默认配置已完成
  - 非2.0主题模板可联系安装服务

---

## 二十四、隐形眼镜表单功能（Contact lens forms）

### 24.1 隐形眼镜表单列表
- 显示所有隐形眼镜表单
- 操作按钮：复制、删除、修改
- 创建新表单按钮

### 24.2 隐形眼镜表单配置（表单字段配置标签页）

#### Power values（度数配置）
- `power_min` - 最小值（范围 -20.00 到 -15.25）
- `power_max` - 最大值（范围 +3.25 到 +8.00）
- `power_step` - 步长（固定 0.25）
- `power_display_direction` - 显示方向（值小的在上方/值大的在上方）

#### Base Curve values（基弧配置）
- `base_curve_options` - 可选项列表（如 8.5, 8.6, 8.7, 9.0 等）
  - 每个选项可删除
- `base_curve_default` - 默认值

#### Diameter values（直径配置）
- `diameter_options` - 可选项列表（如 14.2, 14.3 等）
  - 每个选项可删除
- `diameter_default` - 默认值

#### 数量配置
- `quantity_max` - 最大值
- `quantity_default` - 默认值（必须小于最大值）

#### 高级配置
- `show_custom1` - 显示附加选项 (custom1)
- `show_custom2` - 显示附加选项 (custom2)
- `show_custom3` - 显示附加选项 (custom3)
- `show_uploader` - 显示上传器（处方文件）
- `show_right_eye_left` - 显示右眼表单在左侧

### 24.3 隐形眼镜表单其他标签页
- 文本翻译
- 全局样式
- 发布

> **⚠️ 暂缓实现功能**：以下价格相关功能暂不实现
> - 文本翻译中的 `Price per box` 和 `Total boxes`
> - 全局样式中的 `价格文本样式`、`每盒价格文本样式`、`总盒数文本样式`、`选择器标题样式`、`选择器样式`、`价格预览盒样式`

---

## 二十五、订单管理（Orders）
- 显示通过 LooL 产生的订单列表
- 列：订单、买家、流程、佣金、总价(不含运费)、处方
- 分页导航

---

## 二十六、数据模型更新总结

### 新增类型
1. `PageContent` - 页面内容（标题、副标题、描述）
2. `TranslationTexts` - 完整的翻译文本配置
3. `LocaleTranslations` - 按语言区域的翻译
4. `PrescriptionTypeOption` - 处方类型选项
5. `SubmitMethodOption` - 提交方式选项
6. `FormFieldConfig` - 表单字段配置
7. `PrescriptionFormConfig` - 单光/渐进处方表单完整配置
8. `ReadingFormConfig` - 老花表单配置（简化版，只有老花度数）
9. `UploadStepConfig` - 文件上传页面配置
10. `LensOption` - 镜片选项配置
11. `LensPageConfig` - 镜片页面配置
12. `GlobalStyleConfig` - 全局样式配置
13. `ButtonStyleConfig` - 按钮样式配置
14. `GlobalSettingsConfig` - 全局设置配置
15. `AnimationType` - 动画类型枚举
16. `AddToCartBehavior` - 加入购物车行为枚举
17. `ContactLensFormConfig` - 隐形眼镜表单配置
18. `ContactLensForm` - 隐形眼镜表单实体

### 扩展 FlowNode
每个节点现在包含：
- `ref` - 唯一标识，用于Logic Jump跳转
- `content` - 页面内容配置
- `translations` - 多语言翻译
- `displayConditions` - 显示条件
- 类型特定配置（options、formConfig等）

---

## 二十五、待开发功能优先级

### P0 - 核心功能重构
1. 重构 FlowEditor UI，实现基于截图的完整界面（顶部标签页、左侧页面导航等）
2. 更新类型定义（flow.d.ts）- 包含新的老花表单、上传页面、镜片页面配置
3. 实现处方类型页面配置
4. 实现提交方式页面配置
5. 实现处方表单配置（单光/渐进/老花 - 注意老花表单是简化版）
6. 实现文件上传页面配置（标题、描述、PD选择器开关）
7. 实现镜片页面配置（多页面管理、选项配置、自动跳转开关）
8. **实现镜片选项的产品绑定功能**
   - 产品选择器弹窗（搜索产品、筛选、选择）
   - 编辑产品跳转
   - 产品信息展示卡片
   - 修复显示问题按钮
9. 实现订单预览页面配置
10. 实现显示条件（Display Conditions）
11. 实现 Leads To 逻辑跳转
12. 实现镜片页面的 Logic Jumps（逻辑跳转）功能

### P1 - 完善功能
12. 多语言翻译支持
13. 全局样式和设置
14. lens_first 类型Flow支持
15. Flow复制功能

### P2 - 增强功能
12. 高级表单验证
13. 更多样式定制选项
14. Analytics 增强

---

## 二十六、更新后的MVP范围

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| **P0** | 镜片规则引擎、规则 CRUD、镜片选项查询、健康检查、可见性诊断、变体差分 | ✅ 已完成 |
| **P1-已完成** | Shopify OAuth · Flow 管理 API · 基础 Flow Editor (React) · Prescription 录入/上传 · Bundle 创建+购物车 · Theme App Extension + Storefront SDK · Webhook · Flow 绑定特定产品 | ✅ 已完成 |
| **P1-需重构** | Flow Editor 完整UI重构（基于截图）、处方类型配置、提交方式配置、处方表单配置、显示条件、Leads To跳转 | 🔄 待重构 |
| **P1-待做** | 镜片描述/图片 · 自动触发/隐藏按钮 · 隐藏镜片商品 · 变体自动同步(Webhook) · Metafield API · Collection 管理 · 多语言翻译 · 全局样式设置 | 📋 待开发 |
| **P2-部分完成** | 基础Logic Jump · Analytics · 多语言框架 | ✅ 部分完成 |
| **P2-待做** | AI 镜片推荐(需API) · OCR 验光单识别(需API) · 度数字段可见性条件 · Badge 徽章 · 布局模式(Disclosure/Variant-as-product) · Combined Product · Bundle Delete Action · Skip Step | 📋 下期 |

---

## 二十七、服务模块总览（更新后）

```text
dist/src/ （✅ 核心已实现）
├── auth/       shopifyOAuth.js         ✅ Shopify OAuth 安装/回调
├── domain/     lensRuleEngine.js       ✅ 规则引擎
│               flowExecutor.js         ✅ Flow 步骤驱动 + Logic Jump
│               bundleBuilder.js        ✅ Bundle 合算
├── services/   productLensOptions.js   ✅ 镜片选项分类
│               healthCheck.js          ✅ 健康诊断
│               diagnostics.js          ✅ 可见性诊断
│               analyticsService.js     ✅ Analytics 数据
│               shopifySync.js          ✅ 变体同步差分
│               flowService.js          🔄 需要扩展支持新数据模型
│               prescriptionService.js  ✅ 验光数据管理
│               bundleService.js        ✅ Bundle 管理
│               metafieldService.js     📋 待完善
│               collectionService.js    📋 待完善
├── repositories/ InMemory + Prisma     ✅ 双实现，需要扩展
├── api/         lensApi / flowApi /     ✅ 核心API，需要扩展
│               prescriptionApi /
│               bundleApi / analyticsApi /
│               proxyApi / webhookHandler /
│               metafieldApi.js         📋 待完善
├── types/       lens / flow /           🔄 需要更新
│               prescription / bundle / sync
├── locales/     en.json / zh-CN.json    ✅ 中英双语框架
│
📋 需重构/新增：
├── domain/     flowConfigValidator.js  📋 Flow配置验证
├── services/   flowConfigService.js    📋 Flow配置管理
├── api/        flowConfigApi.js        📋 Flow配置REST API

admin-ui/ （🔄 需要重构）
├── src/pages/  Dashboard / Flows /     ✅ 基础页面
│               FlowEditor / Rules /    🔄 FlowEditor需要大幅重构
│               Analytics / Health
├── src/components/                     📋 需要新增丰富组件
│               PageConfigEditor.jsx
│               PrescriptionTypeEditor.jsx
│               SubmitMethodEditor.jsx
│               PrescriptionFormEditor.jsx
│               DisplayConditionBuilder.jsx
│               TranslationEditor.jsx
├── src/hooks/  useApi / useI18n        ✅ 自定义 hooks
└── src/locales/ en.json / zh-CN.json   ✅ 需扩展翻译

extensions/theme-app-extension/ （🔄 需要扩展）
├── blocks/     lens-flow.liquid        ✅ App Embed Block
├── assets/     lens-flow.js / .css     🔄 需要支持新的Flow配置
└── locales/    en.json / zh-CN.json    ✅ 翻译
```
