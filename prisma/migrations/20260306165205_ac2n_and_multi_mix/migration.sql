/*
  Warnings:

  - The primary key for the `MixGenerationLock` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `MixGenerationLock` table. All the data in the column will be lost.
  - You are about to drop the column `selectedAdminId` on the `MixGenerationLock` table. All the data in the column will be lost.
  - Added the required column `game` to the `MixGenerationLock` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MixGame" AS ENUM ('WARZONE', 'ROCKET_LEAGUE');

-- DropForeignKey
ALTER TABLE "MixGenerationLock" DROP CONSTRAINT "MixGenerationLock_selectedAdminId_fkey";

-- DropIndex
DROP INDEX "MixGenerationLock_selectedAdminId_idx";

-- AlterTable
ALTER TABLE "MixGenerationLock" DROP CONSTRAINT "MixGenerationLock_pkey",
DROP COLUMN "id",
DROP COLUMN "selectedAdminId",
ADD COLUMN     "game" "MixGame" NOT NULL,
ADD COLUMN     "selectedUserId" TEXT,
ADD CONSTRAINT "MixGenerationLock_pkey" PRIMARY KEY ("game");

-- AlterTable
ALTER TABLE "MixSession" ADD COLUMN     "game" "MixGame" NOT NULL DEFAULT 'WARZONE';

-- AlterTable
ALTER TABLE "SiteConfig" ALTER COLUMN "siteName" SET DEFAULT 'AC2N Squad Manager',
ALTER COLUMN "homeHeadline" SET DEFAULT 'AC2N Warzone Squad';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAvailableForRocketLeagueMix" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAvailableForWarzoneMix" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "MixGenerationLock_selectedUserId_idx" ON "MixGenerationLock"("selectedUserId");

-- CreateIndex
CREATE INDEX "MixSession_game_idx" ON "MixSession"("game");

-- CreateIndex
CREATE INDEX "User_isAvailableForWarzoneMix_idx" ON "User"("isAvailableForWarzoneMix");

-- CreateIndex
CREATE INDEX "User_isAvailableForRocketLeagueMix_idx" ON "User"("isAvailableForRocketLeagueMix");

-- AddForeignKey
ALTER TABLE "MixGenerationLock" ADD CONSTRAINT "MixGenerationLock_selectedUserId_fkey" FOREIGN KEY ("selectedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
