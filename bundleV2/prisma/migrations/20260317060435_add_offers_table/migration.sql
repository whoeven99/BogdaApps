-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
