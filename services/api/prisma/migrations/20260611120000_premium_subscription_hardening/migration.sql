-- Premium subscription hardening: grace tracking and status history
ALTER TABLE "UserSubscription" ADD COLUMN IF NOT EXISTS "graceEndsAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "UserSubscription_graceEndsAt_idx" ON "UserSubscription"("graceEndsAt");

CREATE TABLE IF NOT EXISTS "SubscriptionStatusHistory" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromStatus" "SubscriptionStatus",
    "toStatus" "SubscriptionStatus" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SubscriptionStatusHistory_subscriptionId_idx" ON "SubscriptionStatusHistory"("subscriptionId");
CREATE INDEX IF NOT EXISTS "SubscriptionStatusHistory_userId_idx" ON "SubscriptionStatusHistory"("userId");
CREATE INDEX IF NOT EXISTS "SubscriptionStatusHistory_toStatus_idx" ON "SubscriptionStatusHistory"("toStatus");
CREATE INDEX IF NOT EXISTS "SubscriptionStatusHistory_createdAt_idx" ON "SubscriptionStatusHistory"("createdAt");

ALTER TABLE "SubscriptionStatusHistory" DROP CONSTRAINT IF EXISTS "SubscriptionStatusHistory_subscriptionId_fkey";
ALTER TABLE "SubscriptionStatusHistory" ADD CONSTRAINT "SubscriptionStatusHistory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubscriptionStatusHistory" DROP CONSTRAINT IF EXISTS "SubscriptionStatusHistory_userId_fkey";
ALTER TABLE "SubscriptionStatusHistory" ADD CONSTRAINT "SubscriptionStatusHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
