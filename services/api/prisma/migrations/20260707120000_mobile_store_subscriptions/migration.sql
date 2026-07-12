-- CreateEnum
CREATE TYPE "MobilePlatform" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "StoreProvider" AS ENUM ('GOOGLE_PLAY', 'APPLE');

-- CreateEnum
CREATE TYPE "StoreSubscriptionStatus" AS ENUM ('ACTIVE', 'GRACE', 'EXPIRED', 'CANCELLED', 'PENDING');

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'GOOGLE_PLAY';
ALTER TYPE "PaymentProvider" ADD VALUE 'APPLE';

-- CreateTable
CREATE TABLE "StoreSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userSubscriptionId" TEXT,
    "platform" "MobilePlatform" NOT NULL,
    "provider" "StoreProvider" NOT NULL,
    "productId" TEXT NOT NULL,
    "transactionId" TEXT,
    "purchaseToken" TEXT,
    "originalTransactionId" TEXT,
    "receiptData" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "renewalStatus" TEXT,
    "autoRenewStatus" BOOLEAN NOT NULL DEFAULT true,
    "status" "StoreSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePurchaseHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeSubscriptionId" TEXT,
    "platform" "MobilePlatform" NOT NULL,
    "provider" "StoreProvider" NOT NULL,
    "productId" TEXT NOT NULL,
    "transactionId" TEXT,
    "purchaseToken" TEXT,
    "receiptData" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "renewalStatus" TEXT,
    "status" "StoreSubscriptionStatus" NOT NULL,
    "verificationPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePurchaseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreSubscription_userSubscriptionId_key" ON "StoreSubscription"("userSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreSubscription_provider_purchaseToken_key" ON "StoreSubscription"("provider", "purchaseToken");

-- CreateIndex
CREATE UNIQUE INDEX "StoreSubscription_provider_originalTransactionId_key" ON "StoreSubscription"("provider", "originalTransactionId");

-- CreateIndex
CREATE INDEX "StoreSubscription_userId_idx" ON "StoreSubscription"("userId");

-- CreateIndex
CREATE INDEX "StoreSubscription_status_idx" ON "StoreSubscription"("status");

-- CreateIndex
CREATE INDEX "StoreSubscription_expiryDate_idx" ON "StoreSubscription"("expiryDate");

-- CreateIndex
CREATE INDEX "StoreSubscription_productId_idx" ON "StoreSubscription"("productId");

-- CreateIndex
CREATE INDEX "StorePurchaseHistory_userId_idx" ON "StorePurchaseHistory"("userId");

-- CreateIndex
CREATE INDEX "StorePurchaseHistory_storeSubscriptionId_idx" ON "StorePurchaseHistory"("storeSubscriptionId");

-- CreateIndex
CREATE INDEX "StorePurchaseHistory_provider_transactionId_idx" ON "StorePurchaseHistory"("provider", "transactionId");

-- CreateIndex
CREATE INDEX "StorePurchaseHistory_provider_purchaseToken_idx" ON "StorePurchaseHistory"("provider", "purchaseToken");

-- CreateIndex
CREATE INDEX "StorePurchaseHistory_createdAt_idx" ON "StorePurchaseHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "StoreSubscription" ADD CONSTRAINT "StoreSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSubscription" ADD CONSTRAINT "StoreSubscription_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePurchaseHistory" ADD CONSTRAINT "StorePurchaseHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePurchaseHistory" ADD CONSTRAINT "StorePurchaseHistory_storeSubscriptionId_fkey" FOREIGN KEY ("storeSubscriptionId") REFERENCES "StoreSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
