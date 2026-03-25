-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "shopName" TEXT NOT NULL DEFAULT '',
    "status" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "offerType" TEXT NOT NULL,
    "pricingOption" TEXT NOT NULL DEFAULT 'duo',
    "layoutFormat" TEXT NOT NULL DEFAULT 'vertical',
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "totalBudget" REAL,
    "dailyBudget" REAL,
    "customerSegments" TEXT,
    "markets" TEXT,
    "usageLimitPerCustomer" TEXT NOT NULL DEFAULT 'unlimited',
    "selectedProductsJson" TEXT,
    "discountRulesJson" TEXT
);
INSERT INTO "new_Offer" ("createdAt", "customerSegments", "dailyBudget", "discountRulesJson", "endTime", "id", "layoutFormat", "markets", "name", "offerType", "pricingOption", "selectedProductsJson", "startTime", "status", "totalBudget", "updatedAt", "usageLimitPerCustomer") SELECT "createdAt", "customerSegments", "dailyBudget", "discountRulesJson", "endTime", "id", "layoutFormat", "markets", "name", "offerType", "pricingOption", "selectedProductsJson", "startTime", "status", "totalBudget", "updatedAt", "usageLimitPerCustomer" FROM "Offer";
DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
