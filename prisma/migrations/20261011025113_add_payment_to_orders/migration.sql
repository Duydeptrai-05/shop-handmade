-- AlterTable
ALTER TABLE `orders` ADD COLUMN `is_paid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `paid_at` DATETIME(3) NULL,
    ADD COLUMN `payment_method` ENUM('cod', 'bank_transfer') NOT NULL DEFAULT 'cod';
