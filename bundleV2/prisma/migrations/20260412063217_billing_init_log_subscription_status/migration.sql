
-- AlterTable
ALTER TABLE "BillingInitLog" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "BillingInitLog" ADD COLUMN "subscriptionStatusUpdatedAt" DATETIME;

-- CreateIndex
CREATE INDEX "BillingInitLog_shopifySubscriptionId_idx" ON "BillingInitLog"("shopifySubscriptionId");
