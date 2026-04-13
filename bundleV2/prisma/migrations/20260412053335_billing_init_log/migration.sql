-- CreateTable
CREATE TABLE "BillingInitLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopName" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "subscriptionName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "shopifySubscriptionId" TEXT,
    "testCharge" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "BillingInitLog_shopName_idx" ON "BillingInitLog"("shopName");

-- CreateIndex
CREATE INDEX "BillingInitLog_createdAt_idx" ON "BillingInitLog"("createdAt");
