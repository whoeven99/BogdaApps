/*
  Warnings:

  - You are about to drop the `BillingSubscriptionWebhookLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "BillingInitLog" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "BillingInitLog" ADD COLUMN "subscriptionStatusUpdatedAt" DATETIME;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BillingSubscriptionWebhookLog";
PRAGMA foreign_keys=on;

-- CreateIndex
CREATE INDEX "BillingInitLog_shopifySubscriptionId_idx" ON "BillingInitLog"("shopifySubscriptionId");
