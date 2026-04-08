import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaLocalGlobal: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaTursoGlobal: PrismaClient | undefined;
}

async function verifyTursoSchemaOnBoot(
  url: string,
  authToken: string,
): Promise<void> {
  try {
    const client = createClient({ url, authToken });
    const tablesResult = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );

    const tableNames = tablesResult.rows
      .map((row: any) => String(row?.name ?? "").trim())
      .filter(Boolean);

    console.log(
      `[db] TURSO tables: ${tableNames.length ? tableNames.join(", ") : "(none)"}`,
    );

    const hasSessionTable = tableNames.some(
      (name) => name.toLowerCase() === "session",
    );

    if (!hasSessionTable) {
      throw new Error(
        "[db] ENV=test 已连接 Turso，但缺少 Session 表。请先执行 prisma/migrations 的初始化 SQL 到该 Turso 数据库。",
      );
    }
  } catch (error) {
    console.error("[db] TURSO schema check failed:", error);
    throw error;
  }
}

function createTursoClient(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL?.trim() || "";
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url.startsWith("libsql://") || !authToken) {
    throw new Error(
      'ENV=test 需要可用的 Turso URL。请设置 TURSO_DATABASE_URL="libsql://..."。',
    );
  }

  // Prisma adapter 需要 config 对象（不是 libsql client 实例），否则会出现 URL_INVALID(undefined)
  const adapter = new PrismaLibSQL({ url, authToken });
  console.log("[db] using TURSO");
  // 启动后立即做 schema 健康检查，避免等到鉴权阶段才暴露缺表问题
  void verifyTursoSchemaOnBoot(url, authToken).catch((error) => {
    throw error;
  });
  return new PrismaClient({ adapter });
}

type DbTarget = "local" | "turso";

/** 数据库路由：勿用 NODE_ENV（dev 下恒为 development）。见 DATABASE_TARGET。 */
function resolveDbTarget(): DbTarget {
  const t = process.env.DATABASE_TARGET?.trim().toLowerCase();
  if (t === "turso" || t === "test") return "turso";
  if (t === "local" || t === "sqlite") return "local";
  // 未显式设置时：prod/test 走 Turso，其余（development 等）走本地 SQLite
  return process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "test"
    ? "turso"
    : "local";
}

function createPrismaClient(): PrismaClient {
  const target = resolveDbTarget();
  console.log(
    "[db] DATABASE_TARGET=",
    process.env.DATABASE_TARGET ?? "(unset)",
    "resolved=",
    target,
    "NODE_ENV=",
    process.env.NODE_ENV,
    "TURSO_DATABASE_URL=",
    process.env.TURSO_DATABASE_URL ? "(set)" : undefined,
  );
  if (target === "local") {
    if (!global.prismaLocalGlobal) {
      global.prismaLocalGlobal = new PrismaClient();
    }
    console.log("[db] using LOCAL");
    return global.prismaLocalGlobal;
  }
  if (!global.prismaTursoGlobal) {
    global.prismaTursoGlobal = createTursoClient();
  }
  console.log("prismaTursoGlobal create success");
  return global.prismaTursoGlobal;
}

const prisma = createPrismaClient();

export default prisma;
