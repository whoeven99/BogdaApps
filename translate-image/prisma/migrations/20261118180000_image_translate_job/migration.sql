CREATE TABLE "ImageTranslateJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "targetLanguage" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'content',
  "status" TEXT NOT NULL,
  "pauseReason" TEXT,
  "retranslate" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "done" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "skipped" INTEGER NOT NULL DEFAULT 0,
  "creditsUsed" INTEGER NOT NULL DEFAULT 0,
  "claimedBy" TEXT,
  "heartbeatAt" DATETIME,
  "finishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ImageTranslateJob_shop_createdAt_idx" ON "ImageTranslateJob"("shop", "createdAt");
CREATE INDEX "ImageTranslateJob_shop_kind_createdAt_idx" ON "ImageTranslateJob"("shop", "kind", "createdAt");
CREATE INDEX "ImageTranslateJob_status_updatedAt_idx" ON "ImageTranslateJob"("status", "updatedAt");

CREATE TABLE "ImageTranslateJobItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "jobId" TEXT NOT NULL,
  "shop" TEXT NOT NULL,
  "urlKey" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "productId" TEXT NOT NULL DEFAULT '',
  "resourceTitle" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "imageAfterUrl" TEXT,
  "credits" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ImageTranslateJobItem_jobId_urlKey_productId_key"
  ON "ImageTranslateJobItem"("jobId", "urlKey", "productId");
CREATE INDEX "ImageTranslateJobItem_jobId_status_idx" ON "ImageTranslateJobItem"("jobId", "status");
