-- Add `entrepreneur` value to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'entrepreneur';

-- New enums
DO $$ BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('free', 'provider', 'entrepreneur');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'active', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EmailTokenType" AS ENUM ('verify', 'magic', 'reset');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PostStatus" AS ENUM ('active', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RatingValue" AS ENUM ('up', 'down');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend NotificationType with new values (use ADD VALUE IF NOT EXISTS)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'subscription_activated';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'subscription_expiring';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'favorite_new_product';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'favorite_new_post';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'rating_changed';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'email_verified';

-- Extend "User" with new columns
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ratingScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ratingUpCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ratingDownCount" INTEGER NOT NULL DEFAULT 0;

-- EmailToken
CREATE TABLE IF NOT EXISTS "EmailToken" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "email"     TEXT NOT NULL,
  "token"     TEXT NOT NULL UNIQUE,
  "type"      "EmailTokenType" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EmailToken_userId_type_idx" ON "EmailToken" ("userId", "type");

-- Subscription
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "plan"        "SubscriptionPlan" NOT NULL,
  "status"      "SubscriptionStatus" NOT NULL DEFAULT 'pending',
  "priceUAH"    INTEGER NOT NULL,
  "priceTokens" INTEGER NOT NULL,
  "paidWith"    TEXT NOT NULL DEFAULT 'tokens',
  "paymentId"   TEXT,
  "startsAt"    TIMESTAMP(3),
  "expiresAt"   TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Subscription_userId_status_idx" ON "Subscription" ("userId", "status");

-- Post
CREATE TABLE IF NOT EXISTS "Post" (
  "id"            TEXT PRIMARY KEY,
  "authorId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title"         TEXT NOT NULL,
  "body"          TEXT NOT NULL,
  "images"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"        "PostStatus" NOT NULL DEFAULT 'active',
  "views"         INTEGER NOT NULL DEFAULT 0,
  "likes"         INTEGER NOT NULL DEFAULT 0,
  "removedReason" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Post_authorId_idx" ON "Post" ("authorId");
CREATE INDEX IF NOT EXISTS "Post_status_createdAt_idx" ON "Post" ("status", "createdAt");

-- Rating
CREATE TABLE IF NOT EXISTS "Rating" (
  "id"           TEXT PRIMARY KEY,
  "voterId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "targetUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "value"        "RatingValue" NOT NULL,
  "reason"       TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Rating_voter_target_uniq" UNIQUE ("voterId", "targetUserId")
);
CREATE INDEX IF NOT EXISTS "Rating_targetUserId_idx" ON "Rating" ("targetUserId");

-- PriceLog
CREATE TABLE IF NOT EXISTS "PriceLog" (
  "id"             TEXT PRIMARY KEY,
  "productId"      TEXT NOT NULL,
  "oldPriceUAH"    INTEGER,
  "newPriceUAH"    INTEGER,
  "oldPriceTokens" INTEGER NOT NULL,
  "newPriceTokens" INTEGER NOT NULL,
  "delta"          INTEGER NOT NULL,
  "flagged"        BOOLEAN NOT NULL DEFAULT false,
  "reason"         TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PriceLog_productId_createdAt_idx" ON "PriceLog" ("productId", "createdAt");
