/*
  Warnings:

  - You are about to drop the column `plan` on the `Shop` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ShopPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "subscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trialEndsAt" DATETIME,
    "billingStartedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" DATETIME,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "embedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "firstCampaignCreated" BOOLEAN NOT NULL DEFAULT false,
    "storeVerified" BOOLEAN NOT NULL DEFAULT false,
    "widgetTitle" TEXT NOT NULL DEFAULT 'Frequently bought together',
    "widgetSubtitle" TEXT,
    "widgetCtaLabel" TEXT NOT NULL DEFAULT 'Add bundle to cart',
    "widgetAccentColor" TEXT NOT NULL DEFAULT '#000000',
    "widgetTextColor" TEXT NOT NULL DEFAULT '#202020',
    "widgetBorderRadius" INTEGER NOT NULL DEFAULT 8,
    "widgetFontFamily" TEXT NOT NULL DEFAULT 'inherit',
    "shopifyDiscountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shop" ("createdAt", "currency", "embedEnabled", "firstCampaignCreated", "id", "installedAt", "locale", "shop", "shopifyDiscountId", "storeVerified", "timezone", "uninstalledAt", "updatedAt", "widgetAccentColor", "widgetBorderRadius", "widgetCtaLabel", "widgetFontFamily", "widgetSubtitle", "widgetTextColor", "widgetTitle") SELECT "createdAt", "currency", "embedEnabled", "firstCampaignCreated", "id", "installedAt", "locale", "shop", "shopifyDiscountId", "storeVerified", "timezone", "uninstalledAt", "updatedAt", "widgetAccentColor", "widgetBorderRadius", "widgetCtaLabel", "widgetFontFamily", "widgetSubtitle", "widgetTextColor", "widgetTitle" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
CREATE UNIQUE INDEX "Shop_shop_key" ON "Shop"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ShopPlan_shop_key" ON "ShopPlan"("shop");

-- CreateIndex
CREATE INDEX "ShopPlan_shop_idx" ON "ShopPlan"("shop");
