/**
 * Apply prisma/migrations/*.sql to Turso.
 * Usage: node scripts/turso-migrate.mjs
 * Prod write: node scripts/turso-migrate.mjs --confirm-prod
 */
import { createClient } from "@libsql/client";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = (process.env.TURSO_DATABASE_URL || "").trim();
const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();
if (!url.startsWith("libsql://") || !authToken) {
  console.error("Need TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
  process.exit(1);
}

const isProd = /prod/i.test(url);
const confirmProd = process.argv.includes("--confirm-prod");
if (isProd && !confirmProd) {
  console.error("Refusing prod Turso without --confirm-prod");
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
const dir = path.join(root, "prisma", "migrations");
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
