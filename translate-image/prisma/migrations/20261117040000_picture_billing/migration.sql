-- CreateTable
CREATE TABLE "Account" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "plan" INTEGER NOT NULL DEFAULT 1,
    "planType" TEXT NOT NULL DEFAULT 'Free',
    "feeType" INTEGER NOT NULL DEFAULT 0,
    "purchasePoints" INTEGER NOT NULL DEFAULT 0,
    "usedPoints" INTEGER NOT NULL DEFAULT 0,
    "subscriptionGid" TEXT,
    "currentPeriodEnd" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CreditGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "gid" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditGrant_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "languageCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditUsage_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPicture" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "imageBeforeUrl" TEXT NOT NULL,
    "imageAfterUrl" TEXT,
    "altBeforeTranslation" TEXT,
    "altAfterTranslation" TEXT,
    "languageCode" TEXT NOT NULL,
    "urlKey" TEXT,
    "imageAfterFileId" TEXT,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditGrant_gid_periodKey_key" ON "CreditGrant"("gid", "periodKey");

-- CreateIndex
CREATE INDEX "CreditGrant_shop_idx" ON "CreditGrant"("shop");

-- CreateIndex
CREATE INDEX "CreditUsage_shop_idx" ON "CreditUsage"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "UserPicture_shop_imageId_imageBeforeUrl_languageCode_key" ON "UserPicture"("shop", "imageId", "imageBeforeUrl", "languageCode");

-- CreateIndex
CREATE INDEX "UserPicture_shop_imageId_languageCode_isDelete_idx" ON "UserPicture"("shop", "imageId", "languageCode", "isDelete");

-- CreateIndex
CREATE INDEX "UserPicture_shop_languageCode_urlKey_idx" ON "UserPicture"("shop", "languageCode", "urlKey");
