-- ─── New Enums ──────────────────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM ('member', 'provider', 'buyer', 'admin');
CREATE TYPE "ListingStatus" AS ENUM ('active', 'paused', 'removed');
CREATE TYPE "ServiceType" AS ENUM ('offer', 'request');
CREATE TYPE "PartnerStatus" AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE "WalletTxType" AS ENUM ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'purchase', 'refund', 'bonus');
CREATE TYPE "WithdrawalStatus" AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE "NotificationType" AS ENUM (
  'partner_request', 'partner_accepted', 'message',
  'product_warning', 'product_removed',
  'service_warning', 'service_removed',
  'payment_confirmed', 'payment_rejected',
  'withdrawal_approved', 'withdrawal_rejected',
  'system'
);

-- ─── Extend User ─────────────────────────────────────────────────────────────

ALTER TABLE "User"
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'Україна',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'member',
  ADD COLUMN "fullName" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "workPhone" TEXT,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "bannerUrl" TEXT,
  ADD COLUMN "aboutMe" TEXT,
  ADD COLUMN "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "telegram" TEXT,
  ADD COLUMN "instagram" TEXT,
  ADD COLUMN "facebook" TEXT,
  ADD COLUMN "whatsapp" TEXT,
  ADD COLUMN "businessNiche" TEXT,
  ADD COLUMN "acceptsPartners" BOOLEAN NOT NULL DEFAULT true;

-- ─── Product ─────────────────────────────────────────────────────────────────

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priceTokens" INTEGER NOT NULL,
  "priceUAH" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'UAH',
  "category" TEXT,
  "city" TEXT,
  "region" TEXT,
  "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" "ListingStatus" NOT NULL DEFAULT 'active',
  "views" INTEGER NOT NULL DEFAULT 0,
  "sourceUrl" TEXT,
  "externalId" TEXT,
  "removedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Product_ownerId_idx" ON "Product"("ownerId");
CREATE INDEX "Product_status_idx" ON "Product"("status");

ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ServiceAd ───────────────────────────────────────────────────────────────

CREATE TABLE "ServiceAd" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "type" "ServiceType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priceTokens" INTEGER,
  "priceUAH" INTEGER,
  "category" TEXT,
  "city" TEXT,
  "region" TEXT,
  "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" "ListingStatus" NOT NULL DEFAULT 'active',
  "removedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceAd_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceAd_ownerId_idx" ON "ServiceAd"("ownerId");
CREATE INDEX "ServiceAd_type_idx" ON "ServiceAd"("type");
CREATE INDEX "ServiceAd_status_idx" ON "ServiceAd"("status");

ALTER TABLE "ServiceAd" ADD CONSTRAINT "ServiceAd_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── DirectMessage ───────────────────────────────────────────────────────────

CREATE TABLE "DirectMessage" (
  "id" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contextType" TEXT,
  "contextId" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DirectMessage_senderId_receiverId_idx" ON "DirectMessage"("senderId", "receiverId");
CREATE INDEX "DirectMessage_receiverId_createdAt_idx" ON "DirectMessage"("receiverId", "createdAt");

ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_receiverId_fkey"
  FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Partnership ─────────────────────────────────────────────────────────────

CREATE TABLE "Partnership" (
  "id" TEXT NOT NULL,
  "initiatorId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "status" "PartnerStatus" NOT NULL DEFAULT 'pending',
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "Partnership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Partnership_initiatorId_targetId_key" ON "Partnership"("initiatorId", "targetId");
CREATE INDEX "Partnership_targetId_idx" ON "Partnership"("targetId");

ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_initiatorId_fkey"
  FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_targetId_fkey"
  FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Favorite ────────────────────────────────────────────────────────────────

CREATE TABLE "Favorite" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "userId" TEXT,
  "productId" TEXT,
  "serviceId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Favorite_ownerId_idx" ON "Favorite"("ownerId");
CREATE UNIQUE INDEX "Favorite_ownerId_userId_key" ON "Favorite"("ownerId", "userId");
CREATE UNIQUE INDEX "Favorite_ownerId_productId_key" ON "Favorite"("ownerId", "productId");
CREATE UNIQUE INDEX "Favorite_ownerId_serviceId_key" ON "Favorite"("ownerId", "serviceId");

ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "ServiceAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── WalletTransaction ───────────────────────────────────────────────────────

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "WalletTxType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "description" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");

ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── WithdrawalRequest ───────────────────────────────────────────────────────

CREATE TABLE "WithdrawalRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amountTokens" INTEGER NOT NULL,
  "amountUAH" INTEGER,
  "details" TEXT NOT NULL,
  "reason" TEXT,
  "status" "WithdrawalStatus" NOT NULL DEFAULT 'pending',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Notification ────────────────────────────────────────────────────────────

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "link" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── HomeContent ─────────────────────────────────────────────────────────────

CREATE TABLE "HomeContent" (
  "locale" TEXT NOT NULL,
  "content" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeContent_pkey" PRIMARY KEY ("locale")
);
