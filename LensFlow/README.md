# 眼镜配件 App

这是一个按 Shopify App 标准结构搭建的眼镜镜片规则与诊断应用，当前基于 `React Router + Shopify Auth + Polaris + Prisma Session Storage`。

## 文档

- PRD：`docs/prd.md`
- 开发规划：`docs/development-plan.md`

## 当前能力

- 支持 Shopify 标准登录与嵌入式 App 骨架
- 支持 Polaris 页面与后台导航
- 支持镜片规则引擎、诊断、健康检查与前台镜片查询
- 支持通过内存仓储演示当前镜片业务逻辑

## 项目结构

- `app/`：Shopify App 标准路由、认证、页面和服务入口
- `src/`：镜片领域逻辑、规则引擎、诊断、健康检查、同步逻辑
- `prisma/`：Session 存储 schema
- `tests/`：业务逻辑与 API 测试

## 本地开发

1. 复制环境变量文件

```bash
cp .env.example .env
```

2. 配置 Shopify 应用参数

- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL`
- `SCOPES`

3. 配置腾讯云邮件提醒参数

- `TENCENT_SES_SMTP_HOST`：SMTP 主机，全球站可用 `sg-smtp.qcloudmail.com`
- `TENCENT_SES_SMTP_PORT`：SMTP 端口，默认 `465`
- `TENCENT_SES_SMTP_SECURE`：是否启用 SSL，默认 `true`
- `TENCENT_SES_SMTP_USER`：SMTP 用户名，通常为腾讯云 SES 发信地址
- `TENCENT_SES_SMTP_PASS`：SMTP 密码或授权码
- `TENCENT_SES_FROM_EMAIL`：发信地址
- `MERCHANT_ALERT_EMAIL`：商家提醒收件邮箱

4. 初始化 Prisma

```bash
npm run setup
```

5. 启动开发

```bash
npm run dev
```

## 当前页面

- `/auth/login`：店铺登录与安装入口
- `/app`：镜片规则仪表盘
- `/app/rules`：规则配置概览页
- `/app/notifications`：提醒中心与邮件测试页
