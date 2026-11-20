/**
 * Import official templates JSON into Turso/sqlite OfficialTemplate.
 * Usage: node scripts/import-official-templates.mjs [--file=prisma/seed/official-templates.json]
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { createRequire } from "node:module";
import { REPO_ROOT, loadTursoEnv } from "./lib/loadTursoEnv.mjs";

const { url, authToken } = loadTursoEnv();
const fileArg = process.argv.find((arg) => arg.startsWith("--file="));
const filePath = path.resolve(
  REPO_ROOT,
  fileArg ? fileArg.slice("--file=".length) : "prisma/seed/official-templates.json",
);
const rows = JSON.parse(readFileSync(filePath, "utf8"));
if (!Array.isArray(rows) || rows.length === 0) {
  console.info("[templates] no rows to import");
  process.exit(0);
}

function createPrisma() {
  if (url?.startsWith("libsql://") && authToken) {
    const require = createRequire(import.meta.url);
    const { createClient: createLibsql } = require("@libsql/client");
    const { PrismaLibSQL: Adapter } = require("@prisma/adapter-libsql");
    const libsql = createLibsql({ url, authToken });
    const adapter = new Adapter(libsql);
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

const prisma = createPrisma();
for (const row of rows) {
  await prisma.officialTemplate.upsert({
    where: { id: Number(row.id) },
    create: {
      id: Number(row.id),
      templateData: String(row.templateData ?? row.template_data ?? ""),
      templateTitle: String(row.templateTitle ?? row.template_title ?? ""),
      templateType: String(row.templateType ?? row.template_type ?? ""),
      templateDescription: String(row.templateDescription ?? row.template_description ?? ""),
      templateModel: String(row.templateModel ?? row.template_model ?? "product"),
      templateSubtype: String(row.templateSubtype ?? row.template_subtype ?? "description"),
      isPayment: Boolean(row.isPayment ?? row.is_payment ?? false),
      exampleData: String(row.exampleData ?? row.example_date ?? row.example_data ?? ""),
      usedTimes: Number(row.usedTimes ?? row.used_times ?? 0),
    },
    update: {
      templateData: String(row.templateData ?? row.template_data ?? ""),
      templateTitle: String(row.templateTitle ?? row.template_title ?? ""),
      templateType: String(row.templateType ?? row.template_type ?? ""),
      templateDescription: String(row.templateDescription ?? row.template_description ?? ""),
      templateModel: String(row.templateModel ?? row.template_model ?? "product"),
      templateSubtype: String(row.templateSubtype ?? row.template_subtype ?? "description"),
      isPayment: Boolean(row.isPayment ?? row.is_payment ?? false),
      exampleData: String(row.exampleData ?? row.example_date ?? row.example_data ?? ""),
    },
  });
}
console.info(`[templates] imported ${rows.length} official templates`);
await prisma.$disconnect();
