CREATE TYPE "EventLocationType" AS ENUM ('PHYSICAL', 'ONLINE', 'HYBRID');
CREATE TYPE "EventRsvpStatus" AS ENUM ('REGISTERED', 'CANCELLED');

CREATE TABLE "Event" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "bannerImageUrl" TEXT,
  "locationType" "EventLocationType" NOT NULL,
  "venue" TEXT,
  "meetingLink" TEXT,
  "startDateTime" TIMESTAMP(3) NOT NULL,
  "endDateTime" TIMESTAMP(3) NOT NULL,
  "registrationRequired" BOOLEAN NOT NULL DEFAULT false,
  "maxCapacity" INTEGER,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventAttendee" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "EventRsvpStatus" NOT NULL DEFAULT 'REGISTERED',
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventAttendee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE INDEX "Event_published_idx" ON "Event"("published");
CREATE INDEX "Event_featured_idx" ON "Event"("featured");
CREATE INDEX "Event_category_idx" ON "Event"("category");
CREATE INDEX "Event_startDateTime_idx" ON "Event"("startDateTime");

CREATE UNIQUE INDEX "EventAttendee_eventId_userId_key" ON "EventAttendee"("eventId", "userId");
CREATE INDEX "EventAttendee_eventId_idx" ON "EventAttendee"("eventId");
CREATE INDEX "EventAttendee_userId_idx" ON "EventAttendee"("userId");
CREATE INDEX "EventAttendee_status_idx" ON "EventAttendee"("status");

ALTER TABLE "EventAttendee"
  ADD CONSTRAINT "EventAttendee_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventAttendee"
  ADD CONSTRAINT "EventAttendee_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
