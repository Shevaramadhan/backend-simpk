-- AlterTable
ALTER TABLE `order_documents` ADD COLUMN `uploaded_by_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `order_documents_uploaded_by_id_idx` ON `order_documents`(`uploaded_by_id`);

-- AddForeignKey
ALTER TABLE `order_documents` ADD CONSTRAINT `order_documents_uploaded_by_id_fkey` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Dokumen lama diunggah klien pemilik pesanan saat pengajuan (B-37).
UPDATE `order_documents` d
  JOIN `orders` o ON o.`id` = d.`order_id`
  JOIN `clients` c ON c.`id` = o.`client_id`
  SET d.`uploaded_by_id` = c.`user_id`
  WHERE d.`uploaded_by_id` IS NULL;
