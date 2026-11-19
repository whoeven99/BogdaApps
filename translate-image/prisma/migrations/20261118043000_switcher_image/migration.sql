-- CreateTable
CREATE TABLE "SwitcherImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "urlKey" TEXT NOT NULL,
    "imageBeforeUrl" TEXT NOT NULL,
    "lastPagePath" TEXT,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SwitcherImage_shop_urlKey_key" ON "SwitcherImage"("shop", "urlKey");

-- CreateIndex
CREATE INDEX "SwitcherImage_shop_lastSeenAt_idx" ON "SwitcherImage"("shop", "lastSeenAt");

-- CreateTable
CREATE TABLE "SwitcherImagePage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "urlKey" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "targetCode" TEXT,
    "lastSeenAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SwitcherImagePage_shop_urlKey_pagePath_targetCode_key" ON "SwitcherImagePage"("shop", "urlKey", "pagePath", "targetCode");

-- CreateIndex
CREATE INDEX "SwitcherImagePage_shop_targetCode_pagePath_lastSeenAt_idx" ON "SwitcherImagePage"("shop", "targetCode", "pagePath", "lastSeenAt");

-- CreateIndex
CREATE INDEX "SwitcherImagePage_shop_lastSeenAt_idx" ON "SwitcherImagePage"("shop", "lastSeenAt");
