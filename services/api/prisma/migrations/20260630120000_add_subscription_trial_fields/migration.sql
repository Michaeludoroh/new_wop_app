-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN IF NOT EXISTS "lastPaymentAt" TIMESTAMP(3);
