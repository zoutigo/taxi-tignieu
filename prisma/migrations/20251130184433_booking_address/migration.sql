/*
  Warnings:

  - You are about to drop the column `dropoff` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `pickup` on the `Booking` table. All the data in the column will be lost.
  - Added the required column `dropoffId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickupId` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Address` ADD COLUMN `name` VARCHAR(191) NULL,
    MODIFY `street` VARCHAR(191) NULL,
    MODIFY `postalCode` VARCHAR(191) NULL,
    MODIFY `city` VARCHAR(191) NULL,
    MODIFY `country` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Booking` DROP COLUMN `dropoff`,
    DROP COLUMN `pickup`,
    ADD COLUMN `dropoffId` INTEGER NOT NULL,
    ADD COLUMN `pickupId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_pickupId_fkey` FOREIGN KEY (`pickupId`) REFERENCES `Address`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_dropoffId_fkey` FOREIGN KEY (`dropoffId`) REFERENCES `Address`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
