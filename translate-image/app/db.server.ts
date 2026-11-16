import { PrismaClient } from "@prisma/client";
import { ensureRuntimeEnv } from "./config/runtimeEnv.server";

ensureRuntimeEnv();

declare global {
  var prismaGlobal: PrismaClient;
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient();

export default prisma;
