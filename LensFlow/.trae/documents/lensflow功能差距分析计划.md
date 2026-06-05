# LensFlow — 功能差距分析计划

> 基于 PRD.md、TODO.md、Shopify App Dev 最佳实践与实际代码现状的全面差距分析。

---

## 〇、技术栈升级决策：Ant Design + Tailwind CSS

### 现状
Admin UI 当前使用 **Shopify Polaris v13** 的 `AppProvider` 包装，但实际组件全部使用**纯内联样式 (inline styles)** 编写。PRD 已明确指出"Polaris v13 API 不兼容，改用纯 React"。

### 决策：全面迁移至 Ant Design 5 + Tailwind CSS 3

| 维度 | 旧方案 | 新方案 | 理由 |
|---|---|---|---|
| 组件库 | Polaris v13 (仅 AppProvider) + 内联样式 | **Ant Design 5** | 企业级组件完整、中英文国际化内置、Form/Table/Tabs/Modal 等开箱即用 |
| 样式方案 | 纯内联 style 属性 | **Tailwind CSS 3** | 原子化 CSS 快速布局、配合 Ant Design 覆盖组件样式、无运行时开销 |
| 布局 | 手动 div + style | **Ant Design Layout + ProLayout 风格** | 侧边栏导航、面包屑、页头统一 |
| 表单 | 手写 input/select | **Ant Design Form** | 校验规则、动态表单项、表单联动 |
| 表格 | 手写 table | **Ant Design Table** | 排序、筛选、分页、行操作 |
| 嵌入鉴权 | `@shopify/app-bridge` + `@shopify/app-bridge-react` | **保留不变** | Shopify Embedded App 必需 |
| 路由 | React Router v7 (HashRouter) | **保留不变** | Embedded App 标准方案 |

### 迁移步骤

```
admin-ui/
├── package.json          🔄 移除 @shopify/polaris，添加 antd + tailwindcss + autoprefixer + postcss
├── tailwind.config.js    🆕 Tailwind 配置
├── postcss.config.js     🆕 PostCSS 配置
├── src/
│   ├── index.css         🆕 Tailwind 指令 + Ant Design 主题变量覆盖
│   ├── App.jsx           🔄 Polaris AppProvider → Ant Design ConfigProvider + App
│   ├── main.jsx          🔄 导入 index.css
│   └── components/       🔄 全部组件用 Ant Design + Tailwind 重写
```

### Ant Design 组件映射

| 原内联实现 | Ant Design 替代 |
|---|---|
| 手写 NavBar | `Layout.Header` + `Menu` (horizontal) |
| 手写 Card 容器 | `Card` |
| 手写 Button | `Button` |
| 手写 Table | `Table` |
| 手写 Form/Input/Select | `Form.Item` + `Input` / `Select` / `InputNumber` |
| 手写 Modal | `Modal` |
| 手写 Tag/Status | `Tag` / `Badge` |
| 手写 Tabs | `Tabs` |
| 手写 Switch | `Switch` |
| 手写 Notification | `message` / `notification` |
| 手写 Popover/工具提示 | `Tooltip` / `Popover` |
| 手写 Dropdown | `Dropdown` |
| 手写 Collapse | `Collapse` |
| 手写 Upload | `Upload` |
| 手写 ColorPicker | `ColorPicker` |
| 手写 Spin (loading) | `Spin` |
| 手写 Empty | `Empty` |

### Ant Design 主题定制

```js
// Ant Design 5 主题 token 覆盖 — 匹配 Shopify 设计语言
{
  token: {
    colorPrimary: '#005bd3',       // Shopify 品牌蓝
    borderRadius: 6,               // Shopify 圆角
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
}
```

---

## 一、当前实现状态总览

### ✅ 已完成（PRD 确认）
| 模块 | 内容 |
|---|---|
| P0 核心 | 规则引擎 (lensRuleEngine)、规则 CRUD、镜片选项查询、健康诊断、可见性诊断、变体差分 |
| P1 已完成 | Shopify OAuth (Express)、Flow 管理 API (基础 CRUD)、Prescription 录入/上传、Bundle 创建+购物车、Theme App Extension + Storefront SDK、Webhook 基础处理器、Flow 绑定特定产品、Product Search (Admin GraphQL) |
| P2 部分 | 基础 Logic Jump (flowExecutor.js)、Analytics 数据接口、多语言框架 (locales) |

