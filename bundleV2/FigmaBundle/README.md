# Shopify Bundle Offer App

这是一个基于 Shopify Polaris 组件构建的 Bundle 优惠管理应用。

## 功能特性

### 1. Dashboard (仪表盘)
- **GMV 数据展示**: 展示总 GMV、Bundle GMV、转化率和活跃优惠数量
- **创建优惠按钮**: 快速入口创建新的优惠活动
- **我的优惠**: 显示所有已创建的优惠，包括名称、类型、状态和创建日期
- **AB 测试**: 管理和查看 AB 测试记录，包括 PV、转化率、额外 GMV 收益和 ROI

### 2. 创建优惠 (Create Offer)
4 步流程创建优惠：

#### 步骤 1: 创建优惠基本信息
- 填写优惠活动名称
- 选择优惠类型（Buy X Get Y、Volume Discount、Bundle Discount、Free Shipping）

#### 步骤 2: 商品关联与折扣设定
- 选择关联商品
- 设置折扣力度（0-100%）

#### 步骤 3: 设计样式
- 选择主色调
- 设置字体大小（10-24px）
- 选择风格主题（Modern、Classic、Minimal、Bold）

#### 步骤 4: 时间与预算设定
- 设置优惠生效时间
- 设置优惠失效时间
- 配置预算区间（最小值和最大值）

完成后会提示是否启动 AB 测试。

### 3. AB 测试管理
- **查看 AB 测试列表**: 显示所有 AB 测试及其关键指标
- **编辑 AB 测试**: 
  - 设置测试名称
  - 选择目标受众（All Visitors、New Visitors、Returning Visitors、VIP Customers）
  - 配置流量分配比例
  - 设置测试开始和结束时间
- **操作**: 开始、暂停、恢复、关闭测试
- **性能指标**: 实时显示 PV、转化率、额外 GMV、ROI

### 4. Pricing (定价页面)
- **三个订阅计划**:
  - Starter ($29/月): 适合小型商家
  - Professional ($79/月): 适合成长中的商家
  - Enterprise ($199/月): 适合大型企业
- **FAQ 说明**: 折叠式常见问题解答，包含 6 个常见问题

## 技术栈

- **React 18**: 前端框架
- **TypeScript**: 类型安全
- **React Router Dom**: 路由管理
- **Shopify Polaris**: UI 组件库
- **Vite**: 构建工具

## 数据说明

当前应用使用模拟数据（Mock Data）进行展示。在生产环境中，这些数据应该连接到后端 API 或 Shopify 服务。

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 注意事项

- Figma Make 不适用于收集 PII（个人身份信息）或处理敏感数据
- 本应用为演示目的，实际部署需要连接真实的数据源和 Shopify API
- AB 测试功能需要与 Shopify Analytics 集成才能获取真实数据
