-- CreateTable
CREATE TABLE `Country` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `capital` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `population` BIGINT NOT NULL,
    `currency_code` VARCHAR(191) NULL,
    `exchange_rate` DOUBLE NULL,
    `estimated_gdp` DOUBLE NULL,
    `flag_url` VARCHAR(191) NULL,
    `last_refreshed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Country_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Meta` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `last_refreshed_at` DATETIME(3) NULL,
    `total_countries` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
