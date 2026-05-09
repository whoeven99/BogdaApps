-- CreateTable
CREATE TABLE "CartSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopName" TEXT NOT NULL,
    "cartSettingRulesJson" TEXT NOT NULL,
    "cartSettingStylesJson" TEXT NOT NULL,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CartSetting_shopName_key" ON "CartSetting"("shopName");
