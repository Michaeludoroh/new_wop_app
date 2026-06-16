CREATE TYPE "ProgramEnrollmentStatus" AS ENUM ('ENROLLED', 'CANCELLED');

ALTER TABLE "EmpowermentProgram" ADD COLUMN "slug" TEXT;
ALTER TABLE "EmpowermentProgram" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "EmpowermentProgram" ADD COLUMN "bannerImageUrl" TEXT;
ALTER TABLE "EmpowermentProgram" ADD COLUMN "instructorName" TEXT;
ALTER TABLE "EmpowermentProgram" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "EmpowermentProgram" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "EmpowermentProgram" ADD COLUMN "registrationDeadline" TIMESTAMP(3);
ALTER TABLE "EmpowermentProgram" ADD COLUMN "capacity" INTEGER;
ALTER TABLE "EmpowermentProgram" ADD COLUMN "enrolledCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmpowermentProgram" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EmpowermentProgram" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;

UPDATE "EmpowermentProgram"
SET
  "startDate" = COALESCE("startsAt", CURRENT_TIMESTAMP),
  "endDate" = COALESCE("endsAt", CURRENT_TIMESTAMP + INTERVAL '1 day'),
  "published" = CASE WHEN "status" = 'PUBLISHED' THEN true ELSE false END,
  "slug" = COALESCE(
    NULLIF(
      LOWER(
        REGEXP_REPLACE(
          REGEXP_REPLACE(TRIM("title"), '[^a-zA-Z0-9]+', '-', 'g'),
          '(^-+|-+$)',
          '',
          'g'
        )
      ),
      ''
    ),
    'program'
  ) || '-' || SUBSTRING("id", 1, 6);

UPDATE "EmpowermentProgram"
SET "slug" = "id"
WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "EmpowermentProgram" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "EmpowermentProgram" ALTER COLUMN "startDate" SET NOT NULL;
ALTER TABLE "EmpowermentProgram" ALTER COLUMN "endDate" SET NOT NULL;

ALTER TABLE "EmpowermentProgram" DROP COLUMN "status";
ALTER TABLE "EmpowermentProgram" DROP COLUMN "startsAt";
ALTER TABLE "EmpowermentProgram" DROP COLUMN "endsAt";

DROP INDEX IF EXISTS "EmpowermentProgram_status_idx";

CREATE UNIQUE INDEX "EmpowermentProgram_slug_key" ON "EmpowermentProgram"("slug");
CREATE INDEX "EmpowermentProgram_published_idx" ON "EmpowermentProgram"("published");
CREATE INDEX "EmpowermentProgram_featured_idx" ON "EmpowermentProgram"("featured");
CREATE INDEX "EmpowermentProgram_category_idx" ON "EmpowermentProgram"("category");
CREATE INDEX "EmpowermentProgram_startDate_idx" ON "EmpowermentProgram"("startDate");

CREATE TABLE "ProgramEnrollment" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "ProgramEnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProgramEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgramProgress" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "completionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currentModule" TEXT,
  "notes" TEXT,
  "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProgramProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgramEnrollment_programId_userId_key" ON "ProgramEnrollment"("programId", "userId");
CREATE INDEX "ProgramEnrollment_programId_idx" ON "ProgramEnrollment"("programId");
CREATE INDEX "ProgramEnrollment_userId_idx" ON "ProgramEnrollment"("userId");
CREATE INDEX "ProgramEnrollment_status_idx" ON "ProgramEnrollment"("status");

CREATE UNIQUE INDEX "ProgramProgress_programId_userId_key" ON "ProgramProgress"("programId", "userId");
CREATE INDEX "ProgramProgress_programId_idx" ON "ProgramProgress"("programId");
CREATE INDEX "ProgramProgress_userId_idx" ON "ProgramProgress"("userId");
CREATE INDEX "ProgramProgress_lastUpdatedAt_idx" ON "ProgramProgress"("lastUpdatedAt");

ALTER TABLE "ProgramEnrollment"
  ADD CONSTRAINT "ProgramEnrollment_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "EmpowermentProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProgramEnrollment"
  ADD CONSTRAINT "ProgramEnrollment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProgramProgress"
  ADD CONSTRAINT "ProgramProgress_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "EmpowermentProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProgramProgress"
  ADD CONSTRAINT "ProgramProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
