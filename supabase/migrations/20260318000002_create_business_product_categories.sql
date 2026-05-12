-- Migration: Create Business Product Categories
-- Story 12.20b

BEGIN;

CREATE TABLE IF NOT EXISTS business_product_categories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES product_category_master(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, category_id)
);

-- Index for fast lookups by business
CREATE INDEX IF NOT EXISTS idx_bpc_business ON business_product_categories(business_id);

-- Enable RLS
ALTER TABLE business_product_categories ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own categories 
-- (Requires joining with businesses table to check ownership)
DO $$
BEGIN
    DROP POLICY IF EXISTS "owner_manage_biz_categories" ON business_product_categories;
    CREATE POLICY "owner_manage_biz_categories" ON business_product_categories
      FOR ALL USING (
        business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
      );
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Anyone authenticated can read
DO $$
BEGIN
    DROP POLICY IF EXISTS "read_biz_categories" ON business_product_categories;
    CREATE POLICY "read_biz_categories" ON business_product_categories
      FOR SELECT USING (true);
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

COMMIT;
