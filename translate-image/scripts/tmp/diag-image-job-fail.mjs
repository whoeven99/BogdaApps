/**
 * 只读：查产 Turso 图译任务 + Render TranslateImageProd 日志。
 * 不打印 token / webhook / .env 值。
 */
import { createClient } from "@libsql/client";
import { loadStackedEnv, parseEnvFile, resolveTurso } from "../lib/loadEnv.mjs";

const JOB_ID = "f5718a2b-bd99-4856-9568-d8d048a7e612";
const SHOP = "ciwishop.myshopify.com";
const SVC = "srv-d41d5tur433s73dspvmg";

const { env, overlay, files } = loadStackedEnv({ overlay: ".env.prod" });
if (!env.RENDER_API_KEY?.trim()) {
  const tsfProd = parseEnvFile("D:/code/ciwi-translate/.env.prod");
  const sparkEnv = parseEnvFile("D:/code/Spark/.env");
  env.RENDER_API_KEY = tsfProd.RENDER_API_KEY || sparkEnv.RENDER_API_KEY || "";
  env.RENDER_OWNER_ID = env.RENDER_OWNER_ID || tsfProd.RENDER_OWNER_ID || sparkEnv.RENDER_OWNER_ID || "";
  if (env.RENDER_API_KEY) process.env.RENDER_API_KEY = env.RENDER_API_KEY;
}
const turso = resolveTurso(env);
if (!turso.url || !turso.authToken) {
  throw new Error("缺少 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN");
}
console.log("overlay", overlay);
console.log(
  "env files present",
  files.map((f) => f.split(/[/\\]/).pop()),
);
console.log("turso url looks prod", /prod/i.test(turso.url));
console.log("has RENDER_API_KEY", Boolean(env.RENDER_API_KEY?.trim()));
console.log("has GOOGLE_SERVICE_ACCOUNT_JSON", Boolean(env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()));
console.log("GOOGLE_CLOUD_LOCATION", env.GOOGLE_CLOUD_LOCATION?.trim() || "(unset)");
console.log("TENCENT_SES_REGION", env.TENCENT_SES_REGION?.trim() || "(unset)");
console.log("has TENCENT_CLOUD_KEY_ID", Boolean(env.TENCENT_CLOUD_KEY_ID?.trim()));

const db = createClient({ url: turso.url, authToken: turso.authToken });

const job = await db.execute({
  sql: `SELECT id, shop, targetLanguage, model, kind, status, pauseReason, retranslate,
               total, done, failed, skipped, creditsUsed, emailSent, claimedBy,
               heartbeatAt, finishedAt, createdAt, updatedAt
        FROM ImageTranslateJob WHERE id = ?`,
  args: [JOB_ID],
});
console.log("job", job.rows);

const items = await db.execute({
  sql: `SELECT id, urlKey, productId, resourceTitle, status, error, credits,
               substr(imageUrl, 1, 80) AS imageUrlHead, createdAt, updatedAt
        FROM ImageTranslateJobItem WHERE jobId = ? ORDER BY createdAt`,
  args: [JOB_ID],
});
console.log("items", items.rows);

const pendingEmail = await db.execute({
  sql: `SELECT id, shop, status, emailSent, failed, done, total, finishedAt
        FROM ImageTranslateJob
        WHERE status = 'COMPLETED' AND emailSent = 0
          AND finishedAt IS NOT NULL
        ORDER BY finishedAt DESC LIMIT 15`,
});
console.log("completed emailSent=0", pendingEmail.rows.length, pendingEmail.rows);

const recentFail = await db.execute({
  sql: `SELECT i.jobId, i.shop, i.resourceTitle, i.status,
               substr(i.error, 1, 220) AS errorHead, i.updatedAt
        FROM ImageTranslateJobItem i
        WHERE i.status = 'FAILED'
        ORDER BY i.updatedAt DESC LIMIT 12`,
});
console.log("recent FAILED items", recentFail.rows);

