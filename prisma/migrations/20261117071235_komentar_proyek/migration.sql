-- CreateTable
CREATE TABLE `order_comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `author_id` INTEGER NOT NULL,
    `pesan` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_comments_order_id_created_at_idx`(`order_id`, `created_at`),
    INDEX `order_comments_author_id_idx`(`author_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_comments` ADD CONSTRAINT `order_comments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_comments` ADD CONSTRAINT `order_comments_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
