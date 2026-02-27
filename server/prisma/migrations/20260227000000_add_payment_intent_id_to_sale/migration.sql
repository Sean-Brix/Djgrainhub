-- AlterTable: add paymentIntentId and change status default to "pending"
ALTER TABLE `Sale`
  ADD COLUMN `paymentIntentId` VARCHAR(191) NULL,
  MODIFY COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'pending';

-- CreateIndex: unique constraint on paymentIntentId
CREATE UNIQUE INDEX `Sale_paymentIntentId_key` ON `Sale`(`paymentIntentId`);
