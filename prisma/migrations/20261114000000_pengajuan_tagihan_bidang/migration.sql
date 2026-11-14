-- DropForeignKey
ALTER TABLE `invoices` DROP FOREIGN KEY `invoices_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `invoice_items` DROP FOREIGN KEY `invoice_items_invoice_id_fkey`;

-- DropIndex
DROP INDEX `invoices_project_id_idx` ON `invoices`;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `judul` VARCHAR(160) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `tasks` ADD COLUMN `bidang` ENUM('UI_UX', 'FRONTEND', 'BACKEND', 'INTEGRASI') NOT NULL DEFAULT 'FRONTEND',
    ADD COLUMN `bobot` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `invoices` DROP COLUMN `project_id`,
    ADD COLUMN `issued_by_id` INTEGER NULL,
    ADD COLUMN `keterangan` VARCHAR(160) NOT NULL,
    ADD COLUMN `order_id` INTEGER NOT NULL,
    MODIFY `tgl_terbit` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `status` ENUM('DRAF', 'DITERBITKAN', 'LUNAS') NOT NULL DEFAULT 'DITERBITKAN';

-- DropTable
DROP TABLE `invoice_items`;

-- CreateTable
CREATE TABLE `order_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `nama_file` VARCHAR(255) NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    `mime` VARCHAR(100) NOT NULL,
    `ukuran` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_documents_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `invoices_order_id_idx` ON `invoices`(`order_id`);

-- AddForeignKey
ALTER TABLE `order_documents` ADD CONSTRAINT `order_documents_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_issued_by_id_fkey` FOREIGN KEY (`issued_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

