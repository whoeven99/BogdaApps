import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENV_LOG = "[translate-image:env]";

/** 去掉首尾空白与成对引号（Render 控制台偶发带入） */
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

/** Shopify CLI 在 `shopify app dev` 时注入；本地 .env 不应覆盖 */
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

function maskValue(key: string, value: string): string {
  if (!value) return "(空)";
  if (/token|secret|key|password|auth|credential|pem/i.test(key)) {
    return `(已设置,len=${value.length})`;
  }
  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}

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
  const exists = existsSync(filePath);
  console.info(`${ENV_LOG} 检查 ${filePath}: ${exists ? "存在" : "不存在"}`);
  if (!exists) return 0;
  try {
    const content = readFileSync(filePath, "utf8");
    const { appliedCount, skipped } = applyEnvFileContent(
      content,
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
  const rootEnv = path.join(projectRoot, ".env");
  const fromEnv = [
    process.env.ENV_FILE,
    process.env.DOTENV_PATH,
    process.env.ENV_FILE_PATH,
  ]
    .filter((p): p is string => Boolean(p?.trim()))
    .map((p) => path.resolve(p.trim()));
  const cwdEnv = path.join(process.cwd(), ".env");
  return [
    ...new Set([
      rootEnv,
      ...fromEnv,
      cwdEnv,
      "/etc/secrets/.env",
      "/etc/secrets/env",
      "/var/secrets/.env",
    ]),
  ];
}

type EnvField = [key: string, value: string | undefined];

function formatEnvField([key, value]: EnvField): string {
  if (value?.trim()) return `${key}=${maskValue(key, value)}`;
  return `${key}=❌ 缺失`;
}

function logEnvCheck(service: string, ok: boolean, fields: EnvField[]): void {
  console.info(`${ENV_LOG}   [${ok ? "✅" : "❌"}] ${service}`);
  for (const field of fields) {
    console.info(`${ENV_LOG}       ${formatEnvField(field)}`);
  }
}

function logCriticalEnvStatus(): void {
  console.info(`${ENV_LOG} ===== 关键变量 =====`);

  logEnvCheck(
    "Shopify",
    Boolean(
      process.env.SHOPIFY_API_KEY?.trim() &&
        process.env.SHOPIFY_API_SECRET?.trim(),
    ),
    [
      ["SHOPIFY_API_KEY", process.env.SHOPIFY_API_KEY],
      ["SHOPIFY_API_SECRET", process.env.SHOPIFY_API_SECRET],
      ["SHOPIFY_APP_URL", process.env.SHOPIFY_APP_URL],
      ["SCOPES", process.env.SCOPES],
    ],
  );

  logEnvCheck(
    "App-only token",
    Boolean(
      process.env.SHOPIFY_APP_ONLY_KEY_ID?.trim() &&
        process.env.SHOPIFY_APP_ONLY_PRIVATE_KEY?.trim(),
    ),
    [
      ["SHOPIFY_APP_ONLY_KEY_ID", process.env.SHOPIFY_APP_ONLY_KEY_ID],
      ["SHOPIFY_APP_ONLY_PRIVATE_KEY", process.env.SHOPIFY_APP_ONLY_PRIVATE_KEY],
    ],
  );

  logEnvCheck("Switcher", Boolean(process.env.SHOPIFY_CIWI_SWITCHER_ID?.trim()), [
    ["SHOPIFY_CIWI_SWITCHER_ID", process.env.SHOPIFY_CIWI_SWITCHER_ID],
    ["SHOPIFY_CIWI_SWITCHER_THEME_ID", process.env.SHOPIFY_CIWI_SWITCHER_THEME_ID],
  ]);

  logEnvCheck("App handle", Boolean(process.env.HANDLE?.trim()), [
    ["HANDLE", process.env.HANDLE],
  ]);

  logEnvCheck(
    "Turso",
    Boolean(
      process.env.TURSO_DATABASE_URL?.trim() && process.env.TURSO_AUTH_TOKEN?.trim(),
    ),
    [
      ["TURSO_DATABASE_URL", process.env.TURSO_DATABASE_URL],
      ["TURSO_AUTH_TOKEN", process.env.TURSO_AUTH_TOKEN],
    ],
  );

  logEnvCheck("Redis", Boolean(process.env.RENDER_KV?.trim()), [
    ["RENDER_KV", process.env.RENDER_KV?.trim() ? "(已设置)" : ""],
  ]);

  logEnvCheck(
    "Google",
    Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
    ),
    [
      ["GOOGLE_CLOUD_PROJECT", process.env.GOOGLE_CLOUD_PROJECT],
      ["GOOGLE_SERVICE_ACCOUNT_JSON", process.env.GOOGLE_SERVICE_ACCOUNT_JSON],
      [
        "GOOGLE_APPLICATION_CREDENTIALS",
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      ],
    ],
  );

  console.info(
    `${ENV_LOG} process.env 总键数: ${Object.keys(process.env).length}`,
  );
  console.info(`${ENV_LOG} =================`);
}

/**
 * 启动时加载本地 .env 与 Render Secret File（/etc/secrets/.env 等）。
 * 必须在 shopifyApp() 之前调用。
 */
export function ensureRuntimeEnv(): void {
  if (runtimeEnvLoaded) return;
  runtimeEnvLoaded = true;

  console.info(
    `${ENV_LOG} NODE_ENV=${process.env.NODE_ENV}, RENDER=${process.env.RENDER ?? "(unset)"}, cwd=${process.cwd()}`,
  );

  const projectRoot = getProjectRoot();
  let secretFileApplied = 0;
  for (const filePath of candidateEnvFiles(projectRoot)) {
    const isProjectDotEnv =
      filePath === path.join(projectRoot, ".env") ||
      filePath === path.join(process.cwd(), ".env");
    const applied = tryLoadEnvFile(filePath, isProjectDotEnv);
    if (RENDER_SECRET_PATHS.has(filePath)) {
      secretFileApplied += applied;
    }
  }

  logCriticalEnvStatus();

  if (
    process.env.RENDER &&
    secretFileApplied === 0 &&
    !process.env.SHOPIFY_API_KEY?.trim() &&
    !process.env.SHOPIFY_API_SECRET?.trim()
  ) {
    console.warn(
      `${ENV_LOG} ⚠️ 未从 Secret File 加载任何变量，且 Shopify 未配置。请在 Render Environment 写入 Environment Variables，或确认 Secret File 文件名为 .env。`,
    );
  }
}

export function getRuntimeEnv(name: string): string {
  return normalizeEnvValue(process.env[name]);
}
