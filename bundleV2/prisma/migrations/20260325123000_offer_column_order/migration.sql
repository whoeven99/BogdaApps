-- Reorder Offer table columns to the following order:
-- id, shopName, status, name, offerType, discountRulesJson, selectedProductsJson, offerSettingsJson, startTime, endTime, createdAt, updatedAt
-- Note: Prisma field order affects migration SQL column order in SQLite.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopName" TEXT NOT NULL DEFAULT '',
    "status" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "offerType" TEXT NOT NULL,
    "discountRulesJson" TEXT,
    "selectedProductsJson" TEXT,
    "offerSettingsJson" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Offer" (
    "id",
    "shopName",
    "status",
    "name",
    "offerType",
    "discountRulesJson",
    "selectedProductsJson",
    "offerSettingsJson",
    "startTime",
    "endTime",
    "createdAt",
    "updatedAt"
) SELECT
    "id",
    "shopName",
    "status",
    "name",
    "offerType",
    "discountRulesJson",
    "selectedProductsJson",
    "offerSettingsJson",
    "startTime",
    "endTime",
    "createdAt",
    "updatedAt"
FROM "Offer";

DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

