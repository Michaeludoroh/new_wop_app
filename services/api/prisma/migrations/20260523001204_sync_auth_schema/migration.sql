/*
  Warnings:

  - The values [MEMBER,STAFF] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `AnalyticsEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MentorshipSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Program` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefreshSession` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `adminUserId` to the `Announcement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "AnalyticsEvent" DROP CONSTRAINT "AnalyticsEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshSession" DROP CONSTRAINT "RefreshSession_userId_fkey";

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "adminUserId" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Clip" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Ebook" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "role" SET DEFAULT 'USER';

-- DropTable
DROP TABLE "AnalyticsEvent";

-- DropTable
DROP TABLE "MentorshipSession";

-- DropTable
DROP TABLE "Program";

-- DropTable
DROP TABLE "RefreshSession";

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpowermentProgram" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmpowermentProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorshipClass" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mentorName" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MentorshipClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorshipClassParticipant" (
    "id" TEXT NOT NULL,
    "mentorshipClassId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorshipClassParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_createdAt_idx" ON "RefreshToken"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_revokedAt_idx" ON "RefreshToken"("revokedAt");

-- CreateIndex
CREATE INDEX "RefreshToken_lastUsedAt_idx" ON "RefreshToken"("lastUsedAt");

-- CreateIndex
CREATE INDEX "EmpowermentProgram_status_idx" ON "EmpowermentProgram"("status");

-- CreateIndex
CREATE INDEX "EmpowermentProgram_createdById_idx" ON "EmpowermentProgram"("createdById");

-- CreateIndex
CREATE INDEX "EmpowermentProgram_deletedAt_idx" ON "EmpowermentProgram"("deletedAt");

-- CreateIndex
CREATE INDEX "MentorshipClass_status_idx" ON "MentorshipClass"("status");

-- CreateIndex
CREATE INDEX "MentorshipClass_createdById_idx" ON "MentorshipClass"("createdById");

-- CreateIndex
CREATE INDEX "MentorshipClass_deletedAt_idx" ON "MentorshipClass"("deletedAt");

-- CreateIndex
CREATE INDEX "MentorshipClassParticipant_userId_idx" ON "MentorshipClassParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorshipClassParticipant_mentorshipClassId_userId_key" ON "MentorshipClassParticipant"("mentorshipClassId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Announcement_adminUserId_idx" ON "Announcement"("adminUserId");

-- CreateIndex
CREATE INDEX "Announcement_deletedAt_idx" ON "Announcement"("deletedAt");

-- CreateIndex
CREATE INDEX "Clip_deletedAt_idx" ON "Clip"("deletedAt");

-- CreateIndex
CREATE INDEX "Ebook_deletedAt_idx" ON "Ebook"("deletedAt");

-- CreateIndex
CREATE INDEX "Notification_deletedAt_idx" ON "Notification"("deletedAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpowermentProgram" ADD CONSTRAINT "EmpowermentProgram_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipClass" ADD CONSTRAINT "MentorshipClass_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipClassParticipant" ADD CONSTRAINT "MentorshipClassParticipant_mentorshipClassId_fkey" FOREIGN KEY ("mentorshipClassId") REFERENCES "MentorshipClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipClassParticipant" ADD CONSTRAINT "MentorshipClassParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
