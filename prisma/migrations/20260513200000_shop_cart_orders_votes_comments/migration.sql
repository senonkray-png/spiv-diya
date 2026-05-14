-- Enums
DO $$ BEGIN
  CREATE TYPE "ShopFulfillment" AS ENUM ('pickup', 'delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ShopOrderStatus" AS ENUM ('paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProductVoteValue" AS ENUM ('up', 'down');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Product columns
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "dimensionsText" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "dislikeCount" INTEGER NOT NULL DEFAULT 0;

-- CartItem
CREATE TABLE IF NOT EXISTS "CartItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_userId_productId_key" ON "CartItem"("userId", "productId");
CREATE INDEX IF NOT EXISTS "CartItem_userId_idx" ON "CartItem"("userId");
DO $$ BEGIN
  ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ShopOrder
CREATE TABLE IF NOT EXISTS "ShopOrder" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "status" "ShopOrderStatus" NOT NULL DEFAULT 'paid',
  "fulfillment" "ShopFulfillment" NOT NULL,
  "deliveryAddress" TEXT,
  "deliveryCity" TEXT,
  "deliveryPhone" TEXT,
  "totalUAH" INTEGER NOT NULL,
  "totalTokens" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ShopOrder_buyerId_createdAt_idx" ON "ShopOrder"("buyerId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ShopOrderLine
CREATE TABLE IF NOT EXISTS "ShopOrderLine" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT,
  "sellerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "unitPriceUAH" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "discountPercentApplied" INTEGER NOT NULL DEFAULT 0,
  "lineTotalUAH" INTEGER NOT NULL,
  "lineTotalTokens" INTEGER NOT NULL,
  CONSTRAINT "ShopOrderLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ShopOrderLine_orderId_idx" ON "ShopOrderLine"("orderId");
CREATE INDEX IF NOT EXISTS "ShopOrderLine_sellerId_idx" ON "ShopOrderLine"("sellerId");
DO $$ BEGIN
  ALTER TABLE "ShopOrderLine" ADD CONSTRAINT "ShopOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ShopOrderLine" ADD CONSTRAINT "ShopOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ShopOrderLine" ADD CONSTRAINT "ShopOrderLine_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ProductVote
CREATE TABLE IF NOT EXISTS "ProductVote" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "value" "ProductVoteValue" NOT NULL,
  CONSTRAINT "ProductVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVote_productId_userId_key" ON "ProductVote"("productId", "userId");
CREATE INDEX IF NOT EXISTS "ProductVote_productId_idx" ON "ProductVote"("productId");
DO $$ BEGIN
  ALTER TABLE "ProductVote" ADD CONSTRAINT "ProductVote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ProductVote" ADD CONSTRAINT "ProductVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ProductComment (FKs inline so the table is never left without constraints if only part of a script runs)
CREATE TABLE IF NOT EXISTS "ProductComment" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductComment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductComment_productId_createdAt_idx" ON "ProductComment"("productId", "createdAt");
