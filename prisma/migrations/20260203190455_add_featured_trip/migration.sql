-- CreateTable
CREATE TABLE `FeaturedTrip` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NULL,
    `featuredSlot` ENUM('TYPE', 'ZONE') NULL,
    `pickupLabel` VARCHAR(191) NOT NULL,
    `dropoffLabel` VARCHAR(191) NOT NULL,
    `pickupAddressId` VARCHAR(191) NULL,
    `dropoffAddressId` VARCHAR(191) NULL,
    `distanceKm` DECIMAL(8, 2) NULL,
    `durationMinutes` INTEGER NULL,
    `basePriceCents` INTEGER NULL,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `heroImageUrl` VARCHAR(191) NULL,
    `badge` VARCHAR(191) NULL,
    `zoneLabel` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FeaturedTrip_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FeaturedTrip` ADD CONSTRAINT `FeaturedTrip_pickupAddressId_fkey` FOREIGN KEY (`pickupAddressId`) REFERENCES `Address`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeaturedTrip` ADD CONSTRAINT `FeaturedTrip_dropoffAddressId_fkey` FOREIGN KEY (`dropoffAddressId`) REFERENCES `Address`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
