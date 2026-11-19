import type { ImageResourceType } from "~/lib/imageResourcePaths";
import type { ThemeImageUsedIn } from "~/lib/themeImageUsedIn";

export type ImageTranslateJobKind = "content" | "product";

export type ContentImageType = ImageResourceType;

export type ImageResourceRow = {
  id: string;
  title: string;
  imageUrl: string | null;
  status: string;
  imageCount?: number;
  translatedImageCount?: number;
  urlKey?: string;
  translated?: TranslatedPicture | null;
  usedIn?: ThemeImageUsedIn[];
};

export type SwitcherPageRow = {
  id: string;
  title: string;
  imageUrl: string | null;
  translated: number;
  total: number;
};

export type SwitcherPageList = {
  rows: SwitcherPageRow[];
  hasNextPage: boolean;
  endCursor: string | null;
  canWriteFiles: boolean;
};

export type ImageResourcePage = {
  rows: ImageResourceRow[];
  hasNextPage: boolean;
  endCursor: string | null;
  canWriteFiles: boolean;
  indexMissing?: boolean;
};

export type ContentImageClassifyStatus = {
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | null;
  lastSuccessAt: string | null;
  error: string | null;
  busy: boolean;
};

export type ResourceImagesPage = {
  resource: ImageResourceRow;
  rows: ContentImageRow[];
  canWriteFiles: boolean;
};

export type TranslatedPicture = {
  imageId: string;
  imageBeforeUrl: string;
  imageAfterUrl: string | null;
  urlKey: string | null;
};

export type ContentImageRow = {
  urlKey: string;
  imageUrl: string;
  usedIn: ThemeImageUsedIn[];
  translated: TranslatedPicture | null;
  productId?: string;
};

/** 扁平行 L1 列表 → 与详情表一致的 ContentImageRow（译图状态 / 任务行匹配）。 */
export function resourceListRowToContentImageRow(row: {
  imageUrl?: string | null;
  urlKey?: string;
  usedIn?: ThemeImageUsedIn[];
  translated?: TranslatedPicture | null;
}): ContentImageRow | null {
  if (!row.imageUrl || !row.urlKey) return null;
  return {
    urlKey: row.urlKey,
    imageUrl: row.imageUrl,
    usedIn: row.usedIn ?? [],
    translated: row.translated ?? null,
  };
}

export type ContentImagePage = {
  rows: ContentImageRow[];
  hasNextPage: boolean;
  endCursor: string | null;
  canWriteFiles: boolean;
};

export type ContentImageJob = {
  id: string;
  kind: ImageTranslateJobKind;
  targetLanguage: string;
  model: string;
  status: "QUEUED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";
  pauseReason: string | null;
  total: number;
  done: number;
  failed: number;
  skipped: number;
  creditsUsed: number;
};

export type ContentImageJobItem = {
  id: string;
  urlKey: string;
  imageUrl: string;
  productId: string;
  resourceTitle: string | null;
  status: string;
  error: string | null;
  imageAfterUrl: string | null;
};

export type ContentImageJobDetail = ContentImageJob & { items: ContentImageJobItem[] };

export type ApiResult<T> = { success: boolean; errorMsg: string; response: T | null };

const ACTIVE = new Set(["QUEUED", "RUNNING", "PAUSED"]);

export function isActiveJob(job: ContentImageJob | null | undefined): boolean {
  return Boolean(job && ACTIVE.has(job.status));
}

/** 内容图在 UserPicture 里的 imageId，与 Worker `contentImageId` 一致。 */
export function contentImageId(urlKey: string): string {
  return `content:${urlKey}`;
}

export function imageRowKey(row: { urlKey: string; productId?: string | null }): string {
  return row.productId ? `${row.productId}::${row.urlKey}` : row.urlKey;
}

export function imageJobResultPath(jobId: string, language?: string): string {
  const path = `/app/image_job/${jobId}`;
  return language ? `${path}?language=${encodeURIComponent(language)}` : path;
}

export function imageListPath(kind: ImageTranslateJobKind, language?: string): string {
  const path = kind === "product" ? "/app/product" : "/app";
  return language ? `${path}?language=${encodeURIComponent(language)}` : path;
}

/** 图译任务卡标题中的类型名（与首页「图片翻译」、各资源页标题区分）。 */
export function imageJobKindLabelKey(
  kind: ImageTranslateJobKind,
): "contentImage.job.kind.product" | "contentImage.job.kind.content" {
  return kind === "product" ? "contentImage.job.kind.product" : "contentImage.job.kind.content";
}

export function jobStatusI18nKey(job: Pick<ContentImageJob, "status" | "pauseReason">): string {
  if (job.status === "PAUSED") return `contentImage.job.pauseReason.${job.pauseReason ?? "MANUAL"}`;
  return `contentImage.job.status.${job.status}`;
}

export function jobActiveToastKey(
  jobKind: ImageTranslateJobKind | undefined,
  pageKind: ImageTranslateJobKind | undefined,
): "contentImage.job.active" | "contentImage.job.activeOther" {
  if (jobKind && pageKind && jobKind !== pageKind) return "contentImage.job.activeOther";
  return "contentImage.job.active";
}

export function formatJobActiveToast(
  t: (key: string, options?: Record<string, string>) => string,
  jobKind: ImageTranslateJobKind | undefined,
  pageKind: ImageTranslateJobKind | undefined,
): string {
  if (jobActiveToastKey(jobKind, pageKind) === "contentImage.job.activeOther" && jobKind) {
    return t("contentImage.job.activeOther", { kind: t(imageJobKindLabelKey(jobKind)) });
  }
  return t("contentImage.job.active");
}

