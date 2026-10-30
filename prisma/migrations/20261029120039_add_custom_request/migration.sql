-- CreateTable
CREATE TABLE `custom_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `budget` INTEGER NULL,
    `reference_image_url` VARCHAR(500) NULL,
    `quoted_price` INTEGER NULL,
    `admin_note` TEXT NULL,
    `status` ENUM('pending', 'quoted', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `custom_requests_customer_id_idx`(`customer_id`),
    INDEX `custom_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `custom_requests` ADD CONSTRAINT `custom_requests_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
