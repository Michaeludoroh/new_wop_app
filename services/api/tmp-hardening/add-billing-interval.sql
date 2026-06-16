ALTER TABLE public."SubscriptionPlan"
ADD COLUMN IF NOT EXISTS "billingInterval" text NOT NULL DEFAULT 'MONTHLY';
