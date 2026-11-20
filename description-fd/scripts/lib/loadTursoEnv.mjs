/**
 * 运维脚本叠加载 env。不打印 .env* 的值。
 * 默认：.env.test → .env → Render Secret File
 * 查产：--env=.env.prod
 * 改产：还须 --confirm-prod（Render 容器启动除外）
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, "../..");

const SECRET_PATHS = ["/etc/secrets/.env", "/etc/secrets/env", "/var/secrets/.env"];

export function normalizeEnvValue(value) {
  let v = String(value ?? "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'")) ||
    (v.startsWith("`") && v.endsWith("`"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function parseEnvFile(filePath) {
  const env = {};
  if (!existsSync(filePath)) return env;
  for (const raw of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    env[key] = normalizeEnvValue(line.slice(eq + 1));
  }
  return env;
}

export function pickEnvOverlayFromArgv(argv = process.argv.slice(2), fallback = ".env.test") {
  for (const a of argv) {
    if (a.startsWith("--env=")) {
      return a.slice("--env=".length).trim() || fallback;
    }
  }
  return fallback;
}

function resolveEnvPath(root, nameOrPath) {
  if (!nameOrPath) return null;
  return isAbsolute(nameOrPath) ? nameOrPath : resolve(root, nameOrPath);
}

function applyEnvFile(filePath) {
  if (!existsSync(filePath)) return 0;
  let applied = 0;
  for (const [key, value] of Object.entries(parseEnvFile(filePath))) {
    if (!process.env[key]) {
      process.env[key] = value;
      applied += 1;
    }
  }
  if (applied > 0) {
    console.info(`[Turso] loaded ${applied} vars from ${filePath}`);
  }
  return applied;
}

export function loadStackedEnv(opts = {}) {
  const root = opts.root ?? REPO_ROOT;
  const overlayName =
    opts.overlay ?? pickEnvOverlayFromArgv(opts.argv ?? process.argv.slice(2), ".env.test");
  const applyToProcess = opts.applyToProcess !== false;

  const files = [];
  const overlayPath = resolveEnvPath(root, overlayName);
  if (overlayPath) files.push(overlayPath);
  files.push(resolve(root, ".env"));

  const uniqueFiles = [...new Set(files.map((f) => resolve(f)))];
  const env = {};
  for (const f of uniqueFiles) {
    Object.assign(env, parseEnvFile(f));
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v != null && v !== "") env[k] = v;
  }
  if (applyToProcess) {
    for (const [k, v] of Object.entries(env)) {
      if (process.env[k] == null || process.env[k] === "") process.env[k] = v;
    }
  }
  return { env, files: uniqueFiles.filter((f) => existsSync(f)), overlay: overlayName };
}

export function loadSecretFiles() {
  for (const filePath of SECRET_PATHS) {
    applyEnvFile(filePath);
  }
}

export function loadTursoEnv(opts = {}) {
  const argv = opts.argv ?? process.argv.slice(2);
  const { overlay } = loadStackedEnv({ argv, root: opts.root });
  loadSecretFiles();
  return {
    url: normalizeEnvValue(process.env.TURSO_DATABASE_URL),
    authToken: normalizeEnvValue(process.env.TURSO_AUTH_TOKEN),
    overlay,
    argv,
  };
}

export function isProdEnvOverlay(overlay) {
  const base = String(overlay || "")
    .replace(/\\/g, "/")
    .split("/")
    .pop();
  return base === ".env.prod";
}

export function tursoLooksProd(url) {
  return /prod/i.test(String(url || ""));
}

export function assertProdWriteAllowed(
  argv = process.argv.slice(2),
  overlay = pickEnvOverlayFromArgv(argv),
  url = process.env.TURSO_DATABASE_URL,
) {
  if (process.env.RENDER) return;
  const prod = isProdEnvOverlay(overlay) || tursoLooksProd(url);
  if (!prod) return;
  if (argv.includes("--confirm-prod")) return;
  throw new Error(
    [
      "拒绝写生产：检测到生产 env 或 Turso URL，但未带 --confirm-prod。",
      "只读查询加 --env=.env.prod 即可。",
      "若确认要改产数据，请同时加上：--env=.env.prod --confirm-prod",
    ].join("\n"),
  );
}
