-- CreateTable
CREATE TABLE "MixGenerationLock" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "selectedAdminId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MixGenerationLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MixGenerationLock_selectedAdminId_idx" ON "MixGenerationLock"("selectedAdminId");

-- AddForeignKey
ALTER TABLE "MixGenerationLock" ADD CONSTRAINT "MixGenerationLock_selectedAdminId_fkey" FOREIGN KEY ("selectedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
