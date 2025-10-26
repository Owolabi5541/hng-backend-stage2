/*
  Warnings:

  - Made the column `last_refreshed_at` on table `Meta` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_countries` on table `Meta` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX `Country_name_key` ON `Country`;

-- AlterTable
ALTER TABLE `Country` ALTER COLUMN `last_refreshed_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Meta` ALTER COLUMN `id` DROP DEFAULT,
    MODIFY `last_refreshed_at` DATETIME(3) NOT NULL,
    MODIFY `total_countries` INTEGER NOT NULL;
