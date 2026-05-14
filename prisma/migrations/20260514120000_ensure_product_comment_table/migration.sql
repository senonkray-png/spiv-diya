-- Repair: if only ALTER ... ProductComment was run (or migration stopped early), the table may be missing.
-- Safe to run multiple times.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'ProductComment'
  ) THEN
    CREATE TABLE "ProductComment" (
      "id" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProductComment_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ProductComment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ProductComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProductComment_productId_createdAt_idx" ON "ProductComment"("productId", "createdAt");
