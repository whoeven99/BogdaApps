/**
 * Import Java APG counters + custom templates. Default dry-run.
 * node scripts/migrate-apg-from-java.mjs --from=path/to/export.json
 * node scripts/migrate-apg-from-java.mjs --from=export.json --write
 * Prod: --env=.env.prod --confirm-prod --write
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import { REPO_ROOT, loadTursoEnv, assertProdWriteAllowed } from "./lib/loadTursoEnv.mjs";

const { url, authToken, overlay, argv } = loadTursoEnv();
const write = argv.includes("--write");
const fromArg = argv.find((arg) => arg.startsWith("--from="));
if (!fromArg) {
  console.error("Need --from=path/to/export.json");
  process.exit(1);
}
if (write) {
  try {
    assertProdWriteAllowed(argv, overlay, url);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

const payload = JSON.parse(readFileSync(path.resolve(fromArg.slice("--from=".length)), "utf8"));
const shops = Array.isArray(payload.shops) ? payload.shops : [];
console.info(`[migrate-apg] shops=${shops.length} write=${write}`);

function createPrisma() {
  if (url?.startsWith("libsql://") && authToken) {
    const require = createRequire(import.meta.url);
    const { createClient } = require("@libsql/client");
    const { PrismaLibSQL } = require("@prisma/adapter-libsql");
    const libsql = createClient({ url, authToken });
    return new PrismaClient({ adapter: new PrismaLibSQL(libsql) });
  }
  return new PrismaClient();
}

const prisma = createPrisma();
let accounts = 0;
let templates = 0;
for (const row of shops) {
  const shop = String(row.shop || "").trim().toLowerCase();
  if (!shop) continue;
  const purchasedCredits = Number(row.allToken || 0);
  const usedCredits = Number(row.userToken || 0);
  console.info(
    `[migrate-apg] ${shop} purchased=${purchasedCredits} used=${usedCredits} templates=${(row.templates || []).length}`,
  );
  if (!write) continue;
  const existing = await prisma.account.findUnique({ where: { shop } });
  if (existing) {
    console.info(`[migrate-apg] skip existing ${shop}`);
    continue;
  }
  await prisma.account.create({
    data: { shop, purchasedCredits, usedCredits },
  });
  accounts += 1;
  for (const template of row.templates || []) {
    const created = await prisma.userTemplate.create({
      data: {
        shop,
        templateData: String(template.templateData || ""),
        templateTitle: String(template.templateTitle || ""),
        templateType: String(template.templateType || ""),
        templateDescription: String(template.templateDescription || ""),
        templateModel: String(template.templateModel || "product"),
        templateSubtype: String(template.templateSubtype || "description"),
      },
    });
    await prisma.shopTemplatePick.upsert({
      where: { shop_source_templateId: { shop, source: "user", templateId: created.id } },
      create: { shop, source: "user", templateId: created.id },
      update: {},
    });
    templates += 1;
  }
  for (const pick of row.picks || []) {
    if (pick.source !== "official") continue;
    await prisma.shopTemplatePick.upsert({
      where: {
        shop_source_templateId: { shop, source: "official", templateId: Number(pick.templateId) },
      },
      create: { shop, source: "official", templateId: Number(pick.templateId) },
      update: {},
    });
  }
}
console.info(`[migrate-apg] done accounts=${accounts} templates=${templates} write=${write}`);
await prisma.$disconnect();
