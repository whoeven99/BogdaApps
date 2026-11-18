import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getAccountQuota } from "~/server/billing/quota.server";
import { getLatestContentImageJob } from "~/server/contentImage/contentImageJobs.server";
import { loadAdminShopLocales } from "~/server/contentImage/switcherImages.server";
import { sessionCanWriteFiles } from "~/server/picture/shopifyFilesAdmin.server";
import type { ImageTranslateJobKind } from "./imageTranslateJobItems";

export async function loadImageManageShell(request: Request, kind: ImageTranslateJobKind) {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const [locales, job, quota] = await Promise.all([
    loadAdminShopLocales(admin).catch(() => [] as Awaited<ReturnType<typeof loadAdminShopLocales>>),
    getLatestContentImageJob(session.shop, kind).catch(() => null),
    getAccountQuota(session.shop).catch(() => null),
  ]);
  const targets = locales
    .filter((row) => !row.primary)
    .map((row) => ({ value: row.locale, label: row.name || row.locale }));
  const primary = locales.find((row) => row.primary);
  const requested = url.searchParams.get("language")?.trim() || "";
  const initialLanguage =
    (requested && targets.some((row) => row.value === requested) ? requested : targets[0]?.value) ||
    null;
  return json({
    shop: session.shop,
    targets,
    primaryLocale: primary?.locale ?? "",
    localeCodes: [...new Set(locales.map((row) => row.locale).filter(Boolean))],
    initialLanguage,
    canWriteFiles: sessionCanWriteFiles(session),
    job,
    remainingCredits: quota?.remaining ?? null,
  });
}

export const imageManageLoader =
  (kind: ImageTranslateJobKind) =>
  async ({ request }: LoaderFunctionArgs) =>
    loadImageManageShell(request, kind);
