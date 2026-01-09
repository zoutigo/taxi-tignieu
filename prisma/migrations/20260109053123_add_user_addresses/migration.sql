/*
  Warnings:

  - A unique constraint covering the columns `[defaultAddressId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `defaultAddressId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `UserAddress` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `addressId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserAddress_userId_label_key`(`userId`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_defaultAddressId_key` ON `User`(`defaultAddressId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_defaultAddressId_fkey` FOREIGN KEY (`defaultAddressId`) REFERENCES `UserAddress`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAddress` ADD CONSTRAINT `UserAddress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAddress` ADD CONSTRAINT `UserAddress_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `Address`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