async function postJson<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as ApiResult<T>;
  } catch (err) {
    console.error(`[content-image] ${url} failed`, err);
    return { success: false, errorMsg: "SERVER_ERROR", response: null };
  }
}

export function fetchSwitcherPages(args: {
  languageCode: string;
  q?: string;
  after?: string | null;
}): Promise<ApiResult<SwitcherPageList>> {
  return postJson("/api/content-image/list", { intent: "switcherPages", ...args });
}

export function fetchSwitcherImages(args: {
  languageCode: string;
  pagePath?: string;
  pagePaths?: string[];
  q?: string;
}): Promise<ApiResult<{ rows: ContentImageRow[]; truncated?: boolean; canWriteFiles: boolean }>> {
  return postJson("/api/content-image/list", { intent: "switcher", ...args });
}

export function fetchContentImageClassify(): Promise<ContentImageClassifyStatus | null> {
  return fetch("/api/content-image/classify")
    .then(async (res) => {
      const body = (await res.json()) as ApiResult<ContentImageClassifyStatus>;
      return body.success ? body.response : null;
    })
    .catch(() => null);
}

export function refreshContentImageClassify(): Promise<ContentImageClassifyStatus | null> {
  return postJson<ContentImageClassifyStatus>("/api/content-image/classify", { intent: "refresh" }).then(
    (body) => (body.success ? body.response : null),
  );
}

export function fetchImageResources(args: {
  type: ContentImageType;
  after?: string | null;
  q?: string;
  status?: string;
  languageCode?: string;
  uiLocale?: string;
}): Promise<ApiResult<ImageResourcePage>> {
  return postJson("/api/content-image/list", { intent: "resources", ...args });
}

export function fetchResourceImages(args: {
  type: ContentImageType;
  resourceId: string;
  languageCode: string;
  uiLocale?: string;
}): Promise<ApiResult<ResourceImagesPage>> {
  return postJson("/api/content-image/list", { intent: "images", ...args });
}

export function fetchResourceImagesMany(args: {
  type: ContentImageType;
  resourceIds: string[];
  languageCode: string;
  uiLocale?: string;
}): Promise<ApiResult<{ rows: ContentImageRow[]; truncated: boolean; canWriteFiles: boolean }>> {
  return postJson("/api/content-image/list", { intent: "images", ...args });
}

export function failedItemToRow(item: ContentImageJobItem): ContentImageRow {
  return {
    urlKey: item.urlKey,
    imageUrl: item.imageUrl,
    usedIn: [{ id: item.productId || item.urlKey, title: item.resourceTitle || "" }],
    translated: null,
    productId: item.productId || undefined,
  };
}

export async function fetchFailedItems(
  kind: ImageTranslateJobKind,
  languageCode?: string,
): Promise<ContentImageJobItem[]> {
  try {
    const params = new URLSearchParams({ failed: "1", kind });
    if (languageCode?.trim()) params.set("languageCode", languageCode.trim());
    const res = await fetch(`/api/content-image/jobs?${params}`);
    const body = (await res.json()) as ApiResult<{ items: ContentImageJobItem[] }>;
    return body.success ? body.response?.items ?? [] : [];
  } catch {
    return [];
  }
}

/** 仅 QUEUED / RUNNING / PAUSED（任意 kind）；失败返回 `undefined` 表示请求失败（勿清空 UI）。 */
export async function fetchCurrentJob(): Promise<ContentImageJob | null | undefined> {
  try {
    const res = await fetch("/api/content-image/jobs?current=1");
    const body = (await res.json()) as ApiResult<ContentImageJob>;
    if (!body.success) return undefined;
    return body.response;
  } catch {
    return undefined;
  }
}

export async function fetchImageJobHistory(limit = 50): Promise<ContentImageJob[]> {
  try {
    const qs = new URLSearchParams({ history: "1", limit: String(limit) });
    const res = await fetch(`/api/content-image/jobs?${qs}`);
    const body = (await res.json()) as ApiResult<{ jobs: ContentImageJob[] }>;
    return body.success ? body.response?.jobs ?? [] : [];
  } catch {
    return [];
  }
}

/** 进行中或 7 天内最近一条（管理页 loader / 冲突提示）。 */
export async function fetchLatestJob(kind?: ImageTranslateJobKind): Promise<ContentImageJob | null> {
  try {
    const qs = kind ? `?kind=${encodeURIComponent(kind)}` : "";
    const res = await fetch(`/api/content-image/jobs${qs}`);
    const body = (await res.json()) as ApiResult<ContentImageJob>;
    return body.success ? body.response : null;
  } catch {
    return null;
  }
}

export async function fetchJobDetail(jobId: string): Promise<ContentImageJobDetail | null> {
  try {
    const res = await fetch(`/api/content-image/jobs?id=${encodeURIComponent(jobId)}`);
    const body = (await res.json()) as ApiResult<ContentImageJobDetail>;
    return body.success ? body.response : null;
  } catch {
    return null;
  }
}

export function createContentImageJob(body: {
  targetLanguage: string;
  model: string;
  kind?: ImageTranslateJobKind;
  items: Array<{ imageUrl: string; title?: string; productId?: string }>;
  retranslate: boolean;
}): Promise<ApiResult<ContentImageJob>> {
  return postJson("/api/content-image/jobs", { intent: "create", ...body });
}

export function controlContentImageJob(
  jobId: string,
  intent: "pause" | "resume" | "cancel",
): Promise<ApiResult<ContentImageJob>> {
  return postJson("/api/content-image/jobs", { intent, jobId });
}
