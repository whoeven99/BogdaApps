import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENV_LOG = "[description-fd:env]";

export function normalizeEnvValue(value: string | undefined): string {
  if (value == null) return "";
  let v = String(value).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'")) ||
    (v.startsWith("`") && v.endsWith("`"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

let runtimeEnvLoaded = false;

export function getProjectRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

const PRESERVE_WHEN_SET_KEYS = new Set([
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_APP_URL",
  "HOST",
  "PORT",
  "FRONTEND_PORT",
  "SCOPES",
]);

const RENDER_SECRET_PATHS = new Set([
  "/etc/secrets/.env",
  "/etc/secrets/env",
  "/var/secrets/.env",
]);

function applyEnvFileContent(
  content: string,
  overrideExisting: boolean,
): { appliedCount: number; skipped: string[] } {
  let appliedCount = 0;
  const skipped: string[] = [];
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
      appliedCount += 1;
    } else if (alreadySet) {
      skipped.push(key);
    }
  }
  return { appliedCount, skipped };
}

function tryLoadEnvFile(filePath: string, overrideExisting: boolean): number {
  if (!existsSync(filePath)) return 0;
  try {
    const { appliedCount, skipped } = applyEnvFileContent(
      readFileSync(filePath, "utf8"),
      overrideExisting,
    );
    console.info(
      `${ENV_LOG} 从 ${filePath} 加载 ${appliedCount} 个变量` +
        (skipped.length > 0 ? `，跳过已有键: ${skipped.join(", ")}` : ""),
    );
    return appliedCount;
  } catch (error) {
    console.warn(`${ENV_LOG} 读取 ${filePath} 失败:`, error);
    return 0;
  }
}

function candidateEnvFiles(projectRoot: string): string[] {
  const fromEnv = [process.env.ENV_FILE, process.env.DOTENV_PATH, process.env.ENV_FILE_PATH]
    .filter((p): p is string => Boolean(p?.trim()))
    .map((p) => path.resolve(p.trim()));
  return [
    ...new Set([
      path.join(projectRoot, ".env"),
      ...fromEnv,
      path.join(process.cwd(), ".env"),
      "/etc/secrets/.env",
      "/etc/secrets/env",
      "/var/secrets/.env",
    ]),
  ];
}

function maskValue(key: string, value: string): string {
  if (/token|secret|key|password|auth|credential|pem/i.test(key)) {
    return `(已设置,len=${value.length})`;
  }
  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}

function logTursoStatus(): void {
  const url = normalizeEnvValue(process.env.TURSO_DATABASE_URL);
  const token = normalizeEnvValue(process.env.TURSO_AUTH_TOKEN);
  console.info(
    `${ENV_LOG} Turso url=${url ? maskValue("TURSO_DATABASE_URL", url) : "❌ 缺失"} token=${
      token ? maskValue("TURSO_AUTH_TOKEN", token) : "❌ 缺失"
    }`,
  );
}

/** 启动时加载本地 .env 与 Render Secret File。必须在 shopifyApp() 之前调用。 */
export function ensureRuntimeEnv(): void {
  if (runtimeEnvLoaded) return;
  runtimeEnvLoaded = true;
  console.info(
    `${ENV_LOG} NODE_ENV=${process.env.NODE_ENV}, RENDER=${process.env.RENDER ?? "(unset)"}`,
  );
  const projectRoot = getProjectRoot();
  for (const filePath of candidateEnvFiles(projectRoot)) {
    const isProjectDotEnv =
      filePath === path.join(projectRoot, ".env") ||
      filePath === path.join(process.cwd(), ".env");
    tryLoadEnvFile(filePath, isProjectDotEnv);
  }
  logTursoStatus();
}

export function getRuntimeEnv(name: string): string {
  return normalizeEnvValue(process.env[name]);
}
