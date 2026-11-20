import { existsSync, readFileSync } from "node:fs";

const SECRET_PATHS = ["/etc/secrets/.env", "/etc/secrets/env", "/var/secrets/.env"];

function normalize(value) {
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

function applyEnvFile(filePath) {
  if (!existsSync(filePath)) return 0;
  let applied = 0;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    const value = normalize(line.slice(eq + 1));
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

export function loadTursoEnv() {
  for (const filePath of SECRET_PATHS) {
    applyEnvFile(filePath);
  }
  return {
    url: normalize(process.env.TURSO_DATABASE_URL),
    authToken: normalize(process.env.TURSO_AUTH_TOKEN),
  };
}