### 🔄 已实现但不完整
| 模块 | 当前状态 | 缺失内容 |
|---|---|---|
| FlowEditor UI | 基础步骤编辑器，仅支持 type/name/ref 选择和 custom_step 内容编辑 | 无标签页导航，无各类型页面深度配置 |
| flow.d.ts 类型 | 仅定义了最小 FlowNode 联合类型 | 缺少 PRD 第六、二十三章定义的全部配置类型 |
| Storefront SDK | 按钮注入、产品关联查询、基础变体监听 | 无多步骤 Modal、无完整 Flow 渲染、无 Logic Jump |
| Webhook 处理器 | 有 products/update、products/delete、inventory/update | 无 app/uninstalled、无幂等性检查、delete 无 HMAC 校验 |
| 后端 Flow API | 基础 CRUD + publish | 无 Flow 配置验证、无新数据模型支持 |
| MetafieldService | 文件存在 | API 不完整 |
| CollectionService | 文件存在、hideLensProductsFromAllCollection 已接 | 功能不完整 |

---

## 二、Shopify 平台安全与最佳实践差距（🔴 高优先级）

### 2.1 缺少 `app/uninstalled` Webhook 处理器
- **现状**：`index.js` 只注册了 `products/update`、`products/delete`，无 `app/uninstalled`
- **风险**：商家卸载后无法清理数据、停止任务，违反 GDPR 合规
- **Shopify 最佳实践**：必须实现，标记 shop 为已卸载，停止队列处理

### 2.2 Webhook 缺少幂等性检查
- **现状**：`webhookHandler.js` 未使用 `X-Shopify-Webhook-Id` 做去重
- **风险**：Shopify 可能重复投递同一 Webhook，导致数据重复写入
- **Shopify 最佳实践**：使用 `X-Shopify-Webhook-Id` 作为唯一键，处理前检查是否已处理

### 2.3 `products/delete` Webhook 缺少 HMAC 签名校验
- **现状**：`productsDeleteHandler` 在任何模式下都不验证 HMAC 签名
- **风险**：生产环境可被伪造删除请求攻击
- **Shopify 最佳实践**：所有 Webhook 处理器必须验证 `X-Shopify-Hmac-SHA256`

### 2.4 缺少 CSP `frame-ancestors` 头
- **现状**：`index.js` 未设置 CSP 头
- **风险**：浏览器可能阻止 Shopify Admin iframe 嵌入
- **Shopify 最佳实践**：必须设置 `Content-Security-Policy: frame-ancestors https://admin.shopify.com https://*.myshopify.com`

### 2.5 CORS 配置过于宽松
- **现状**：`Access-Control-Allow-Origin: *` 允许所有来源
- **风险**：跨站请求伪造、数据泄露
- **Shopify 最佳实践**：Admin API 应限制为 `https://admin.shopify.com`

### 2.6 缺少 Billing / 订阅 API
- **现状**：无任何计费相关代码，但 TODO 提到"升级提示横幅"
- **风险**：免费版无功能限制，无法商业化

### 2.7 GraphQL 查询未检查 `userErrors`
- **现状**：`index.js` 中 Product Search 的 GraphQL 查询未检查 `userErrors`
- **风险**：API 返回错误时静默失败

---

## 三、P0 核心功能重构差距（🔴 最高优先级）

> 对应 TODO.md 第1-10项、PRD 第二十五~二十七章

### 3.1 数据模型更新（TODO #1）
| 文件 | 现状 | 需更新内容 |
|---|---|---|
| `dist/src/types/flow.d.ts` | 13行最小定义 | 扩展为 PRD 第六章完整定义：FlowNode 联合类型(9种)、PageContent、TranslationTexts、LocaleTranslations、PrescriptionTypeOption、SubmitMethodOption、FormFieldConfig、PrescriptionFormConfig、ReadingFormConfig、UploadStepConfig、LensOption(扩展)、LensPageConfig、GlobalStyleConfig、ButtonStyleConfig、AnimationType、AddToCartBehavior、GlobalSettingsConfig、ContactLensFormConfig |
| `dist/src/types/prescription.d.ts` | 需确认 | 补充 PrescriptionData 完整字段 |
| Prisma schema (`prisma/schema.prisma`) | 有备份 | 需基于新类型生成正式 schema |

