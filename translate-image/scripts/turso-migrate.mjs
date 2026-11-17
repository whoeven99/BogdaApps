/**
 * Apply prisma/migrations/*.sql to Turso.
 * Usage: node scripts/turso-migrate.mjs
 * Prod write: node scripts/turso-migrate.mjs --env=.env.prod --confirm-prod
 */
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  assertProdWriteAllowed,
  loadStackedEnv,
  REPO_ROOT,
  resolveTurso,
} from "./lib/loadEnv.mjs";

const argv = process.argv.slice(2);
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
await client.execute(`
  CREATE TABLE IF NOT EXISTS _ti_migrations (
    name TEXT PRIMARY KEY,
    appliedAt TEXT NOT NULL
  )
`);
const appliedRows = await client.execute("SELECT name FROM _ti_migrations");
const applied = new Set(appliedRows.rows.map((row) => String(row.name)));
const dir = path.join(REPO_ROOT, "prisma", "migrations");
const folders = readdirSync(dir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const name of folders) {
  if (applied.has(name)) {
    console.log(`skip ${name}`);
    continue;
  }
  const sqlPath = path.join(dir, name, "migration.sql");
  const sql = readFileSync(sqlPath, "utf8");
  await client.executeMultiple(sql);
  await client.execute({
    sql: "INSERT INTO _ti_migrations (name, appliedAt) VALUES (?, ?)",
    args: [name, new Date().toISOString()],
  });
  console.log(`applied ${name}`);
}

console.log(`done host=${new URL(url).hostname}`);
