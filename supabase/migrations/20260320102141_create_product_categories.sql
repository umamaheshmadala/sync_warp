-- Migration: create_product_categories
CREATE TABLE product_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES product_category_master(id), -- Level 3 entry
  rank        INTEGER NOT NULL CHECK (rank IN (1, 2, 3)),  -- 1=Primary, 2=Secondary, 3=Tertiary
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, rank)
);

CREATE INDEX idx_pc_product ON product_categories(product_id);
CREATE INDEX idx_pc_category ON product_categories(category_id);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Business owner can manage product categories
CREATE POLICY "owner_manage_product_categories" ON product_categories
  FOR ALL USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "read_product_categories" ON product_categories
  FOR SELECT USING (true);
