/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

declare namespace NodeJS {
  interface ProcessEnv {
    TURSO_DATABASE_URL?: string;
    TURSO_AUTH_TOKEN?: string;
  }
}
