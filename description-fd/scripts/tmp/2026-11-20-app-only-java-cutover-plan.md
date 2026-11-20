# description-fd app-only token + Java 切干净 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。用户未要求 git commit 时跳过各任务的 Commit 步。未经用户确认不要改生产 Turso。

**目标：** Shopify Admin GraphQL 只走 application-only JWT；Java `/apg/*` 全部迁本仓 Turso + Remix，删除 `JavaServer.ts` 与 `SERVER_URL`。

**架构：** Partner 公钥（图一 `kid=prod-2027-01` / ES256 P-256）签 JWT，换 client_credentials token，进程内存缓存。业务数据进 Turso：`Account` 四池（P0 只写购包/已用）、官方模板种子、商户模板、生成任务。批量在 Remix 进程 `setInterval` 消费，不新建 Worker。浏览器不再 axios 打 Java，一律 Remix loader/action。

**技术栈：** Remix 2、Prisma + Turso/libSQL、已有 `shopAppToken.server.ts`（RS256/ES256）、OpenAI/DeepSeek（`descriptionAiClient.server.ts`）、tsx `--test`。

**已拍板（grill）：** Java 一次性切干净；迁积分 + 自定义模板；官方模板从 Java 导出做种子；批量 Remix 进程内；Account 四池对齐 TSF 公式但 P0 只接线一次性购包；缺 app-only 密钥硬失败；P0 不发 SES/飞书。

**明确假设（实现时不要再猜）：**
- 扣费：`usedCredits += ceil((prompt_tokens + completion_tokens) * 1.5)`（对齐 Java `MAGNIFICATION=1.5`）；LLM 调用前 `remaining < 1` 则拒绝。
- 批量**不**自动 `productUpdate`；生成结果写入 `GenerateJobItem`，商户仍走 `/descriptionPublish`。
- 一店同时一条 RUNNING 任务。
- 卸载：`Account.deletedAt`、停任务、删 Session；积分行保留便于重装。
- P0 换票失败只 `console.error`，不上飞书（本仓无 Redis）。
- 定价页 UI 仍用 `{ allToken, userToken }`：`allToken = purchased+subscription+trial`，`userToken = usedCredits`。

**不做什么：** 独立 Worker；订阅套餐/试用/邀请码产品；购包邮件；把私钥或 Session token 给 Java。

---

## 文件结构

| 路径 | 职责 |
|---|---|
| `app/lib/shopifyAdminApiVersion.ts` | GraphQL 版本单一来源 `2026-07` + `buildShopifyAdminGraphqlUrl` |
| `app/server/shopify/shopAppToken.server.ts` | JWT 签名/换票/内存缓存（已有，少改） |
| `app/server/shopify/offlineSessionToken.server.ts` | 已安装 = offline Session；有 Account 则 `deletedAt IS NULL` |
| `app/server/shopify/shopifyAuthWrap.ts` | webhook / unauthenticated 替换 admin |
| `app/server/shopify/shopAdminToken.server.ts` | `getShopAdmin`；去掉缺密钥回退；去掉第二层 memory Map |
| `app/shopify.server.ts` | 包 `authenticate.admin/webhook` 与 `unauthenticated.admin` |
| `app/server/billing/quota.server.ts` | remaining / deduct / grantPurchased |
| `app/server/billing/ensureAccount.server.ts` | 进 App 建 Account |
| `app/server/billing/packs.server.ts` | 购包名 → 积分数（现定价页表） |
| `app/server/template/template.server.ts` | 官方种子 + 商户模板 CRUD / 选用 |
| `app/server/generateJob/job.server.ts` | 入队 / 停 / 进度 DTO（对齐 `GetUserData`） |
| `app/server/generateJob/runner.server.ts` | `ensureJobRunner()` + tick |
| `app/server/shopify/productsByIds.server.ts` | 替代 `GetProductsByListId` |
| `app/server/ai/descriptionAiClient.server.ts` | 返回 usage tokens |
| `app/server/ai/generateDescription.server.ts` | 注入模板 + 扣费 |
| `prisma/schema.prisma` | 新模型 |
| `prisma/migrations/<ts>_apg_cutover/migration.sql` | Turso SQL |
| `prisma/seed/official-templates.json` | 官方模板种子 |
| `scripts/import-official-templates.mjs` | JSON → OfficialTemplate |
| `scripts/migrate-apg-from-java.mjs` | Java 存量迁入（默认 dry-run） |
| `app/routes/app.tsx` 等 | 去掉 Java / `SERVER_URL` |
| `app/api/JavaServer.ts` | 最后删除 |

