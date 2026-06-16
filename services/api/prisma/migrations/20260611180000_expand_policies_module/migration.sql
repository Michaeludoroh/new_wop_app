CREATE TYPE "PolicyType" AS ENUM (
  'TERMS_OF_USE',
  'PRIVACY_POLICY',
  'COMMUNITY_GUIDELINES',
  'CONTENT_SHARING_RULES'
);

ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "type" "PolicyType";
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Policy' AND column_name = 'effectiveAt'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Policy' AND column_name = 'effectiveDate'
  ) THEN
    ALTER TABLE "Policy" RENAME COLUMN "effectiveAt" TO "effectiveDate";
  END IF;
END $$;

ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "effectiveDate" TIMESTAMP(3);

UPDATE "Policy"
SET "published" = true
WHERE "status" = 'PUBLISHED';

UPDATE "Policy"
SET "published" = false
WHERE "status" IN ('DRAFT', 'ARCHIVED');

UPDATE "Policy"
SET "type" = 'TERMS_OF_USE'
WHERE "type" IS NULL;

UPDATE "Policy"
SET "slug" = CONCAT(
  LOWER(REPLACE("type"::text, '_', '-')),
  '-v',
  "version"::text,
  '-',
  SUBSTRING("id", 1, 8)
)
WHERE "slug" IS NULL;

ALTER TABLE "Policy" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "Policy" ALTER COLUMN "slug" SET NOT NULL;

DROP INDEX IF EXISTS "Policy_status_idx";
ALTER TABLE "Policy" DROP COLUMN IF EXISTS "status";

CREATE UNIQUE INDEX IF NOT EXISTS "Policy_slug_key" ON "Policy"("slug");
CREATE INDEX IF NOT EXISTS "Policy_type_idx" ON "Policy"("type");
CREATE INDEX IF NOT EXISTS "Policy_published_idx" ON "Policy"("published");
CREATE INDEX IF NOT EXISTS "Policy_deletedAt_idx" ON "Policy"("deletedAt");
CREATE INDEX IF NOT EXISTS "Policy_type_version_idx" ON "Policy"("type", "version");

CREATE TABLE IF NOT EXISTS "PolicyAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PolicyAcceptance_userId_policyId_key"
  ON "PolicyAcceptance"("userId", "policyId");
CREATE INDEX IF NOT EXISTS "PolicyAcceptance_userId_idx" ON "PolicyAcceptance"("userId");
CREATE INDEX IF NOT EXISTS "PolicyAcceptance_policyId_idx" ON "PolicyAcceptance"("policyId");
CREATE INDEX IF NOT EXISTS "PolicyAcceptance_acceptedAt_idx" ON "PolicyAcceptance"("acceptedAt");

ALTER TABLE "PolicyAcceptance"
  ADD CONSTRAINT "PolicyAcceptance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PolicyAcceptance"
  ADD CONSTRAINT "PolicyAcceptance_policyId_fkey"
  FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