### 3.2 Flow Editor UI 重构（TODO #2-9）

当前 FlowEditor.jsx（397行，基础步骤编辑器）需重构为：

```
新 FlowEditor 结构：
├── 顶部标签页导航 (Tabs)
│   ├── 处方 (Prescription)
│   ├── 镜片 (Lens)
│   ├── 订单预览 (Order Preview)
│   ├── 文本翻译 (Translations)
│   ├── 全局样式 (Styles)
│   ├── 全局设置 (Settings)
│   └── 发布 (Publish)
├── 左侧页面列表 (Page Navigator)
│   └── 每种页面类型的缩略图 + 名称
└── 右侧编辑器面板 (Editor Panel)
    └── 根据选中的页面类型渲染对应编辑器
```

#### 需新建的组件（共 20+ 个）：

**页面配置编辑器：**
- `PageConfigEditor.jsx` — 标题、副标题、描述(HTML)、底部描述(HTML) 通用编辑器
- `PrescriptionTypeEditor.jsx` — 处方类型选项列表 + 单个选项编辑 (类型/名称/描述/图片/价格/LeadsTo/启用/顺序)
- `SubmitMethodEditor.jsx` — 提交方式选项列表 + 全局开关 (手动/上传/稍后)
- `PrescriptionFormEditor.jsx` — 单光/渐进表单字段配置 (SPH/CYL/Axis/ADD/PD) + 高级开关
- `ReadingFormEditor.jsx` — 老花表单 (放大度数 最大值/步进)
- `UploadStepEditor.jsx` — 上传组件配置 (标题/描述/PD选择器开关)
- `LensPageEditor.jsx` — 多镜片页面管理 (添加/左移/右移/删除/类型选择)
- `LensOptionEditor.jsx` — 镜片选项管理 (内部引用/复制/删除/上移/下移/编辑展开)
- `LogicJumpsEditor.jsx` — 逻辑跳转配置 (启用开关 + 跳转规则)
- `ReviewOrderEditor.jsx` — 订单预览配置 (标题/副标题/描述)

**翻译与样式编辑器：**
- `TextTranslationEditor.jsx` — 文本翻译标签页 (左右两栏布局)
- `TranslationFieldEditor.jsx` — 单个翻译字段编辑 (区分 HTML/纯文本)
- `GlobalStyleEditor.jsx` — 全局样式标签页 (折叠卡片布局)
- `StyleSectionEditor.jsx` — 单个样式部分编辑 (页面/标题/副标题/选项/进度条/按钮)
- `GlobalSettingsEditor.jsx` — 全局设置标签页 (基础/模板/ATC行为/高级设置)
- `TemplatePreview.jsx` — 模板预览组件

**隐形眼镜表单：**
- `ContactLensFormEditor.jsx` — 隐形眼镜表单编辑
- `PowerValuesEditor.jsx` — Power 配置
- `BaseCurveEditor.jsx` — Base Curve 配置
- `DiameterEditor.jsx` — Diameter 配置

**通用组件：**
- `DisplayConditionBuilder.jsx` — 显示条件构建器 (复用 RuleCondition DSL)
- `FormFieldConfig.jsx` — 表单字段数值范围配置 (min/max/step/direction)

#### 需修改的组件：
- `FlowEditor.jsx` — 大幅重构为标签页 + 页面导航 + 编辑器面板结构
- `RuleBuilder.jsx` — 可能需要扩展支持新的条件字段

### 3.3 后端服务扩展（TODO #10）
| 文件 | 需扩展内容 |
|---|---|
| `dist/src/services/flowService.js` | 支持新 FlowConfig 数据模型 (含所有节点类型配置、翻译、样式、设置) |
| `dist/src/api/flowApi.js` | 扩展 PUT 接口接受完整 FlowConfig |
| `dist/src/domain/flowExecutor.js` | 支持 prescription_type/submit_method/single_vision_form/progressive_form/reading_form/upload_step 节点类型渲染 |
| **新建** `dist/src/domain/flowConfigValidator.js` | Flow 配置完整性校验 (唯一 ref、节点连通性、LeadsTo 目标存在性等) |

