/**
 * 把 Account.purchasePoints-usedPoints 拆进三池。默认 dry-run。
 *   node scripts/migrate-billing-pools.mjs
 *   node scripts/migrate-billing-pools.mjs --write
 *   node scripts/migrate-billing-pools.mjs --shop=xxx.myshopify.com --write
 *   产：--env=.env.prod --write --confirm-prod
 */
import { createClient } from "@libsql/client";
import {
  periodCreditsFromCatalog,
  splitLegacyRemaining,
} from "./lib/accountBalance.mjs";
import {
  assertProdWriteAllowed,
  loadStackedEnv,
  resolveTurso,
} from "./lib/loadEnv.mjs";

function parseArgs(argv) {
  const out = { write: false, shop: "", limit: 0 };
  for (const a of argv) {
    if (a === "--write") out.write = true;
    else if (a === "--dry-run") out.write = false;
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

const argv = process.argv.slice(2);
const args = parseArgs(argv);
const { overlay } = loadStackedEnv({ argv });
const { url, authToken } = resolveTurso();
if (!url.startsWith("libsql://") || !authToken) {
  console.error("Need TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
  process.exit(1);
}
try {
  assertProdWriteAllowed(argv, overlay, url);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const client = createClient({ url, authToken });
const catalogRes = await client.execute(
  `SELECT kind, shopifyPlanName, billingInterval, credits FROM PlanCatalog WHERE enabled = 1`,
);
const catalog = catalogRes.rows.map((row) => ({
  kind: String(row.kind || ""),
  shopifyPlanName: String(row.shopifyPlanName || ""),
  billingInterval: row.billingInterval == null ? null : String(row.billingInterval),
  credits: Number(row.credits) || 0,
}));

let sql = `SELECT shop, plan, planType, feeType, purchasePoints, usedPoints FROM Account`;
const queryArgs = [];
if (args.shop) {
  sql += ` WHERE shop = ?`;
  queryArgs.push(args.shop);
}
if (args.limit > 0) sql += ` LIMIT ${args.limit}`;
const accounts = await client.execute({ sql, args: queryArgs });

let changed = 0;
for (const row of accounts.rows) {
  const shop = String(row.shop);
  const remaining = Math.max(0, Number(row.purchasePoints || 0) - Number(row.usedPoints || 0));
  const period = periodCreditsFromCatalog(row.planType, row.feeType, catalog);
  const split = splitLegacyRemaining({
    remaining,
    plan: Number(row.plan) || 1,
    periodCredits: period,
  });
  changed += 1;
  console.log(
    `${args.write ? "write" : "dry-run"} shop=${shop} remaining=${remaining} sub=${split.subscriptionCredits} purchased=${split.purchasedCredits}`,
  );
  if (!args.write) continue;
  await client.execute({
    sql: `UPDATE Account SET subscriptionCredits = ?, purchasedCredits = ?, trialCredits = 0, usedCredits = 0, updatedAt = CURRENT_TIMESTAMP WHERE shop = ?`,
    args: [split.subscriptionCredits, split.purchasedCredits, shop],
  });
}

console.log(
  `done host=${tursoHost(url)} overlay=${overlay} write=${args.write} shops=${changed}`,
);