页面 UI 布局不改；只改数据入口（loader/action）。

---

### 任务 0：Partner 公钥（图一）——先于部署，无代码

图一就是本应用：`shopify.app.toml` `client_id = b56a502400fe53e1f4cdfdb684929d2b`。

| 图一 | env / 动作 |
|---|---|
| Client ID | `SHOPIFY_API_KEY`（已有） |
| Client secret | `SHOPIFY_API_SECRET`（OAuth，不参与 JWT） |
| JWK `kid=prod-2027-01` `kty=EC` `crv=P-256` `alg=ES256` | 公钥贴 Partner「Add public key」 |
| 配对私钥 PEM | `SHOPIFY_APP_ONLY_PRIVATE_KEY` |
| `kid` | `SHOPIFY_APP_ONLY_KEY_ID=prod-2027-01` |

- [ ] **步骤 1：生成本地 P-256 密钥（不要提交 PEM）**

```bash
openssl ecparam -name prime256v1 -genkey -noout -out apg-app-only.pem
```

- [ ] **步骤 2：导出 JWK 公钥并贴到 Partner**

```bash
node --input-type=module -e "import { createPrivateKey, createPublicKey } from 'node:crypto'; import { readFileSync } from 'node:fs'; const key = createPrivateKey(readFileSync('apg-app-only.pem')); const jwk = createPublicKey(key).export({ format: 'jwk' }); console.log(JSON.stringify({ kty:'EC', crv:'P-256', alg:'ES256', kid:'prod-2027-01', x:jwk.x, y:jwk.y }, null, 2));"
```

把输出贴进图一弹窗，Add key。`x`/`y` 为空的模板不能用。

- [ ] **步骤 3：写入 env（只写变量名到文档；值不进 git）**

`SHOPIFY_APP_ONLY_KEY_ID=prod-2027-01`  
`SHOPIFY_APP_ONLY_PRIVATE_KEY` = PEM，换行用 `\n` 或真实多行。测/产各一对 kid 也可，但图一当前是 `prod-2027-01`。

未完成任务 0 时不要上线任务 1 的硬失败代码。

---

### 任务 1：app-only 硬失败 + 包 webhook/unauthenticated

**文件：**
- 修改：`app/lib/shopifyAdminApiVersion.ts`
- 创建：`app/server/shopify/shopifyAuthWrap.ts`
- 修改：`app/server/shopify/offlineSessionToken.server.ts`
- 修改：`app/server/shopify/shopAdminToken.server.ts`
- 修改：`app/shopify.server.ts`
- 测试：`app/server/shopify/shopifyAuthWrap.test.ts`

- [ ] **步骤 1：写失败测试**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  replaceWebhookAdminIfPresent,
  buildUnauthenticatedAppOnlyAdmin,
} from "./shopifyAuthWrap";

test("webhook without admin stays empty", () => {
  const ctx = { shop: "a.myshopify.com" };
  const out = replaceWebhookAdminIfPresent(ctx, () => ({ source: "app-only" }));
  assert.equal((out as { admin?: unknown }).admin, undefined);
});

test("webhook with admin is replaced", () => {
  const ctx = { shop: "a.myshopify.com", admin: { graphql: "sdk" } };
  const out = replaceWebhookAdminIfPresent(ctx, () => ({ source: "app-only" }));
  assert.deepEqual(out.admin, { source: "app-only" });
});

test("unauthenticated rejects shops that are not installed", async () => {
  await assert.rejects(
    () =>
      buildUnauthenticatedAppOnlyAdmin({
        shop: "missing.myshopify.com",
        isInstalled: async () => false,
        createAdmin: () => ({ ok: true }),
      }),
    /not installed/,
  );
});
```

- [ ] **步骤 2：运行确认失败**

```bash
npx tsx --test app/server/shopify/shopifyAuthWrap.test.ts
```

预期：FAIL，模块不存在。

- [ ] **步骤 3：实现 wrap + 版本 URL + 硬失败**

`app/lib/shopifyAdminApiVersion.ts` 增加：

```ts
export const SHOPIFY_ADMIN_API_VERSION = "2026-07";