---

## 四、P1 功能完善差距（🟡 高优先级）

> 对应 TODO.md 第11-19项、PRD 第二十~二十四章

### 4.1 文本翻译标签页（TODO #11）
- 左右两栏布局编辑器
- 所有 `TranslationTexts` 字段可编辑（约40+字段）
- 区分 HTML 支持字段与纯文本字段
- 每个字段独立"添加翻译"按钮
- 多语言切换支持

### 4.2 全局样式标签页（TODO #12）
- 折叠卡片式布局
- 页面整体样式 (z-index, max-width, padding, margin, 颜色)
- 标题/副标题样式 (字体、大小、粗细、颜色、间距)
- 选项样式 (边框、背景、文字、图片尺寸、徽章、价格)
- 进度条样式 (基础色、高亮色、高度)
- 三类按钮样式 (加入购物车/下一页/确认 - 字体、大小、颜色、背景、边框、圆角等)

### 4.3 全局设置标签页（TODO #13）
- 基础设置 (名称、流程密钥 + Copy 按钮)
- 模板选择 + 预览 (可关闭)
- 加入购物车行为 (跳转购物车/结账)
- 高级设置：
  - 忽略货币格式
  - 动画效果选择 (19种动画)
  - 保存买家处方信息
  - 组合镜框和镜片产品
  - 使用捆绑产品
  - 显示订单备注
- 升级提示横幅 (免费版)

### 4.4 发布标签页（TODO #14）
- 显示 Flow 发布状态 (草稿/已发布)
- 发布按钮
- 首次发布提示弹窗 (引导商家完成设置、非2.0主题提示)

### 4.5 隐形眼镜表单（TODO #15）
- 隐形眼镜表单列表页
- 表单配置页 (Power/BaseCurve/Diameter/Quantity/高级开关)
- 文本翻译标签页 (⚠️跳过 Price per box / Total boxes)
- 全局样式标签页 (⚠️跳过价格相关样式)
- 发布功能

### 4.6 `lens_first` 类型 Flow 支持（TODO #16）
- `FlowExecutor` 需要支持两种流程顺序：
  - prescription_first: 处方类型 → 提交方式 → 表单 → 镜片 → 订单回顾
  - lens_first: 处方类型 → 镜片 → 提交方式 → 表单 → 订单回顾
- Storefront SDK 需要正确处理两种顺序

### 4.7 Flow 列表增强（TODO #17）
- Flow 复制功能 (深拷贝 + 新 ID)
- 表格显示优化
- Flow 类型图标

### 4.8 订单管理页面（TODO #18）
- 订单列表页 (新建 `Orders.jsx`)
- 列：订单号、买家、流程、总价、处方
- 分页功能
- 后端 API：`GET /api/admin/orders`

### 4.9 P1 产品功能（PRD 第二十章）
| 功能 | 状态 | 说明 |
|---|---|---|
| 镜片描述/图片 | 基础已有 | 需扩展 `LensOption` 增加 `modalDescription`(HTML弹窗) |
| 自动触发/隐藏按钮 (Metafield) | 未实现 | 定义 `lensflow.autoTriggerVariantIds` / `lensflow.autoHideVariantIds` metafield，Storefront SDK 读取并执行 |
| 隐藏镜片商品 | 部分实现 | `collectionService.js` 已写 `hideLensProductsFromAllCollection`，需完善 vendor 重命名 + 搜索隐藏 metafield |
| 变体自动同步 (Webhook) | 基础已有 | 需完善增量更新逻辑 |
| Metafield API | 文件存在 | 需完善 CRUD API |
| Collection 管理 | 文件存在 | 需完善 |

---

## 五、P2 增强功能差距（🟢 中优先级）

> 对应 TODO.md 第13-15项、PRD 第二十章

