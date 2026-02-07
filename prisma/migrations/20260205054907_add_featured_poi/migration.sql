-- AlterTable
ALTER TABLE `FeaturedTrip` MODIFY `dropoffLabel` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `FeaturedPoi` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `dropoffAddressId` VARCHAR(191) NULL,
    `distanceKm` DECIMAL(8, 2) NULL,
    `durationMinutes` INTEGER NULL,
    `priceCents` INTEGER NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `tripId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FeaturedPoi_tripId_order_idx`(`tripId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FeaturedPoi` ADD CONSTRAINT `FeaturedPoi_dropoffAddressId_fkey` FOREIGN KEY (`dropoffAddressId`) REFERENCES `Address`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeaturedPoi` ADD CONSTRAINT `FeaturedPoi_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `FeaturedTrip`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
