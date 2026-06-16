ALTER TABLE public."SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "billingInterval" text NOT NULL DEFAULT 'MONTHLY';

ALTER TABLE public."SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "trialPeriodDays" integer NOT NULL DEFAULT 0;

ALTER TABLE public."SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "recurringEnabled" boolean NOT NULL DEFAULT true;

ALTER TABLE public."SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "metadata" jsonb;