| 功能 | 说明 |
|---|---|
| AI 镜片推荐 | 需接入第三方 API (如 OpenAI/Claude)，根据处方数据推荐镜片 |
| OCR 验光单识别 | 需接入 OCR API，自动解析上传的验光单图片 |
| 度数字段可见性条件 | 扩展 `RuleCondition.field` 增加 `od_sph/od_cyl/od_add/os_sph/os_cyl/os_add/submitMethod`，新增 `operator`：gt/lt/gte/lte |
| Badge 徽章 | 扩展 `LensOption` 增加 `badge?: { text, style }` |
| 布局模式 | `Disclosure`(折叠面板)、`Variant-as-product`(每个变体独立卡片) |
| Combined Product | Combo 变体创建 → 加入购物车 → 下单后删除临时变体 + 扣减原始库存 |
| Bundle Delete Action | Theme Extension 设置中的级联删除开关 |
| Skip Step | FlowNode 增加 `skippable`，LensOption 增加 `isSkipOption` |
| 高级表单验证 | 实时验证 + 自定义验证规则 |
| Analytics 增强 | Flow 使用统计、表单完成率、转化率分析 |

---

## 六、Theme App Extension 差距

| 功能 | 现状 | 需要扩展 |
|---|---|---|
| 多步骤 Modal | 未实现 | 按 FlowNode[] 驱动的完整多步骤 Modal UI |
| 处方类型选择 | 未实现 | 渲染 PrescriptionTypeOption 列表 + LeadsTo 跳转 |
| 处方表单 | 未实现 | SPH/CYL/Axis/ADD/PD/Prism 表单 + 表单验证 |
| 老花表单 | 未实现 | 简化版放大度数表单 |
| 文件上传步骤 | 未实现 | 上传组件 + PD 选择器 |
| 镜片多页面 + Logic Jump | 未实现 | 多页面切换 + 条件跳转 |
| 订单回顾 | 未实现 | Frame + Lens 汇总 + 总价 |
| Metafield 自动触发/隐藏 | 部分实现 | 已有 variant/tag 模式，需增加 Metafield 读取 |
| Bundle Delete Action | 未实现 | 级联删除监听 |
| 全局样式渲染 | 部分实现 | 已有基础 CSS，需支持 GlobalStyleConfig 变量注入 |
| 翻译渲染 | 部分实现 | 需从 FlowConfig 读取 TranslationTexts |

---

## 七、建议开发顺序

### 第〇阶段：技术栈迁移 — Ant Design + Tailwind CSS（1天）
> 先行完成 UI 基础设施，后续所有组件开发统一使用新栈

1. **安装依赖**：移除 `@shopify/polaris`，添加 `antd`、`tailwindcss`、`postcss`、`autoprefixer`
2. **Tailwind 配置**：创建 `tailwind.config.js`，扫描 `./src/**/*.{jsx,js}`，扩展 Ant Design 兼容主题色
3. **PostCSS 配置**：创建 `postcss.config.js`
4. **全局样式**：创建 `src/index.css`，引入 Tailwind 指令 + Ant Design 主题 token 覆盖
5. **应用入口改造**：`App.jsx` 中 `AppProvider` → `ConfigProvider` + `App`；`main.jsx` 导入 `index.css`
6. **布局重构**：NavBar → `Layout.Header` + `Menu` (horizontal)，内容区用 `<Layout.Content>`
7. **现有页面快速迁移**：Dashboard/Flows/Rules/Health/Analytics/LensOptions 替换内联样式为 Ant Design + Tailwind 组合（不改功能逻辑）

### 第一阶段：安全加固（1-2天）
8. 添加 `app/uninstalled` Webhook 处理器
9. 实现 Webhook 幂等性（X-Shopify-Webhook-Id）
10. 修复 `products/delete` HMAC 签名校验
11. 添加 CSP `frame-ancestors` 头
12. 限制 CORS 来源
13. GraphQL 查询增加 `userErrors` 检查

