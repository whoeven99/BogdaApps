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
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "selectedProductsJson" TEXT,
    "discountRulesJson" TEXT,
    "offerSettingsJson" TEXT
);

INSERT INTO "new_Offer" (
    "createdAt",
    "shopName",
    "status",
    "name",
    "offerType",
    "startTime",
    "endTime",
    "selectedProductsJson",
    "discountRulesJson",
    "offerSettingsJson",
    "id",
    "updatedAt"
) SELECT
    "createdAt",
    "shopName",
    "status",
    "name",
    "offerType",
    "startTime",
    "endTime",
    "selectedProductsJson",
    "discountRulesJson",
    json_object(
      'layoutFormat', "layoutFormat",
      'totalBudget', "totalBudget",
      'dailyBudget', "dailyBudget",
      'customerSegments', "customerSegments",
      'markets', "markets",
      'usageLimitPerCustomer', "usageLimitPerCustomer"
    ) as "offerSettingsJson",
    "id",
    "updatedAt"
FROM "Offer";

DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

