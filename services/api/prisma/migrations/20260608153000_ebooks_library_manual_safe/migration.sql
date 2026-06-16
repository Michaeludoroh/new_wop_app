-- Safe manual migration: eBooks/library enhancements only
-- No changes to auth/payment/subscription core tables

-- AlterTable Ebook
ALTER TABLE "Ebook"
  ADD COLUMN IF NOT EXISTS "author" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "secureFileKey" TEXT;

-- Ebook indexes
CREATE INDEX IF NOT EXISTS "Ebook_isPremium_idx" ON "Ebook"("isPremium");
CREATE INDEX IF NOT EXISTS "Ebook_category_idx" ON "Ebook"("category");

-- CreateTable EbookPurchase
CREATE TABLE IF NOT EXISTS "EbookPurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ebookId" TEXT NOT NULL,
  "paymentReference" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EbookPurchase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EbookPurchase_userId_idx" ON "EbookPurchase"("userId");
CREATE INDEX IF NOT EXISTS "EbookPurchase_ebookId_idx" ON "EbookPurchase"("ebookId");
CREATE INDEX IF NOT EXISTS "EbookPurchase_purchasedAt_idx" ON "EbookPurchase"("purchasedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "EbookPurchase_userId_ebookId_key" ON "EbookPurchase"("userId", "ebookId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EbookPurchase_userId_fkey'
  ) THEN
    ALTER TABLE "EbookPurchase"
      ADD CONSTRAINT "EbookPurchase_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EbookPurchase_ebookId_fkey'
  ) THEN
    ALTER TABLE "EbookPurchase"
      ADD CONSTRAINT "EbookPurchase_ebookId_fkey"
      FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable ReadingProgress
CREATE TABLE IF NOT EXISTS "ReadingProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ebookId" TEXT NOT NULL,
  "currentPage" INTEGER NOT NULL DEFAULT 1,
  "totalPages" INTEGER,
  "progressPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bookmarkPages" JSONB,
  "downloaded" BOOLEAN NOT NULL DEFAULT false,
  "downloadedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReadingProgress_userId_idx" ON "ReadingProgress"("userId");
CREATE INDEX IF NOT EXISTS "ReadingProgress_ebookId_idx" ON "ReadingProgress"("ebookId");
CREATE INDEX IF NOT EXISTS "ReadingProgress_lastReadAt_idx" ON "ReadingProgress"("lastReadAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ReadingProgress_userId_ebookId_key" ON "ReadingProgress"("userId", "ebookId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ReadingProgress_userId_fkey'
  ) THEN
    ALTER TABLE "ReadingProgress"
      ADD CONSTRAINT "ReadingProgress_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ReadingProgress_ebookId_fkey'
  ) THEN
    ALTER TABLE "ReadingProgress"
      ADD CONSTRAINT "ReadingProgress_ebookId_fkey"
      FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
