/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,tempPlayerId]` on the table `MixSessionPlayer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teamId,tempPlayerId]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MixSessionPlayer" ADD COLUMN     "tempPlayerId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "tempPlayerId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TempPlayer" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "note" TEXT,
    "isAvailableForMix" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "linkedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TempPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TempPlayer_isAvailableForMix_idx" ON "TempPlayer"("isAvailableForMix");

-- CreateIndex
CREATE INDEX "TempPlayer_createdById_idx" ON "TempPlayer"("createdById");

-- CreateIndex
CREATE INDEX "TempPlayer_linkedUserId_idx" ON "TempPlayer"("linkedUserId");

-- CreateIndex
CREATE INDEX "TempPlayer_createdAt_idx" ON "TempPlayer"("createdAt");

-- CreateIndex
CREATE INDEX "MixSessionPlayer_tempPlayerId_idx" ON "MixSessionPlayer"("tempPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "MixSessionPlayer_sessionId_tempPlayerId_key" ON "MixSessionPlayer"("sessionId", "tempPlayerId");

-- CreateIndex
CREATE INDEX "TeamMember_tempPlayerId_idx" ON "TeamMember"("tempPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_tempPlayerId_key" ON "TeamMember"("teamId", "tempPlayerId");

-- AddForeignKey
ALTER TABLE "TempPlayer" ADD CONSTRAINT "TempPlayer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempPlayer" ADD CONSTRAINT "TempPlayer_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixSessionPlayer" ADD CONSTRAINT "MixSessionPlayer_tempPlayerId_fkey" FOREIGN KEY ("tempPlayerId") REFERENCES "TempPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_tempPlayerId_fkey" FOREIGN KEY ("tempPlayerId") REFERENCES "TempPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
