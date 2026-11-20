import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import { libsqlFetch } from "./lib/libsqlFetch.server";

const require = createRequire(import.meta.url);

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function tursoUrlHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "(invalid-url)";
  }
}

function createPrismaClient(): PrismaClient {
  const url = env("TURSO_DATABASE_URL");
  const authToken = env("TURSO_AUTH_TOKEN");

  if (url.startsWith("libsql://")) {
    if (!authToken) {
      throw new Error("TURSO_AUTH_TOKEN is not set");
    }
    const { createClient } = require("@libsql/client") as typeof import("@libsql/client");
    const { PrismaLibSQL } = require("@prisma/adapter-libsql") as {
      PrismaLibSQL: new (client: unknown) => unknown;
    };
    console.info(`[Turso] Prisma host=${tursoUrlHost(url)}`);
    const libsql = createClient({ url, authToken, fetch: libsqlFetch });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  }

  return new PrismaClient();
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = createPrismaClient();
  }
}

const prisma = global.prismaGlobal ?? createPrismaClient();

export default prisma;