export function buildShopifyAdminGraphqlUrl(shopDomain: string): string {
  const shop = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${shop}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`;
}
```

`shopifyAuthWrap.ts` 复制自 ciwi-translate `app/server/shop/shopifyAuthWrap.ts`（`replaceWebhookAdminIfPresent` / `buildUnauthenticatedAppOnlyAdmin`）。

`offlineSessionToken.server.ts` 的 `isShopInstalled`：

```ts
export async function isShopInstalled(shop: string): Promise<boolean> {
  if (!shop) return false;
  const session = await prisma.session.findFirst({
    where: { shop, isOnline: false },
    select: { id: true },
  });
  if (!session) return false;
  const account = await prisma.account.findUnique({
    where: { shop },
    select: { deletedAt: true },
  }).catch(() => null);
  if (account) return account.deletedAt === null;
  return true;
}
```

（Account 表未迁完前 `findUnique` 可能抛错，用 `catch` 退回「有 Session 即已安装」，任务 2 落地后删 catch。）

`shopAdminToken.server.ts`：
- 删除 `memory` Map，只留 `createShopAppTokenProvider` 缓存。
- `hasAppOnlyCredentials()` 为 false 时 `getShopAdminGraphql` / `getShopAdmin` **throw**，禁止回退。
- GraphQL URL 用 `buildShopifyAdminGraphqlUrl`。
- 401 时 `invalidate(shop)` 再换一次。

`shopify.server.ts`：

```ts
import { SHOPIFY_ADMIN_API_VERSION } from "./lib/shopifyAdminApiVersion";
import { getShopAdminGraphql } from "./server/shopify/shopAdminToken.server";
import { isShopInstalled } from "./server/shopify/offlineSessionToken.server";
import {
  buildUnauthenticatedAppOnlyAdmin,
  replaceWebhookAdminIfPresent,
} from "./server/shopify/shopifyAuthWrap";

const shopify = shopifyApp({
  // ...
  apiVersion: SHOPIFY_ADMIN_API_VERSION as ApiVersion,
  // ...
});

export const apiVersion = SHOPIFY_ADMIN_API_VERSION as ApiVersion;

const authenticateAdmin = (async (request: Request) => {
  const ctx = await shopify.authenticate.admin(request);
  const graphql = await getShopAdminGraphql(ctx.session.shop);
  return { ...ctx, admin: { ...ctx.admin, graphql } };
}) as typeof shopify.authenticate.admin;

const authenticateWebhook = (async (request: Request) => {
  const ctx = await shopify.authenticate.webhook(request);
  return replaceWebhookAdminIfPresent(ctx, (shop) => ({
    graphql: (query: string, options?: { variables?: Record<string, unknown> }) =>
      getShopAdminGraphql(shop).then((g) => g(query, options)),
  }));
}) as typeof shopify.authenticate.webhook;

const unauthenticatedAdmin = (async (shop: string) =>
  buildUnauthenticatedAppOnlyAdmin({
    shop,
    isInstalled: isShopInstalled,
    createAdmin: async (normalized) => ({
      graphql: await getShopAdminGraphql(normalized),
    }),
  })) as typeof shopify.unauthenticated.admin;

export const authenticate = {
  ...shopify.authenticate,
  admin: authenticateAdmin,
  webhook: authenticateWebhook,
};
export const unauthenticated = { ...shopify.unauthenticated, admin: unauthenticatedAdmin };
```

删除 `hasAppOnlyCredentials` 回退分支。webhook 的 `createAdmin` 保持同步对象更干净：让 `getShopAdminGraphql` 改成同步返回已闭包的 `graphql`（内部仍 async 换票）——即现有 `getShopAdminGraphql` 已是 `async () => graphql`。wrap 里用：

```ts
replaceWebhookAdminIfPresent(ctx, (shop) => ({
  graphql: async (query: string, options?: { variables?: Record<string, unknown> }) => {
    const g = await getShopAdminGraphql(shop);
    return g(query, options);
  },
}));
```

- [ ] **步骤 4：跑测试 + 扩展 npm test**

`package.json`：

```json
"test": "npx --yes tsx --test app/lib/generatedDescriptionJson.server.test.ts app/server/shopify/shopifyAuthWrap.test.ts app/server/billing/quota.server.test.ts app/server/generateJob/job.server.test.ts app/server/ai/descriptionAiClient.server.test.ts"
```

先跑 wrap 测试预期 PASS。`npx prisma validate` 仍过（此时 schema 未改）。

- [ ] **步骤 5：Commit**（用户未要求则跳过）

---

### 任务 2：Prisma 模型

**文件：**
- 修改：`prisma/schema.prisma`
- 创建：`prisma/migrations/20261120000000_apg_cutover/migration.sql`

- [ ] **步骤 1：在 schema 追加模型（保留现有 Session）**

```prisma
model Account {
  shop                 String    @id
  subscriptionCredits  Int       @default(0)
  purchasedCredits     Int       @default(0)
  trialCredits         Int       @default(0)
  trialCreditsExpiresAt DateTime?
  trialInstallCredits  Int       @default(0)
  trialInstallExpiresAt DateTime?
  trialBonusCredits    Int       @default(0)
  trialBonusExpiresAt  DateTime?
  usedCredits          Int       @default(0)
  deletedAt            DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  billingLogs          BillingLog[]
  templates            UserTemplate[]
  templatePicks        ShopTemplatePick[]
  generateJobs         GenerateJob[]
}

model BillingLog {
  id        String   @id @default(cuid())
  shop      String
  kind      String
  amount    Int      @default(0)
  uniqueKey String
  metadata  String?
  createdAt DateTime @default(now())
  account   Account  @relation(fields: [shop], references: [shop])
  @@unique([shop, uniqueKey])
  @@index([shop, createdAt])
}

model OfficialTemplate {
  id                  Int      @id
  templateData        String
  templateTitle       String
  templateType        String   @default("")
  templateDescription String   @default("")
  templateModel       String
  templateSubtype     String
  isPayment           Boolean  @default(false)
  exampleData         String   @default("")
  usedTimes           Int      @default(0)
}

model UserTemplate {
  id                  Int      @id @default(autoincrement())
  shop                String
  templateData        String
  templateTitle       String
  templateType        String   @default("")
  templateDescription String   @default("")
  templateModel       String
  templateSubtype     String
  deletedAt           DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  account             Account  @relation(fields: [shop], references: [shop])
}

model ShopTemplatePick {
  id         Int      @id @default(autoincrement())
  shop       String
  source     String
  templateId Int
  createdAt  DateTime @default(now())
  account    Account  @relation(fields: [shop], references: [shop])
  @@unique([shop, source, templateId])
}

model GenerateJob {
  id             String   @id @default(cuid())
  shop           String
  status         String
  pageType       String
  contentType    String
  languageStyle  String
  brandStyle     String   @default("")
  templateId     Int
  templateSource String
  model          String
  language       String
  seoKeywords    String   @default("")
  brandWord      String   @default("")
  brandSlogan    String   @default("")
  stopRequested  Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  account        Account  @relation(fields: [shop], references: [shop])
  items          GenerateJobItem[]
  @@index([shop, status])
}

model GenerateJobItem {
  id          String   @id @default(cuid())
  jobId       String
  shop        String
  resourceId  String
  status      String
  title       String   @default("")
  generatedHtml String @default("")
  generatedTitle String @default("")
  error       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  job         GenerateJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  @@index([jobId, status])
  @@index([shop, status])
}
```

`GenerateJob.status`：`QUEUED | RUNNING | COMPLETED | STOPPED | FAILED`。  
`GenerateJobItem.status`：`PENDING | RUNNING | DONE | FAILED | SKIPPED`。  
`ShopTemplatePick.source`：`official | user`。

- [ ] **步骤 2：migration.sql 用 SQLite/Turso 可执行 DDL**（Prisma 生成后核对；`Account.shop` TEXT PRIMARY KEY；`BillingLog` UNIQUE(shop, uniqueKey)）。

- [ ] **步骤 3：** `npx prisma generate` && `npx prisma validate`

- [ ] **步骤 4：** 测环境 `npm run turso:migrate`（无 `--confirm-prod`）。产库等用户二次确认。

---

### 任务 3：额度公式

**文件：**
- 创建：`app/server/billing/quota.server.ts`
- 测试：`app/server/billing/quota.server.test.ts`

remaining = `subscriptionCredits + purchasedCredits + trialCredits - usedCredits`（P0 前两项试用/订阅为 0）。

- [ ] **步骤 1：失败测试**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { remainingCredits, billableCredits } from "./quota.server";

test("remaining is pools minus used", () => {
  assert.equal(
    remainingCredits({
      subscriptionCredits: 0,
      purchasedCredits: 1000,
      trialCredits: 0,
      usedCredits: 200,
    }),
    800,
  );
});

test("billable is ceil of tokens times 1.5", () => {
  assert.equal(billableCredits(10, 0), 15);
  assert.equal(billableCredits(1, 0), 2);
});
```

- [ ] **步骤 2：跑测确认失败** → 模块不存在。

- [ ] **步骤 3：实现**

```ts
export const CREDIT_MULTIPLIER = 1.5;

export function remainingCredits(account: {
  subscriptionCredits: number;
  purchasedCredits: number;
  trialCredits: number;
  usedCredits: number;
}): number {
  return (
    account.subscriptionCredits +
    account.purchasedCredits +
    account.trialCredits -
    account.usedCredits
  );
}

export function billableCredits(promptTokens: number, completionTokens: number): number {
  return Math.ceil((promptTokens + completionTokens) * CREDIT_MULTIPLIER);
}

export function toCounterDto(account: {
  subscriptionCredits: number;
  purchasedCredits: number;
  trialCredits: number;
  usedCredits: number;
}): { allToken: number; userToken: number } {
  return {
    allToken:
      account.subscriptionCredits + account.purchasedCredits + account.trialCredits,
    userToken: account.usedCredits,
  };
}
```

`ensureAccount(shop)`：upsert `Account`，`deletedAt` 非空则清掉（重装）。  
`deductShopCredits({ shop, amount, uniqueKey })`：事务里 `remaining >= amount` 才 `usedCredits += amount`，写 `BillingLog kind=DEDUCT`；不够抛 `QUOTA_INSUFFICIENT`。  
`grantPurchasedCredits({ shop, amount, uniqueKey })`：`purchasedCredits += amount`，`BillingLog kind=PURCHASE`；uniqueKey 冲突视为幂等成功。

购包名映射（与 `app.pricing.tsx` / webhook 现表一致，定价页 1,000,000 标价 6.99、webhook 仍 7.99——**P0 保持 webhook 现数字，不改价**）：

```ts
export const CREDIT_PACKS: Record<string, { credits: number; price: number }> = {
  "500,000 Credits": { credits: 500000, price: 3.99 },
  "1,000,000 Credits": { credits: 1000000, price: 7.99 },
  "2,000,000 Credits": { credits: 2000000, price: 15.99 },
  "3,000,000 Credits": { credits: 3000000, price: 23.99 },
  "5,000,000 Credits": { credits: 5000000, price: 39.99 },
  "10,000,000 Credits": { credits: 10000000, price: 79.99 },
  "20,000,000 Credits": { credits: 20000000, price: 159.99 },
  "30,000,000 Credits": { credits: 30000000, price: 239.99 },
};
```

- [ ] **步骤 4：** `npx tsx --test app/server/billing/quota.server.test.ts` 预期 PASS。

---

### 任务 4：进 App 不再把 accessToken 给 Java

**文件：**
- 创建：`app/server/billing/ensureAccount.server.ts`
- 修改：`app/routes/app.tsx`

- [ ] **步骤 1：** `ensureAccount(shop)` upsert，不读 `session.accessToken`。

- [ ] **步骤 2：** `app.tsx` action 删 `axios` 与 `SERVER_URL` POST。保留 shop GraphQL 取 email（app-only）。action 只 `ensureAccount(shopName)`。`ensureJobRunner()` 在 loader 里调用一次（任务 8 落地后接上；先空函数也可）。

- [ ] **步骤 3：** 人工：进 `/app` 不再请求 Java；Turso `Account` 出现一行。

---

### 任务 5：模板服务 + 官方种子

**文件：**
- 创建：`app/server/template/template.server.ts`
- 创建：`prisma/seed/official-templates.json`（先 `[]`，任务 5b 填）
- 创建：`scripts/import-official-templates.mjs`

响应必须兼容现前端 `TemplateDTO`：

```ts
export type TemplateDto = {
  id: number;
  templateData: string;
  templateTitle: string;
  templateType: string;
  templateDescription: string;
  templateClass: boolean; // false=官方 true=用户
  templateModel: string;
  templateSubtype: string;
  isPayment: boolean;
  isUserUsed: boolean;
};
```

函数：
- `listPickedTemplates(shop)` → 替代 `GetTemplateByShopName`
- `listCatalog(shop, { pageType, contentType, templateType, templateClass })` → `GetAllTemplateData`
- `addPick(shop, { templateId, templateType })` → `AddOfficialOrUserTemplate`（`templateType` 布尔：官方/用户，对齐 Java）
- `removeUserTemplate(shop, { id, templateClass })` → `DeleteUserTemplate`
- `createUserTemplate(shop, fields)` → `CreateUserTemplate`
- `previewOfficial(templateId)` → `PreviewExampleDataByTemplateId`（读 `exampleData`）

Java `templateType` 布尔在 Add/Delete 里表示官方 vs 用户；DTO 的 `templateType` 字符串是风格名。TS 参数分开：`source: "official" | "user"`。路由适配层把 Java 布尔转 source，避免页面大改。

- [ ] **步骤 1：** `import-official-templates.mjs` 读 JSON，`INSERT OR REPLACE` 进 `OfficialTemplate`。空数组时 no-op。

- [ ] **步骤 2：** 从 Java 只导出官方表（任务 5b，运维）。列：`id, template_data, template_title, template_type, template_description, template_model, template_subtype, is_payment, example_date`。`example_date` → JSON `exampleData`。

---

### 任务 6：生成链路接模板 + 扣费

**文件：**
- 修改：`app/server/ai/descriptionAiClient.server.ts`
- 测试：`app/server/ai/descriptionAiClient.server.test.ts`
- 修改：`app/server/ai/generateDescription.server.ts`
- 修改：`app/routes/aiGenerateDescription.tsx`

- [ ] **步骤 1：** chat 返回 `{ content, promptTokens, completionTokens }`。OpenAI/DeepSeek JSON `usage.prompt_tokens` / `usage.completion_tokens`；缺省当 0 但仍要有 content 才算成功。无 usage 时用 `Math.ceil(content.length / 4)` 作 completionTokens 兜底，避免 0 扣费。

测试只测 `billableCredits` 与 JSON parse，不打网。

- [ ] **步骤 2：** `GenerateDescriptionInput` 增加 `templateId?: number; templateSource?: "official" | "user"`。有模板则 `list` 出 `templateData` 拼进 system prompt（「Follow this template structure: …」）。无模板保持现逻辑（首页已走 `/aiGenerateDescription`）。

- [ ] **步骤 3：** 生成前 `remainingCredits < 1` → 返回 `{ success:false, errorCode:"QUOTA_INSUFFICIENT" }`。成功后 `deductShopCredits`。失败不扣。

- [ ] **步骤 4：** `resultManage` / `template_.create` 的 `GenerateDescription` 改为 `fetcher.submit` → `/aiGenerateDescription`（已鉴权），不要浏览器打 Java。把 `templateId` / `templateSource` 放进 form。

`JavaServer.GenerateDescription` 成功时把 `\n` 换成 `<br/>`。TS 路径若模型已返回 HTML 则不要二次替换；SEO 用 `htmlToPlainText`。与现 `/aiGenerateDescription` 对齐。

---

### 任务 7：商品列表替代 GetProductsByListId

**文件：**
- 创建：`app/server/shopify/productsByIds.server.ts`
- 修改：`app/routes/getProductInfoByIds.tsx`（可复用）

Java `GetProductsByListId` 读的是 Java 库缓存。P0 改实时 GraphQL。已有 `getProductInfoByIds`（`products(query:, first:20)`）。批量可能 >20，改为按 50 个 GID 一组 `nodes(ids:)`：

```graphql
query ProductsByIds($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Product { id title status }
  }
}
```

返回给页面的形状保持调用方能读 `id` / `title`。`batchGeneration` / `resultManage` 里客户端 `GetProductsByListId` 改为 submit `/getProductInfoByIds`。

---

### 任务 8：批量任务 + 进程内 runner

**文件：**
- 创建：`app/server/generateJob/job.server.ts`
- 创建：`app/server/generateJob/runner.server.ts`
- 测试：`app/server/generateJob/job.server.test.ts`
- 修改：`app/routes/app.batchGeneration.tsx` action
- 修改：`app/routes/stopBatchGenerateDescription.tsx`
- 修改：`app/routes/app.tsx` loader（`ensureJobRunner()`）

进度 DTO 对齐 `GenerateProgressBarVO`，页面少改：

```ts
export type UserDataDto = {
  allCount: number;
  unfinishedCount: number;
  taskModel: string;
  taskStatus: number; // 2 RUNNING, 4 FAILED/STOPPED, 3 完成（对齐现 batch 成功/失败码）
  taskData: string;   // JSON.stringify({ productIds })
  productTitle: string;
  status: number;
};
```

映射：RUNNING→`taskStatus=2`；COMPLETED→3；FAILED/STOPPED→4。现 `BatchGenerateDescription` 成功返回 `taskStatus:2`。

- [ ] **步骤 1：纯函数测试**（shop 已有 RUNNING 则拒绝入队；stop 只把 `stopRequested=true`）。

- [ ] **步骤 2：`enqueueBatchJob`**
  - 同店已有 `QUEUED|RUNNING` → 返回 success:false（对齐 Java `isTaskRunning`）。
  - 插入 job + N 条 PENDING items，status=QUEUED。
  - `ensureJobRunner()`。

- [ ] **步骤 3：runner**

```ts
let started = false;
export function ensureJobRunner() {
  if (started) return;
  started = true;
  setInterval(() => void tick().catch((err) => console.error("[generate-job]", err)), 3000);
}

