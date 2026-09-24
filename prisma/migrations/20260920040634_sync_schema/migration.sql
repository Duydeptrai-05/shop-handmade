/*
  Warnings:

  - You are about to drop the column `created_at` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `phone_number` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `total_amount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `orders` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `Enum(EnumId(0))`.
  - You are about to drop the column `created_at` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[order_id,product_id]` on the table `order_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password_hash` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price_at_order` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `products_slug_key` ON `products`;

-- AlterTable
ALTER TABLE `admins` DROP COLUMN `created_at`,
    DROP COLUMN `password`,
    ADD COLUMN `password_hash` VARCHAR(255) NOT NULL,
    MODIFY `username` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `categories` DROP COLUMN `created_at`,
    DROP COLUMN `description`,
    MODIFY `name` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `order_items` DROP COLUMN `price`,
    ADD COLUMN `price_at_order` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `orders` DROP COLUMN `note`,
    DROP COLUMN `phone_number`,
    DROP COLUMN `total_amount`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `phone` VARCHAR(50) NOT NULL,
    MODIFY `customer_name` VARCHAR(255) NOT NULL,
    MODIFY `status` ENUM('pending', 'confirmed', 'shipped', 'completed') NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `products` DROP COLUMN `created_at`,
    DROP COLUMN `slug`,
    DROP COLUMN `updated_at`,
    MODIFY `image_url` VARCHAR(500) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `order_items_order_id_product_id_key` ON `order_items`(`order_id`, `product_id`);

-- CreateIndex
CREATE INDEX `products_is_active_category_id_idx` ON `products`(`is_active`, `category_id`);
