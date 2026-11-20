/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

declare namespace NodeJS {
  interface ProcessEnv {
    TURSO_DATABASE_URL?: string;
    TURSO_AUTH_TOKEN?: string;
    TENCENT_CLOUD_KEY_ID?: string;
    TENCENT_CLOUD_KEY?: string;
    TENCENT_SES_REGION?: string;
    TENCENT_FROM_EMAIL?: string;
    APG_PURCHASE_EMAIL_TEMPLATE_ID?: string;
    FEISHU_ENV?: string;
    FEISHU_WEBHOOK_URL_SUPPORT?: string;
    APG_TRIAL_INSTALL_CREDITS?: string;
    APG_TRIAL_INSTALL_DAYS?: string;
    BILLING_TEST?: string;
    BILLING_TEST_SHOPS?: string;
    DEEPSEEK_API_KEYS?: string;
    DEEPSEEK_BASE_URL?: string;
    DEEPSEEK_MODEL?: string;
  }
}
