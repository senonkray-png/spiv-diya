-- Product: unified marketplace catalog (AI / heuristic), separate from seller `category`
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "catalogCategory" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "catalogSubcategory" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isPromotional" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Product_status_catalogCategory_idx" ON "Product"("status", "catalogCategory");

-- User: last viewed catalog categories for homepage personalization
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "marketplaceBrowseCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Existing rows: slug `other` = «Інше» in UI; until seller saves, treat as uncatalogued bucket (optional TS re-classify job)
UPDATE "Product" SET "catalogCategory" = 'other' WHERE "catalogCategory" IS NULL;
