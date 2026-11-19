/**
 * 清点 / 导入 Java COS 旧译图到 Turso。不重译、不扣费。
 *
 * 默认 dry-run。必须 --shop=。
 * --write 把 COS 行写入 Turso（urlKey 与 App 同口径：剥 _720x / 主题 t/{id}/ / ext:）。
 * 字节迁 Shopify Files 仍走 Admin 替换/重译（本脚本不上传）。
 *
 *   node scripts/migrate-cos-pictures-to-files.mjs --shop=xxx.myshopify.com --language=fr
 *   node scripts/migrate-cos-pictures-to-files.mjs --shop=xxx --language=fr,de --write
 *   node scripts/migrate-cos-pictures-to-files.mjs --shop=xxx --language=fr --env=.env.prod --write --confirm-prod
 */
import { createClient } from "@libsql/client";
import {
  assertProdWriteAllowed,
  loadStackedEnv,
  resolveTurso,
} from "./lib/loadEnv.mjs";
import {
  classifyPictureRow,
  normalizeShop,
  pictureUrlKey,
} from "./lib/cosPictures.mjs";

function parseArgs(argv) {
  const out = { write: false, shop: "", languages: [] };
  for (const a of argv) {
    if (a === "--write") out.write = true;
    else if (a === "--dry-run") out.write = false;
    else if (a.startsWith("--shop=")) out.shop = a.slice("--shop=".length).trim();
    else if (a.startsWith("--language=")) {
      out.languages = a
        .slice("--language=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return out;
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

async function javaPictures(server, shop, languageCode) {
  const url = `${server}/pcUserPic/selectPicturesByShopNameAndLanguageCode?shopName=${encodeURIComponent(shop)}&languageCode=${encodeURIComponent(languageCode)}`;
  const res = await fetch(url, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  return asList(body?.response);
}

async function upsertTurso(client, shop, row) {
  const now = new Date().toISOString();
  const imageId = String(row.imageId || "");
  const imageBeforeUrl = String(row.imageBeforeUrl || "");
  const languageCode = String(row.languageCode || "");
  if (!imageId || !imageBeforeUrl || !languageCode) return "skip";
  const urlKey = pictureUrlKey(imageBeforeUrl);
  await client.execute({
    sql: `INSERT INTO UserPicture (
        shop, imageId, imageBeforeUrl, imageAfterUrl, altBeforeTranslation, altAfterTranslation,
        languageCode, urlKey, imageAfterFileId, isDelete, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)
      ON CONFLICT(shop, imageId, imageBeforeUrl, languageCode) DO UPDATE SET
        imageAfterUrl = excluded.imageAfterUrl,
        altBeforeTranslation = excluded.altBeforeTranslation,
        altAfterTranslation = excluded.altAfterTranslation,
        urlKey = excluded.urlKey,
        isDelete = 0,
        updatedAt = excluded.updatedAt`,
    args: [
      shop,
      imageId,
      imageBeforeUrl,
      row.imageAfterUrl ?? null,
      row.altBeforeTranslation ?? null,
      row.altAfterTranslation ?? null,
      languageCode,
      urlKey || null,
      now,
      now,
    ],
  });
  return "ok";
}

const argv = process.argv.slice(2);
const { overlay } = loadStackedEnv({ argv });
const args = parseArgs(argv);
const shop = normalizeShop(args.shop);
const server = (process.env.SERVER_URL || "").trim().replace(/\/$/, "");
const { url, authToken } = resolveTurso();

if (!shop) {
  console.error("Need --shop=");
  process.exit(1);
}
if (!args.languages.length) {
  console.error("Need --language=fr or --language=fr,de");
  process.exit(1);
}
if (!server) {
  console.error("Need SERVER_URL");
  process.exit(1);
}
if (!url.startsWith("libsql://") || !authToken) {
  console.error("Need TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
  process.exit(1);
}
if (args.write) {
  try {
    assertProdWriteAllowed(argv, overlay, url);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

const client = createClient({ url, authToken });
console.log(
  `mode=${args.write ? "write" : "dry-run"} overlay=${overlay} shop=${shop} languages=${args.languages.join(",")} java=set turso=${new URL(url).hostname}`,
);

const counts = { migrate: 0, already_files: 0, no_after: 0, not_cos: 0, written: 0, failed: 0 };
for (const language of args.languages) {
  const rows = await javaPictures(server, shop, language);
  console.log(`java ${language} rows=${rows.length}`);
  for (const row of rows) {
    const kind = classifyPictureRow(row);
    counts[kind] = (counts[kind] || 0) + 1;
    if (kind !== "migrate") continue;
    if (!args.write) continue;
    try {
      await upsertTurso(client, shop, row);
      counts.written += 1;
    } catch (err) {
      counts.failed += 1;
      console.log(`fail ${language} ${row.imageId} ${err instanceof Error ? err.message : err}`);
    }
  }
}

console.log(
  `done migrate=${counts.migrate} already_files=${counts.already_files} no_after=${counts.no_after} not_cos=${counts.not_cos} written=${counts.written} failed=${counts.failed}`,
);
console.log("Files 上传未做：COS URL 仍可用；要落到商户 Files 请在 Admin 替换或重译。");
