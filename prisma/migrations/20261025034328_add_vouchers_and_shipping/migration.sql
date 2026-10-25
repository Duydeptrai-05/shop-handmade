-- AlterTable
ALTER TABLE `orders` ADD COLUMN `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `discount_voucher_id` INTEGER NULL,
    ADD COLUMN `shipping_discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `shipping_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `shipping_voucher_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `vouchers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `type` ENUM('discount', 'shipping') NOT NULL,
    `discount_kind` ENUM('percent', 'fixed') NOT NULL,
    `value` DECIMAL(12, 2) NOT NULL,
    `max_discount` DECIMAL(12, 2) NULL,
    `min_order_value` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `starts_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `usage_limit` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vouchers_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orders_discount_voucher_id_idx` ON `orders`(`discount_voucher_id`);

-- CreateIndex
CREATE INDEX `orders_shipping_voucher_id_idx` ON `orders`(`shipping_voucher_id`);

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_discount_voucher_id_fkey` FOREIGN KEY (`discount_voucher_id`) REFERENCES `vouchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_shipping_voucher_id_fkey` FOREIGN KEY (`shipping_voucher_id`) REFERENCES `vouchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
