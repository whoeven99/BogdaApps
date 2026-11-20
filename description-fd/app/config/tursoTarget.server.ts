import { getRuntimeEnv } from "./runtimeEnv.server";

const PRIMARY_URL_KEY = "TURSO_DATABASE_URL";
const PRIMARY_TOKEN_KEY = "TURSO_AUTH_TOKEN";

function isUsableLibsqlUrl(value: string): boolean {
  return (
    value.startsWith("libsql://") &&
    !/your-prod|replace_me|xxx\.turso|example\.turso|changeme/i.test(value)
  );
}

export function readTursoCredentials(): {
  url: string;
  authToken: string;
  urlKey: string;
  tokenKey: string;
} {
  return {
    url: getRuntimeEnv(PRIMARY_URL_KEY),
    authToken: getRuntimeEnv(PRIMARY_TOKEN_KEY),
    urlKey: PRIMARY_URL_KEY,
    tokenKey: PRIMARY_TOKEN_KEY,
  };
}

export function hasTursoCredentials(): boolean {
  const { url, authToken } = readTursoCredentials();
  return isUsableLibsqlUrl(url) && Boolean(authToken);
}

export function mustUseTurso(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.RENDER) || env.NODE_ENV === "production";
}

export function describeTursoEnvKeys(): string {
  return `需要 ${PRIMARY_URL_KEY} / ${PRIMARY_TOKEN_KEY}`;
}