### 第二阶段：数据模型 + Flow Editor 重构（3-5天）
14. 更新 `flow.d.ts` 为 PRD 完整版类型定义
15. 更新 Prisma schema
16. 重构 FlowEditor 框架 — 用 **Ant Design `Tabs`** 实现标签页导航 + **`Menu`(vertical)** 实现左侧页面列表 + 右侧编辑器面板
17. 实现 PageConfigEditor — 用 **`Form.Item` + `Input`**
18. 实现 DisplayConditionBuilder — 用 **`Select` + `Input`**
19. 实现 PrescriptionTypeEditor — 用 **`Table`** (排序/拖拽) + **`Modal`** (选项编辑)
20. 实现 SubmitMethodEditor — 用 **`Switch`** (全局开关) + **`Table`**
21. 实现 PrescriptionFormEditor — 用 **`Form` + `InputNumber` + `Switch` + `Collapse`** (高级设置)
22. 实现 ReadingFormEditor — 用 **`Form` + `InputNumber`**
23. 实现 UploadStepEditor — 用 **`Form` + `Switch`**
24. 实现 LensPageEditor + LensOptionEditor + LogicJumpsEditor — 用 **`Tabs`**(多页面) + **`Table`**(选项) + **`Modal`** + **`Switch`**
25. 实现 ReviewOrderEditor — 用 **`Form` + `Input`**
26. 后端 FlowService 扩展 + FlowConfigValidator

### 第三阶段：翻译 + 样式 + 设置（2-3天）
27. 实现 TextTranslationEditor — 用 **`Layout`(左右分栏) + `Tabs`(语言切换) + `Form`**
28. 实现 TranslationFieldEditor — 用 **`Form.Item` + `Input` / `Input.TextArea`**，标记 HTML/纯文本
29. 实现 GlobalStyleEditor — 用 **`Collapse`**(折叠卡片) + **`Form`** + **`ColorPicker`** + **`InputNumber`** + **`Select`**
30. 实现 StyleSectionEditor — 用 **`Collapse.Panel`**
31. 实现 GlobalSettingsEditor — 用 **`Form` + `Select` + `Switch` + `Input`**(flow_key + Copy) + **`Modal`**(模板预览)
32. 实现 TemplatePreview — 用 **`Modal` + iframe**
33. 实现发布标签页 (PublishTab) — 用 **`Descriptions`**(状态) + **`Button`** + **`Modal`**(首次提示)
34. 后端存储支持翻译/样式/设置数据

### 第四阶段：P1 功能完善（2-3天）
35. 隐形眼镜表单列表 — 用 **`Table` + `Button`**(新建/复制/删除)
36. 隐形眼镜表单编辑器 — 用 **`Tabs`**(配置/翻译/样式/发布) + **`Form` + `InputNumber` + `Select` + `Switch`**
37. PowerValuesEditor — 用 **`Form` + `InputNumber` + `Select`**
38. BaseCurveEditor / DiameterEditor — 用 **`Form` + `Select`** (动态选项管理)
39. lens_first Flow 类型支持 (FlowExecutor 更新)
40. Flow 复制功能 — 用 `mutate` API
41. 订单管理页面 — 用 **`Table`(分页) + `Tag`**(状态)
42. MetafieldService API 完善
43. 自动触发/隐藏按钮 (Metafield 读取)
44. 镜片商品隐藏完善

### 第五阶段：Storefront SDK 升级（2-3天）
45. 多步骤 Modal UI 框架
46. 各页面类型渲染 (prescription_type, submit_method, forms, upload, lens, review)
47. LeadsTo 跳转逻辑
48. Logic Jump 支持
49. 全局样式注入
50. 翻译渲染
51. Bundle Delete Action

### 第六阶段：P2 增强（按需）
52. Skip Step
53. Badge 徽章
54. 布局模式 (Disclosure/Variant-as-product)
55. Combined Product
56. 度数字段可见性条件
57. AI 推荐 + OCR (需外部 API)

---

## 八、文件变更清单

### 新建文件（基础设施）

```
admin-ui/
├── tailwind.config.js                🆕 Tailwind CSS 配置
├── postcss.config.js                 🆕 PostCSS 配置
└── src/
    └── index.css                     🆕 Tailwind 指令 + Ant Design 主题变量
```

### 新建文件（组件）

