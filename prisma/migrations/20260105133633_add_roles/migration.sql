-- CreateTable
CREATE TABLE `RolePermission` (
    `id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'MANAGER',
    `module` VARCHAR(191) NOT NULL,
    `canView` BOOLEAN NOT NULL DEFAULT false,
    `canCreate` BOOLEAN NOT NULL DEFAULT false,
    `canUpdate` BOOLEAN NOT NULL DEFAULT false,
    `canDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RolePermission_module_key`(`module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
