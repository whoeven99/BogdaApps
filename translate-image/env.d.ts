/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

declare namespace NodeJS {
  interface ProcessEnv {
    TURSO_DATABASE_URL?: string;
    TURSO_AUTH_TOKEN?: string;
    RENDER_KV?: string;
    TENCENT_CLOUD_KEY_ID?: string;
    TENCENT_CLOUD_KEY?: string;
    TENCENT_SES_REGION?: string;
    TENCENT_FROM_EMAIL?: string;
  }
}