async function tick() {
  const running = await prisma.generateJob.count({ where: { status: "RUNNING" } });
  if (running > 0) return;
  const job = await prisma.generateJob.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return;
  await prisma.generateJob.update({ where: { id: job.id }, data: { status: "RUNNING" } });
  await runJob(job.id);
}
```

`runJob`：逐条 PENDING；每条前读 `stopRequested`；用 `getShopAdminGraphql(shop)` + `generateDescriptionCopy`；DONE 写 html/title；额度不足则 job=FAILED 剩余 SKIPPED。一店一条由「全局同时只跑一个 RUNNING」简化为 P0（单 Web 实例）。多实例 P2。

进程重启：RUNNING 且心跳过期 → 下次 tick 当作 QUEUED 续跑。P0 用 `updatedAt < now-10min` 的 RUNNING 改回 QUEUED。

- [ ] **步骤 4：** `stopBatchGenerateDescription` 鉴权后 `stopRequested=true`。webhook `APP_UNINSTALLED` / `SHOP_REDACT` 同样停该店任务 + `Account.deletedAt`。

- [ ] **步骤 5：** 页面 `GetUserData` 改为 GET loader 或 action `intent=progress` 返回 DTO。`progressDataUpdate` 用 fetcher，不再 axios Java。

---

### 任务 9：购包 webhook

**文件：**
- 修改：`app/routes/webhooks.tsx`

- [ ] ACK 先 `200`，再处理（try/catch 仍 200）。
- [ ] `APP_PURCHASES_ONE_TIME_UPDATE`：`status===ACTIVE` 时 `grantPurchasedCredits({ shop, amount: pack.credits, uniqueKey: payload.app_purchase_one_time.admin_graphql_api_id })`。未知包名只打日志不入账。
- [ ] 删除 `InsertOrUpdateOrder` / `UpdateUserToken` / `SendAPGPurchaseEmail`。
- [ ] `APP_UNINSTALLED`：停任务、`deletedAt=now()`、`session.deleteMany`；不要再调 Java。
- [ ] `SHOP_REDACT`：停任务；已安装检查可失败，换票用 silent（P0 若无 redact 出站 GraphQL 则只清库）。

不写订单表（P0 用 BillingLog 即可）。

---

### 任务 10：页面拔掉 Java

按路由改 loader/action，去掉 `server: process.env.SERVER_URL` 和 `JavaServer` import。

| 路由 | 现 Java | 改为 |
|---|---|---|
| `app.pricing.tsx` | 客户端 `GetUserCounter` | loader 返回 `toCounterDto` |
| `app.template.tsx` | list/add/delete/preview | action intents |
| `app.template_.create.tsx` | create + GenerateDescription | create 走 template.server；预览生成走 `/aiGenerateDescription` |
| `app._index/route.tsx` | `GetTemplateByShopName` | loader `listPickedTemplates` |
| `app.batchGeneration.tsx` | batch + templates + GetUserData + GetProductsByListId | action 入队；进度 intent；商品 `/getProductInfoByIds` |
| `app.resultManage.tsx` | 同上 + GenerateDescription | 进度/商品/生成全部本仓 |
| `stopBatchGenerateDescription.tsx` | Java stop | `job.server` stop |
| `app.tsx` | insertOrUpdateApgUser | `ensureAccount` |

- [ ] 任何 `app/routes/**` 与 `app/api/**` 禁止出现 `SERVER_URL`、`JavaServer`。
- [ ] 删除 `app/api/JavaServer.ts`。
- [ ] `rg SERVER_URL description-fd` 与 `rg JavaServer` 为空。

---

### 任务 11：Java 存量迁移脚本

**文件：**
- 创建：`scripts/migrate-apg-from-java.mjs`

默认 dry-run。输入：`--from=path/to/export.json`（不要在脚本里直连生产 SQL Server，除非另给只读连接串且用户确认）。

JSON 形状：

```json
{
  "shops": [
    {
      "shop": "x.myshopify.com",
      "allToken": 1000000,
      "userToken": 12000,
      "templates": [
        {
          "id": 1,
          "templateData": "...",
          "templateTitle": "...",
          "templateType": "",
          "templateDescription": "",
          "templateModel": "product",
          "templateSubtype": "description"
        }
      ],
      "picks": [{ "source": "official", "templateId": 3 }]
    }
  ]
}
```

写入：`purchasedCredits=allToken`，`usedCredits=userToken`，自定义模板、picks。已存在 Account 则 skip 或 `--overwrite`（默认 skip）。

- [ ] 测环境先 dry-run 打印将写入行数。
- [ ] 写测 Turso 须用户说「可以写测试库」。
- [ ] 写产：`--env=.env.prod --confirm-prod` 且用户二次「确认执行 / 可以改产」。

Cutover：先停 Java 批量（或脚本把进行中当放弃），再迁积分/模板，再部署硬失败 token 代码。

---

### 任务 12：验证

```bash
npx prisma validate
npx prisma generate
npm test
npm run build
```

手工（密钥已配）：
1. 进 App → Account 行出现，Network 无 `/apg/`。
2. 商品列表 GraphQL 200。
3. 首页单次生成走 `/aiGenerateDescription`，`usedCredits` 增加。
4. 模板页官方种子可见，新建自定义模板进 Turso。
5. 批量入队后 3s 内 item 变 RUNNING/DONE；Stop 后不再开新 item。
6. 定价页余额 = Turso；webhook 用 Shopify 测试购包（test charge）只打测环境。

---

## 实现优先级

1. **P0** 任务 0→1→2→3→4→5→6→7→8→9→10→11→12（顺序有依赖：密钥与 schema 在业务之前；删 JavaServer 在替代完成之后）
2. **P1** 购包 SES/飞书；卸载出站 cancel；多 Web 实例下的 job 锁
3. **P2** 订阅/试用接线；独立 Worker；自动写回 Shopify（可延后）

## 风险（≤2）

- 任务 1 部署早于任务 0 → 全店 GraphQL 硬失败。必须先贴公钥再发版。
- 积分迁移写产不可逆；默认 dry-run。

---

## 规格覆盖自检

| 拍板项 | 任务 |
|---|---|
| app-only 硬失败、包 webhook/unauth、图一 kid | 0, 1 |
| 不回退 Session、不传 token 给 Java | 1, 4, 10 |
| Account 四池、P0 只购包 | 2, 3, 9 |
| 迁积分 + 自定义模板 | 11 |
| 官方模板种子 | 5 |
| Remix 进程内批量、一店一条、不新建 Worker | 8 |
| P0 不发邮件 | 9 |
| 删除 JavaServer / SERVER_URL | 10 |
| 进行中批量不迁 | 8 + 11 cutover |

无 TODO/待定占位。类型名全程：`remainingCredits` / `deductShopCredits` / `grantPurchasedCredits` / `ensureAccount` / `ensureJobRunner` / `TemplateDto` / `UserDataDto`。
