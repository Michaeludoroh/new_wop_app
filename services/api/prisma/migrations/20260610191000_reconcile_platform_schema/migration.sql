-- Reconcile official Prisma migration history with schema.prisma.
-- This migration folds the previously manual platform-hardening SQL into the
-- Prisma migration chain so fresh `prisma migrate deploy` environments match
-- the runtime datamodel.

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingInterval') THEN
    CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
    CREATE TYPE "TransactionType" AS ENUM (
      'SUBSCRIPTION_INITIAL',
      'SUBSCRIPTION_RENEWAL',
      'SUBSCRIPTION_UPGRADE',
      'SUBSCRIPTION_DOWNGRADE',
      'RETRY_CHARGE',
      'REFUND'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebhookProcessingStatus') THEN
    CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'DUPLICATE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnnouncementCategory') THEN
    CREATE TYPE "AnnouncementCategory" AS ENUM (
      'NEWS',
      'EVENT',
      'GENERAL_UPDATE',
      'PRAYER_MEETING',
      'CONFERENCE'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PushPlatform') THEN
    CREATE TYPE "PushPlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PushCategory') THEN
    CREATE TYPE "PushCategory" AS ENUM ('NOTIFICATION', 'PAYMENT', 'SUBSCRIPTION', 'SECURITY', 'SYSTEM');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PushProvider') THEN
    CREATE TYPE "PushProvider" AS ENUM ('FCM');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PushDeliveryStatus') THEN
    CREATE TYPE "PushDeliveryStatus" AS ENUM ('SENT', 'FAILED', 'RETRYING');
  END IF;
END $$;

-- AlterEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentProvider' AND e.enumlabel = 'STRIPE'
  ) THEN
    ALTER TYPE "PaymentProvider" ADD VALUE 'STRIPE';
  END IF;
END $$;

-- Align SubscriptionPlan with schema.prisma.
ALTER TABLE "SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "billingInterval" "BillingInterval",
  ADD COLUMN IF NOT EXISTS "trialPeriodDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "recurringEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'SubscriptionPlan' AND column_name = 'interval'
  ) THEN
    UPDATE "SubscriptionPlan"
    SET "billingInterval" = COALESCE("billingInterval", "interval"::text::"BillingInterval");
  END IF;
END $$;

UPDATE "SubscriptionPlan"
SET "billingInterval" = 'MONTHLY'
WHERE "billingInterval" IS NULL;

ALTER TABLE "SubscriptionPlan"
  ALTER COLUMN "billingInterval" SET NOT NULL;

ALTER TABLE "SubscriptionPlan"
  DROP COLUMN IF EXISTS "interval";

DROP TYPE IF EXISTS "SubscriptionInterval";

-- Announcements phase-1 fields.
ALTER TABLE "Announcement"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "category" "AnnouncementCategory" NOT NULL DEFAULT 'GENERAL_UPDATE',
  ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pushNotificationSent" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Announcement"
SET "isPublished" = true
WHERE "status" = 'PUBLISHED';