```
admin-ui/src/components/
├── PageConfigEditor.jsx              🆕
├── PrescriptionTypeEditor.jsx        🆕
├── SubmitMethodEditor.jsx            🆕
├── PrescriptionFormEditor.jsx        🆕
├── ReadingFormEditor.jsx             🆕
├── UploadStepEditor.jsx              🆕
├── LensPageEditor.jsx                🆕
├── LensOptionEditor.jsx              🆕
├── LogicJumpsEditor.jsx              🆕
├── ReviewOrderEditor.jsx             🆕
├── TextTranslationEditor.jsx         🆕
├── TranslationFieldEditor.jsx        🆕
├── GlobalStyleEditor.jsx             🆕
├── StyleSectionEditor.jsx            🆕
├── GlobalSettingsEditor.jsx          🆕
├── TemplatePreview.jsx               🆕
├── ContactLensFormEditor.jsx         🆕
├── PowerValuesEditor.jsx             🆕
├── BaseCurveEditor.jsx               🆕
├── DiameterEditor.jsx                🆕
├── DisplayConditionBuilder.jsx       🆕
├── FormFieldConfig.jsx               🆕
└── PublishTab.jsx                    🆕

admin-ui/src/pages/
├── Orders.jsx                        🆕
├── ContactLensForms.jsx              🆕
├── ContactLensFormEditor.jsx         🆕

dist/src/domain/
└── flowConfigValidator.js            🆕
```

### 修改文件

```
dist/src/types/flow.d.ts              🔄 大幅扩展
dist/src/types/prescription.d.ts      🔄 扩展
dist/src/types/lens.d.ts              🔄 扩展
dist/src/index.js                     🔄 添加安全头/CORS/新API
dist/src/api/webhookHandler.js        🔄 幂等性+HMAC修复
dist/src/services/flowService.js      🔄 支持新数据模型
dist/src/api/flowApi.js               🔄 扩展
dist/src/domain/flowExecutor.js       🔄 支持新节点类型

admin-ui/src/pages/FlowEditor.jsx     🔄 大幅重构
admin-ui/src/components/RuleBuilder.jsx 🔄 可能扩展
admin-ui/src/App.jsx                  🔄 添加新路由
admin-ui/src/locales/en.json          🔄 扩展
admin-ui/src/locales/zh-CN.json       🔄 扩展

extensions/theme-app-extension/assets/lens-flow.js   🔄 大幅扩展
extensions/theme-app-extension/assets/lens-flow.css  🔄 扩展
extensions/theme-app-extension/locales/en.default.json 🔄 扩展
extensions/theme-app-extension/locales/zh-CN.json    🔄 扩展
```

---

## 九、总结

| 类别 | 待完成项目数 | 优先级 | 技术方案 |
|---|---|---|---|
| 技术栈迁移 | 7项 (依赖安装+配置+全局布局) | 🔴 最高 | Ant Design 5 + Tailwind CSS 3 替代 Polaris + 内联样式 |
| Shopify 安全/最佳实践 | 7项 | 🔴 最高 | 原生 Node.js (crypto/CSP/CORS) |
| Flow Editor 重构 | 13项 (组件+后端) | 🔴 最高 | Ant Design Tabs/Table/Form/Modal/Collapse + Tailwind 布局 |
| 翻译/样式/设置 | 5项 | 🟡 高 | Ant Design Layout/Collapse/Form/ColorPicker + Tailwind |
| P1 产品功能 | 9项 | 🟡 高 | Ant Design Table/Form/Switch/Select + Tailwind |
| Storefront SDK 升级 | 7项 | 🟡 高 | Vanilla JS (Storefront 不用框架) |
| P2 增强 | 10项 | 🟢 中 | Ant Design + 第三方 API |
| **总计** | **58项** | | |

**核心技术栈：**
- **Admin UI**：React 18 + React Router 7 + **Ant Design 5** + **Tailwind CSS 3** + Vite 4
- **Backend**：Express + @shopify/shopify-app-express + Shopify Admin/Storefront API
- **Database**：Postgres + Prisma（生产）/ InMemory（开发）
- **Storefront**：Vanilla JS (Theme App Extension SDK)
- **Shopify Auth**：@shopify/app-bridge + Session Token

**预估工作量：** 约 12-18 个工作日（2人团队并行开发）