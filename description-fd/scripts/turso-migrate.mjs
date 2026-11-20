/**
 * Apply prisma/migrations/*.sql to Turso. Used by docker-start.
 * Local: node scripts/turso-migrate.mjs
 * Prod write: node scripts/turso-migrate.mjs --env=.env.prod --confirm-prod
 * Render 容器启动不要求 --confirm-prod。
 */
import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  REPO_ROOT,
  assertProdWriteAllowed,
  loadTursoEnv,
} from "./lib/loadTursoEnv.mjs";

const { url, authToken, overlay, argv } = loadTursoEnv();
const onRender = Boolean(process.env.RENDER) || process.env.NODE_ENV === "production";

if (!url.startsWith("libsql://") || !authToken) {
  if (onRender) {
    console.error("[Turso] migrate: need TURSO_DATABASE_URL (libsql://) and TURSO_AUTH_TOKEN");
    process.exit(1);
  }
  console.info("[Turso] migrate skip (no credentials; local sqlite)");
  process.exit(0);
}

try {
  assertProdWriteAllowed(argv, overlay, url);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const client = createClient({ url, authToken });
await client.execute(`
  CREATE TABLE IF NOT EXISTS _fd_migrations (
    name TEXT PRIMARY KEY,
    appliedAt TEXT NOT NULL
  )
`);

const appliedRows = await client.execute("SELECT name FROM _fd_migrations");
const applied = new Set(appliedRows.rows.map((row) => String(row.name)));
const dir = path.join(REPO_ROOT, "prisma", "migrations");
const folders = readdirSync(dir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const name of folders) {
  if (applied.has(name)) {
    console.info(`[Turso] skip ${name}`);
    continue;
  }
  const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
  try {
    await client.executeMultiple(sql);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/already exists/i.test(message)) throw err;
    console.info(`[Turso] ${name} already present (${message})`);
  }
  await client.execute({
    sql: "INSERT INTO _fd_migrations (name, appliedAt) VALUES (?, ?)",
    args: [name, new Date().toISOString()],
  });
  console.info(`[Turso] applied ${name}`);
}

console.info(`[Turso] migrate done host=${new URL(url).hostname}`);