-- Notification announcement linkage.
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "announcementId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "trialStartedAt" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT true,
  "upgradeFromId" TEXT,
  "downgradedFromId" TEXT,
  "lastPaymentAttemptAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "maxRetryCount" INTEGER NOT NULL DEFAULT 3,
  "invoiceReference" TEXT,
  "receiptReference" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- Preserve legacy Subscription rows when present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Subscription') THEN
    INSERT INTO "UserSubscription" (
      "id",
      "userId",
      "planId",
      "status",
      "startedAt",
      "currentPeriodStart",
      "currentPeriodEnd",
      "cancelledAt",
      "createdAt",
      "updatedAt"
    )
    SELECT
      "id",
      "userId",
      "planId",
      "status",
      "startDate",
      "startDate",
      "endDate",
      "cancelledAt",
      "createdAt",
      "updatedAt"
    FROM "Subscription"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userSubscriptionId" TEXT,
  "provider" "PaymentProvider" NOT NULL,
  "providerReference" TEXT NOT NULL,
  "transactionType" "TransactionType" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "retryable" BOOLEAN NOT NULL DEFAULT false,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "invoiceReference" TEXT,
  "receiptReference" TEXT,
  "providerPayload" JSONB,
  "normalizedEvent" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "subscriptionPlanId" TEXT,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- Preserve legacy Payment rows when present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Payment') THEN
    INSERT INTO "PaymentTransaction" (
      "id",
      "userId",
      "userSubscriptionId",
      "provider",
      "providerReference",
      "transactionType",
      "amount",
      "currency",
      "status",
      "initiatedAt",
      "paidAt",
      "metadata",
      "createdAt",
      "updatedAt"
    )
    SELECT
      "id",
      "userId",
      "subscriptionId",
      "provider",
      "providerRef",
      'SUBSCRIPTION_INITIAL',
      "amount",
      "currency",
      "status",
      "createdAt",
      "paidAt",
      "metadata",
      "createdAt",
      "updatedAt"
    FROM "Payment"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventHash" TEXT NOT NULL,
  "paymentTransactionId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "processingStatus" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
  "signatureValid" BOOLEAN NOT NULL DEFAULT false,
  "rawPayload" JSONB NOT NULL,
  "normalizedPayload" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PushDeviceToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" "PushPlatform" NOT NULL,
  "deviceId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushDeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PushDeliveryLog" (
  "id" TEXT NOT NULL,
  "announcementId" TEXT,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "category" "PushCategory" NOT NULL,
  "provider" "PushProvider" NOT NULL,
  "status" "PushDeliveryStatus" NOT NULL DEFAULT 'SENT',
  "success" BOOLEAN NOT NULL,
  "providerMessageId" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "retryable" BOOLEAN NOT NULL DEFAULT false,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "maxRetryCount" INTEGER NOT NULL DEFAULT 3,
  "nextRetryAt" TIMESTAMP(3),
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- Drop legacy tables after preserving data in the schema-backed replacements.
DROP TABLE IF EXISTS "Payment";
DROP TABLE IF EXISTS "Subscription";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Announcement_isPublished_idx" ON "Announcement"("isPublished");
CREATE INDEX IF NOT EXISTS "Announcement_category_idx" ON "Announcement"("category");

CREATE INDEX IF NOT EXISTS "Notification_announcementId_idx" ON "Notification"("announcementId");

CREATE INDEX IF NOT EXISTS "UserSubscription_userId_idx" ON "UserSubscription"("userId");
CREATE INDEX IF NOT EXISTS "UserSubscription_planId_idx" ON "UserSubscription"("planId");
CREATE INDEX IF NOT EXISTS "UserSubscription_status_idx" ON "UserSubscription"("status");
CREATE INDEX IF NOT EXISTS "UserSubscription_trialEndsAt_idx" ON "UserSubscription"("trialEndsAt");
CREATE INDEX IF NOT EXISTS "UserSubscription_currentPeriodEnd_idx" ON "UserSubscription"("currentPeriodEnd");

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_providerReference_key" ON "PaymentTransaction"("providerReference");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_userId_idx" ON "PaymentTransaction"("userId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_userSubscriptionId_idx" ON "PaymentTransaction"("userSubscriptionId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_transactionType_idx" ON "PaymentTransaction"("transactionType");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_provider_providerReference_idx" ON "PaymentTransaction"("provider", "providerReference");

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_provider_externalEventId_key" ON "PaymentWebhookEvent"("provider", "externalEventId");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_eventHash_idx" ON "PaymentWebhookEvent"("eventHash");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_processingStatus_idx" ON "PaymentWebhookEvent"("processingStatus");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_paymentTransactionId_idx" ON "PaymentWebhookEvent"("paymentTransactionId");

CREATE UNIQUE INDEX IF NOT EXISTS "PushDeviceToken_token_key" ON "PushDeviceToken"("token");
CREATE INDEX IF NOT EXISTS "PushDeviceToken_userId_idx" ON "PushDeviceToken"("userId");
CREATE INDEX IF NOT EXISTS "PushDeviceToken_userId_isActive_idx" ON "PushDeviceToken"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "PushDeviceToken_platform_idx" ON "PushDeviceToken"("platform");
CREATE INDEX IF NOT EXISTS "PushDeviceToken_revokedAt_idx" ON "PushDeviceToken"("revokedAt");

CREATE INDEX IF NOT EXISTS "PushDeliveryLog_announcementId_createdAt_idx" ON "PushDeliveryLog"("announcementId", "createdAt");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_userId_idx" ON "PushDeliveryLog"("userId");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_provider_idx" ON "PushDeliveryLog"("provider");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_dedupeKey_idx" ON "PushDeliveryLog"("dedupeKey");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_category_idx" ON "PushDeliveryLog"("category");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_success_idx" ON "PushDeliveryLog"("success");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_status_retryCount_nextRetryAt_idx" ON "PushDeliveryLog"("status", "retryCount", "nextRetryAt");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_retryable_retryCount_idx" ON "PushDeliveryLog"("retryable", "retryCount");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_nextRetryAt_idx" ON "PushDeliveryLog"("nextRetryAt");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_createdAt_idx" ON "PushDeliveryLog"("createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_announcementId_fkey') THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_announcementId_fkey"
      FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserSubscription_userId_fkey') THEN
    ALTER TABLE "UserSubscription"
      ADD CONSTRAINT "UserSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserSubscription_planId_fkey') THEN
    ALTER TABLE "UserSubscription"
      ADD CONSTRAINT "UserSubscription_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentTransaction_subscriptionPlanId_fkey') THEN
    ALTER TABLE "PaymentTransaction"
      ADD CONSTRAINT "PaymentTransaction_subscriptionPlanId_fkey"
      FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentTransaction_userId_fkey') THEN
    ALTER TABLE "PaymentTransaction"
      ADD CONSTRAINT "PaymentTransaction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentTransaction_userSubscriptionId_fkey') THEN
    ALTER TABLE "PaymentTransaction"
      ADD CONSTRAINT "PaymentTransaction_userSubscriptionId_fkey"
      FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentWebhookEvent_paymentTransactionId_fkey') THEN
    ALTER TABLE "PaymentWebhookEvent"
      ADD CONSTRAINT "PaymentWebhookEvent_paymentTransactionId_fkey"
      FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushDeviceToken_userId_fkey') THEN
    ALTER TABLE "PushDeviceToken"
      ADD CONSTRAINT "PushDeviceToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushDeliveryLog_announcementId_fkey') THEN
    ALTER TABLE "PushDeliveryLog"
      ADD CONSTRAINT "PushDeliveryLog_announcementId_fkey"
      FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushDeliveryLog_userId_fkey') THEN
    ALTER TABLE "PushDeliveryLog"
      ADD CONSTRAINT "PushDeliveryLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
