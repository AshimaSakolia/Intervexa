-- AlterTable
ALTER TABLE `Answer` ADD COLUMN `communication` INTEGER NULL,
    ADD COLUMN `performanceLabel` VARCHAR(191) NULL,
    ADD COLUMN `problemSolving` INTEGER NULL,
    ADD COLUMN `resumeUnderstanding` INTEGER NULL,
    ADD COLUMN `technicalCorrectness` INTEGER NULL,
    ADD COLUMN `technicalDepth` INTEGER NULL;

-- AlterTable
ALTER TABLE `Interview` ADD COLUMN `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN `interviewType` ENUM('TECHNICAL', 'HR', 'BEHAVIORAL', 'PROJECT', 'SYSTEM_DESIGN') NOT NULL DEFAULT 'TECHNICAL',
    ADD COLUMN `maxQuestions` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `resumeId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Question` ADD COLUMN `askedBecause` TEXT NULL,
    ADD COLUMN `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NULL,
    ADD COLUMN `targetsClaimId` INTEGER NULL,
    ADD COLUMN `topic` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Report` ADD COLUMN `categoryScores` TEXT NULL,
    ADD COLUMN `missedConcepts` TEXT NULL,
    ADD COLUMN `resumeClaimConfidence` TEXT NULL;

-- CreateTable
CREATE TABLE `Resume` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `rawText` TEXT NOT NULL,
    `analysis` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResumeClaim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resumeId` INTEGER NOT NULL,
    `text` TEXT NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `confidence` INTEGER NULL,
    `notes` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LearningPlan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `interviewId` INTEGER NOT NULL,
    `topics` TEXT NOT NULL,
    `recommendedNextInterview` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LearningPlan_interviewId_key`(`interviewId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Resume` ADD CONSTRAINT `Resume_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResumeClaim` ADD CONSTRAINT `ResumeClaim_resumeId_fkey` FOREIGN KEY (`resumeId`) REFERENCES `Resume`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_resumeId_fkey` FOREIGN KEY (`resumeId`) REFERENCES `Resume`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_targetsClaimId_fkey` FOREIGN KEY (`targetsClaimId`) REFERENCES `ResumeClaim`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningPlan` ADD CONSTRAINT `LearningPlan_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
