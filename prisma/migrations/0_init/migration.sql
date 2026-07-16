-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `scope` VARCHAR(191) NULL,
    `expires` DATETIME(3) NULL,
    `accessToken` VARCHAR(191) NOT NULL,
    `userId` BIGINT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `accountOwner` BOOLEAN NOT NULL DEFAULT false,
    `locale` VARCHAR(191) NULL,
    `collaborator` BOOLEAN NULL DEFAULT false,
    `emailVerified` BOOLEAN NULL DEFAULT false,
    `refreshToken` VARCHAR(191) NULL,
    `refreshTokenExpires` DATETIME(3) NULL,

    INDEX `Session_shop_idx`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Shop` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `installedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uninstalledAt` DATETIME(3) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `localeIsAuto` BOOLEAN NOT NULL DEFAULT true,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/New_York',
    `embedEnabled` BOOLEAN NOT NULL DEFAULT false,
    `firstCampaignCreated` BOOLEAN NOT NULL DEFAULT false,
    `storeVerified` BOOLEAN NOT NULL DEFAULT false,
    `widgetTitle` VARCHAR(191) NOT NULL DEFAULT 'Frequently bought together',
    `widgetSubtitle` VARCHAR(191) NULL,
    `widgetCtaLabel` VARCHAR(191) NOT NULL DEFAULT 'Add bundle to cart',
    `widgetAccentColor` VARCHAR(191) NOT NULL DEFAULT '#000000',
    `widgetTextColor` VARCHAR(191) NOT NULL DEFAULT '#202020',
    `widgetBorderRadius` INTEGER NOT NULL DEFAULT 8,
    `widgetFontFamily` VARCHAR(191) NOT NULL DEFAULT 'inherit',
    `shopifyDiscountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Shop_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'FBT_LIST',
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `placement` VARCHAR(191) NOT NULL DEFAULT 'PRODUCT_PAGE',
    `priority` INTEGER NOT NULL DEFAULT 0,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/New_York',
    `triggerType` VARCHAR(191) NOT NULL DEFAULT 'SPECIFIC_PRODUCTS',
    `title` VARCHAR(191) NULL,
    `subtitle` VARCHAR(191) NULL,
    `showQuantityPicker` BOOLEAN NOT NULL DEFAULT false,
    `allowDeselectTrigger` BOOLEAN NOT NULL DEFAULT false,
    `doNotPreselect` BOOLEAN NOT NULL DEFAULT false,
    `randomizeOffers` BOOLEAN NOT NULL DEFAULT false,
    `limitOffersShown` INTEGER NULL,
    `autoMatchVariants` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Campaign_shop_status_idx`(`shop`, `status`),
    INDEX `Campaign_shop_placement_status_idx`(`shop`, `placement`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampaignTrigger` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `resourceType` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NOT NULL,
    `resourceTitle` VARCHAR(191) NOT NULL,
    `resourceHandle` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `CampaignTrigger_campaignId_idx`(`campaignId`),
    INDEX `CampaignTrigger_resourceId_idx`(`resourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampaignOffer` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productTitle` VARCHAR(191) NOT NULL,
    `productHandle` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `variantId` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `CampaignOffer_campaignId_idx`(`campaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Discount` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'NONE',
    `value` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Discount_campaignId_key`(`campaignId`),
    INDEX `Discount_shop_idx`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiscountTier` (
    `id` VARCHAR(191) NOT NULL,
    `discountId` VARCHAR(191) NOT NULL,
    `minItems` INTEGER NOT NULL,
    `valueType` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `label` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `DiscountTier_discountId_idx`(`discountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CollectionProductCache` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `productIds` JSON NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CollectionProductCache_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `CollectionProductCache_shop_collectionId_key`(`shop`, `collectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsEvent` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `revenue` DOUBLE NULL,
    `currency` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsEvent_shop_campaignId_eventType_idx`(`shop`, `campaignId`, `eventType`),
    INDEX `AnalyticsEvent_shop_createdAt_idx`(`shop`, `createdAt`),
    INDEX `AnalyticsEvent_shop_eventType_createdAt_idx`(`shop`, `eventType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShopPlan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `plan` VARCHAR(191) NOT NULL DEFAULT 'free',
    `subscriptionId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `trialEndsAt` DATETIME(3) NULL,
    `billingStartedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShopPlan_shop_key`(`shop`),
    INDEX `ShopPlan_shop_idx`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_shop_fkey` FOREIGN KEY (`shop`) REFERENCES `Shop`(`shop`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignTrigger` ADD CONSTRAINT `CampaignTrigger_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignOffer` ADD CONSTRAINT `CampaignOffer_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Discount` ADD CONSTRAINT `Discount_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiscountTier` ADD CONSTRAINT `DiscountTier_discountId_fkey` FOREIGN KEY (`discountId`) REFERENCES `Discount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

