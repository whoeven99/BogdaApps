-- CreateTable
CREATE TABLE "AppSubscription" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "shopifySubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "planName" TEXT NOT NULL DEFAULT '',
    "creditsPerPeriod" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodEnd" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppSubscription_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "GenerateJob" ADD COLUMN "autoPublish" BOOLEAN NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "GenerateJobItem" ADD COLUMN "publishedAt" DATETIME;
