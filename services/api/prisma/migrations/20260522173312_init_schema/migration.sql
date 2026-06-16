-- AlterTable
ALTER TABLE "RefreshSession" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "RefreshSession_userId_createdAt_idx" ON "RefreshSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RefreshSession_revokedAt_idx" ON "RefreshSession"("revokedAt");

-- CreateIndex
CREATE INDEX "RefreshSession_lastUsedAt_idx" ON "RefreshSession"("lastUsedAt");
