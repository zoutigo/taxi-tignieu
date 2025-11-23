-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `driverId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
