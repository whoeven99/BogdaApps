import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 去掉首尾空白与成对引号（Render 控制台偶发带入） */
export function normalizeEnvValue(value: string | undefined): string {
  if (value == null) return "";
  let v = String(value).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

let runtimeEnvLoaded = false;

export function getProjectRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

/** Shopify CLI 在 dev 时注入；本地 .env 不应覆盖 */
const PRESERVE_WHEN_SET_KEYS = new Set([
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_APP_URL",
  "HOST",
  "PORT",
  "FRONTEND_PORT",
  "SCOPES",
]);

function maskValue(key: string, value: string): string {
  if (!value) return "(空)";
  if (/token|secret|key|password|auth/i.test(key)) {
    return `(已设置,len=${value.length})`;
  }
  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}

function applyEnvFileContent(
  content: string,
  sourceLabel: string,
  overrideExisting: boolean,
): number {
  let applied = 0;
  const loadedKeys: string[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    const existing = process.env[key];
    const alreadySet = existing !== undefined && existing !== "";
    const preserveCliValue = alreadySet && PRESERVE_WHEN_SET_KEYS.has(key);
    const shouldApply =
      !preserveCliValue &&
      (existing === undefined ||
        existing === "" ||
        (overrideExisting && !process.env.RENDER));
    if (shouldApply) {
      process.env[key] = value;
      applied += 1;
      loadedKeys.push(`${key}=${maskValue(key, value)}`);
    }
  }
  if (applied > 0) {
    console.info(
      `[env] 从 ${sourceLabel} 加载 ${applied} 个变量: ${loadedKeys.join("; ")}`,
    );
  }
  return applied;
}

function tryLoadEnvFile(filePath: string, overrideExisting: boolean): void {
  if (!existsSync(filePath)) return;
  try {
    const content = readFileSync(filePath, "utf8");
    applyEnvFileContent(content, filePath, overrideExisting);
  } catch (error) {
    console.warn(`[env] 读取 ${filePath} 失败:`, error);
  }
}

function candidateEnvFiles(projectRoot: string): string[] {
  const rootEnv = path.join(projectRoot, ".env");
  const fromEnv = [
    process.env.ENV_FILE,
    process.env.DOTENV_PATH,
    process.env.ENV_FILE_PATH,
  ]
    .filter((p): p is string => Boolean(p?.trim()))
    .map((p) => path.resolve(p.trim()));

  const secretPaths = [
    "/etc/secrets/.env",
    "/etc/secrets/env",
    "/var/secrets/.env",
  ];

  const cwdEnv = path.join(process.cwd(), ".env");
  return [...new Set([rootEnv, ...fromEnv, cwdEnv, ...secretPaths])];
}

function logTursoEnvStatus(): void {
  const tursoKeys = Object.keys(process.env)
    .filter((k) => k.startsWith("TURSO_"))
    .sort();
  console.info(
    `[env] NODE_ENV=${process.env.NODE_ENV}, RENDER=${process.env.RENDER ?? "(unset)"}, cwd=${process.cwd()}`,
  );
  console.info(
    `[env] TURSO_DATABASE_URL=${process.env.TURSO_DATABASE_URL ? "(set)" : "缺失"}`,
  );
  console.info(
    `[env] TURSO_AUTH_TOKEN=${process.env.TURSO_AUTH_TOKEN ? "(set)" : "缺失"}`,
  );
  if (tursoKeys.length > 0) {
    console.info(`[env] TURSO_* 键: ${tursoKeys.join(", ")}`);
  }
}

/**
 * 启动时加载本地 .env 与 Render Secret File（/etc/secrets/.env 等）。
 * 在 db.server / redis.server 最早 import 时调用，无需 Docker NODE_OPTIONS。
 */
export function ensureRuntimeEnv(): void {
  if (runtimeEnvLoaded) return;
  runtimeEnvLoaded = true;

  const projectRoot = getProjectRoot();
  for (const filePath of candidateEnvFiles(projectRoot)) {
    const isProjectDotEnv =
      filePath === path.join(projectRoot, ".env") ||
      filePath === path.join(process.cwd(), ".env");
    tryLoadEnvFile(filePath, isProjectDotEnv);
  }

  logTursoEnvStatus();
}

export function getRuntimeEnv(name: string): string {
  return normalizeEnvValue(process.env[name]);
}
