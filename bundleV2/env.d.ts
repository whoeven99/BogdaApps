/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

declare namespace NodeJS {
  interface ProcessEnv {
    /** local | sqlite=本机 Prisma；turso | test=远端 LibSQL（需 TURSO_*）。未设置时：production→turso，其余→local */
    DATABASE_TARGET?: "local" | "sqlite" | "turso" | "test";
    NODE_ENV?: string;
    /** Turso / LibSQL 远程库 URL，例如 libsql://xxx.turso.io */
    TURSO_DATABASE_URL?: string;
    /** Turso CLI: turso db tokens create <database-name> */
    TURSO_AUTH_TOKEN?: string;
    SHOPIFY_API_KEY?: string;
    SHOPIFY_API_SECRET?: string;
    SCOPES?: string;
    SHOPIFY_APP_URL?: string;
    SHOP_CUSTOM_DOMAIN?: string;
    /** 阿里云日志 Web Pixel 上报（webpixerToAli） */
    ALIBABA_CLOUD_ACCESS_KEY_ID?: string;
    ALIBABA_CLOUD_ACCESS_KEY_SECRET?: string;
    ALIBABA_CLOUD_ENDPOINT?: string;
    ALIBABA_CLOUD_REGION?: string;
    ALIBABA_CLOUD_PROJECT?: string;
    ALIBABA_CLOUD_LOGSTORE?: string;
  }
}
