import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { libsqlFetch } from "./config/libsqlFetch.server";
import { ensureRuntimeEnv } from "./config/runtimeEnv.server";
import {
  describeTursoEnvKeys,
  hasTursoCredentials,
  mustUseTurso,
  readTursoCredentials,
} from "./config/tursoTarget.server";

ensureRuntimeEnv();

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function tursoUrlHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "(invalid-url)";
  }
}

function createPrismaClient(): PrismaClient {
  if (hasTursoCredentials()) {
    const { url, authToken, urlKey } = readTursoCredentials();
    console.info(`[Turso] Prisma host=${tursoUrlHost(url)} key=${urlKey}`);
    const libsql = createClient({ url, authToken, fetch: libsqlFetch });
    return new PrismaClient({
      adapter: new PrismaLibSQL(libsql),
    } as ConstructorParameters<typeof PrismaClient>[0]);
  }
  if (mustUseTurso()) {
    throw new Error(`[Turso] ${describeTursoEnvKeys()}；生产禁止回退本地 SQLite`);
  }
  console.warn(`[Turso] ${describeTursoEnvKeys()}；当前回退本地 SQLite`);
  return new PrismaClient();
}

if (!global.prismaGlobal) {
  global.prismaGlobal = createPrismaClient();
}

const prisma = global.prismaGlobal;
export default prisma;
