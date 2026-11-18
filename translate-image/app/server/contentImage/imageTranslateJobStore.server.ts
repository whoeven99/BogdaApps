import prisma from "~/db.server";

/**
 * 批量图译任务表 raw SQL。时间字段一律写 JS ISO 字符串，与 Prisma DateTime 写入格式一致，
 * 心跳过期判断才能按字符串比较。
 */
export type ImageTranslateJobRow = {
  id: string;
  shop: string;
  kind: string;
  targetLanguage: string;
  model: string;
  status: string;
  retranslate: boolean;
};

export type ImageTranslateItemRow = {
  id: string;
  urlKey: string;
  imageUrl: string;
  productId: string;
};

export type JobPauseReason = "MANUAL" | "QUOTA_INSUFFICIENT" | "SCOPE_MISSING" | "SERVICE_ERROR";

const nowIso = () => new Date().toISOString();

async function query<T extends Record<string, unknown>>(
  sql: string,
  args: unknown[] = [],
): Promise<T[]> {
  const rows = await prisma.$queryRawUnsafe<T[]>(sql, ...args);
  return Array.isArray(rows) ? rows : [];
}

async function execute(sql: string, args: unknown[] = []): Promise<number> {
  return prisma.$executeRawUnsafe(sql, ...args);
}

function toJob(r: Record<string, unknown>): ImageTranslateJobRow {
  return {
    id: String(r.id),
    shop: String(r.shop),
    kind: String(r.kind ?? "content"),
    targetLanguage: String(r.targetLanguage),
    model: String(r.model),
    status: String(r.status),
    retranslate: Number(r.retranslate ?? 0) === 1 || r.retranslate === true,
  };
}

/** 原子领取一个 QUEUED 任务，或心跳过期的 RUNNING 任务（进程崩溃 / 重启）。 */
export async function claimImageTranslateJob(
  claimedBy: string,
  staleMs: number,
): Promise<ImageTranslateJobRow | null> {
  const staleBefore = new Date(Date.now() - staleMs).toISOString();
  const now = nowIso();
  const eligible = `(status = 'QUEUED' OR (status = 'RUNNING' AND (heartbeatAt IS NULL OR heartbeatAt < ?)))`;
  const rows = await query<Record<string, unknown>>(
    `UPDATE ImageTranslateJob
     SET status = 'RUNNING', claimedBy = ?, heartbeatAt = ?, updatedAt = ?
     WHERE id = (SELECT id FROM ImageTranslateJob WHERE ${eligible} ORDER BY createdAt LIMIT 1)
       AND ${eligible}
     RETURNING id, shop, kind, targetLanguage, model, status, retranslate`,
    [claimedBy, now, now, staleBefore, staleBefore],
  );
  const row = rows[0];
  return row ? toJob(row) : null;
}

export async function readJobStatus(jobId: string): Promise<string | null> {
  const rows = await query<{ status: unknown }>(
    `SELECT status FROM ImageTranslateJob WHERE id = ?`,
    [jobId],
  );
  return rows[0]?.status == null ? null : String(rows[0].status);
}

