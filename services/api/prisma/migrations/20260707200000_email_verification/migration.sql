-- Email verification fields for production account verification flow
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "emailVerificationTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3);

-- Grandfather existing accounts as verified
UPDATE "User"
SET "emailVerified" = true,
    "emailVerifiedAt" = COALESCE("emailVerifiedAt", "createdAt")
WHERE "emailVerified" = false;

CREATE INDEX "User_emailVerified_idx" ON "User"("emailVerified");
