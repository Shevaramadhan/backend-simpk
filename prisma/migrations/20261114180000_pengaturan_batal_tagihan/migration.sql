-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `alasan_batal` VARCHAR(255) NULL,
    MODIFY `status` ENUM('DRAF', 'DITERBITKAN', 'LUNAS', 'DIBATALKAN') NOT NULL DEFAULT 'DITERBITKAN';

-- CreateTable
CREATE TABLE `pengaturan` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `nama` VARCHAR(160) NOT NULL,
    `alamat` VARCHAR(255) NOT NULL,
    `telepon` VARCHAR(40) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `bank` VARCHAR(80) NOT NULL,
    `nomor_rekening` VARCHAR(40) NOT NULL,
    `atas_nama` VARCHAR(120) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

