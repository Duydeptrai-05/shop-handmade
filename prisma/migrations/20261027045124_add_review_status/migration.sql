-- AlterTable
ALTER TABLE `reviews` ADD COLUMN `status` ENUM('pending', 'approved', 'hidden') NOT NULL DEFAULT 'approved';

-- CreateIndex
CREATE INDEX `reviews_status_idx` ON `reviews`(`status`);
