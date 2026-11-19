/**
 * 只读：查产 Turso + Render，定位图译订阅飞书没发。
 * 不打印 token / webhook URL / .env 值。
 */
import { createClient } from "@libsql/client";
import { loadStackedEnv, resolveTurso } from "../lib/loadEnv.mjs";

const SHOP = "ciwishop.myshopify.com";
const { env, overlay } = loadStackedEnv({ overlay: ".env.prod" });
const turso = resolveTurso(env);
if (!turso.url || !turso.authToken) {
  throw new Error("缺少 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN");
}
if (!/prod/i.test(turso.url)) {
  throw new Error("拒绝：Turso URL 不像 prod");
}

const feishuKeys = {
  FEISHU_ENV: Boolean(env.FEISHU_ENV?.trim()),
  FEISHU_ENV_value_ok: ["test", "prod"].includes(
    String(env.FEISHU_ENV || "").trim().toLowerCase(),
  ),
  FEISHU_WEBHOOK_URL_SUPPORT: Boolean(env.FEISHU_WEBHOOK_URL_SUPPORT?.trim()),
  FEISHU_ENABLED: env.FEISHU_ENABLED?.trim() || "(unset, default true)",
};
console.log("overlay", overlay);
console.log("local .env.prod Feishu keys", feishuKeys);

const db = createClient({ url: turso.url, authToken: turso.authToken });

const account = await db.execute({
  sql: `SELECT shop, plan, planType, feeType, subscriptionGid,
               purchasePoints, usedPoints, subscriptionCredits, purchasedCredits,
               trialCredits, usedCredits, trialEndsAt, currentPeriodEnd
        FROM Account WHERE shop = ?`,
  args: [SHOP],
});
console.log("Account", account.rows);

const sub = await db.execute({
  sql: `SELECT shop, planKey, shopifySubscriptionId, billingInterval, status,
               creditsPerPeriod, trialEndsAt, currentPeriodStart, currentPeriodEnd, cancelledAt
        FROM AppSubscription WHERE shop = ?`,
  args: [SHOP],
});
console.log("AppSubscription", sub.rows);

const logs = await db.execute({
  sql: `SELECT id, eventType, planKey, referenceId, creditsDelta, createdAt, metadata
        FROM BillingLog WHERE shop = ? ORDER BY createdAt DESC LIMIT 30`,
  args: [SHOP],
});
console.log("BillingLog count", logs.rows.length);
for (const row of logs.rows) {
  let meta = row.metadata;
  if (typeof meta === "string") {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = "(unparsed)";
    }
  }
  const metaSafe =
    meta && typeof meta === "object"
      ? {
          grantKind: meta.grantKind,
          chargeGuard: meta.chargeGuard?.reason || meta.chargeGuard,
          renewalFeishuSent: meta.renewalFeishuSent,
          annualCreditFeishuSent: meta.annualCreditFeishuSent,
          staffFeishuSent: meta.staffFeishuSent,
          stage: meta.stage,
          reason: meta.reason,
          kind: meta.kind,
        }
      : meta;
  console.log({
    eventType: row.eventType,
    planKey: row.planKey,
    creditsDelta: row.creditsDelta,
    createdAt: row.createdAt,
    refTail: String(row.referenceId || "").slice(-24),
    metaSafe,
  });
}

const catalog = await db.execute(
  `SELECT planKey, kind, billingInterval, shopifyPlanName, displayName, enabled, priceAmount, credits
   FROM PlanCatalog WHERE kind = 'SUBSCRIPTION' ORDER BY planKey`,
);
console.log(
  "PlanCatalog SUBSCRIPTION",
  catalog.rows.map((r) => ({
    planKey: r.planKey,
    interval: r.billingInterval,
    shopifyPlanName: r.shopifyPlanName,
    enabled: r.enabled,
    credits: r.credits,
    price: String(r.priceAmount),
  })),
);

const apiKey = env.RENDER_API_KEY?.trim();
const ownerId = env.RENDER_OWNER_ID?.trim() || "tea-csovfmhu0jms738qrra0";
if (!apiKey) {
  console.log("Render: no RENDER_API_KEY, skip logs");
  process.exit(0);
}

async function renderGet(path, query = {}) {
  const url = new URL(`https://api.render.com/v1${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Render ${res.status} ${path}`);
  return JSON.parse(text);
}

const services = await renderGet("/services", { limit: "100" });
const list = Array.isArray(services) ? services : services.items || [];
const matched = list
  .map((item) => item.service || item)
  .filter((s) => {
    const name = String(s.name || "");
    const url = String(s.serviceDetails?.url || s.url || "");
    return /translateimage/i.test(name) || /translateimage/i.test(url);
  })
  .map((s) => ({
    id: s.id,
    name: s.name,
    branch: s.repo?.branch || s.branch,
    autoDeploy: s.autoDeploy,
    updatedAt: s.updatedAt,
    url: s.serviceDetails?.url,
  }));
console.log("Render image services", matched);

const prod = matched.find((s) => /prod/i.test(s.name)) || matched[0];
if (!prod) {
  console.log("no TranslateImageProd service found");
  process.exit(0);
}

const deploys = await renderGet(`/services/${prod.id}/deploys`, { limit: "8" });
const deployList = Array.isArray(deploys) ? deploys : deploys.items || [];
console.log(
  "Recent deploys",
  deployList.map((d) => {
    const dep = d.deploy || d;
    return {
      id: dep.id,
      status: dep.status,
      commit: String(dep.commit?.id || dep.commitId || "").slice(0, 7),
      message: String(dep.commit?.message || "").slice(0, 80),
      createdAt: dep.createdAt,
      finishedAt: dep.finishedAt,
    };
  }),
);

const end = new Date();
const start = new Date(Date.now() - 6 * 3600_000);
const logUrl = new URL("https://api.render.com/v1/logs");
logUrl.searchParams.set("ownerId", ownerId);
logUrl.searchParams.set("resource", prod.id);
logUrl.searchParams.set("type", "app");
logUrl.searchParams.set("startTime", start.toISOString());
logUrl.searchParams.set("endTime", end.toISOString());
logUrl.searchParams.set("direction", "backward");
logUrl.searchParams.set("limit", "100");
const logRes = await fetch(logUrl, {
  headers: { Authorization: `Bearer ${apiKey}` },
});
const logJson = await logRes.json();
const lines = logJson.logs || [];
const interesting = /APP_SUBSCRIPTIONS|lifecycleFeishu|\[Feishu\]|charge.?guard|plan match|billing webhook|subscribe|install grant|图译|bad_feishu|no_webhook|Feishu/i;
const hits = [];
for (const line of lines) {
  const msg = String(line.message || line.log?.message || "");
  if (interesting.test(msg) || msg.includes(SHOP) && /webhook/i.test(msg)) {
    hits.push(`${line.timestamp || ""} ${msg.slice(0, 400)}`);
  }
}
console.log("interesting log hits", hits.length);
for (const h of hits.slice(0, 40)) console.log(h);

const boot = lines.filter((line) =>
  /\[translate-image:env\]|Feishu/i.test(String(line.message || "")),
);
console.log(
  "env/boot Feishu lines",
  boot.slice(0, 10).map((l) => String(l.message || "").slice(0, 300)),
);
