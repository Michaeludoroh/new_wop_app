-- Add a dedicated transaction type for verified eBook purchases so payment
-- reporting and entitlement reconciliation can distinguish them from
-- subscription charges.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'TransactionType'
      AND e.enumlabel = 'EBOOK_PURCHASE'
  ) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'EBOOK_PURCHASE';
  END IF;
END $$;