export async function nextPendingItem(jobId: string): Promise<ImageTranslateItemRow | null> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, urlKey, imageUrl, productId FROM ImageTranslateJobItem
     WHERE jobId = ? AND status = 'PENDING' ORDER BY createdAt, id LIMIT 1`,
    [jobId],
  );
  const r = rows[0];
  return r
    ? {
        id: String(r.id),
        urlKey: String(r.urlKey),
        imageUrl: String(r.imageUrl),
        productId: String(r.productId ?? ""),
      }
    : null;
}

export type ItemOutcome =
  | { status: "DONE"; imageAfterUrl: string; credits: number }
  | { status: "SKIPPED" }
  | { status: "FAILED"; error: string };

const COUNTER_BY_STATUS = { DONE: "done", SKIPPED: "skipped", FAILED: "failed" } as const;

/** 记一张图的结果并累加任务计数；只在任务仍是本进程持有的 RUNNING 时写计数。 */
export async function recordItemOutcome(
  jobId: string,
  itemId: string,
  outcome: ItemOutcome,
): Promise<void> {
  const now = nowIso();
  const credits = outcome.status === "DONE" ? outcome.credits : 0;
  await execute(
    `UPDATE ImageTranslateJobItem
     SET status = ?, error = ?, imageAfterUrl = ?, credits = ?, updatedAt = ?
     WHERE id = ?`,
    [
      outcome.status,
      outcome.status === "FAILED" ? outcome.error.slice(0, 500) : null,
      outcome.status === "DONE" ? outcome.imageAfterUrl : null,
      credits,
      now,
      itemId,
    ],
  );
  const counter = COUNTER_BY_STATUS[outcome.status];
  await execute(
    `UPDATE ImageTranslateJob
     SET ${counter} = ${counter} + 1, creditsUsed = creditsUsed + ?, heartbeatAt = ?, updatedAt = ?
     WHERE id = ?`,
    [credits, now, now, jobId],
  );
}

/** 熔断后把剩余 PENDING 标失败，不打模型。返回改写条数。 */
export async function failRemainingPendingItems(jobId: string, error: string): Promise<number> {
  const now = nowIso();
  const rows = await query<{ id: unknown }>(
    `UPDATE ImageTranslateJobItem
     SET status = 'FAILED', error = ?, updatedAt = ?
     WHERE jobId = ? AND status = 'PENDING'
     RETURNING id`,
    [error.slice(0, 500), now, jobId],
  );
  const n = rows.length;
  if (n === 0) return 0;
  await execute(
    `UPDATE ImageTranslateJob
     SET failed = failed + ?, heartbeatAt = ?, updatedAt = ?
     WHERE id = ?`,
    [n, now, now, jobId],
  );
  return n;
}

/** 只把仍在 RUNNING 的任务改成暂停 / 完成，避免覆盖商户刚点的取消。 */
export async function pauseRunningJob(jobId: string, reason: JobPauseReason): Promise<void> {
  const now = nowIso();
  await execute(
    `UPDATE ImageTranslateJob SET status = 'PAUSED', pauseReason = ?, updatedAt = ?
     WHERE id = ? AND status = 'RUNNING'`,
    [reason, now, jobId],
  );
}

/** 进程退出时交还任务，新实例无需等心跳过期即可接手。 */
export async function requeueRunningJob(jobId: string): Promise<void> {
  await execute(
    `UPDATE ImageTranslateJob SET status = 'QUEUED', claimedBy = NULL, updatedAt = ?
     WHERE id = ? AND status = 'RUNNING'`,
    [nowIso(), jobId],
  );
}

export async function completeRunningJob(jobId: string): Promise<void> {
  const now = nowIso();
  await execute(
    `UPDATE ImageTranslateJob
     SET status = 'COMPLETED', pauseReason = NULL, finishedAt = ?, updatedAt = ?
     WHERE id = ? AND status = 'RUNNING'`,
    [now, now, jobId],
  );
}

/** 任意来源行只要该语言已有译图就算已译。 */
export async function hasTranslatedPicture(
  shop: string,
  languageCode: string,
  urlKey: string,
  imageId?: string,
): Promise<boolean> {
  const rows = imageId
    ? await query(
        `SELECT 1 FROM UserPicture
         WHERE shop = ? AND languageCode = ? AND urlKey = ? AND imageId = ?
           AND isDelete = 0 AND imageAfterUrl IS NOT NULL AND imageAfterUrl != ''
         LIMIT 1`,
        [shop, languageCode, urlKey, imageId],
      )
    : await query(
        `SELECT 1 FROM UserPicture
         WHERE shop = ? AND languageCode = ? AND urlKey = ? AND isDelete = 0
           AND imageAfterUrl IS NOT NULL AND imageAfterUrl != ''
         LIMIT 1`,
        [shop, languageCode, urlKey],
      );
  return rows.length > 0;
}