const shopJobs = await db.execute({
  sql: `SELECT id, status, total, done, failed, skipped, emailSent, claimedBy, createdAt, finishedAt
        FROM ImageTranslateJob WHERE shop = ? ORDER BY createdAt DESC LIMIT 8`,
  args: [SHOP],
});
console.log("shop recent jobs", shopJobs.rows);

const runningItems = await db.execute({
  sql: `SELECT jobId, resourceTitle, status, substr(error, 1, 220) AS errorHead, updatedAt
        FROM ImageTranslateJobItem
        WHERE jobId IN ('ced3a9b6-bf66-4e45-819a-0d131be169ef', 'f5718a2b-dd96-4866-9b8f-88d948af2632')
        ORDER BY jobId, createdAt`,
});
console.log("running+target items", runningItems.rows);

const failFull = await db.execute({
  sql: `SELECT error FROM ImageTranslateJobItem
        WHERE jobId = 'f5718a2b-dd96-4866-9b8f-88d948af2632' AND status = 'FAILED'`,
});
console.log("full fail error", failFull.rows);

const emailStats = await db.execute(
  `SELECT status, emailSent, COUNT(*) AS n FROM ImageTranslateJob GROUP BY status, emailSent`,
);
console.log("job status x emailSent", emailStats.rows);

const apiKey = env.RENDER_API_KEY?.trim();
const ownerId = env.RENDER_OWNER_ID?.trim() || "tea-csovfmhu0jms738qrra0";
if (!apiKey) {
  console.log("Render: no RENDER_API_KEY, skip logs");
  process.exit(0);
}

async function renderGet(path, query = {}) {
  const url = new URL(`https://api.render.com/v1${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, item);
    } else {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Render ${res.status} ${path} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

const svc = await renderGet(`/services/${SVC}`);
const service = svc.service || svc;
const details = service.serviceDetails || {};
console.log("render service", {
  id: service.id,
  name: service.name,
  type: service.type,
  plan: details.plan || service.plan,
  region: details.region || service.region,
  env: details.env,
  numInstances: details.numInstances,
  suspended: service.suspended,
  autoDeploy: service.autoDeploy,
  branch: service.repo?.branch || details.branch,
  url: details.url,
  updatedAt: service.updatedAt,
});

const deploys = await renderGet(`/services/${SVC}/deploys`, { limit: "6" });
const deployList = Array.isArray(deploys) ? deploys : deploys.items || [];
console.log(
  "recent deploys",
  deployList.map((d) => {
    const dep = d.deploy || d;
    return {
      status: dep.status,
      commit: String(dep.commit?.id || dep.commitId || "").slice(0, 7),
      message: String(dep.commit?.message || "").slice(0, 90),
      createdAt: dep.createdAt,
      finishedAt: dep.finishedAt,
    };
  }),
);

const end = new Date();
const start = new Date(Date.now() - 18 * 3600_000);
const logJson = await renderGet("/logs", {
  ownerId,
  resource: SVC,
  type: "app",
  level: "error",
  startTime: start.toISOString(),
  endTime: end.toISOString(),
  direction: "backward",
  limit: "100",
});
const lines = logJson.logs || [];
console.log("log lines pulled", lines.length);

const interesting =
  /imageTranslate|tencentSes|imgEmail|oauth2|ETIMEDOUT|InvalidTemplate|f5718a2b|item failed|geminiImage|spin|sleep/i;
const hits = [];
const templateIds = new Map();
for (const line of lines) {
  const msg = String(line.message || line.log?.message || "");
  const ts = line.timestamp || "";
  const m = msg.match(/"templateId":(\d+)/);
  if (m) templateIds.set(m[1], (templateIds.get(m[1]) || 0) + 1);
  if (interesting.test(msg)) hits.push(`${ts} ${msg.slice(0, 500)}`);
}
console.log("templateId counts in log window", Object.fromEntries(templateIds));
console.log("interesting hits", hits.length);
for (const h of hits.slice(0, 50)) console.log(h);
console.log("raw error sample");
for (const line of lines.slice(0, 8)) {
  const msg = String(line.message || JSON.stringify(line)).slice(0, 450);
  console.log(`${line.timestamp || ""} ${msg}`);
}
