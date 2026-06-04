/**
 * Render Secret Files 挂载在 /etc/secrets/<filename>，不会自动注入 process.env。
 * 通过 NODE_OPTIONS=--import 在容器启动时加载（见 Dockerfile）。
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SECRETS_DIR = "/etc/secrets";

function applyEnvFile(content) {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadFile(path) {
  if (!existsSync(path)) return false;
  applyEnvFile(readFileSync(path, "utf8"));
  console.log(`[env] Loaded Render secret file: ${path}`);
  return true;
}

if (!existsSync(SECRETS_DIR)) {
  // 本地开发无 Secret Files，静默跳过
} else if (loadFile(join(SECRETS_DIR, ".env"))) {
  // 最常见：Dashboard Secret Files 文件名为 .env
} else {
  const names = readdirSync(SECRETS_DIR);
  const envLike = names.filter(
    (n) => n === ".env" || n.endsWith(".env") || n === "env",
  );
  for (const name of envLike) {
    if (loadFile(join(SECRETS_DIR, name))) break;
  }
}
