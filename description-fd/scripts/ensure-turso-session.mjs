import { createClient } from "@libsql/client";

const url = String(process.env.TURSO_DATABASE_URL ?? "").trim();
const authToken = String(process.env.TURSO_AUTH_TOKEN ?? "").trim();

if (!url.startsWith("libsql://")) {
  console.info("[Turso] skip Session ensure (no TURSO_DATABASE_URL)");
  process.exit(0);
}

if (!authToken) {
  console.error("[Turso] TURSO_AUTH_TOKEN is not set");
  process.exit(1);
}

const client = createClient({ url, authToken });

await client.execute(`
  CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
  )
`);

await client.execute(
  `CREATE INDEX IF NOT EXISTS "Session_shop_idx" ON "Session"("shop")`,
);

console.info("[Turso] Session table ensured");
