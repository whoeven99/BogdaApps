ALTER TABLE "Account" ADD COLUMN "subscriptionCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "purchasedCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "trialCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "trialCreditsExpiresAt" DATETIME;
ALTER TABLE "Account" ADD COLUMN "trialInstallCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "trialInstallExpiresAt" DATETIME;
ALTER TABLE "Account" ADD COLUMN "trialBonusCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "trialBonusExpiresAt" DATETIME;
ALTER TABLE "Account" ADD COLUMN "usedCredits" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PlanCatalog" (
    "planKey" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "billingInterval" TEXT,
    "displayName" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "priceAmount" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "trialDays" INTEGER,
    "shopifyPlanName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PlanCatalog_enabled_sortOrder_idx" ON "PlanCatalog"("enabled", "sortOrder");

CREATE TABLE "AppSubscription" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "planKey" TEXT NOT NULL,
    "shopifySubscriptionId" TEXT NOT NULL,
    "billingInterval" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "creditsPerPeriod" INTEGER NOT NULL,
    "trialEndsAt" DATETIME,
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "cancelledAt" DATETIME,
    "rawPayload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppSubscription_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AppSubscription_shopifySubscriptionId_key" ON "AppSubscription"("shopifySubscriptionId");
CREATE INDEX "AppSubscription_status_idx" ON "AppSubscription"("status");

CREATE TABLE "BillingLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "planKey" TEXT,
    "referenceId" TEXT,
    "creditsDelta" INTEGER,
    "usedCredits" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingLog_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "BillingLog_shop_createdAt_idx" ON "BillingLog"("shop", "createdAt");
CREATE INDEX "BillingLog_eventType_createdAt_idx" ON "BillingLog"("eventType", "createdAt");
CREATE INDEX "BillingLog_referenceId_idx" ON "BillingLog"("referenceId");

CREATE TABLE "BillingReconcileLock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lockedAt" DATETIME NOT NULL
);

INSERT INTO "BillingReconcileLock" ("id", "lockedAt") VALUES ('global', '1970-01-01T00:00:00.000Z');

INSERT INTO "PlanCatalog" ("planKey", "kind", "billingInterval", "displayName", "credits", "priceAmount", "trialDays", "shopifyPlanName", "sortOrder", "enabled") VALUES
  ('basic_monthly', 'SUBSCRIPTION', 'MONTHLY', 'Basic', 200000, '9.99', 0, 'Basic', 10, 1),
  ('basic_annual', 'SUBSCRIPTION', 'ANNUAL', 'Basic', 200000, '7.99', 0, 'Basic', 11, 1),
  ('pro_monthly', 'SUBSCRIPTION', 'MONTHLY', 'Pro', 600000, '29.99', 5, 'Pro', 20, 1),
  ('pro_annual', 'SUBSCRIPTION', 'ANNUAL', 'Pro', 600000, '23.99', 5, 'Pro', 21, 1),
  ('premium_monthly', 'SUBSCRIPTION', 'MONTHLY', 'Premium', 1600000, '79.99', 5, 'Premium', 30, 1),
  ('premium_annual', 'SUBSCRIPTION', 'ANNUAL', 'Premium', 1600000, '63.99', 5, 'Premium', 31, 1),
  ('pack_50', 'ONE_TIME_PACK', NULL, '50 extra times', 100000, '3.99', NULL, '50 extra times', 100, 1),
  ('pack_100', 'ONE_TIME_PACK', NULL, '100 extra times', 200000, '7.99', NULL, '100 extra times', 101, 1),
  ('pack_200', 'ONE_TIME_PACK', NULL, '200 extra times', 400000, '15.99', NULL, '200 extra times', 102, 1),
  ('pack_300', 'ONE_TIME_PACK', NULL, '300 extra times', 600000, '23.99', NULL, '300 extra times', 103, 1),
  ('pack_500', 'ONE_TIME_PACK', NULL, '500 extra times', 1000000, '39.99', NULL, '500 extra times', 104, 1),
  ('pack_1000', 'ONE_TIME_PACK', NULL, '1000 extra times', 2000000, '79.99', NULL, '1000 extra times', 105, 1),
  ('pack_2000', 'ONE_TIME_PACK', NULL, '2000 extra times', 4000000, '159.99', NULL, '2000 extra times', 106, 1),
  ('pack_3000', 'ONE_TIME_PACK', NULL, '3000 extra times', 6000000, '239.99', NULL, '3000 extra times', 107, 1);
