-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopName" TEXT NOT NULL DEFAULT '',
    "status" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "cartTitle" TEXT NOT NULL DEFAULT 'Bundle Discount',
    "offerType" TEXT NOT NULL,
    "discountRulesJson" TEXT,
    "selectedProductsJson" TEXT,
    "offerSettingsJson" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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
    "subscriptionStatus" TEXT,
    "subscriptionStatusUpdatedAt" DATETIME,
    "testCharge" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_shopName_name_key" ON "Offer"("shopName", "name");

-- CreateIndex
CREATE INDEX "BillingInitLog_shopName_idx" ON "BillingInitLog"("shopName");

-- CreateIndex
CREATE INDEX "BillingInitLog_createdAt_idx" ON "BillingInitLog"("createdAt");

-- CreateIndex
CREATE INDEX "BillingInitLog_shopifySubscriptionId_idx" ON "BillingInitLog"("shopifySubscriptionId");
