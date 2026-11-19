ALTER TABLE "ImageTranslateJob" ADD COLUMN "emailSent" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "ImageTranslateJob_status_emailSent_finishedAt_idx"
  ON "ImageTranslateJob"("status", "emailSent", "finishedAt");
