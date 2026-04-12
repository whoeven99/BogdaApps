-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Offer" (
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
INSERT INTO "new_Offer" ("createdAt", "discountRulesJson", "endTime", "id", "name", "offerSettingsJson", "offerType", "selectedProductsJson", "shopName", "startTime", "status", "updatedAt") SELECT "createdAt", "discountRulesJson", "endTime", "id", "name", "offerSettingsJson", "offerType", "selectedProductsJson", "shopName", "startTime", "status", "updatedAt" FROM "Offer";
DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";
CREATE UNIQUE INDEX "Offer_shopName_name_key" ON "Offer"("shopName", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
