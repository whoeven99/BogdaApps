-- CreateTable
CREATE TABLE "Account" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "subscriptionCredits" INTEGER NOT NULL DEFAULT 0,
    "purchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "trialCredits" INTEGER NOT NULL DEFAULT 0,
    "trialCreditsExpiresAt" DATETIME,
    "trialInstallCredits" INTEGER NOT NULL DEFAULT 0,
    "trialInstallExpiresAt" DATETIME,
    "trialBonusCredits" INTEGER NOT NULL DEFAULT 0,
    "trialBonusExpiresAt" DATETIME,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BillingLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "uniqueKey" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingLog_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfficialTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "templateData" TEXT NOT NULL,
    "templateTitle" TEXT NOT NULL,
    "templateType" TEXT NOT NULL DEFAULT '',
    "templateDescription" TEXT NOT NULL DEFAULT '',
    "templateModel" TEXT NOT NULL,
    "templateSubtype" TEXT NOT NULL,
    "isPayment" BOOLEAN NOT NULL DEFAULT false,
    "exampleData" TEXT NOT NULL DEFAULT '',
    "usedTimes" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "UserTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "templateData" TEXT NOT NULL,
    "templateTitle" TEXT NOT NULL,
    "templateType" TEXT NOT NULL DEFAULT '',
    "templateDescription" TEXT NOT NULL DEFAULT '',
    "templateModel" TEXT NOT NULL,
    "templateSubtype" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserTemplate_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShopTemplatePick" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "templateId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShopTemplatePick_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerateJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "languageStyle" TEXT NOT NULL,
    "brandStyle" TEXT NOT NULL DEFAULT '',
    "templateId" INTEGER NOT NULL,
    "templateSource" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "seoKeywords" TEXT NOT NULL DEFAULT '',
    "brandWord" TEXT NOT NULL DEFAULT '',
    "brandSlogan" TEXT NOT NULL DEFAULT '',
    "stopRequested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GenerateJob_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerateJobItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "generatedHtml" TEXT NOT NULL DEFAULT '',
    "generatedTitle" TEXT NOT NULL DEFAULT '',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GenerateJobItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerateJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingLog_shop_uniqueKey_key" ON "BillingLog"("shop", "uniqueKey");

-- CreateIndex
CREATE INDEX "BillingLog_shop_createdAt_idx" ON "BillingLog"("shop", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopTemplatePick_shop_source_templateId_key" ON "ShopTemplatePick"("shop", "source", "templateId");

-- CreateIndex
CREATE INDEX "GenerateJob_shop_status_idx" ON "GenerateJob"("shop", "status");

-- CreateIndex
CREATE INDEX "GenerateJobItem_jobId_status_idx" ON "GenerateJobItem"("jobId", "status");

-- CreateIndex
CREATE INDEX "GenerateJobItem_shop_status_idx" ON "GenerateJobItem"("shop", "status");
