-- AlterTable
ALTER TABLE `product` ADD COLUMN `imageBlob` LONGBLOB NULL,
    ADD COLUMN `imageMimeType` VARCHAR(191) NULL;
