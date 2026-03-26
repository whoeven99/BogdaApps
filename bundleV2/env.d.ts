/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

declare namespace NodeJS {
  interface ProcessEnv {
    /** 环境目标：local=本地 SQLite，test=远端 Turso */
    ENV?: "local" | "test";
    /** Turso / LibSQL 远程库 URL，例如 libsql://xxx.turso.io */
    TURSO_DATABASE_URL?: string;
    /** Turso CLI: turso db tokens create <database-name> */
    TURSO_AUTH_TOKEN?: string;
    SHOPIFY_API_KEY?: string;
    SHOPIFY_API_SECRET?: string;
    SCOPES?: string;
    SHOPIFY_APP_URL?: string;
    SHOP_CUSTOM_DOMAIN?: string;
  }
}
