-- CreateTable
CREATE TABLE "LensRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LensRuleCondition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "LensRuleCondition_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "LensRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LensRuleAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lensOptionId" TEXT NOT NULL,
    "message" TEXT,
    "variantId" TEXT,
    CONSTRAINT "LensRuleAction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "LensRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
