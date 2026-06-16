CREATE TYPE "MentorshipParticipantStatus" AS ENUM ('ENROLLED', 'WAITLISTED', 'CANCELLED');
CREATE TYPE "MentorshipAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');

ALTER TABLE "MentorshipClass" ADD COLUMN "slug" TEXT;
ALTER TABLE "MentorshipClass" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "MentorshipClass" ADD COLUMN "bannerImageUrl" TEXT;
ALTER TABLE "MentorshipClass" ADD COLUMN "mentorBio" TEXT;
ALTER TABLE "MentorshipClass" ADD COLUMN "mentorImageUrl" TEXT;
ALTER TABLE "MentorshipClass" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "MentorshipClass" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "MentorshipClass" ADD COLUMN "registrationDeadline" TIMESTAMP(3);
ALTER TABLE "MentorshipClass" ADD COLUMN "capacity" INTEGER;
ALTER TABLE "MentorshipClass" ADD COLUMN "enrolledCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MentorshipClass" ADD COLUMN "waitlistCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MentorshipClass" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MentorshipClass" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;

UPDATE "MentorshipClass"
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
    'mentorship'
  ) || '-' || SUBSTRING("id", 1, 6);

UPDATE "MentorshipClass"
SET "slug" = "id"
WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "MentorshipClass" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "MentorshipClass" ALTER COLUMN "startDate" SET NOT NULL;
ALTER TABLE "MentorshipClass" ALTER COLUMN "endDate" SET NOT NULL;

ALTER TABLE "MentorshipClass" DROP COLUMN "status";
ALTER TABLE "MentorshipClass" DROP COLUMN "startsAt";
ALTER TABLE "MentorshipClass" DROP COLUMN "endsAt";

DROP INDEX IF EXISTS "MentorshipClass_status_idx";

CREATE UNIQUE INDEX "MentorshipClass_slug_key" ON "MentorshipClass"("slug");
CREATE INDEX "MentorshipClass_published_idx" ON "MentorshipClass"("published");
CREATE INDEX "MentorshipClass_featured_idx" ON "MentorshipClass"("featured");
CREATE INDEX "MentorshipClass_category_idx" ON "MentorshipClass"("category");
CREATE INDEX "MentorshipClass_startDate_idx" ON "MentorshipClass"("startDate");

ALTER TABLE "MentorshipClassParticipant" ADD COLUMN "status" "MentorshipParticipantStatus" NOT NULL DEFAULT 'ENROLLED';
ALTER TABLE "MentorshipClassParticipant" ADD COLUMN "waitlistedAt" TIMESTAMP(3);
ALTER TABLE "MentorshipClassParticipant" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "MentorshipClassParticipant" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "MentorshipClassParticipant" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "MentorshipClass" mc
SET "enrolledCount" = sub.cnt
FROM (
  SELECT "mentorshipClassId", COUNT(*) AS cnt
  FROM "MentorshipClassParticipant"
  GROUP BY "mentorshipClassId"
) sub
WHERE mc."id" = sub."mentorshipClassId";

CREATE INDEX "MentorshipClassParticipant_mentorshipClassId_idx" ON "MentorshipClassParticipant"("mentorshipClassId");
CREATE INDEX "MentorshipClassParticipant_status_idx" ON "MentorshipClassParticipant"("status");

CREATE TABLE "MentorshipSession" (
  "id" TEXT NOT NULL,
  "mentorshipClassId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "meetingLink" TEXT,
  "location" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MentorshipSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorshipAttendance" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "MentorshipAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
  "notes" TEXT,
  "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MentorshipAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorshipFeedback" (
  "id" TEXT NOT NULL,
  "mentorshipClassId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MentorshipFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorshipProgress" (
  "id" TEXT NOT NULL,
  "mentorshipClassId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "completionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currentMilestone" TEXT,
  "notes" TEXT,
  "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MentorshipProgress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MentorshipSession_mentorshipClassId_idx" ON "MentorshipSession"("mentorshipClassId");
CREATE INDEX "MentorshipSession_scheduledAt_idx" ON "MentorshipSession"("scheduledAt");

CREATE UNIQUE INDEX "MentorshipAttendance_sessionId_userId_key" ON "MentorshipAttendance"("sessionId", "userId");
CREATE INDEX "MentorshipAttendance_sessionId_idx" ON "MentorshipAttendance"("sessionId");
CREATE INDEX "MentorshipAttendance_userId_idx" ON "MentorshipAttendance"("userId");
CREATE INDEX "MentorshipAttendance_status_idx" ON "MentorshipAttendance"("status");

CREATE UNIQUE INDEX "MentorshipFeedback_mentorshipClassId_userId_key" ON "MentorshipFeedback"("mentorshipClassId", "userId");
CREATE INDEX "MentorshipFeedback_mentorshipClassId_idx" ON "MentorshipFeedback"("mentorshipClassId");
CREATE INDEX "MentorshipFeedback_userId_idx" ON "MentorshipFeedback"("userId");

CREATE UNIQUE INDEX "MentorshipProgress_mentorshipClassId_userId_key" ON "MentorshipProgress"("mentorshipClassId", "userId");
CREATE INDEX "MentorshipProgress_mentorshipClassId_idx" ON "MentorshipProgress"("mentorshipClassId");
CREATE INDEX "MentorshipProgress_userId_idx" ON "MentorshipProgress"("userId");
CREATE INDEX "MentorshipProgress_lastUpdatedAt_idx" ON "MentorshipProgress"("lastUpdatedAt");

ALTER TABLE "MentorshipSession"
  ADD CONSTRAINT "MentorshipSession_mentorshipClassId_fkey"
  FOREIGN KEY ("mentorshipClassId") REFERENCES "MentorshipClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorshipAttendance"
  ADD CONSTRAINT "MentorshipAttendance_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "MentorshipSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorshipAttendance"
  ADD CONSTRAINT "MentorshipAttendance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorshipFeedback"
  ADD CONSTRAINT "MentorshipFeedback_mentorshipClassId_fkey"
  FOREIGN KEY ("mentorshipClassId") REFERENCES "MentorshipClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorshipFeedback"
  ADD CONSTRAINT "MentorshipFeedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorshipProgress"
  ADD CONSTRAINT "MentorshipProgress_mentorshipClassId_fkey"
  FOREIGN KEY ("mentorshipClassId") REFERENCES "MentorshipClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorshipProgress"
  ADD CONSTRAINT "MentorshipProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
