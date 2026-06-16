-- Phase 1 Announcements schema alignment migration
-- Target DB: app_db (public schema)
-- Purpose: align runtime DB columns with Prisma/application model to remove P2022 errors

ALTER TABLE "Announcement"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pushNotificationSent" BOOLEAN NOT NULL DEFAULT false;

-- Backfill isPublished from status for existing rows
UPDATE "Announcement"
SET "isPublished" = CASE
  WHEN "status"::text = 'PUBLISHED' THEN true
  ELSE false
END
WHERE "isPublished" IS DISTINCT FROM (
  CASE WHEN "status"::text = 'PUBLISHED' THEN true ELSE false END
);

-- Helpful indexes for admin/public listing filters
CREATE INDEX IF NOT EXISTS "Announcement_category_idx" ON "Announcement"("category");
CREATE INDEX IF NOT EXISTS "Announcement_isPublished_idx" ON "Announcement"("isPublished");
CREATE INDEX IF NOT EXISTS "Announcement_deletedAt_idx" ON "Announcement"("deletedAt");
