/*
  Warnings:

  - A unique constraint covering the columns `[module,role]` on the table `RolePermission` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `RolePermission_module_key` ON `RolePermission`;

-- CreateIndex
CREATE UNIQUE INDEX `RolePermission_module_role_key` ON `RolePermission`(`module`, `role`);
