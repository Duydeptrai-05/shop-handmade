/*
  Warnings:

  - You are about to alter the column `budget` on the `custom_requests` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(12,2)`.
  - You are about to alter the column `quoted_price` on the `custom_requests` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(12,2)`.

*/
-- AlterTable
ALTER TABLE `custom_requests` MODIFY `budget` DECIMAL(12, 2) NULL,
    MODIFY `quoted_price` DECIMAL(12, 2) NULL;
