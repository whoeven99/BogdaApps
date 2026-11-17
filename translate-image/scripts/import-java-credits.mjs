/**
 * 从 Java 快照导入剩余积分到 Turso Account。
 * gid / periodKey / kind 必须与 app/server/billing/quota.server.ts 一致。
 *
 * 用法：
 *   node scripts/import-java-credits.mjs
 *   node scripts/import-java-credits.mjs --write
 *   node scripts/import-java-credits.mjs --shop=xxx.myshopify.com --write
 *   node scripts/import-java-credits.mjs --env=.env.prod
 *   node scripts/import-java-credits.mjs --env=.env.prod --write --confirm-prod
 *
 * 默认 dry-run。已有 java-snapshot 的店跳过；--force 仅在该店尚无 CreditUsage 时覆写。
 * 不打印密钥 / SERVER_URL。
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import {
  assertProdWriteAllowed,
  loadStackedEnv,
  resolveTurso,
} from "./lib/loadEnv.mjs";

const JAVA_SNAPSHOT_PERIOD_KEY = "once";
const JAVA_SNAPSHOT_KIND = "java-snapshot";
const JAVA_SNAPSHOT_SUBSCRIPTION_GID = "java-snapshot";

function javaSnapshotGrantGid(shop) {
  return `java-snapshot:${shop}`;
}

function parseArgs(argv) {
  const out = {
    write: false,
    force: false,
    shop: "",
    limit: 0,
  };
  for (const a of argv) {
    if (a === "--write") out.write = true;
    else if (a === "--dry-run") out.write = false;
    else if (a === "--force") out.force = true;
    else if (a.startsWith("--shop=")) out.shop = a.slice("--shop=".length).trim();
    else if (a.startsWith("--limit=")) out.limit = Math.max(0, Number(a.slice("--limit=".length)) || 0);
  }
  return out;
}

function tursoHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "(invalid-url)";
  }
}

async function javaJson(url) {
  const res = await fetch(url, { method: url.includes("getPurchasePoints") ? "POST" : "GET" });
  return res.json().catch(() => null);
}

async function fetchJavaQuota(server, shop) {
  const words = await javaJson(`${server}/pcUsers/getPurchasePoints?shopName=${encodeURIComponent(shop)}`);
  if (!words?.success) return { ok: false, reason: words?.errorMsg || "java-words-failed" };
  const plan = await javaJson(
    `${server}/pc/userSubscription/getUserSubscriptionPlan?shopName=${encodeURIComponent(shop)}`,
  );
  const periodEndRaw = plan?.response?.currentPeriodEnd;
  const periodEnd = periodEndRaw ? new Date(periodEndRaw) : null;
  return {
    ok: true,
    purchasePoints: Number(words?.response?.purchasePoints ?? 0) || 0,
    usedPoints: Number(words?.response?.usedPoints ?? 0) || 0,
    plan: Number.isFinite(Number(plan?.response?.userSubscriptionPlan))
      ? Number(plan.response.userSubscriptionPlan)
      : 1,
    planType: String(plan?.response?.planType ?? "Free"),
    feeType: Number.isFinite(Number(plan?.response?.feeType)) ? Number(plan.response.feeType) : 0,
    currentPeriodEnd:
      periodEnd && !Number.isNaN(periodEnd.getTime()) ? periodEnd.toISOString() : null,
  };
}

async function listShops(client, shopFilter) {
  if (shopFilter) return [shopFilter];
  const shops = new Set();
  try {
    const sessions = await client.execute("SELECT DISTINCT shop FROM Session");
    for (const row of sessions.rows) {
      const shop = String(row.shop || "").trim();
      if (shop) shops.add(shop);
    }
  } catch (err) {
    console.warn("read Session failed", err instanceof Error ? err.message : err);
  }
  try {
    const accounts = await client.execute("SELECT shop FROM Account");
    for (const row of accounts.rows) {
      const shop = String(row.shop || "").trim();
      if (shop) shops.add(shop);
    }
  } catch (err) {
    console.warn("read Account failed", err instanceof Error ? err.message : err);
  }
  return [...shops].sort();
}

async function grantExists(client, shop) {
  const res = await client.execute({
    sql: "SELECT 1 AS ok FROM CreditGrant WHERE gid = ? AND periodKey = ? LIMIT 1",
    args: [javaSnapshotGrantGid(shop), JAVA_SNAPSHOT_PERIOD_KEY],
  });
  return res.rows.length > 0;
}

async function hasLocalUsage(client, shop) {
  const res = await client.execute({
    sql: "SELECT 1 AS ok FROM CreditUsage WHERE shop = ? LIMIT 1",
    args: [shop],
  });
  return res.rows.length > 0;
}

async function applySnapshot(client, shop, snapshot) {
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO Account (
        shop, plan, planType, feeType, purchasePoints, usedPoints,
        subscriptionGid, currentPeriodEnd, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(shop) DO UPDATE SET
        plan = excluded.plan,
        planType = excluded.planType,
        feeType = excluded.feeType,
        purchasePoints = excluded.purchasePoints,
        usedPoints = excluded.usedPoints,
        subscriptionGid = excluded.subscriptionGid,
        currentPeriodEnd = excluded.currentPeriodEnd,
        updatedAt = excluded.updatedAt`,
    args: [
      shop,
      snapshot.plan,
      snapshot.planType,
      snapshot.feeType,
      snapshot.purchasePoints,
      snapshot.usedPoints,
      snapshot.plan > 1 ? JAVA_SNAPSHOT_SUBSCRIPTION_GID : null,
      snapshot.currentPeriodEnd,
      now,
      now,
    ],
  });
  try {
    await client.execute({
      sql: `INSERT INTO CreditGrant (id, shop, gid, periodKey, kind, credits, createdAt)
            VALUES (?, ?, ?, ?, ?, 0, ?)`,
      args: [
        randomUUID(),
        shop,
        javaSnapshotGrantGid(shop),
        JAVA_SNAPSHOT_PERIOD_KEY,
        JAVA_SNAPSHOT_KIND,
        now,
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/UNIQUE|unique/i.test(message)) throw err;
  }
}

const argv = process.argv.slice(2);
const { overlay } = loadStackedEnv({ argv });
const args = parseArgs(argv);
const { url, authToken } = resolveTurso();
const server = (process.env.SERVER_URL || "").trim().replace(/\/$/, "");

if (!url.startsWith("libsql://") || !authToken) {
  console.error("Need TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
  process.exit(1);
}
if (!server) {
  console.error("Need SERVER_URL");
  process.exit(1);
}

if (args.write) {
  try {
    assertProdWriteAllowed(argv, overlay, url);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

const client = createClient({ url, authToken });
let shops = await listShops(client, args.shop);
if (args.limit > 0) shops = shops.slice(0, args.limit);

console.log(
  `mode=${args.write ? "write" : "dry-run"} overlay=${overlay} turso=${tursoHost(url)} shops=${shops.length} force=${args.force ? "yes" : "no"} java=set`,
);

const counts = { applied: 0, skipped: 0, failed: 0, blocked: 0 };
for (const shop of shops) {
  try {
    const exists = await grantExists(client, shop);
    if (exists && !args.force) {
      counts.skipped += 1;
      console.log(`skip ${shop} already-snapshotted`);
      continue;
    }
    if (exists && args.force && (await hasLocalUsage(client, shop))) {
      counts.blocked += 1;
      console.log(`skip ${shop} force-blocked-by-usage`);
      continue;
    }
    const snapshot = await fetchJavaQuota(server, shop);
    if (!snapshot.ok) {
      counts.failed += 1;
      console.log(`fail ${shop} ${snapshot.reason}`);
      continue;
    }
    const remaining = snapshot.purchasePoints - snapshot.usedPoints;
    if (!args.write) {
      counts.applied += 1;
      console.log(
        `dry ${shop} remaining=${remaining} purchase=${snapshot.purchasePoints} used=${snapshot.usedPoints} plan=${snapshot.planType}`,
      );
      continue;
    }
    await applySnapshot(client, shop, snapshot);
    counts.applied += 1;
    console.log(
      `ok ${shop} remaining=${remaining} purchase=${snapshot.purchasePoints} used=${snapshot.usedPoints} plan=${snapshot.planType}`,
    );
  } catch (err) {
    counts.failed += 1;
    console.log(`fail ${shop} ${err instanceof Error ? err.message : err}`);
  }
}

console.log(
  `done applied=${counts.applied} skipped=${counts.skipped} blocked=${counts.blocked} failed=${counts.failed}`,
);
