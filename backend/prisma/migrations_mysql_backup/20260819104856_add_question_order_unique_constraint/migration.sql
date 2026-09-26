-- AlterTable
ALTER TABLE `Question` ADD UNIQUE INDEX `Question_interviewId_order_key`(`interviewId`, `order`);
