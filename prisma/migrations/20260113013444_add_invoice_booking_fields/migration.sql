/*
  Warnings:

  - You are about to drop the column `amountCents` on the `Invoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Invoice` DROP COLUMN `amountCents`,
    ADD COLUMN `adjustmentComment` VARCHAR(191) NULL,
    ADD COLUMN `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `paid` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `paymentMethod` ENUM('CB', 'CASH', 'PAYPAL', 'BTC') NULL DEFAULT 'CB',
    ADD COLUMN `realKm` DECIMAL(8, 2) NULL,
    ADD COLUMN `realLuggage` INTEGER NULL,
    ADD COLUMN `realPax` INTEGER NULL,
    ADD COLUMN `sendToClient` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `waitHours` INTEGER NOT NULL DEFAULT 0;
